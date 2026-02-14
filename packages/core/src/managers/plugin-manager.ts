// src/managers/plugin-manager.ts

import type { PMPlugin, ProviderInfo, CreateTaskInput, UpdateTaskInput } from '../models/plugin.js';
import type { Task, ProviderType } from '../models/task.js';
import { parseTaskId } from '../models/task.js';

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
      if (!plugin) throw new Error(`Unknown provider: ${options.source}`);
      if (!(await plugin.isAuthenticated())) {
        throw new Error(`Not connected to ${options.source}. Run: pm connect ${options.source}`);
      }
      plugins = [plugin];
    } else {
      plugins = await this.getConnectedPlugins();
      if (plugins.length === 0) {
        throw new Error('No providers connected. Run: pm connect <provider>');
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
          console.error(`Error fetching from ${plugin.name}:`, error);
          return [];
        }
      })
    );

    // Flatten and sort by due date
    const allTasks = results.flat();
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
      if (!plugin) throw new Error(`Unknown provider: ${options.source}`);
      plugins = [plugin];
    } else {
      plugins = await this.getConnectedPlugins();
    }

    const results = await Promise.all(
      plugins.map((plugin) => plugin.searchTasks(query, { limit: options?.limit }))
    );

    const allTasks = results.flat();
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
    if (!plugin) throw new Error(`Unknown provider: ${source}`);
    if (!(await plugin.isAuthenticated())) {
      throw new Error(`Not connected to ${source}. Run: pm connect ${source}`);
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
    if (!parsed) throw new Error(`Invalid task ID format: ${taskId}`);

    const plugin = this.getPlugin(parsed.source);
    if (!plugin) throw new Error(`Unknown provider: ${parsed.source}`);
    if (!(await plugin.isAuthenticated())) {
      throw new Error(`Not connected to ${parsed.source}. Run: pm connect ${parsed.source}`);
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
}

// Export singleton instance
export const pluginManager = new PluginManager();
