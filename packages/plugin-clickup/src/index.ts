import type {
  PMPlugin,
  ProviderCredentials,
  ProviderInfo,
  ProviderType,
  Task,
  TaskQueryOptions,
  CreateTaskInput,
  UpdateTaskInput,
} from '@jogi47/pm-cli-core';
import { cacheManager, isOverdue } from '@jogi47/pm-cli-core';
import { clickupClient } from './client.js';
import { mapClickUpTask, mapClickUpTasks } from './mapper.js';

function statusToClickUpStatus(status: UpdateTaskInput['status']): string | undefined {
  if (!status) return undefined;
  if (status === 'todo') return 'open';
  if (status === 'in_progress') return 'active';
  return 'done';
}


export class ClickUpPlugin implements PMPlugin {
  readonly name: ProviderType = 'clickup';
  readonly displayName = 'ClickUp';

  async initialize(): Promise<void> {
    await clickupClient.initialize();
  }

  async isAuthenticated(): Promise<boolean> {
    return clickupClient.isConnected();
  }

  async authenticate(credentials: ProviderCredentials): Promise<void> {
    await clickupClient.connect(credentials.token);
  }

  async disconnect(): Promise<void> {
    clickupClient.disconnect();
    await cacheManager.invalidateProvider('clickup');
  }

  async getInfo(): Promise<ProviderInfo> {
    const user = clickupClient.getUser();
    const workspace = clickupClient.getWorkspace();

    return {
      name: this.name,
      displayName: this.displayName,
      connected: clickupClient.isConnected(),
      workspace: workspace?.name,
      userName: user?.username,
      userEmail: user?.email,
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      await clickupClient.initialize();
      return clickupClient.isConnected();
    } catch {
      return false;
    }
  }

  async getAssignedTasks(options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('assigned', 'clickup');
      if (cached) return cached;
    }

    let tasks = mapClickUpTasks(await clickupClient.getAssignedTasks(options?.limit ?? 50));
    if (!options?.includeCompleted) {
      tasks = tasks.filter(task => task.status !== 'done');
    }

    await cacheManager.setTasks('assigned', 'clickup', tasks);
    return tasks;
  }

  async getOverdueTasks(options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('overdue', 'clickup');
      if (cached) return cached;
    }

    let tasks = mapClickUpTasks(await clickupClient.getAssignedTasks(options?.limit ?? 100));
    tasks = tasks.filter(task => task.status !== 'done' && isOverdue(task.dueDate));
    if (options?.limit) tasks = tasks.slice(0, options.limit);

    await cacheManager.setTasks('overdue', 'clickup', tasks);
    return tasks;
  }

  async searchTasks(query: string, options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('search', 'clickup', query);
      if (cached) return cached;
    }

    let tasks = mapClickUpTasks(await clickupClient.searchTasks(query, options?.limit ?? 25));
    if (!options?.includeCompleted) {
      tasks = tasks.filter(task => task.status !== 'done');
    }

    await cacheManager.setTasks('search', 'clickup', tasks, query);
    return tasks;
  }

  async getTask(externalId: string): Promise<Task | null> {
    const taskId = `CLICKUP-${externalId}`;
    const cached = await cacheManager.getTaskDetail(taskId);
    if (cached) return cached;

    const clickupTask = await clickupClient.getTask(externalId);
    if (!clickupTask) return null;

    const task = mapClickUpTask(clickupTask);
    await cacheManager.setTaskDetail(task);
    return task;
  }

  getTaskUrl(externalId: string): string {
    return `https://app.clickup.com/t/${externalId}`;
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const clickupTask = await clickupClient.createTask({
      title: input.title,
      description: input.description,
      dueDate: input.dueDate?.getTime(),
      listId: input.sectionId || input.projectId,
    });

    await cacheManager.invalidateProvider('clickup');
    return mapClickUpTask(clickupTask);
  }

  async updateTask(externalId: string, updates: UpdateTaskInput): Promise<Task> {
    const clickupTask = await clickupClient.updateTask(externalId, {
      title: updates.title,
      description: updates.description,
      dueDate: updates.dueDate === undefined ? undefined : updates.dueDate ? updates.dueDate.getTime() : null,
      status: statusToClickUpStatus(updates.status),
    });

    await cacheManager.invalidateProvider('clickup');
    return mapClickUpTask(clickupTask);
  }

  async completeTask(externalId: string): Promise<Task> {
    return this.updateTask(externalId, { status: 'done' });
  }

  async deleteTask(externalId: string): Promise<void> {
    await clickupClient.deleteTask(externalId);
    await cacheManager.invalidateProvider('clickup');
  }

  async addComment(externalId: string, body: string): Promise<void> {
    await clickupClient.addComment(externalId, body);
  }
}
