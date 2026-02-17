// src/models/task.ts

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type ProviderType = 'asana' | 'notion';

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
  const match = id.match(/^(ASANA|NOTION)-(.+)$/i);
  if (!match) return null;

  return {
    source: match[1].toLowerCase() as ProviderType,
    externalId: match[2],
  };
}
