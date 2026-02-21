// src/models/task.ts

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type ProviderType = 'asana' | 'notion' | 'trello' | 'linear';
export type TaskCustomFieldType = 'enum' | 'multi_enum' | 'unsupported';

export interface TaskCustomFieldResult {
  /** Custom field identifier */
  fieldId: string;

  /** Custom field display name */
  fieldName: string;

  /** Normalized field type */
  type: TaskCustomFieldType;

  /** Resolved option IDs (empty when cleared) */
  optionIds: string[];

  /** Resolved option names (empty when cleared) */
  optionNames: string[];

  /** Apply status for create/update operations */
  status: 'applied' | 'failed';

  /** Optional provider error details */
  message?: string;
}

export interface Task {
  /** Internal ID format: "{SOURCE}-{externalId}" e.g. "ASANA-1234567890" */
  id: string;

  /** Original ID from the provider */
  externalId: string;

  /** Task title/name */
  title: string;

  /** Task description/notes (may contain HTML or markdown) */
  description?: string;

  /** Normalized status */
  status: TaskStatus;

  /** Due date (if set) */
  dueDate?: Date;

  /** Assignee display name */
  assignee?: string;

  /** Assignee email (for matching across providers) */
  assigneeEmail?: string;

  /** Project or parent container name */
  project?: string;

  /** Structured project/section placement details */
  placement?: {
    project?: {
      id: string;
      name: string;
    };
    section?: {
      id: string;
      name: string;
    };
  };

  /** Tags/labels */
  tags?: string[];

  /** Normalized custom field resolution/apply results */
  customFieldResults?: TaskCustomFieldResult[];

  /** Source provider */
  source: ProviderType;

  /** Direct URL to task in provider's UI */
  url: string;

  /** Priority level (if available) */
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  /** Creation timestamp */
  createdAt?: Date;

  /** Last modification timestamp */
  updatedAt?: Date;
}

/**
 * Create internal task ID from provider and external ID
 */
export function createTaskId(source: ProviderType, externalId: string): string {
  return `${source.toUpperCase()}-${externalId}`;
}

/**
 * Parse internal task ID to get provider and external ID
 */
export function parseTaskId(id: string): { source: ProviderType; externalId: string } | null {
  const match = id.match(/^(ASANA|NOTION|TRELLO|LINEAR)-(.+)$/i);
  if (!match) return null;

  return {
    source: match[1].toLowerCase() as ProviderType,
    externalId: match[2],
  };
}
