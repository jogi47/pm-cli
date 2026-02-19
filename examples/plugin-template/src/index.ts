import type { PMPlugin, ProviderCredentials, ProviderInfo, Task, CreateTaskInput, UpdateTaskInput } from '@jogi47/pm-cli-core';

export class TemplatePlugin implements PMPlugin {
  name = 'asana';
  displayName = 'Template Provider';

  async initialize(): Promise<void> {}
  async authenticate(_credentials: ProviderCredentials): Promise<void> {}
  async disconnect(): Promise<void> {}
  async isAuthenticated(): Promise<boolean> { return false; }
  async getInfo(): Promise<ProviderInfo> {
    return { name: this.name, displayName: this.displayName, connected: false };
  }

  async getAssignedTasks(): Promise<Task[]> { return []; }
  async getOverdueTasks(): Promise<Task[]> { return []; }
  async searchTasks(): Promise<Task[]> { return []; }
  async getTask(): Promise<Task | null> { return null; }
  async createTask(_input: CreateTaskInput): Promise<Task> { throw new Error('Not implemented'); }
  async updateTask(_id: string, _updates: UpdateTaskInput): Promise<Task> { throw new Error('Not implemented'); }
  async completeTask(_id: string): Promise<Task> { throw new Error('Not implemented'); }
  async deleteTask(_id: string): Promise<void> {}
  async addComment(_id: string, _body: string): Promise<void> {}
}
