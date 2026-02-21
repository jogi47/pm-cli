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
import { linearClient } from './client.js';
import { mapLinearIssue, mapLinearIssues } from './mapper.js';

function statusToLinearState(status: UpdateTaskInput['status']): 'unstarted' | 'started' | 'completed' | undefined {
  if (!status) return undefined;
  if (status === 'todo') return 'unstarted';
  if (status === 'in_progress') return 'started';
  return 'completed';
}

export class LinearPlugin implements PMPlugin {
  readonly name: ProviderType = 'linear';
  readonly displayName = 'Linear';

  async initialize(): Promise<void> {
    await linearClient.initialize();
  }

  async isAuthenticated(): Promise<boolean> {
    return linearClient.isConnected();
  }

  async authenticate(credentials: ProviderCredentials): Promise<void> {
    await linearClient.connect(credentials.token);
  }

  async disconnect(): Promise<void> {
    linearClient.disconnect();
    await cacheManager.invalidateProvider('linear');
  }

  async getInfo(): Promise<ProviderInfo> {
    const user = linearClient.getUser();
    return {
      name: this.name,
      displayName: this.displayName,
      connected: linearClient.isConnected(),
      workspace: 'Linear Workspace',
      userName: user?.name || undefined,
      userEmail: user?.email || undefined,
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      await linearClient.initialize();
      return linearClient.isConnected();
    } catch {
      return false;
    }
  }

  async getAssignedTasks(options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('assigned', 'linear');
      if (cached) return cached;
    }

    let tasks = mapLinearIssues(await linearClient.getAssignedIssues(options?.limit ?? 50));
    if (!options?.includeCompleted) tasks = tasks.filter((task) => task.status !== 'done');

    await cacheManager.setTasks('assigned', 'linear', tasks);
    return tasks;
  }

  async getOverdueTasks(options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('overdue', 'linear');
      if (cached) return cached;
    }

    let tasks = mapLinearIssues(await linearClient.getAssignedIssues(options?.limit ?? 100));
    tasks = tasks.filter((task) => task.status !== 'done' && isOverdue(task.dueDate));
    if (options?.limit) tasks = tasks.slice(0, options.limit);

    await cacheManager.setTasks('overdue', 'linear', tasks);
    return tasks;
  }

  async searchTasks(query: string, options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('search', 'linear', query);
      if (cached) return cached;
    }

    let tasks = mapLinearIssues(await linearClient.searchIssues(query, options?.limit ?? 25));
    if (!options?.includeCompleted) tasks = tasks.filter((task) => task.status !== 'done');

    await cacheManager.setTasks('search', 'linear', tasks, query);
    return tasks;
  }

  async getTask(externalId: string): Promise<Task | null> {
    const taskId = `LINEAR-${externalId}`;
    const cached = await cacheManager.getTaskDetail(taskId);
    if (cached) return cached;

    const issue = await linearClient.getIssue(externalId);
    if (!issue) return null;

    const task = mapLinearIssue(issue);
    await cacheManager.setTaskDetail(task);
    return task;
  }

  getTaskUrl(externalId: string): string {
    return `https://linear.app/issue/${externalId}`;
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const issue = await linearClient.createIssue({
      title: input.title,
      description: input.description,
      dueDate: input.dueDate?.toISOString().split('T')[0],
    });
    await cacheManager.invalidateProvider('linear');
    return mapLinearIssue(issue);
  }

  async updateTask(externalId: string, updates: UpdateTaskInput): Promise<Task> {
    const issue = await linearClient.updateIssue(externalId, {
      title: updates.title,
      description: updates.description,
      dueDate: updates.dueDate === undefined ? undefined : updates.dueDate ? updates.dueDate.toISOString().split('T')[0] : null,
      stateType: statusToLinearState(updates.status),
    });
    await cacheManager.invalidateProvider('linear');
    return mapLinearIssue(issue);
  }

  async completeTask(externalId: string): Promise<Task> {
    return this.updateTask(externalId, { status: 'done' });
  }

  async deleteTask(externalId: string): Promise<void> {
    await linearClient.deleteIssue(externalId);
    await cacheManager.invalidateProvider('linear');
  }

  async addComment(externalId: string, body: string): Promise<void> {
    await linearClient.addComment(externalId, body);
  }
}
