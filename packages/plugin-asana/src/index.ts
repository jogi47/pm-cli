// src/index.ts

import type { PMPlugin, ProviderInfo, ProviderCredentials, TaskQueryOptions, Task, ProviderType, Workspace } from '@pm-cli/core';
import { cacheManager } from '@pm-cli/core';
import { asanaClient } from './client.js';
import { mapAsanaTask, mapAsanaTasks } from './mapper.js';

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
}

// Re-export for convenience
export { asanaClient } from './client.js';
export { mapAsanaTask, mapAsanaTasks } from './mapper.js';
