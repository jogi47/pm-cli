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
  CustomFieldInput,
  TaskCustomFieldResult,
} from '@jogi47/pm-cli-core';
import { cacheManager } from '@jogi47/pm-cli-core';
import { asanaClient, type AsanaCustomField, type AsanaProject, type AsanaWorkspace } from './client.js';
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

type WorkspaceInputContext = {
  workspaceId?: string;
  workspaceName?: string;
};

type ProjectInputContext = WorkspaceInputContext & {
  projectId?: string;
  projectName?: string;
  refresh?: boolean;
};

type CreateSectionContext = {
  sectionId?: string;
  sectionName?: string;
  refresh?: boolean;
};

type ResolvedCustomFieldMutation = {
  fieldId: string;
  fieldName: string;
  fieldType: 'enum' | 'multi_enum';
  payloadValue: string | string[] | null;
  optionIds: string[];
  optionNames: string[];
};

type CustomFieldContext = {
  field: AsanaCustomField;
  projectIds: Set<string>;
  projectNames: Set<string>;
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

    const projectId = project?.id ?? input.projectId;
    const workspaceGid = project?.workspace.gid ?? workspace.gid;
    const memberships = projectId && section
      ? [{ project: projectId, section: section.id }]
      : undefined;

    const customFieldInputs = getRequestedCustomFields(input.customFields, input.difficulty);
    const resolvedFields = customFieldInputs.length > 0
      ? await this.resolveCustomFields(customFieldInputs, projectId ? [{ id: projectId, name: project?.name || projectId }] : [], Boolean(input.refresh), '--field requires --project')
      : [];

    const asanaTask = await this.runAsanaOperation('create task', async () => asanaClient.createTask({
      name: input.title,
      notes: input.description,
      due_on: input.dueDate ? input.dueDate.toISOString().split('T')[0] : undefined,
      projects: projectId && !section ? [projectId] : undefined,
      memberships,
      customFields: toAsanaCustomFieldsPayload(resolvedFields),
      workspaceGid,
      assignee: input.assigneeEmail,
    }));

    const task = mapAsanaTask(asanaTask);
    if (resolvedFields.length > 0) {
      task.customFieldResults = toCustomFieldResults(resolvedFields);
    }

    await cacheManager.invalidateProvider('asana');
    return task;
  }

  async updateTask(externalId: string, updates: UpdateTaskInput): Promise<Task> {
    const params: {
      name?: string;
      notes?: string;
      due_on?: string | null;
      completed?: boolean;
      customFields?: Record<string, string | string[] | null>;
    } = {};

    if (updates.title !== undefined) params.name = updates.title;
    if (updates.description !== undefined) params.notes = updates.description;
    if (updates.dueDate !== undefined) {
      params.due_on = updates.dueDate ? updates.dueDate.toISOString().split('T')[0] : null;
    }
    if (updates.status === 'done') params.completed = true;

    const customFieldInputs = updates.customFields || [];
    const resolvedFields = customFieldInputs.length > 0
      ? await this.resolveCustomFieldsForUpdate(externalId, updates, customFieldInputs)
      : [];

    if (resolvedFields.length > 0) {
      params.customFields = toAsanaCustomFieldsPayload(resolvedFields);
    }

    const asanaTask = await asanaClient.updateTask(externalId, params);

    const task = mapAsanaTask(asanaTask);
    if (resolvedFields.length > 0) {
      task.customFieldResults = toCustomFieldResults(resolvedFields);
    }

    await cacheManager.invalidateProvider('asana');
    return task;
  }

  async completeTask(externalId: string): Promise<Task> {
    const asanaTask = await asanaClient.updateTask(externalId, { completed: true });

    const task = mapAsanaTask(asanaTask);
    await cacheManager.invalidateProvider('asana');
    return task;
  }

  async deleteTask(externalId: string): Promise<void> {
    await asanaClient.deleteTask(externalId);
    await cacheManager.invalidateProvider('asana');
  }

  async addComment(externalId: string, body: string): Promise<void> {
    await asanaClient.addComment(externalId, body);
  }

  async getTaskThread(externalId: string) {
    const stories = await this.runAsanaOperation('fetch task thread', async () => asanaClient.getTaskStories(externalId));

    return stories
      .filter(story => story.text && story.text.trim().length > 0)
      .map(story => ({
        id: story.gid,
        body: story.text!.trim(),
        author: story.created_by?.name,
        source: 'asana',
        createdAt: new Date(story.created_at),
      }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

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

  private resolveWorkspace(input: WorkspaceInputContext): AsanaWorkspace {
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

  private async resolveProject(input: ProjectInputContext, workspace: AsanaWorkspace): Promise<ResolvedProject | undefined> {
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
    input: CreateSectionContext & { projectId?: string },
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

  private async resolveCustomFieldsForUpdate(
    externalId: string,
    updates: UpdateTaskInput,
    customFieldInputs: CustomFieldInput[]
  ): Promise<ResolvedCustomFieldMutation[]> {
    const refresh = Boolean(updates.refresh);

    if (updates.projectId || updates.projectName) {
      const workspace = this.resolveWorkspace(updates);
      const project = await this.resolveProject(updates, workspace);
      if (!project) {
        throw new Error('--project could not be resolved for --field updates');
      }

      return this.resolveCustomFields(customFieldInputs, [{ id: project.id, name: project.name }], refresh, '--field requires a resolvable project context');
    }

    const asanaTask = await this.runAsanaOperation('load task for custom field resolution', async () => (
      asanaClient.getTask(externalId)
    ));

    if (!asanaTask) {
      throw new Error(`Task not found: ${externalId}`);
    }

    const memberships = asanaTask.memberships || [];
    const membershipProjects = memberships
      .map((membership) => membership.project)
      .filter((project): project is { gid: string; name: string } => Boolean(project?.gid && project?.name));
    const fallbackProjects = (asanaTask.projects || [])
      .filter((project): project is { gid: string; name: string } => Boolean(project.gid && project.name));

    const uniqueProjects = dedupeProjectsById([...membershipProjects, ...fallbackProjects]);
    if (uniqueProjects.length === 0) {
      throw new Error('Cannot resolve --field updates: task has no project memberships. Pass --project explicitly.');
    }

    return this.resolveCustomFields(customFieldInputs, uniqueProjects.map((project) => ({ id: project.gid, name: project.name })), refresh);
  }

  private async resolveCustomFields(
    customFieldInputs: CustomFieldInput[],
    projects: Array<{ id: string; name: string }>,
    refresh: boolean,
    missingProjectError = '--field requires --project'
  ): Promise<ResolvedCustomFieldMutation[]> {
    if (customFieldInputs.length === 0) {
      return [];
    }

    if (projects.length === 0) {
      throw new Error(missingProjectError);
    }

    const fieldContexts = await this.loadCustomFieldContexts(projects, refresh);
    const availableFieldContexts = Array.from(fieldContexts.values());

    if (availableFieldContexts.length === 0) {
      throw new Error(`No custom fields found in scoped project metadata (${projects.map((project) => project.id).join(', ')}).`);
    }

    return customFieldInputs.map((input) => {
      const context = resolveFieldContext(input.field, availableFieldContexts);
      const field = context.field;
      const fieldSubtype = field.resourceSubtype;

      if (fieldSubtype !== 'enum' && fieldSubtype !== 'multi_enum') {
        throw new Error(
          `Unsupported custom field type for "${field.name}" (${field.gid}): ${fieldSubtype || 'unknown'}. ` +
          'Supported types: enum, multi_enum.'
        );
      }

      if (fieldSubtype === 'enum') {
        if (input.values.length > 1) {
          throw new Error(`Custom field "${field.name}" expects a single value, but received: ${input.values.join(', ')}`);
        }

        if (input.values.length === 0) {
          return {
            fieldId: field.gid,
            fieldName: field.name,
            fieldType: 'enum',
            payloadValue: null,
            optionIds: [],
            optionNames: [],
          };
        }

        const option = resolveEnumOption(field, input.values[0]);
        return {
          fieldId: field.gid,
          fieldName: field.name,
          fieldType: 'enum',
          payloadValue: option.gid,
          optionIds: [option.gid],
          optionNames: [option.name],
        };
      }

      if (input.values.length === 0) {
        return {
          fieldId: field.gid,
          fieldName: field.name,
          fieldType: 'multi_enum',
          payloadValue: [],
          optionIds: [],
          optionNames: [],
        };
      }

      const resolvedOptions = dedupeOptionsById(input.values.map((value) => resolveEnumOption(field, value)));
      return {
        fieldId: field.gid,
        fieldName: field.name,
        fieldType: 'multi_enum',
        payloadValue: resolvedOptions.map((option) => option.gid),
        optionIds: resolvedOptions.map((option) => option.gid),
        optionNames: resolvedOptions.map((option) => option.name),
      };
    });
  }

  private async loadCustomFieldContexts(
    projects: Array<{ id: string; name: string }>,
    refresh: boolean
  ): Promise<Map<string, CustomFieldContext>> {
    const settingsByProject = await Promise.all(projects.map(async (project) => {
      const settings = await this.runAsanaOperation(`resolve project custom fields (${project.name})`, async () => (
        asanaClient.getCustomFieldSettingsForProject(project.id, { refresh })
      ));

      return { project, settings };
    }));

    const contextByFieldId = new Map<string, CustomFieldContext>();

    for (const { project, settings } of settingsByProject) {
      for (const setting of settings) {
        const field = setting.customField;
        if (!field.gid || !field.name) continue;

        const existing = contextByFieldId.get(field.gid);
        if (existing) {
          existing.projectIds.add(project.id);
          existing.projectNames.add(project.name);
          if ((!existing.field.enumOptions || existing.field.enumOptions.length === 0) && field.enumOptions) {
            existing.field.enumOptions = field.enumOptions;
          }
          continue;
        }

        contextByFieldId.set(field.gid, {
          field: {
            gid: field.gid,
            name: field.name,
            resourceSubtype: field.resourceSubtype,
            enumOptions: field.enumOptions || [],
          },
          projectIds: new Set([project.id]),
          projectNames: new Set([project.name]),
        });
      }
    }

    return contextByFieldId;
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

function getRequestedCustomFields(
  customFields: CustomFieldInput[] | undefined,
  difficulty: string | undefined
): CustomFieldInput[] {
  const fields: CustomFieldInput[] = [];

  if (difficulty) {
    fields.push({ field: 'Difficulty', values: [difficulty] });
  }

  if (customFields && customFields.length > 0) {
    fields.push(...customFields);
  }

  return fields;
}

function toAsanaCustomFieldsPayload(
  fields: ResolvedCustomFieldMutation[]
): Record<string, string | string[] | null> | undefined {
  if (fields.length === 0) return undefined;

  const payload: Record<string, string | string[] | null> = {};
  for (const field of fields) {
    payload[field.fieldId] = field.payloadValue;
  }

  return payload;
}

function toCustomFieldResults(fields: ResolvedCustomFieldMutation[]): TaskCustomFieldResult[] {
  return fields.map((field) => ({
    fieldId: field.fieldId,
    fieldName: field.fieldName,
    type: field.fieldType,
    optionIds: field.optionIds,
    optionNames: field.optionNames,
    status: 'applied',
  }));
}

function resolveFieldContext(identifier: string, contexts: CustomFieldContext[]): CustomFieldContext {
  const byId = contexts.filter((context) => context.field.gid === identifier);
  if (byId.length === 1) return byId[0];

  if (byId.length > 1) {
    // This should not happen because contexts are keyed by field ID.
    return byId[0];
  }

  const byName = contexts.filter((context) => matchesExactCaseInsensitive(context.field.name, identifier));
  if (byName.length === 1) return byName[0];

  if (byName.length > 1) {
    const candidates = byName
      .map((context) => {
        const projects = Array.from(context.projectNames).join(', ');
        return `${context.field.name} (${context.field.gid}) [projects: ${projects}]`;
      })
      .join('\n');

    throw new Error(
      `Ambiguous custom field: "${identifier}". Use field ID.\nCandidates:\n${candidates}`
    );
  }

  const availableNames = Array.from(new Set(contexts.map((context) => context.field.name)));
  const suggestions = getTopNameSuggestions(availableNames, identifier);
  const suggestionText = suggestions.length > 0
    ? ` Possible matches: ${suggestions.join(', ')}`
    : ` Available fields: ${availableNames.join(', ')}`;

  throw new Error(`Custom field not found: "${identifier}".${suggestionText}`);
}

function resolveEnumOption(field: AsanaCustomField, value: string): { gid: string; name: string } {
  const options = field.enumOptions || [];

  const byId = options.filter((option) => option.gid === value);
  if (byId.length === 1) return byId[0];

  const byName = options.filter((option) => matchesExactCaseInsensitive(option.name, value));
  if (byName.length === 1) return byName[0];

  if (byName.length > 1) {
    const ids = byName.map((option) => `${option.name} (${option.gid})`).join(', ');
    throw new Error(`Ambiguous option for custom field "${field.name}": "${value}". Candidates: ${ids}`);
  }

  const available = options.map((option) => `${option.name} (${option.gid})`).join(', ');
  throw new Error(
    `Option not found for custom field "${field.name}": "${value}".` +
    (available ? ` Available options: ${available}` : '')
  );
}

function dedupeProjectsById(projects: Array<{ gid: string; name: string }>): Array<{ gid: string; name: string }> {
  const seen = new Set<string>();
  const deduped: Array<{ gid: string; name: string }> = [];

  for (const project of projects) {
    if (seen.has(project.gid)) continue;
    seen.add(project.gid);
    deduped.push(project);
  }

  return deduped;
}

function dedupeOptionsById(options: Array<{ gid: string; name: string }>): Array<{ gid: string; name: string }> {
  const seen = new Set<string>();
  const deduped: Array<{ gid: string; name: string }> = [];

  for (const option of options) {
    if (seen.has(option.gid)) continue;
    seen.add(option.gid);
    deduped.push(option);
  }

  return deduped;
}

function getTopNameSuggestions(names: string[], query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const startsWith = names.filter((name) => name.toLowerCase().startsWith(lowerQuery));
  if (startsWith.length > 0) return startsWith.slice(0, 10);

  const contains = names.filter((name) => name.toLowerCase().includes(lowerQuery));
  if (contains.length > 0) return contains.slice(0, 10);

  return names.slice(0, 10);
}

// Re-export for convenience
export { asanaClient } from './client.js';
export { mapAsanaTask, mapAsanaTasks } from './mapper.js';
export type { ResolvedProject, ResolvedSection };
