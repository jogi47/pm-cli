// src/index.ts

import type {
  PMPlugin,
  ProviderInfo,
  ProviderCredentials,
  TaskQueryOptions,
  CreateTaskInput,
  UpdateTaskInput,
  Task,
  ProviderType,
  Workspace,
} from '@jogi47/pm-cli-core';
import { cacheManager } from '@jogi47/pm-cli-core';
import { asanaClient, type AsanaProject, type AsanaWorkspace } from './client.js';
import { mapAsanaTask, mapAsanaTasks } from './mapper.js';

type ResolvedProject = {
  id: string;
  name: string;
  workspace: AsanaWorkspace;
};

type ResolvedSection = {
  id: string;
  name: string;
};

type ResolvedDifficulty = {
  fieldId: string;
  fieldName: string;
  optionId: string;
  optionName: string;
};

export class AsanaPlugin implements PMPlugin {
  readonly name: ProviderType = 'asana';
  readonly displayName = 'Asana';

  async initialize(): Promise<void> {
    await asanaClient.initialize();
  }

  async isAuthenticated(): Promise<boolean> {
    return asanaClient.isConnected();
  }

  async authenticate(credentials: ProviderCredentials): Promise<void> {
    await asanaClient.connect(credentials.token);
  }

  async disconnect(): Promise<void> {
    asanaClient.disconnect();
    await cacheManager.invalidateProvider('asana');
  }

  async getInfo(): Promise<ProviderInfo> {
    const user = asanaClient.getUser();
    const workspace = asanaClient.getDefaultWorkspace();

    return {
      name: 'asana',
      displayName: 'Asana',
      connected: asanaClient.isConnected(),
      workspace: workspace?.name,
      userName: user?.name,
      userEmail: user?.email,
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      await asanaClient.initialize();
      return asanaClient.isConnected();
    } catch {
      return false;
    }
  }

  async getAssignedTasks(options?: TaskQueryOptions): Promise<Task[]> {
    // Check cache first
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('assigned', 'asana');
      if (cached) return cached;
    }

    const asanaTasks = await asanaClient.getMyTasks({
      completedSince: options?.includeCompleted ? undefined : 'now',
      limit: options?.limit,
    });

    const tasks = mapAsanaTasks(asanaTasks);
    await cacheManager.setTasks('assigned', 'asana', tasks);

    return tasks;
  }

  async getOverdueTasks(options?: TaskQueryOptions): Promise<Task[]> {
    // Check cache first
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('overdue', 'asana');
      if (cached) return cached;
    }

    const asanaTasks = await asanaClient.getOverdueTasks({
      limit: options?.limit,
    });

    const tasks = mapAsanaTasks(asanaTasks);
    await cacheManager.setTasks('overdue', 'asana', tasks);

    return tasks;
  }

  async searchTasks(query: string, options?: TaskQueryOptions): Promise<Task[]> {
    // Check cache first
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('search', 'asana', query);
      if (cached) return cached;
    }

    const asanaTasks = await asanaClient.searchTasks(query, {
      limit: options?.limit,
    });

    const tasks = mapAsanaTasks(asanaTasks);
    await cacheManager.setTasks('search', 'asana', tasks, query);

    return tasks;
  }

  async getTask(externalId: string): Promise<Task | null> {
    // Check cache first
    const taskId = `ASANA-${externalId}`;
    const cached = await cacheManager.getTaskDetail(taskId);
    if (cached) return cached;

    const asanaTask = await asanaClient.getTask(externalId);
    if (!asanaTask) return null;

    const task = mapAsanaTask(asanaTask);
    await cacheManager.setTaskDetail(task);

    return task;
  }

  getTaskUrl(externalId: string): string {
    return `https://app.asana.com/0/0/${externalId}`;
  }

  // ═══════════════════════════════════════════════
  // WRITE OPERATIONS
  // ═══════════════════════════════════════════════

  async createTask(input: CreateTaskInput): Promise<Task> {
    const workspace = this.resolveWorkspace(input);
    const project = await this.resolveProject(input, workspace);
    const section = await this.resolveSection(input, project);
    const difficulty = await this.resolveDifficulty(input, project);

    const projectId = project?.id ?? input.projectId;
    const workspaceGid = project?.workspace.gid ?? workspace.gid;
    const memberships = projectId && section
      ? [{ project: projectId, section: section.id }]
      : undefined;
    const customFields = difficulty ? { [difficulty.fieldId]: difficulty.optionId } : undefined;

    const asanaTask = await this.runAsanaOperation('create task', async () => asanaClient.createTask({
      name: input.title,
      notes: input.description,
      due_on: input.dueDate ? input.dueDate.toISOString().split('T')[0] : undefined,
      projects: projectId && !section ? [projectId] : undefined,
      memberships,
      customFields,
      workspaceGid,
      assignee: input.assigneeEmail,
    }));

    const task = mapAsanaTask(asanaTask);
    await cacheManager.invalidateProvider('asana');
    return task;
  }

  async updateTask(externalId: string, updates: UpdateTaskInput): Promise<Task> {
    const params: {
      name?: string;
      notes?: string;
      due_on?: string | null;
      completed?: boolean;
    } = {};

    if (updates.title !== undefined) params.name = updates.title;
    if (updates.description !== undefined) params.notes = updates.description;
    if (updates.dueDate !== undefined) {
      params.due_on = updates.dueDate ? updates.dueDate.toISOString().split('T')[0] : null;
    }
    if (updates.status === 'done') params.completed = true;

    const asanaTask = await asanaClient.updateTask(externalId, params);

    const task = mapAsanaTask(asanaTask);
    await cacheManager.invalidateProvider('asana');
    return task;
  }

  async completeTask(externalId: string): Promise<Task> {
    const asanaTask = await asanaClient.updateTask(externalId, { completed: true });

    const task = mapAsanaTask(asanaTask);
    await cacheManager.invalidateProvider('asana');
    return task;
  }

  async addComment(externalId: string, body: string): Promise<void> {
    await asanaClient.addComment(externalId, body);
  }

  // ═══════════════════════════════════════════════
  // WORKSPACE OPERATIONS
  // ═══════════════════════════════════════════════

  supportsWorkspaces(): boolean {
    return true;
  }

  getWorkspaces(): Workspace[] {
    return asanaClient.getWorkspaces().map(ws => ({
      id: ws.gid,
      name: ws.name,
    }));
  }

  getCurrentWorkspace(): Workspace | null {
    const ws = asanaClient.getDefaultWorkspace();
    return ws ? { id: ws.gid, name: ws.name } : null;
  }

  setWorkspace(workspaceId: string): void {
    asanaClient.setWorkspace(workspaceId);
  }

  private resolveWorkspace(input: CreateTaskInput): AsanaWorkspace {
    const workspaces = asanaClient.getWorkspaces();
    if (workspaces.length === 0) {
      throw new Error('No Asana workspaces available for this account');
    }

    if (input.workspaceId) {
      const match = workspaces.find((workspace) => workspace.gid === input.workspaceId);
      if (!match) {
        throw new Error(`Workspace not found: "${input.workspaceId}". Available workspaces:\n${formatWorkspaceCandidates(workspaces)}`);
      }
      return match;
    }

    if (input.workspaceName) {
      const exactMatches = workspaces.filter((workspace) => matchesExactCaseInsensitive(workspace.name, input.workspaceName!));
      if (exactMatches.length === 1) return exactMatches[0];
      if (exactMatches.length > 1) {
        throw new Error(
          `Ambiguous workspace: "${input.workspaceName}". Use --workspace ID.\nCandidates:\n${formatWorkspaceCandidates(exactMatches)}`
        );
      }
      throw new Error(`Workspace not found: "${input.workspaceName}". Available workspaces:\n${formatWorkspaceCandidates(workspaces)}`);
    }

    return asanaClient.getDefaultWorkspace() || workspaces[0];
  }

  private async resolveProject(input: CreateTaskInput, workspace: AsanaWorkspace): Promise<ResolvedProject | undefined> {
    if (input.projectName) {
      const scopedWorkspaces = (input.workspaceId || input.workspaceName)
        ? [workspace]
        : asanaClient.getWorkspaces();

      const allProjects = await this.loadProjects(scopedWorkspaces, Boolean(input.refresh));
      const exactMatches = allProjects.filter((project) => matchesExactCaseInsensitive(project.name, input.projectName!));

      if (exactMatches.length === 1) {
        return exactMatches[0];
      }

      if (exactMatches.length > 1) {
        const candidates = exactMatches
          .map((project) => `${project.id} (${project.workspace.name})`)
          .join('\n');
        throw new Error(`Ambiguous project: "${input.projectName}". Use --project ID or --workspace.\nCandidates:\n${candidates}`);
      }

      const topMatches = getTopProjectSuggestions(allProjects, input.projectName);
      const suffix = topMatches.length > 0
        ? `\nPossible matches:\n${topMatches.map((project) => `${project.name} (${project.id}, ${project.workspace.name})`).join('\n')}`
        : '';
      throw new Error(`Project not found: "${input.projectName}".${suffix}`);
    }

    if (input.projectId) {
      try {
        const scopedWorkspaces = (input.workspaceId || input.workspaceName)
          ? [workspace]
          : asanaClient.getWorkspaces();
        const allProjects = await this.loadProjects(scopedWorkspaces, Boolean(input.refresh));
        const matchedProject = allProjects.find((project) => project.id === input.projectId);
        if (matchedProject) return matchedProject;
      } catch {
        // For ID-based project input, listing metadata is best effort only.
      }

      return {
        id: input.projectId,
        name: input.projectId,
        workspace,
      };
    }

    return undefined;
  }

  private async resolveSection(
    input: CreateTaskInput,
    project: ResolvedProject | undefined
  ): Promise<ResolvedSection | undefined> {
    if (!input.sectionId && !input.sectionName) {
      return undefined;
    }

    const projectId = project?.id ?? input.projectId;
    if (!projectId) {
      throw new Error('--section requires --project');
    }

    if (input.sectionName) {
      const sections = await this.runAsanaOperation('resolve project sections', async () => (
        asanaClient.getSectionsForProject(projectId, { refresh: Boolean(input.refresh) })
      ));
      const exactMatches = sections.filter((section) => matchesExactCaseInsensitive(section.name, input.sectionName!));

      if (exactMatches.length === 1) {
        return { id: exactMatches[0].gid, name: exactMatches[0].name };
      }

      if (exactMatches.length > 1) {
        const candidates = exactMatches.map((section) => `${section.gid} (${section.name})`).join('\n');
        throw new Error(`Ambiguous section: "${input.sectionName}" in project ${projectId}. Use --section ID.\nCandidates:\n${candidates}`);
      }

      const available = sections.map((section) => `${section.name} (${section.gid})`).join('\n');
      throw new Error(`Section not found: "${input.sectionName}" in project ${projectId}. Available sections:\n${available || '(none)'}`);
    }

    const sectionId = input.sectionId!;
    const sections = await this.runAsanaOperation('resolve project sections', async () => (
      asanaClient.getSectionsForProject(projectId, { refresh: Boolean(input.refresh) })
    ));
    const found = sections.find((section) => section.gid === sectionId);

    if (!found) {
      return { id: sectionId, name: sectionId };
    }

    return { id: found.gid, name: found.name };
  }

  private async resolveDifficulty(
    input: CreateTaskInput,
    project: ResolvedProject | undefined
  ): Promise<ResolvedDifficulty | undefined> {
    if (!input.difficulty) return undefined;

    const projectId = project?.id ?? input.projectId;
    if (!projectId) {
      throw new Error('--difficulty requires --project');
    }

    const settings = await this.runAsanaOperation('resolve project custom fields', async () => (
      asanaClient.getCustomFieldSettingsForProject(projectId, { refresh: Boolean(input.refresh) })
    ));

    const enumFields = settings
      .map((setting) => setting.customField)
      .filter((field) => field.resourceSubtype === 'enum');
    const difficultyFields = enumFields.filter((field) => matchesExactCaseInsensitive(field.name, 'Difficulty'));

    if (difficultyFields.length === 0) {
      const fieldNames = enumFields.map((field) => field.name).join(', ');
      throw new Error(
        `Difficulty custom field not found in project ${projectId}.` +
        (fieldNames ? ` Available enum fields: ${fieldNames}` : '')
      );
    }

    if (difficultyFields.length > 1) {
      const ids = difficultyFields.map((field) => `${field.name} (${field.gid})`).join(', ');
      throw new Error(`Ambiguous Difficulty custom field in project ${projectId}. Candidates: ${ids}`);
    }

    const difficultyField = difficultyFields[0];
    const options = difficultyField.enumOptions || [];
    const matches = options.filter((option) => matchesExactCaseInsensitive(option.name, input.difficulty!));

    if (matches.length === 0) {
      const available = options.map((option) => option.name).join(', ');
      throw new Error(
        `Difficulty option not found: "${input.difficulty}" in project ${projectId}.` +
        (available ? ` Available options: ${available}` : '')
      );
    }

    if (matches.length > 1) {
      const ids = matches.map((option) => `${option.name} (${option.gid})`).join(', ');
      throw new Error(`Ambiguous difficulty option: "${input.difficulty}". Candidates: ${ids}`);
    }

    return {
      fieldId: difficultyField.gid,
      fieldName: difficultyField.name,
      optionId: matches[0].gid,
      optionName: matches[0].name,
    };
  }

  private async loadProjects(workspaces: AsanaWorkspace[], refresh: boolean): Promise<ResolvedProject[]> {
    const projectsByWorkspace = await Promise.all(workspaces.map(async (workspace) => {
      const projects = await this.runAsanaOperation(`list projects in workspace ${workspace.name}`, async () => (
        asanaClient.getProjects(workspace.gid, { refresh })
      ));
      return { workspace, projects };
    }));

    return projectsByWorkspace.flatMap(({ workspace, projects }) => {
      return projects.map((project) => toResolvedProject(project, workspace));
    });
  }

  private async runAsanaOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Asana API failure while trying to ${operation}: ${message}`);
    }
  }
}

function matchesExactCaseInsensitive(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function toResolvedProject(project: AsanaProject, fallbackWorkspace: AsanaWorkspace): ResolvedProject {
  const workspace = project.workspace?.gid && project.workspace?.name
    ? { gid: project.workspace.gid, name: project.workspace.name }
    : fallbackWorkspace;

  return {
    id: project.gid,
    name: project.name,
    workspace,
  };
}

function getTopProjectSuggestions(projects: ResolvedProject[], query: string): ResolvedProject[] {
  const lowerQuery = query.toLowerCase();
  const containing = projects.filter((project) => project.name.toLowerCase().includes(lowerQuery));
  if (containing.length > 0) return containing.slice(0, 10);
  return projects.slice(0, 10);
}

function formatWorkspaceCandidates(workspaces: AsanaWorkspace[]): string {
  return workspaces.map((workspace) => `${workspace.name} (${workspace.gid})`).join('\n');
}

// Re-export for convenience
export { asanaClient } from './client.js';
export { mapAsanaTask, mapAsanaTasks } from './mapper.js';
export type { ResolvedProject, ResolvedSection };
