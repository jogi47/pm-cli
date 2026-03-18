// src/models/plugin.ts

import type { Task, ProviderType, ThreadAttachment, ThreadEntry } from './task.js';

export interface CustomFieldInput {
  /** Custom field identifier (provider field ID or case-insensitive field name) */
  field: string;

  /** Option identifiers or names (empty array means clear field value) */
  values: string[];
}

export interface TaskPlacementInput {
  /** Primary container identifier, such as a project, board, or list */
  containerId?: string;

  /** Primary container display name */
  containerName?: string;

  /** Nested grouping identifier, such as a section or column */
  parentId?: string;

  /** Nested grouping display name */
  parentName?: string;
}

export interface TaskProviderContextInput {
  /** Provider workspace or organization identifier */
  workspaceId?: string;

  /** Provider workspace or organization display name */
  workspaceName?: string;

  /** Neutral placement context for provider-specific routing */
  placement?: TaskPlacementInput;

  /** Skip provider metadata cache when resolving context */
  refresh?: boolean;
}

export interface CreateTaskProviderOptionsInput {
  /** Provider-specific enum convenience input */
  difficulty?: string;

  /** Provider-specific custom field mutations */
  customFields?: CustomFieldInput[];
}

export interface UpdateTaskProviderOptionsInput {
  /** Provider-specific custom field mutations */
  customFields?: CustomFieldInput[];
}

export interface CreateTaskInput {
  /** Task title */
  title: string;

  /** Task description */
  description?: string;

  /** Due date */
  dueDate?: Date;

  /** Assignee email */
  assigneeEmail?: string;

  /** Provider-specific context such as workspace and placement */
  context?: TaskProviderContextInput;

  /** Provider-specific mutation options */
  providerOptions?: CreateTaskProviderOptionsInput;
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

  /** Provider-specific context such as workspace and placement */
  context?: TaskProviderContextInput;

  /** Provider-specific mutation options */
  providerOptions?: UpdateTaskProviderOptionsInput;
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

export interface ThreadQueryOptions {
  /** Only return human comments, exclude system activity */
  commentsOnly?: boolean;
  /** Limit the number of entries */
  limit?: number;
  /** Download image attachments into a local temp directory */
  downloadImages?: boolean;
  /** Base temp directory used for downloaded images */
  tempDir?: string;
  /** Remove this task's previous download directory before fetching again */
  cleanup?: boolean;
}

export interface AttachmentDownloadOptions {
  /** Base temp directory used for downloaded files */
  tempDir?: string;
  /** Remove this task's previous download directory before downloading */
  cleanup?: boolean;
  /** Provider task ID used to namespace downloads */
  taskId?: string;
}

export interface ProviderCredentialFieldSpec {
  /** Human-readable prompt label */
  label: string;

  /** Matching environment variable when supported */
  envVar?: string;

  /** Whether interactive prompts should hide the value */
  secret?: boolean;
}

export interface ProviderCredentialSpec {
  /** Required credential fields */
  requiredFields: string[];

  /** Optional credential fields */
  optionalFields?: string[];

  /** Per-field prompt and env metadata */
  fields: Record<string, ProviderCredentialFieldSpec>;
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

  /** Declared provider capability manifest */
  capabilities: ProviderCapabilities;
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

export interface ProviderCapabilities {
  comments: boolean;
  thread: boolean;
  attachmentDownload: boolean;
  workspaces: boolean;
  customFields: boolean;
  projectPlacement: boolean;
}

export type ProviderCapability = keyof ProviderCapabilities;

export interface CommentCapablePlugin {
  addComment(externalId: string, body: string): Promise<void>;
}

export interface ThreadCapablePlugin {
  getTaskThread(externalId: string, options?: ThreadQueryOptions): Promise<ThreadEntry[]>;
}

export interface AttachmentDownloadCapablePlugin {
  downloadAttachment(attachment: ThreadAttachment, options?: AttachmentDownloadOptions): Promise<string | null>;
}

export interface WorkspaceCapablePlugin {
  getWorkspaces(): Workspace[];
  getCurrentWorkspace(): Workspace | null;
  setWorkspace(workspaceId: string): void;
}

export interface PMPluginBase {
  /** Provider identifier */
  readonly name: ProviderType;

  /** Human-readable display name */
  readonly displayName: string;

  /** Explicit runtime capability manifest */
  readonly capabilities: ProviderCapabilities;

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
}

export type PMPlugin =
  & PMPluginBase
  & Partial<CommentCapablePlugin>
  & Partial<ThreadCapablePlugin>
  & Partial<AttachmentDownloadCapablePlugin>
  & Partial<WorkspaceCapablePlugin>;

export function hasProviderCapability(plugin: PMPluginBase, capability: ProviderCapability): boolean {
  return plugin.capabilities[capability];
}

export function isCommentCapable(plugin: PMPluginBase): plugin is PMPluginBase & CommentCapablePlugin {
  return hasProviderCapability(plugin, 'comments') && typeof (plugin as Partial<CommentCapablePlugin>).addComment === 'function';
}

export function isThreadCapable(plugin: PMPluginBase): plugin is PMPluginBase & ThreadCapablePlugin {
  return hasProviderCapability(plugin, 'thread') && typeof (plugin as Partial<ThreadCapablePlugin>).getTaskThread === 'function';
}

export function isAttachmentDownloadCapable(
  plugin: PMPluginBase
): plugin is PMPluginBase & AttachmentDownloadCapablePlugin {
  return hasProviderCapability(plugin, 'attachmentDownload')
    && typeof (plugin as Partial<AttachmentDownloadCapablePlugin>).downloadAttachment === 'function';
}

export function isWorkspaceCapable(plugin: PMPluginBase): plugin is PMPluginBase & WorkspaceCapablePlugin {
  return hasProviderCapability(plugin, 'workspaces')
    && typeof (plugin as Partial<WorkspaceCapablePlugin>).getWorkspaces === 'function'
    && typeof (plugin as Partial<WorkspaceCapablePlugin>).getCurrentWorkspace === 'function'
    && typeof (plugin as Partial<WorkspaceCapablePlugin>).setWorkspace === 'function';
}

/**
 * Credentials required for each provider type
 */
export const PROVIDER_CREDENTIALS: Record<ProviderType, ProviderCredentialSpec> = {
  asana: {
    requiredFields: ['token'],
    fields: {
      token: {
        label: 'Personal Access Token (from https://app.asana.com/0/my-apps)',
        envVar: 'ASANA_TOKEN',
        secret: true,
      },
    },
  },
  notion: {
    requiredFields: ['token', 'databaseId'],
    fields: {
      token: {
        label: 'Integration Token (from https://www.notion.so/my-integrations)',
        envVar: 'NOTION_TOKEN',
        secret: true,
      },
      databaseId: {
        label: 'Task Database ID (from database URL)',
        envVar: 'NOTION_DATABASE_ID',
      },
    },
  },
  trello: {
    requiredFields: ['apiKey', 'token'],
    fields: {
      apiKey: {
        label: 'Trello API Key (from https://trello.com/power-ups/admin)',
        envVar: 'TRELLO_API_KEY',
      },
      token: {
        label: 'Trello Token (from https://trello.com/1/authorize)',
        envVar: 'TRELLO_TOKEN',
        secret: true,
      },
    },
  },
  linear: {
    requiredFields: ['token'],
    fields: {
      token: {
        label: 'Linear API Key (from https://linear.app/settings/api)',
        envVar: 'LINEAR_API_KEY',
        secret: true,
      },
    },
  },
  clickup: {
    requiredFields: ['token'],
    fields: {
      token: {
        label: 'ClickUp Personal API Token (from https://app.clickup.com/settings/apps)',
        envVar: 'CLICKUP_TOKEN',
        secret: true,
      },
    },
  },
};

export function validateProviderCredentials(provider: ProviderType, credentials: ProviderCredentials): string[] {
  const spec = PROVIDER_CREDENTIALS[provider];
  return spec.requiredFields.filter((field) => {
    const value = credentials[field];
    return value === undefined || value.trim().length === 0;
  });
}
