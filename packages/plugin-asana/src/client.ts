// src/client.ts

import * as Asana from 'asana';
import { authManager } from '@jogi47/pm-cli-core';

export interface AsanaUser {
  gid: string;
  name: string;
  email: string;
}

export interface AsanaWorkspace {
  gid: string;
  name: string;
}

export interface AsanaProject {
  gid: string;
  name: string;
  workspace?: {
    gid: string;
    name: string;
  };
}

export interface AsanaSection {
  gid: string;
  name: string;
}

export interface AsanaEnumOption {
  gid: string;
  name: string;
}

export interface AsanaCustomField {
  gid: string;
  name: string;
  resourceSubtype?: string;
  enumOptions?: AsanaEnumOption[];
}

export interface AsanaCustomFieldSetting {
  customField: AsanaCustomField;
}

export interface AsanaTaskCustomField {
  gid: string;
  name: string;
  resourceSubtype?: string;
  enumValue?: AsanaEnumOption;
  multiEnumValues?: AsanaEnumOption[];
}

export interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  html_notes?: string;
  completed: boolean;
  completed_at?: string;
  due_on?: string;
  due_at?: string;
  assignee?: {
    gid: string;
    name: string;
    email?: string;
  };
  projects?: Array<{
    gid: string;
    name: string;
  }>;
  tags?: Array<{
    gid: string;
    name: string;
  }>;
  permalink_url: string;
  created_at: string;
  modified_at: string;
  memberships?: Array<{
    project?: {
      gid: string;
      name: string;
    };
    section?: {
      gid: string;
      name: string;
    };
  }>;
  custom_fields?: Array<{
    gid?: string;
    name?: string;
    resource_subtype?: string;
    enum_value?: {
      gid?: string;
      name?: string;
    };
    multi_enum_values?: Array<{
      gid?: string;
      name?: string;
    }>;
  }>;
}


export interface AsanaStory {
  gid: string;
  text?: string;
  created_at: string;
  created_by?: {
    gid: string;
    name: string;
  };
}

interface MetadataCacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Field list for API requests
const TASK_FIELDS = [
  'gid', 'name', 'notes', 'completed', 'completed_at',
  'due_on', 'due_at', 'assignee.gid', 'assignee.name', 'assignee.email',
  'projects.gid', 'projects.name', 'tags.gid', 'tags.name',
  'permalink_url', 'created_at', 'modified_at',
  'memberships.project.gid', 'memberships.project.name',
  'memberships.section.gid', 'memberships.section.name',
  'custom_fields.gid', 'custom_fields.name', 'custom_fields.resource_subtype',
  'custom_fields.enum_value.gid', 'custom_fields.enum_value.name',
  'custom_fields.multi_enum_values.gid', 'custom_fields.multi_enum_values.name',
];

const TASK_DETAIL_FIELDS = [
  ...TASK_FIELDS,
  'html_notes',
];

const METADATA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class AsanaClient {
  private apiClient: typeof Asana.ApiClient.instance | null = null;
  private usersApi: Asana.UsersApi | null = null;
  private tasksApi: Asana.TasksApi | null = null;
  private projectsApi: Asana.ProjectsApi | null = null;
  private sectionsApi: Asana.SectionsApi | null = null;
  private customFieldSettingsApi: Asana.CustomFieldSettingsApi | null = null;
  private userTaskListsApi: Asana.UserTaskListsApi | null = null;
  private storiesApi: Asana.StoriesApi | null = null;
  private currentUser: AsanaUser | null = null;
  private workspaces: AsanaWorkspace[] = [];
  private selectedWorkspaceGid: string | null = null;
  private projectsCacheByWorkspace: Record<string, MetadataCacheEntry<AsanaProject[]>> = {};
  private sectionsCacheByProject: Record<string, MetadataCacheEntry<AsanaSection[]>> = {};
  private customFieldSettingsCacheByProject: Record<string, MetadataCacheEntry<AsanaCustomFieldSetting[]>> = {};

  /**
   * Initialize the client with stored credentials
   */
  async initialize(): Promise<boolean> {
    const credentials = authManager.getCredentials('asana');
    if (!credentials) return false;

    try {
      this.setupClient(credentials.token);
      await this.loadUserInfo();
      // Restore selected workspace from credentials
      if (credentials.workspaceGid) {
        this.selectedWorkspaceGid = credentials.workspaceGid;
      }
      return true;
    } catch {
      this.apiClient = null;
      this.usersApi = null;
      this.tasksApi = null;
      this.projectsApi = null;
      this.sectionsApi = null;
      this.customFieldSettingsApi = null;
      this.userTaskListsApi = null;
      this.storiesApi = null;
      this.currentUser = null;
      this.workspaces = [];
      this.selectedWorkspaceGid = null;
      this.projectsCacheByWorkspace = {};
      this.sectionsCacheByProject = {};
      this.customFieldSettingsCacheByProject = {};
      return false;
    }
  }

  /**
   * Setup the API client with token
   */
  private setupClient(token: string): void {
    this.apiClient = Asana.ApiClient.instance;
    this.apiClient.authentications['token'].accessToken = token;

    this.usersApi = new Asana.UsersApi();
    this.tasksApi = new Asana.TasksApi();
    this.projectsApi = new Asana.ProjectsApi();
    this.sectionsApi = new Asana.SectionsApi();
    this.customFieldSettingsApi = new Asana.CustomFieldSettingsApi();
    this.userTaskListsApi = new Asana.UserTaskListsApi();
    this.storiesApi = new Asana.StoriesApi();
  }

  /**
   * Connect with a new token
   */
  async connect(token: string, workspaceGid?: string): Promise<void> {
    this.setupClient(token);
    await this.loadUserInfo();
    this.projectsCacheByWorkspace = {};
    this.sectionsCacheByProject = {};
    this.customFieldSettingsCacheByProject = {};

    // If workspace specified, use it; otherwise default to first
    if (workspaceGid) {
      this.selectedWorkspaceGid = workspaceGid;
    } else if (this.workspaces.length > 0) {
      this.selectedWorkspaceGid = this.workspaces[0].gid;
    }

    authManager.setCredentials('asana', {
      token,
      workspaceGid: this.selectedWorkspaceGid || undefined,
    });
  }

  /**
   * Disconnect and clear credentials
   */
  disconnect(): void {
    this.apiClient = null;
    this.usersApi = null;
    this.tasksApi = null;
    this.projectsApi = null;
    this.sectionsApi = null;
    this.customFieldSettingsApi = null;
    this.userTaskListsApi = null;
    this.storiesApi = null;
    this.currentUser = null;
    this.workspaces = [];
    this.selectedWorkspaceGid = null;
    this.projectsCacheByWorkspace = {};
    this.sectionsCacheByProject = {};
    this.customFieldSettingsCacheByProject = {};
    authManager.removeCredentials('asana');
  }

  /**
   * Load current user info
   */
  private async loadUserInfo(): Promise<void> {
    if (!this.usersApi) throw new Error('Client not initialized');

    const response = await this.usersApi.getUser('me', {
      opt_fields: 'gid,name,email,workspaces.gid,workspaces.name',
    });

    const me = response.data;
    this.currentUser = {
      gid: me.gid!,
      name: me.name!,
      email: me.email!,
    };
    this.workspaces = (me.workspaces || []).map((w: { gid?: string; name?: string }) => ({
      gid: w.gid!,
      name: w.name!,
    }));
  }

  /**
   * Get current user
   */
  getUser(): AsanaUser | null {
    return this.currentUser;
  }

  /**
   * Get workspaces
   */
  getWorkspaces(): AsanaWorkspace[] {
    return this.workspaces;
  }

  /**
   * Get the selected workspace (or first one if none selected)
   */
  getDefaultWorkspace(): AsanaWorkspace | null {
    if (this.selectedWorkspaceGid) {
      const selected = this.workspaces.find(w => w.gid === this.selectedWorkspaceGid);
      if (selected) return selected;
    }
    return this.workspaces[0] || null;
  }

  /**
   * Set the selected workspace
   */
  setWorkspace(workspaceGid: string): void {
    const workspace = this.workspaces.find(w => w.gid === workspaceGid);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceGid}`);
    }
    this.selectedWorkspaceGid = workspaceGid;

    // Update stored credentials with new workspace
    const credentials = authManager.getCredentials('asana');
    if (credentials) {
      authManager.setCredentials('asana', {
        ...credentials,
        workspaceGid,
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.apiClient !== null && this.currentUser !== null;
  }

  /**
   * Get user's task list GID
   */
  async getUserTaskListGid(workspaceGid: string): Promise<string> {
    if (!this.userTaskListsApi || !this.currentUser) throw new Error('Not connected');

    const response = await this.userTaskListsApi.getUserTaskListForUser(
      this.currentUser.gid,
      workspaceGid,
      {}
    );
    return response.data.gid!;
  }

  /**
   * Get tasks from user's task list
   */
  async getMyTasks(options?: {
    completedSince?: string;
    limit?: number;
  }): Promise<AsanaTask[]> {
    if (!this.tasksApi) throw new Error('Not connected');

    const workspace = this.getDefaultWorkspace();
    if (!workspace) throw new Error('No workspace found');

    const taskListGid = await this.getUserTaskListGid(workspace.gid);

    const opts: Record<string, unknown> = {
      opt_fields: TASK_FIELDS.join(','),
    };

    if (options?.completedSince) {
      opts.completed_since = options.completedSince;
    }
    if (options?.limit) {
      opts.limit = options.limit;
    }

    const response = await this.tasksApi.getTasksForUserTaskList(taskListGid, opts);
    return (response.data || []) as AsanaTask[];
  }

  /**
   * Search tasks in workspace
   */
  async searchTasks(query: string, options?: { limit?: number }): Promise<AsanaTask[]> {
    if (!this.tasksApi) throw new Error('Not connected');

    const workspace = this.getDefaultWorkspace();
    if (!workspace) throw new Error('No workspace found');

    const opts: Record<string, unknown> = {
      text: query,
      opt_fields: TASK_FIELDS.join(','),
    };

    if (options?.limit) {
      opts.limit = options.limit;
    }

    const response = await this.tasksApi.searchTasksForWorkspace(workspace.gid, opts);
    return (response.data || []) as AsanaTask[];
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(options?: { limit?: number }): Promise<AsanaTask[]> {
    if (!this.tasksApi) throw new Error('Not connected');

    const workspace = this.getDefaultWorkspace();
    if (!workspace) throw new Error('No workspace found');

    const today = new Date().toISOString().split('T')[0];

    const opts: Record<string, unknown> = {
      'assignee.any': this.currentUser!.gid,
      'due_on.before': today,
      completed: false,
      opt_fields: TASK_FIELDS.join(','),
      sort_by: 'due_date',
      sort_ascending: true,
    };

    if (options?.limit) {
      opts.limit = options.limit;
    }

    const response = await this.tasksApi.searchTasksForWorkspace(workspace.gid, opts);
    return (response.data || []) as AsanaTask[];
  }

  /**
   * Get projects in a workspace (with short-lived metadata cache)
   */
  async getProjects(workspaceGid: string, options?: { refresh?: boolean }): Promise<AsanaProject[]> {
    if (!this.projectsApi) throw new Error('Not connected');

    const cached = this.projectsCacheByWorkspace[workspaceGid];
    if (!options?.refresh && cached && Date.now() <= cached.expiresAt) {
      return cached.data;
    }

    const response = await this.projectsApi.getProjects({
      workspace: workspaceGid,
      archived: false,
      opt_fields: 'gid,name,workspace.gid,workspace.name',
      limit: 100,
    });

    const projects = (response.data || [])
      .filter((project): project is { gid: string; name: string; workspace?: { gid?: string; name?: string } } => Boolean(project.gid && project.name))
      .map((project) => ({
        gid: project.gid,
        name: project.name,
        workspace: project.workspace?.gid && project.workspace?.name
          ? { gid: project.workspace.gid, name: project.workspace.name }
          : undefined,
      }));

    this.projectsCacheByWorkspace[workspaceGid] = {
      data: projects,
      expiresAt: Date.now() + METADATA_CACHE_TTL,
    };

    return projects;
  }

  /**
   * Get sections in a project (with short-lived metadata cache)
   */
  async getSectionsForProject(projectGid: string, options?: { refresh?: boolean }): Promise<AsanaSection[]> {
    if (!this.sectionsApi) throw new Error('Not connected');

    const cached = this.sectionsCacheByProject[projectGid];
    if (!options?.refresh && cached && Date.now() <= cached.expiresAt) {
      return cached.data;
    }

    const response = await this.sectionsApi.getSectionsForProject(projectGid, {
      opt_fields: 'gid,name',
      limit: 100,
    });

    const sections = (response.data || [])
      .filter((section): section is { gid: string; name: string } => Boolean(section.gid && section.name))
      .map((section) => ({
        gid: section.gid,
        name: section.name,
      }));

    this.sectionsCacheByProject[projectGid] = {
      data: sections,
      expiresAt: Date.now() + METADATA_CACHE_TTL,
    };

    return sections;
  }

  /**
   * Get custom field settings in a project (with short-lived metadata cache)
   */
  async getCustomFieldSettingsForProject(projectGid: string, options?: { refresh?: boolean }): Promise<AsanaCustomFieldSetting[]> {
    if (!this.customFieldSettingsApi) throw new Error('Not connected');

    const cached = this.customFieldSettingsCacheByProject[projectGid];
    if (!options?.refresh && cached && Date.now() <= cached.expiresAt) {
      return cached.data;
    }

    const response = await this.customFieldSettingsApi.getCustomFieldSettingsForProject(projectGid, {
      opt_fields: 'custom_field.gid,custom_field.name,custom_field.resource_subtype,custom_field.enum_options.gid,custom_field.enum_options.name',
      limit: 100,
    });

    const rawSettings = Array.isArray((response as { data?: unknown }).data)
      ? (response as { data: Array<{ custom_field?: { gid?: string; name?: string; resource_subtype?: string; enum_options?: Array<{ gid?: string; name?: string }> } }> }).data
      : [];

    const settings: AsanaCustomFieldSetting[] = [];
    for (const setting of rawSettings) {
      const customField = setting.custom_field;
      if (!customField?.gid || !customField.name) continue;

      const enumOptions = (customField.enum_options || [])
        .filter((option): option is { gid: string; name: string } => Boolean(option.gid && option.name))
        .map((option) => ({ gid: option.gid, name: option.name }));

      settings.push({
        customField: {
          gid: customField.gid,
          name: customField.name,
          resourceSubtype: customField.resource_subtype,
          enumOptions,
        },
      });
    }

    this.customFieldSettingsCacheByProject[projectGid] = {
      data: settings,
      expiresAt: Date.now() + METADATA_CACHE_TTL,
    };

    return settings;
  }

  /**
   * Create a new task
   */
  async createTask(params: {
    name: string;
    notes?: string;
    due_on?: string;
    projects?: string[];
    memberships?: Array<{ project: string; section?: string }>;
    customFields?: Record<string, string | string[] | null>;
    workspaceGid?: string;
    assignee?: string;
  }): Promise<AsanaTask> {
    if (!this.tasksApi) throw new Error('Not connected');

    const workspaceGid = params.workspaceGid || this.getDefaultWorkspace()?.gid;
    if (!workspaceGid) throw new Error('No workspace found');

    const data: Record<string, unknown> = {
      name: params.name,
      workspace: workspaceGid,
    };

    if (params.notes) data.notes = params.notes;
    if (params.due_on) data.due_on = params.due_on;
    if (params.projects && params.projects.length > 0) data.projects = params.projects;
    if (params.memberships && params.memberships.length > 0) data.memberships = params.memberships;
    if (params.customFields && Object.keys(params.customFields).length > 0) data.custom_fields = params.customFields;
    if (params.assignee) data.assignee = params.assignee;

    const response = await this.tasksApi.createTask(
      { data },
      { opt_fields: TASK_FIELDS.join(',') }
    );
    return response.data as AsanaTask;
  }

  /**
   * Update an existing task
   */
  async updateTask(gid: string, params: {
    name?: string;
    notes?: string;
    due_on?: string | null;
    completed?: boolean;
    customFields?: Record<string, string | string[] | null>;
  }): Promise<AsanaTask> {
    if (!this.tasksApi) throw new Error('Not connected');

    const data: Record<string, unknown> = {};

    if (params.name !== undefined) data.name = params.name;
    if (params.notes !== undefined) data.notes = params.notes;
    if (params.due_on !== undefined) data.due_on = params.due_on;
    if (params.completed !== undefined) data.completed = params.completed;
    if (params.customFields && Object.keys(params.customFields).length > 0) data.custom_fields = params.customFields;

    const response = await this.tasksApi.updateTask(
      gid,
      { data },
      { opt_fields: TASK_FIELDS.join(',') }
    );
    return response.data as AsanaTask;
  }

  /**
   * Delete a task by GID
   */
  async deleteTask(gid: string): Promise<void> {
    if (!this.tasksApi) throw new Error('Not connected');

    await this.tasksApi.deleteTask(gid);
  }

  /**
   * Get a single task by GID
   */
  async getTask(gid: string): Promise<AsanaTask | null> {
    if (!this.tasksApi) throw new Error('Not connected');

    try {
      const response = await this.tasksApi.getTask(gid, {
        opt_fields: TASK_DETAIL_FIELDS.join(','),
      });
      return response.data as AsanaTask;
    } catch {
      return null;
    }
  }
  /**
   * Fetch stories/comments for a task
   */
  async getTaskStories(taskGid: string): Promise<AsanaStory[]> {
    if (!this.storiesApi) throw new Error('Not connected');

    const response = await this.storiesApi.getStoriesForTask(taskGid, {
      opt_fields: 'gid,text,created_at,created_by.gid,created_by.name',
      limit: 100,
    });

    return (response.data || []) as AsanaStory[];
  }

  /**
   * Add a comment (story) to a task
   */
  async addComment(taskGid: string, text: string): Promise<void> {
    if (!this.storiesApi) throw new Error('Not connected');

    await this.storiesApi.createStoryForTask({
      data: { text },
    }, taskGid);
  }
}

// Export singleton
export const asanaClient = new AsanaClient();
