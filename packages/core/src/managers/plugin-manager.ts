// src/managers/plugin-manager.ts

import type { PMPlugin, ProviderInfo, CreateTaskInput, UpdateTaskInput } from '../models/plugin.js';
import type { Task, TaskStatus, ProviderType, ThreadEntry } from '../models/task.js';
import { parseTaskId } from '../models/task.js';
import { PMCliError, ProviderError, NotConnectedError, formatError } from '../utils/errors.js';

export interface FilterSortOptions {
  status?: TaskStatus;
  priority?: string[];
  sort?: 'due' | 'priority' | 'status' | 'source' | 'title';
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER: Record<string, number> = { in_progress: 0, todo: 1, done: 2 };


function dedupeTasks(tasks: Task[]): Task[] {
  const seen = new Set<string>();
  const unique: Task[] = [];

  for (const task of tasks) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    unique.push(task);
  }

  return unique;
}


/**
 * Filter and sort tasks after aggregation
 */
export function filterAndSortTasks(tasks: Task[], options: FilterSortOptions): Task[] {
  let result = tasks;

  if (options.status) {
    result = result.filter(t => t.status === options.status);
  }

  if (options.priority && options.priority.length > 0) {
    result = result.filter(t => t.priority && options.priority!.includes(t.priority));
  }

  if (options.sort) {
    result = [...result];
    switch (options.sort) {
      case 'due':
        result.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        });
        break;
      case 'priority':
        result.sort((a, b) => {
          const pa = a.priority ? PRIORITY_ORDER[a.priority] ?? 99 : 99;
          const pb = b.priority ? PRIORITY_ORDER[b.priority] ?? 99 : 99;
          return pa - pb;
        });
        break;
      case 'status':
        result.sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
        break;
      case 'source':
        result.sort((a, b) => a.source.localeCompare(b.source));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
  }

  return result;
}

class PluginManager {
  private plugins: Map<ProviderType, PMPlugin> = new Map();
  private initialized = false;

  /**
   * Register a plugin
   */
  registerPlugin(plugin: PMPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Initialize all plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize each plugin
    for (const plugin of this.plugins.values()) {
      await plugin.initialize();
    }

    this.initialized = true;
  }

  /**
   * Get a specific plugin
   */
  getPlugin(provider: ProviderType): PMPlugin | undefined {
    return this.plugins.get(provider);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): PMPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all connected (authenticated) plugins
   */
  async getConnectedPlugins(): Promise<PMPlugin[]> {
    const connected: PMPlugin[] = [];

    for (const plugin of this.plugins.values()) {
      if (await plugin.isAuthenticated()) {
        connected.push(plugin);
      }
    }

    return connected;
  }

  /**
   * Get provider info for all plugins
   */
  async getProvidersInfo(): Promise<ProviderInfo[]> {
    const info: ProviderInfo[] = [];

    for (const plugin of this.plugins.values()) {
      info.push(await plugin.getInfo());
    }

    return info;
  }

  /**
   * Aggregate tasks from multiple providers
   */
  async aggregateTasks(
    operation: 'assigned' | 'overdue',
    options?: { source?: ProviderType; limit?: number; refresh?: boolean }
  ): Promise<Task[]> {
    let plugins: PMPlugin[];

    if (options?.source) {
      const plugin = this.getPlugin(options.source);
      if (!plugin) throw new PMCliError({ message: `Unknown provider: ${options.source}`, reason: 'The provider is not registered.', suggestion: 'Use `pm providers` to list available providers.' });
      if (!(await plugin.isAuthenticated())) {
        throw new NotConnectedError(options.source);
      }
      plugins = [plugin];
    } else {
      plugins = await this.getConnectedPlugins();
      if (plugins.length === 0) {
        throw new PMCliError({ message: 'No providers connected', reason: 'No active provider sessions were found.', suggestion: 'Run: pm connect <provider>' });
      }
    }

    const queryOptions = {
      limit: options?.limit,
      refresh: options?.refresh,
    };

    const results = await Promise.all(
      plugins.map(async (plugin) => {
        try {
          if (operation === 'assigned') {
            return await plugin.getAssignedTasks(queryOptions);
          } else {
            return await plugin.getOverdueTasks(queryOptions);
          }
        } catch (error) {
          const providerError = new ProviderError(plugin.name, `Failed to fetch ${operation} tasks`, error instanceof Error ? error : undefined, {
            reason: error instanceof Error ? error.message : 'Unknown API error.',
            suggestion: `Retry with --refresh or reconnect using \`pm connect ${plugin.name}\`.`,
          });

          console.warn(formatError(providerError));
          return [];
        }
      })
    );

    // Flatten and sort by due date
    const allTasks = dedupeTasks(results.flat());
    allTasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    return options?.limit ? allTasks.slice(0, options.limit) : allTasks;
  }

  /**
   * Search tasks across providers
   */
  async searchTasks(
    query: string,
    options?: { source?: ProviderType; limit?: number }
  ): Promise<Task[]> {
    let plugins: PMPlugin[];

    if (options?.source) {
      const plugin = this.getPlugin(options.source);
      if (!plugin) throw new PMCliError({ message: `Unknown provider: ${options.source}`, reason: 'The provider is not registered.', suggestion: 'Use `pm providers` to list available providers.' });
      plugins = [plugin];
    } else {
      plugins = await this.getConnectedPlugins();
    }

    const results = await Promise.all(
      plugins.map((plugin) => plugin.searchTasks(query, { limit: options?.limit }))
    );

    const allTasks = dedupeTasks(results.flat());
    return options?.limit ? allTasks.slice(0, options.limit) : allTasks;
  }

  /**
   * Create a task in a specific provider
   */
  async createTask(
    source: ProviderType,
    input: CreateTaskInput
  ): Promise<Task> {
    const plugin = this.getPlugin(source);
    if (!plugin) throw new PMCliError({ message: `Unknown provider: ${source}`, reason: 'The provider is not registered.', suggestion: 'Use `pm providers` to list available providers.' });
    if (!(await plugin.isAuthenticated())) {
      throw new NotConnectedError(source);
    }
    return plugin.createTask(input);
  }

  /**
   * Update a task (provider determined from task ID)
   */
  async updateTask(
    taskId: string,
    updates: UpdateTaskInput
  ): Promise<Task> {
    const parsed = parseTaskId(taskId);
    if (!parsed) throw new PMCliError({ message: `Invalid task ID format: ${taskId}`, reason: 'Task IDs must look like ASANA-123 or NOTION-abc.', suggestion: 'Copy an ID from `pm tasks assigned --ids-only` and try again.' });

    const plugin = this.getPlugin(parsed.source);
    if (!plugin) throw new PMCliError({ message: `Unknown provider: ${parsed.source}`, reason: 'The provider is not registered.', suggestion: 'Use `pm providers` to list available providers.' });
    if (!(await plugin.isAuthenticated())) {
      throw new NotConnectedError(parsed.source);
    }
    return plugin.updateTask(parsed.externalId, updates);
  }

  /**
   * Complete one or more tasks
   */
  async completeTasks(taskIds: string[]): Promise<{ id: string; task?: Task; error?: string }[]> {
    const results: { id: string; task?: Task; error?: string }[] = [];

    for (const taskId of taskIds) {
      try {
        const parsed = parseTaskId(taskId);
        if (!parsed) {
          results.push({ id: taskId, error: `Invalid task ID format: ${taskId}` });
          continue;
        }

        const plugin = this.getPlugin(parsed.source);
        if (!plugin) {
          results.push({ id: taskId, error: `Unknown provider: ${parsed.source}` });
          continue;
        }
        if (!(await plugin.isAuthenticated())) {
          results.push({ id: taskId, error: `Not connected to ${parsed.source}` });
          continue;
        }

        const task = await plugin.completeTask(parsed.externalId);
        results.push({ id: taskId, task });
      } catch (error) {
        results.push({ id: taskId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return results;
  }

  /**
   * Delete one or more tasks
   */
  async deleteTasks(taskIds: string[]): Promise<{ id: string; error?: string }[]> {
    const results: { id: string; error?: string }[] = [];

    for (const taskId of taskIds) {
      try {
        const parsed = parseTaskId(taskId);
        if (!parsed) {
          results.push({ id: taskId, error: `Invalid task ID format: ${taskId}` });
          continue;
        }

        const plugin = this.getPlugin(parsed.source);
        if (!plugin) {
          results.push({ id: taskId, error: `Unknown provider: ${parsed.source}` });
          continue;
        }
        if (!(await plugin.isAuthenticated())) {
          results.push({ id: taskId, error: `Not connected to ${parsed.source}` });
          continue;
        }

        await plugin.deleteTask(parsed.externalId);
        results.push({ id: taskId });
      } catch (error) {
        results.push({ id: taskId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return results;
  }

  /**
   * Fetch thread entries for a task (provider determined from task ID)
   */
  async getTaskThread(taskId: string): Promise<ThreadEntry[]> {
    const parsed = parseTaskId(taskId);
    if (!parsed) throw new PMCliError({ message: `Invalid task ID format: ${taskId}`, reason: 'Task IDs must look like ASANA-123 or NOTION-abc.', suggestion: 'Copy an ID from `pm tasks assigned --ids-only` and try again.' });

    const plugin = this.getPlugin(parsed.source);
    if (!plugin) throw new PMCliError({ message: `Unknown provider: ${parsed.source}`, reason: 'The provider is not registered.', suggestion: 'Use `pm providers` to list available providers.' });
    if (!(await plugin.isAuthenticated())) {
      throw new NotConnectedError(parsed.source);
    }
    if (!plugin.getTaskThread) {
      throw new PMCliError({
        message: `${parsed.source} does not support task threads`,
        reason: 'The plugin does not implement this feature.',
        suggestion: 'Use `pm providers` to list available providers and their capabilities.',
      });
    }

    return plugin.getTaskThread(parsed.externalId);
  }

  /**
   * Add a comment to a task (provider determined from task ID)
   */
  async addComment(taskId: string, body: string): Promise<void> {
    const parsed = parseTaskId(taskId);
    if (!parsed) throw new PMCliError({ message: `Invalid task ID format: ${taskId}`, reason: 'Task IDs must look like ASANA-123 or NOTION-abc.', suggestion: 'Copy an ID from `pm tasks assigned --ids-only` and try again.' });

    const plugin = this.getPlugin(parsed.source);
    if (!plugin) throw new PMCliError({ message: `Unknown provider: ${parsed.source}`, reason: 'The provider is not registered.', suggestion: 'Use `pm providers` to list available providers.' });
    if (!(await plugin.isAuthenticated())) {
      throw new NotConnectedError(parsed.source);
    }
    if (!plugin.addComment) {
      throw new Error(`${parsed.source} does not support comments`);
    }
    await plugin.addComment(parsed.externalId, body);
  }
}

// Export singleton instance
export const pluginManager = new PluginManager();
