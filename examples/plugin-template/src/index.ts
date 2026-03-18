import type {
  CreateTaskInput,
  PMPluginBase,
  ProviderCredentials,
  ProviderInfo,
  ProviderType,
  Task,
  UpdateTaskInput,
} from 'pm-cli-core';

export class TemplatePlugin implements PMPluginBase {
  readonly name: ProviderType = 'asana'; // replace with your provider
  readonly displayName = 'Template Provider';
  readonly capabilities = {
    comments: false,
    thread: false,
    attachmentDownload: false,
    workspaces: false,
    customFields: false,
    projectPlacement: false,
  };

  async initialize(): Promise<void> {}
  async authenticate(_credentials: ProviderCredentials): Promise<void> {}
  async disconnect(): Promise<void> {}
  async isAuthenticated(): Promise<boolean> { return false; }
  async validateConnection(): Promise<boolean> { return false; }
  async getInfo(): Promise<ProviderInfo> {
    return { name: this.name, displayName: this.displayName, connected: false, capabilities: this.capabilities };
  }

  async getAssignedTasks(): Promise<Task[]> { return []; }
  async getOverdueTasks(): Promise<Task[]> { return []; }
  async searchTasks(): Promise<Task[]> { return []; }
  async getTask(): Promise<Task | null> { return null; }
  getTaskUrl(externalId: string): string { return `https://example.com/tasks/${externalId}`; }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const context = input.context;
    const providerOptions = input.providerOptions;
    void context;
    void providerOptions;
    throw new Error('Not implemented');
  }

  async updateTask(_id: string, updates: UpdateTaskInput): Promise<Task> {
    const context = updates.context;
    const providerOptions = updates.providerOptions;
    void context;
    void providerOptions;
    throw new Error('Not implemented');
  }

  async completeTask(_id: string): Promise<Task> { throw new Error('Not implemented'); }
  async deleteTask(_id: string): Promise<void> {}
}
