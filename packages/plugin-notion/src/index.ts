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
} from '@pm-cli/core';
import { cacheManager, isOverdue } from '@pm-cli/core';
import { notionClient } from './client.js';
import { mapNotionPage, mapNotionPages } from './mapper.js';

export class NotionPlugin implements PMPlugin {
  readonly name: ProviderType = 'notion';
  readonly displayName = 'Notion';

  async initialize(): Promise<void> {
    await notionClient.initialize();
  }

  async isAuthenticated(): Promise<boolean> {
    return notionClient.isConnected();
  }

  async authenticate(credentials: ProviderCredentials): Promise<void> {
    const databaseId = credentials.databaseId;
    if (!databaseId) {
      throw new Error('Database ID is required for Notion connection');
    }
    await notionClient.connect(credentials.token, databaseId);
  }

  async disconnect(): Promise<void> {
    notionClient.disconnect();
    await cacheManager.invalidateProvider('notion');
  }

  async getInfo(): Promise<ProviderInfo> {
    const user = notionClient.getUser();

    return {
      name: 'notion',
      displayName: 'Notion',
      connected: notionClient.isConnected(),
      workspace: notionClient.getDatabaseId() ? 'Notion Database' : undefined,
      userName: user?.name,
      userEmail: user?.email,
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      await notionClient.initialize();
      return notionClient.isConnected();
    } catch {
      return false;
    }
  }

  // ═══════════════════════════════════════════════
  // READ OPERATIONS
  // ═══════════════════════════════════════════════

  async getAssignedTasks(options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('assigned', 'notion');
      if (cached) return cached;
    }

    // Query all incomplete tasks, sorted by last edited
    const pages = await notionClient.queryDatabase({
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      pageSize: options?.limit ?? 50,
    });

    let tasks = mapNotionPages(pages);

    if (!options?.includeCompleted) {
      tasks = tasks.filter((t) => t.status !== 'done');
    }

    await cacheManager.setTasks('assigned', 'notion', tasks);
    return tasks;
  }

  async getOverdueTasks(options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('overdue', 'notion');
      if (cached) return cached;
    }

    const today = new Date().toISOString().split('T')[0];

    // Try to query with a due date filter
    // We need to find the actual due date property name in the schema
    let pages;
    try {
      const schema = await notionClient.getDatabaseSchema();
      const dueDatePropName = findPropertyName(schema, ['due date', 'due', 'deadline', 'date']);

      if (dueDatePropName) {
        pages = await notionClient.queryDatabase({
          filter: {
            and: [
              {
                property: dueDatePropName,
                date: { before: today },
              },
            ],
          },
          sorts: [{ property: dueDatePropName, direction: 'ascending' }],
          pageSize: options?.limit ?? 50,
        });
      } else {
        // No due date property found; fall back to fetching all and filtering
        pages = await notionClient.queryDatabase({
          pageSize: options?.limit ?? 100,
        });
      }
    } catch {
      // Fallback: fetch all and filter client-side
      pages = await notionClient.queryDatabase({
        pageSize: options?.limit ?? 100,
      });
    }

    let tasks = mapNotionPages(pages);
    tasks = tasks.filter((t) => t.status !== 'done' && isOverdue(t.dueDate));
    tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    if (options?.limit) {
      tasks = tasks.slice(0, options.limit);
    }

    await cacheManager.setTasks('overdue', 'notion', tasks);
    return tasks;
  }

  async searchTasks(query: string, options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('search', 'notion', query);
      if (cached) return cached;
    }

    const pages = await notionClient.searchPages(query, {
      pageSize: options?.limit ?? 20,
    });

    let tasks = mapNotionPages(pages);

    if (!options?.includeCompleted) {
      tasks = tasks.filter((t) => t.status !== 'done');
    }

    await cacheManager.setTasks('search', 'notion', tasks, query);
    return tasks;
  }

  async getTask(externalId: string): Promise<Task | null> {
    const taskId = `NOTION-${externalId}`;
    const cached = await cacheManager.getTaskDetail(taskId);
    if (cached) return cached;

    const page = await notionClient.getPage(externalId);
    if (!page) return null;

    const task = mapNotionPage(page);
    await cacheManager.setTaskDetail(task);
    return task;
  }

  getTaskUrl(externalId: string): string {
    // Notion page URLs use the page ID without dashes
    const cleanId = externalId.replace(/-/g, '');
    return `https://notion.so/${cleanId}`;
  }

  // ═══════════════════════════════════════════════
  // WRITE OPERATIONS
  // ═══════════════════════════════════════════════

  async createTask(input: CreateTaskInput): Promise<Task> {
    const schema = await notionClient.getDatabaseSchema();
    const properties: Record<string, unknown> = {};

    // Set title (find the title property)
    const titlePropName = findTitleProperty(schema);
    if (titlePropName) {
      properties[titlePropName] = {
        title: [{ text: { content: input.title } }],
      };
    }

    // Set due date if provided
    if (input.dueDate) {
      const dueDatePropName = findPropertyName(schema, ['due date', 'due', 'deadline', 'date']);
      if (dueDatePropName) {
        properties[dueDatePropName] = {
          date: { start: input.dueDate.toISOString().split('T')[0] },
        };
      }
    }

    // Set description if provided and there's a rich_text property for it
    if (input.description) {
      const descPropName = findPropertyName(schema, ['description', 'notes', 'details']);
      if (descPropName && (schema[descPropName].type === 'rich_text')) {
        properties[descPropName] = {
          rich_text: [{ text: { content: input.description } }],
        };
      }
    }

    const page = await notionClient.createPage(properties);
    const task = mapNotionPage(page);
    await cacheManager.invalidateProvider('notion');
    return task;
  }

  async updateTask(externalId: string, updates: UpdateTaskInput): Promise<Task> {
    const schema = await notionClient.getDatabaseSchema();
    const properties: Record<string, unknown> = {};

    if (updates.title !== undefined) {
      const titlePropName = findTitleProperty(schema);
      if (titlePropName) {
        properties[titlePropName] = {
          title: [{ text: { content: updates.title } }],
        };
      }
    }

    if (updates.dueDate !== undefined) {
      const dueDatePropName = findPropertyName(schema, ['due date', 'due', 'deadline', 'date']);
      if (dueDatePropName) {
        properties[dueDatePropName] = {
          date: updates.dueDate ? { start: updates.dueDate.toISOString().split('T')[0] } : null,
        };
      }
    }

    if (updates.description !== undefined) {
      const descPropName = findPropertyName(schema, ['description', 'notes', 'details']);
      if (descPropName && (schema[descPropName].type === 'rich_text')) {
        properties[descPropName] = {
          rich_text: [{ text: { content: updates.description } }],
        };
      }
    }

    if (updates.status !== undefined) {
      const statusPropName = findPropertyName(schema, ['status', 'state']);
      if (statusPropName) {
        const statusValue = mapTaskStatusToNotion(updates.status);
        if (schema[statusPropName].type === 'status') {
          properties[statusPropName] = { status: { name: statusValue } };
        } else if (schema[statusPropName].type === 'select') {
          properties[statusPropName] = { select: { name: statusValue } };
        } else if (schema[statusPropName].type === 'checkbox') {
          properties[statusPropName] = { checkbox: updates.status === 'done' };
        }
      }
    }

    const page = await notionClient.updatePage(externalId, properties);
    const task = mapNotionPage(page);
    await cacheManager.invalidateProvider('notion');
    return task;
  }

  async completeTask(externalId: string): Promise<Task> {
    return this.updateTask(externalId, { status: 'done' });
  }
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/**
 * Find a property name in the schema by common aliases (case-insensitive)
 */
function findPropertyName(
  schema: Record<string, { type: string; name: string }>,
  aliases: string[]
): string | null {
  for (const [name] of Object.entries(schema)) {
    if (aliases.includes(name.toLowerCase())) {
      return name;
    }
  }
  return null;
}

/**
 * Find the title property in the schema
 */
function findTitleProperty(
  schema: Record<string, { type: string; name: string }>
): string | null {
  for (const [name, prop] of Object.entries(schema)) {
    if (prop.type === 'title') {
      return name;
    }
  }
  return null;
}

/**
 * Map TaskStatus to a Notion-friendly status name
 */
function mapTaskStatusToNotion(status: string): string {
  switch (status) {
    case 'done':
      return 'Done';
    case 'in_progress':
      return 'In Progress';
    case 'todo':
    default:
      return 'To Do';
  }
}

// Re-export for convenience
export { notionClient } from './client.js';
export { mapNotionPage, mapNotionPages } from './mapper.js';
