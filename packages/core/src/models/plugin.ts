// src/models/plugin.ts

import type { Task, ProviderType } from './task.js';

export interface CustomFieldInput {
  /** Custom field identifier (provider field ID or case-insensitive field name) */
  field: string;

  /** Option identifiers or names (empty array means clear field value) */
  values: string[];
}

export interface CreateTaskInput {
  /** Task title */
  title: string;

  /** Task description */
  description?: string;

  /** Due date */
  dueDate?: Date;

  /** Project ID to add task to */
  projectId?: string;

  /** Project name to resolve in provider */
  projectName?: string;

  /** Section/column ID to place task into */
  sectionId?: string;

  /** Section/column name to resolve in provider */
  sectionName?: string;

  /** Workspace ID to resolve for creation context */
  workspaceId?: string;

  /** Workspace name to resolve for creation context */
  workspaceName?: string;

  /** Skip cache when resolving metadata */
  refresh?: boolean;

  /** Difficulty enum option name (provider-specific) */
  difficulty?: string;

  /** Custom fields to set */
  customFields?: CustomFieldInput[];

  /** Assignee email */
  assigneeEmail?: string;
}

export interface UpdateTaskInput {
  /** New title */
  title?: string;

  /** New description */
  description?: string;

  /** New due date (null to clear) */
  dueDate?: Date | null;

  /** New status */
  status?: 'todo' | 'in_progress' | 'done';

  /** Project ID to scope custom field resolution */
  projectId?: string;

  /** Project name to scope custom field resolution */
  projectName?: string;

  /** Workspace ID to scope project resolution */
  workspaceId?: string;

  /** Workspace name to scope project resolution */
  workspaceName?: string;

  /** Skip cache when resolving metadata */
  refresh?: boolean;

  /** Custom fields to set */
  customFields?: CustomFieldInput[];
}

export interface TaskQueryOptions {
  /** Maximum number of tasks to return */
  limit?: number;

  /** Include completed tasks (default: false) */
  includeCompleted?: boolean;

  /** Filter by project ID */
  projectId?: string;

  /** Skip cache and fetch fresh data */
  refresh?: boolean;
}

export interface ProviderCredentials {
  /** API token or access token */
  token: string;

  /** Additional provider-specific config */
  [key: string]: string | undefined;
}

export interface ProviderInfo {
  /** Provider identifier */
  name: ProviderType;

  /** Human-readable name */
  displayName: string;

  /** Workspace/organization name (after connection) */
  workspace?: string;

  /** User's name in this provider */
  userName?: string;

  /** User's email in this provider */
  userEmail?: string;

  /** Connection status */
  connected: boolean;
}

/**
 * Workspace/organization in a provider
 */
export interface Workspace {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;
}

export interface PMPlugin {
  /** Provider identifier */
  readonly name: ProviderType;

  /** Human-readable display name */
  readonly displayName: string;

  // ═══════════════════════════════════════════════
  // LIFECYCLE METHODS
  // ═══════════════════════════════════════════════

  /**
   * Initialize the plugin (load config, setup client)
   */
  initialize(): Promise<void>;

  /**
   * Check if the plugin has valid credentials stored
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Authenticate with the provider
   * @param credentials - Provider-specific credentials
   */
  authenticate(credentials: ProviderCredentials): Promise<void>;

  /**
   * Disconnect and clear stored credentials
   */
  disconnect(): Promise<void>;

  /**
   * Get provider connection info
   */
  getInfo(): Promise<ProviderInfo>;

  /**
   * Validate that current credentials are still valid
   * (makes an API call to verify)
   */
  validateConnection(): Promise<boolean>;

  // ═══════════════════════════════════════════════
  // TASK OPERATIONS
  // ═══════════════════════════════════════════════

  /**
   * Get tasks assigned to the current user
   */
  getAssignedTasks(options?: TaskQueryOptions): Promise<Task[]>;

  /**
   * Get tasks that are past their due date
   */
  getOverdueTasks(options?: TaskQueryOptions): Promise<Task[]>;

  /**
   * Search tasks by text query
   */
  searchTasks(query: string, options?: TaskQueryOptions): Promise<Task[]>;

  /**
   * Get a single task by its external ID
   */
  getTask(externalId: string): Promise<Task | null>;

  /**
   * Get the URL to open task in browser
   */
  getTaskUrl(externalId: string): string;

  // ═══════════════════════════════════════════════
  // WRITE OPERATIONS
  // ═══════════════════════════════════════════════

  /**
   * Create a new task
   */
  createTask(input: CreateTaskInput): Promise<Task>;

  /**
   * Update an existing task
   */
  updateTask(externalId: string, updates: UpdateTaskInput): Promise<Task>;

  /**
   * Mark a task as complete
   */
  completeTask(externalId: string): Promise<Task>;

  /**
   * Delete a task
   */
  deleteTask(externalId: string): Promise<void>;

  /**
   * Add a comment to a task
   */
  addComment?(externalId: string, body: string): Promise<void>;

  // ═══════════════════════════════════════════════
  // WORKSPACE OPERATIONS (optional)
  // ═══════════════════════════════════════════════

  /**
   * Check if this plugin supports multiple workspaces
   */
  supportsWorkspaces?(): boolean;

  /**
   * Get available workspaces
   */
  getWorkspaces?(): Workspace[];

  /**
   * Get the currently selected workspace
   */
  getCurrentWorkspace?(): Workspace | null;

  /**
   * Switch to a different workspace
   */
  setWorkspace?(workspaceId: string): void;
}

/**
 * Credentials required for each provider type
 */
export const PROVIDER_CREDENTIALS: Record<ProviderType, { fields: string[]; labels: Record<string, string> }> = {
  asana: {
    fields: ['token'],
    labels: {
      token: 'Personal Access Token (from https://app.asana.com/0/my-apps)',
    },
  },
  notion: {
    fields: ['token', 'databaseId'],
    labels: {
      token: 'Integration Token (from https://www.notion.so/my-integrations)',
      databaseId: 'Task Database ID (from database URL)',
    },
  },
  trello: {
    fields: ['apiKey', 'token'],
    labels: {
      apiKey: 'Trello API Key (from https://trello.com/power-ups/admin)',
      token: 'Trello Token (from https://trello.com/1/authorize)',
    },
  },
  linear: {
    fields: ['token'],
    labels: {
      token: 'Linear API Key (from https://linear.app/settings/api)',
    },
  },
};
