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
    section?: {
      gid: string;
      name: string;
    };
  }>;
}

// Field list for API requests
const TASK_FIELDS = [
  'gid', 'name', 'notes', 'completed', 'completed_at',
  'due_on', 'due_at', 'assignee.gid', 'assignee.name', 'assignee.email',
  'projects.gid', 'projects.name', 'tags.gid', 'tags.name',
  'permalink_url', 'created_at', 'modified_at', 'memberships.section.name',
];

const TASK_DETAIL_FIELDS = [
  ...TASK_FIELDS,
  'html_notes',
];

export class AsanaClient {
  private apiClient: typeof Asana.ApiClient.instance | null = null;
  private usersApi: Asana.UsersApi | null = null;
  private tasksApi: Asana.TasksApi | null = null;
  private userTaskListsApi: Asana.UserTaskListsApi | null = null;
  private currentUser: AsanaUser | null = null;
  private workspaces: AsanaWorkspace[] = [];
  private selectedWorkspaceGid: string | null = null;

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
    this.userTaskListsApi = new Asana.UserTaskListsApi();
  }

  /**
   * Connect with a new token
   */
  async connect(token: string, workspaceGid?: string): Promise<void> {
    this.setupClient(token);
    await this.loadUserInfo();

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
    this.userTaskListsApi = null;
    this.currentUser = null;
    this.workspaces = [];
    this.selectedWorkspaceGid = null;
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
   * Create a new task
   */
  async createTask(params: {
    name: string;
    notes?: string;
    due_on?: string;
    projects?: string[];
    assignee?: string;
  }): Promise<AsanaTask> {
    if (!this.tasksApi) throw new Error('Not connected');

    const workspace = this.getDefaultWorkspace();
    if (!workspace) throw new Error('No workspace found');

    const data: Record<string, unknown> = {
      name: params.name,
      workspace: workspace.gid,
    };

    if (params.notes) data.notes = params.notes;
    if (params.due_on) data.due_on = params.due_on;
    if (params.projects && params.projects.length > 0) data.projects = params.projects;
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
  }): Promise<AsanaTask> {
    if (!this.tasksApi) throw new Error('Not connected');

    const data: Record<string, unknown> = {};

    if (params.name !== undefined) data.name = params.name;
    if (params.notes !== undefined) data.notes = params.notes;
    if (params.due_on !== undefined) data.due_on = params.due_on;
    if (params.completed !== undefined) data.completed = params.completed;

    const response = await this.tasksApi.updateTask(
      gid,
      { data },
      { opt_fields: TASK_FIELDS.join(',') }
    );
    return response.data as AsanaTask;
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
}

// Export singleton
export const asanaClient = new AsanaClient();
