import type { Task } from '../../models/task.js';

export interface QueryTasksResult {
  tasks: Task[];
  warnings: string[];
}

export interface GetTaskResult {
  task: Task | null;
  warnings: string[];
}

export interface MutationResult<T> {
  data: T;
  warnings: string[];
}

export interface BulkMutationItem<T> {
  id: string;
  data?: T;
  error?: string;
}

export interface BulkMutationResult<T> {
  items: BulkMutationItem<T>[];
  warnings: string[];
}
