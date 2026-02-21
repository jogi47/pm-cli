import { authManager, ProviderError } from '@jogi47/pm-cli-core';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: number;
  url: string;
  createdAt: string;
  updatedAt: string;
  state?: { name?: string | null; type?: string | null } | null;
  assignee?: { name?: string | null; email?: string | null } | null;
  labels: { nodes: Array<{ name: string }> };
  project?: { name?: string | null } | null;
  team?: { id?: string; name?: string | null } | null;
}

type GraphQLResponse<T> = { data?: T; errors?: Array<{ message: string }> };

class LinearPluginClient {
  private token: string | null = null;
  private viewer: { id: string; name?: string; email?: string; activeTeam?: { id: string } } | null = null;

  async initialize(): Promise<boolean> {
    const credentials = authManager.getCredentials('linear');
    if (!credentials?.token) return false;

    try {
      await this.connect(credentials.token);
      return true;
    } catch {
      this.disconnect();
      return false;
    }
  }

  async connect(token: string): Promise<void> {
    this.token = token;
    const data = await this.request<{ viewer: { id: string; name: string; email: string; activeTeam?: { id: string } } }>(
      `query Viewer { viewer { id name email activeTeam { id } } }`
    );
    this.viewer = data.viewer;
    authManager.setCredentials('linear', { token });
  }

  disconnect(): void {
    this.token = null;
    this.viewer = null;
    authManager.removeCredentials('linear');
  }

  isConnected(): boolean {
    return Boolean(this.token && this.viewer);
  }

  getUser(): { name?: string; email?: string } | null {
    if (!this.viewer) return null;
    return { name: this.viewer.name, email: this.viewer.email };
  }

  async getAssignedIssues(limit = 50): Promise<LinearIssue[]> {
    const data = await this.request<{ viewer: { assignedIssues: { nodes: LinearIssue[] } } }>(`
      query AssignedIssues($first: Int!) {
        viewer {
          assignedIssues(first: $first) {
            nodes {
              id identifier title description dueDate priority url createdAt updatedAt
              state { name type }
              assignee { name email }
              labels { nodes { name } }
              project { name }
              team { id name }
            }
          }
        }
      }
    `, { first: limit });

    return data.viewer.assignedIssues.nodes;
  }

  async searchIssues(query: string, limit = 25): Promise<LinearIssue[]> {
    const data = await this.request<{ issues: { nodes: LinearIssue[] } }>(`
      query SearchIssues($first: Int!, $query: String!) {
        issues(first: $first, filter: { title: { containsIgnoreCase: $query } }) {
          nodes {
            id identifier title description dueDate priority url createdAt updatedAt
            state { name type }
            assignee { name email }
            labels { nodes { name } }
            project { name }
            team { id name }
          }
        }
      }
    `, { first: limit, query });

    return data.issues.nodes;
  }

  async getIssue(identifier: string): Promise<LinearIssue | null> {
    const data = await this.request<{ issue: LinearIssue | null }>(`
      query Issue($id: String!) {
        issue(id: $id) {
          id identifier title description dueDate priority url createdAt updatedAt
          state { name type }
          assignee { name email }
          labels { nodes { name } }
          project { name }
          team { id name }
        }
      }
    `, { id: identifier });

    return data.issue;
  }

  async createIssue(input: { title: string; description?: string; dueDate?: string }): Promise<LinearIssue> {
    const teamId = this.viewer?.activeTeam?.id;
    if (!teamId) throw new ProviderError('linear', 'No active team found for issue creation');

    const data = await this.request<{ issueCreate: { success: boolean; issue?: { identifier: string } } }>(`
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { identifier }
        }
      }
    `, {
      input: {
        teamId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
      },
    });

    const identifier = data.issueCreate.issue?.identifier;
    if (!identifier) throw new ProviderError('linear', 'Failed to create issue');

    const issue = await this.getIssue(identifier);
    if (!issue) throw new ProviderError('linear', `Issue not found after create: ${identifier}`);
    return issue;
  }

  async updateIssue(identifier: string, updates: { title?: string; description?: string; dueDate?: string | null; stateType?: 'unstarted' | 'started' | 'completed' }): Promise<LinearIssue> {
    const issue = await this.getIssue(identifier);
    if (!issue) throw new ProviderError('linear', `Issue not found: ${identifier}`);

    const stateId = updates.stateType && issue.team?.id ? await this.resolveStateId(issue.team.id, updates.stateType) : undefined;

    await this.request<{ issueUpdate: { success: boolean } }>(`
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) { success }
      }
    `, {
      id: issue.id,
      input: {
        title: updates.title,
        description: updates.description,
        dueDate: updates.dueDate,
        stateId,
      },
    });

    const refreshed = await this.getIssue(identifier);
    if (!refreshed) throw new ProviderError('linear', `Issue not found after update: ${identifier}`);
    return refreshed;
  }

  async deleteIssue(identifier: string): Promise<void> {
    const issue = await this.getIssue(identifier);
    if (!issue) return;
    await this.request(`mutation DeleteIssue($id: String!) { issueDelete(id: $id) { success } }`, { id: issue.id });
  }

  async addComment(identifier: string, body: string): Promise<void> {
    const issue = await this.getIssue(identifier);
    if (!issue) throw new ProviderError('linear', `Issue not found: ${identifier}`);
    await this.request(`mutation Comment($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`, {
      input: { issueId: issue.id, body },
    });
  }

  private async resolveStateId(teamId: string, type: 'unstarted' | 'started' | 'completed'): Promise<string | undefined> {
    const data = await this.request<{ workflowStates: { nodes: Array<{ id: string }> } }>(`
      query ResolveState($teamId: String!, $type: String!) {
        workflowStates(first: 1, filter: { team: { id: { eq: $teamId } }, type: { eq: $type } }) {
          nodes { id }
        }
      }
    `, { teamId, type });

    return data.workflowStates.nodes[0]?.id;
  }

  private async request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    if (!this.token) throw new ProviderError('linear', 'Not authenticated');

    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.token,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new ProviderError('linear', `Linear API request failed (${response.status})`);
    }

    const payload = await response.json() as GraphQLResponse<T>;
    if (payload.errors?.length) {
      throw new ProviderError('linear', payload.errors.map((e) => e.message).join('; '));
    }

    if (!payload.data) {
      throw new ProviderError('linear', 'Linear API returned no data');
    }

    return payload.data;
  }
}

export const linearClient = new LinearPluginClient();
