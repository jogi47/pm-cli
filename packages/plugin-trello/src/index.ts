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
import { trelloClient } from './client.js';
import { mapTrelloCard, mapTrelloCards } from './mapper.js';

export class TrelloPlugin implements PMPlugin {
  readonly name: ProviderType = 'trello';
  readonly displayName = 'Trello';

  async initialize(): Promise<void> {
    await trelloClient.initialize();
  }

  async isAuthenticated(): Promise<boolean> {
    return trelloClient.isConnected();
  }

  async authenticate(credentials: ProviderCredentials): Promise<void> {
    const apiKey = credentials.apiKey;
    if (!apiKey) throw new Error('Trello API key is required');
    await trelloClient.connect(apiKey, credentials.token);
  }

  async disconnect(): Promise<void> {
    trelloClient.disconnect();
    await cacheManager.invalidateProvider('trello');
  }

  async getInfo(): Promise<ProviderInfo> {
    const user = trelloClient.getCurrentUser();
    return {
      name: this.name,
      displayName: this.displayName,
      connected: trelloClient.isConnected(),
      workspace: 'Trello Workspace',
      userName: user?.fullName,
      userEmail: user?.username,
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      await trelloClient.initialize();
      return trelloClient.isConnected();
    } catch {
      return false;
    }
  }

  async getAssignedTasks(options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('assigned', 'trello');
      if (cached) return cached;
    }

    const cards = await trelloClient.getMyCards(options?.limit ?? 50);
    let tasks = mapTrelloCards(cards);
    if (!options?.includeCompleted) tasks = tasks.filter((t) => t.status !== 'done');

    await cacheManager.setTasks('assigned', 'trello', tasks);
    return tasks;
  }

  async getOverdueTasks(options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('overdue', 'trello');
      if (cached) return cached;
    }

    const cards = await trelloClient.getMyCards(options?.limit ?? 100);
    let tasks = mapTrelloCards(cards).filter((t) => t.status !== 'done' && isOverdue(t.dueDate));
    if (options?.limit) tasks = tasks.slice(0, options.limit);

    await cacheManager.setTasks('overdue', 'trello', tasks);
    return tasks;
  }

  async searchTasks(query: string, options?: TaskQueryOptions): Promise<Task[]> {
    if (!options?.refresh) {
      const cached = await cacheManager.getTasks('search', 'trello', query);
      if (cached) return cached;
    }

    const cards = await trelloClient.searchCards(query, options?.limit ?? 25);
    let tasks = mapTrelloCards(cards);
    if (!options?.includeCompleted) tasks = tasks.filter((t) => t.status !== 'done');

    await cacheManager.setTasks('search', 'trello', tasks, query);
    return tasks;
  }

  async getTask(externalId: string): Promise<Task | null> {
    const taskId = `TRELLO-${externalId}`;
    const cached = await cacheManager.getTaskDetail(taskId);
    if (cached) return cached;

    const card = await trelloClient.getCard(externalId);
    if (!card) return null;

    const task = mapTrelloCard(card);
    await cacheManager.setTaskDetail(task);
    return task;
  }

  getTaskUrl(externalId: string): string {
    return `https://trello.com/c/${externalId}`;
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const card = await trelloClient.createCard({
      name: input.title,
      desc: input.description,
      due: input.dueDate?.toISOString(),
      idList: input.sectionId || input.projectId,
    });
    await cacheManager.invalidateProvider('trello');
    return mapTrelloCard(card);
  }

  async updateTask(externalId: string, updates: UpdateTaskInput): Promise<Task> {
    const card = await trelloClient.updateCard(externalId, {
      name: updates.title,
      desc: updates.description,
      due: updates.dueDate === undefined ? undefined : updates.dueDate ? updates.dueDate.toISOString() : null,
      closed: updates.status ? updates.status === 'done' : undefined,
    });
    await cacheManager.invalidateProvider('trello');
    return mapTrelloCard(card);
  }

  async completeTask(externalId: string): Promise<Task> {
    return this.updateTask(externalId, { status: 'done' });
  }

  async deleteTask(externalId: string): Promise<void> {
    await trelloClient.deleteCard(externalId);
    await cacheManager.invalidateProvider('trello');
  }

  async addComment(externalId: string, body: string): Promise<void> {
    await trelloClient.addComment(externalId, body);
  }
}
