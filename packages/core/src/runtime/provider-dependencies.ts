import type { ProviderCredentials } from '../models/plugin.js';
import type { ProviderType, Task } from '../models/task.js';
import { authManager } from '../managers/auth-manager.js';
import { cacheManager } from '../managers/cache-manager.js';

type TaskListOperation = 'assigned' | 'overdue' | 'search';

export interface ProviderAuthStore {
  getCredentials(provider: ProviderType): ProviderCredentials | null;
  setCredentials(provider: ProviderType, credentials: ProviderCredentials, options?: { expiresIn?: number }): void;
  removeCredentials(provider: ProviderType): void;
}

export interface ProviderTaskCache {
  getTasks(operation: TaskListOperation, provider: ProviderType, extra?: string): Promise<Task[] | null>;
  setTasks(operation: TaskListOperation, provider: ProviderType, tasks: Task[], extra?: string, ttl?: number): Promise<void>;
  getTaskDetail(taskId: string): Promise<Task | null>;
  setTaskDetail(task: Task, ttl?: number): Promise<void>;
  invalidateProvider(provider: ProviderType): Promise<void>;
}

export const defaultProviderAuthStore: ProviderAuthStore = authManager;
export const defaultProviderTaskCache: ProviderTaskCache = cacheManager;
