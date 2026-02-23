import { authManager, ProviderError } from '@jogi47/pm-cli-core';

export interface ClickUpUser {
  id: number;
  username: string;
  email?: string;
}

export interface ClickUpWorkspace {
  id: string;
  name: string;
}

export interface ClickUpPriority {
  id: string;
}

export interface ClickUpStatus {
  status: string;
  type: string;
}

export interface ClickUpTag {
  name: string;
}

export interface ClickUpList {
  id: string;
  name: string;
}

export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: ClickUpStatus;
  due_date?: string | null;
  assignees?: ClickUpUser[];
  tags?: ClickUpTag[];
  priority?: ClickUpPriority | null;
  url: string;
  list?: ClickUpList;
  date_created?: string;
  date_updated?: string;
}

type ClickUpRequestInit = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

class ClickUpClient {
  private token: string | null = null;
  private me: ClickUpUser | null = null;
  private workspace: ClickUpWorkspace | null = null;

  async initialize(): Promise<boolean> {
    const credentials = authManager.getCredentials('clickup');
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

    const [me, workspaces] = await Promise.all([
      this.request<{ user: ClickUpUser }>('/user'),
      this.request<{ teams: ClickUpWorkspace[] }>('/team'),
    ]);

    this.me = me.user;
    this.workspace = workspaces.teams[0] ?? null;

    authManager.setCredentials('clickup', { token });
  }

  disconnect(): void {
    this.token = null;
    this.me = null;
    this.workspace = null;
    authManager.removeCredentials('clickup');
  }

  isConnected(): boolean {
    return Boolean(this.token && this.me);
  }

  getUser(): ClickUpUser | null {
    return this.me;
  }

  getWorkspace(): ClickUpWorkspace | null {
    return this.workspace;
  }

  async getAssignedTasks(limit = 50): Promise<ClickUpTask[]> {
    if (!this.workspace) {
      throw new ProviderError('clickup', 'No ClickUp workspace selected', undefined, {
        suggestion: 'Reconnect ClickUp or set a valid token with workspace access.',
      });
    }

    const response = await this.request<{ tasks: ClickUpTask[] }>(`/team/${this.workspace.id}/task`, {
      query: {
        subtasks: true,
        include_closed: true,
      },
    });

    return response.tasks.slice(0, limit);
  }

  async searchTasks(query: string, limit = 25): Promise<ClickUpTask[]> {
    if (!this.workspace) {
      throw new ProviderError('clickup', 'No ClickUp workspace selected');
    }

    const response = await this.request<{ tasks: ClickUpTask[] }>(`/team/${this.workspace.id}/task`, {
      query: {
        search: query,
        subtasks: true,
        include_closed: true,
      },
    });

    return response.tasks.slice(0, limit);
  }

  async getTask(taskId: string): Promise<ClickUpTask | null> {
    try {
      return await this.request<ClickUpTask>(`/task/${taskId}`);
    } catch (error) {
      if (error instanceof ProviderError && /404/.test(error.message)) {
        return null;
      }
      throw error;
    }
  }

  async createTask(input: {
    title: string;
    description?: string;
    dueDate?: number;
    listId?: string;
    assignees?: number[];
    priority?: number;
  }): Promise<ClickUpTask> {
    const listId = input.listId;
    if (!listId) {
      throw new ProviderError('clickup', 'ClickUp list ID is required for task creation', undefined, {
        suggestion: 'Provide --section/--project id mapped to a ClickUp list.',
      });
    }

    return this.request<ClickUpTask>(`/list/${listId}/task`, {
      method: 'POST',
      body: {
        name: input.title,
        description: input.description,
        due_date: input.dueDate,
        assignees: input.assignees,
        priority: input.priority,
      },
    });
  }

  async updateTask(
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      dueDate?: number | null;
      status?: string;
      priority?: number;
    }
  ): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/task/${taskId}`, {
      method: 'PUT',
      body: {
        name: updates.title,
        description: updates.description,
        due_date: updates.dueDate,
        status: updates.status,
        priority: updates.priority,
      },
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.request(`/task/${taskId}`, { method: 'DELETE' });
  }

  async addComment(taskId: string, commentText: string): Promise<void> {
    await this.request(`/task/${taskId}/comment`, {
      method: 'POST',
      body: { comment_text: commentText },
    });
  }

  private async request<T>(path: string, init: ClickUpRequestInit = {}): Promise<T> {
    if (!this.token) {
      throw new ProviderError('clickup', 'Not authenticated', undefined, {
        reason: 'Missing ClickUp token.',
        suggestion: 'Run `pm connect clickup` or set CLICKUP_TOKEN.',
      });
    }

    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(init.query || {})) {
      if (value !== undefined) query.set(key, String(value));
    }

    const querySuffix = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`https://api.clickup.com/api/v2${path}${querySuffix}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: this.token,
        'Content-Type': 'application/json',
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ProviderError('clickup', `ClickUp API request failed (${response.status})`, undefined, {
        reason: body || `HTTP ${response.status}`,
        suggestion: 'Check your ClickUp token and workspace permissions.',
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

export const clickupClient = new ClickUpClient();
