import { pluginManager } from '../managers/plugin-manager.js';
import type { PMPluginBase, CreateTaskInput, UpdateTaskInput } from '../models/plugin.js';
import type { ProviderType, Task } from '../models/task.js';
import { BulkOperationError, PMCliError } from '../utils/errors.js';
import type { BulkMutationItem, BulkMutationResult, MutationResult } from './shared/result.js';

export interface CreateTasksCommandInput {
  source?: ProviderType;
  inputs: CreateTaskInput[];
}

type TaskMutationPluginManager = Pick<
  typeof pluginManager,
  'initialize' | 'getConnectedPlugins' | 'createTask' | 'updateTask' | 'addComment' | 'completeTasks' | 'deleteTasks'
>;

type CompleteTaskManagerResult = { id: string; task?: Task; error?: string };
type DeleteTaskManagerResult = { id: string; error?: string };

function normalizeCompleteResults(results: CompleteTaskManagerResult[]): BulkMutationResult<Task> {
  return {
    items: results.map((result): BulkMutationItem<Task> => ({
      id: result.id,
      data: result.task,
      error: result.error,
    })),
    warnings: [],
  };
}

function normalizeDeleteResults(results: DeleteTaskManagerResult[]): BulkMutationResult<void> {
  return {
    items: results.map((result): BulkMutationItem<void> => ({
      id: result.id,
      error: result.error,
    })),
    warnings: [],
  };
}

export class TaskMutationService {
  constructor(private readonly manager: TaskMutationPluginManager = pluginManager) {}

  async createTasks(input: CreateTasksCommandInput): Promise<MutationResult<Task[]>> {
    await this.manager.initialize();
    const source = await this.resolveCreateSource(input.source);

    const tasks: Task[] = [];
    for (const item of input.inputs) {
      tasks.push(await this.manager.createTask(source, item));
    }

    return {
      data: tasks,
      warnings: [],
    };
  }

  async updateTask(taskId: string, input: UpdateTaskInput): Promise<MutationResult<Task>> {
    await this.manager.initialize();

    return {
      data: await this.manager.updateTask(taskId, input),
      warnings: [],
    };
  }

  async addComment(taskId: string, body: string): Promise<MutationResult<void>> {
    await this.manager.initialize();
    await this.manager.addComment(taskId, body);

    return {
      data: undefined,
      warnings: [],
    };
  }

  async completeTasks(taskIds: string[]): Promise<BulkMutationResult<Task>> {
    await this.manager.initialize();

    try {
      return normalizeCompleteResults(await this.manager.completeTasks(taskIds));
    } catch (error) {
      if (error instanceof BulkOperationError) {
        return normalizeCompleteResults(error.results as CompleteTaskManagerResult[]);
      }
      throw error;
    }
  }

  async deleteTasks(taskIds: string[]): Promise<BulkMutationResult<void>> {
    await this.manager.initialize();

    try {
      return normalizeDeleteResults(await this.manager.deleteTasks(taskIds));
    } catch (error) {
      if (error instanceof BulkOperationError) {
        return normalizeDeleteResults(error.results as DeleteTaskManagerResult[]);
      }
      throw error;
    }
  }

  async resolveCreateSource(explicitSource?: ProviderType): Promise<ProviderType> {
    await this.manager.initialize();

    if (explicitSource) {
      return explicitSource;
    }

    const connected = await this.manager.getConnectedPlugins();
    if (connected.length === 0) {
      throw new PMCliError({
        message: 'No providers connected. Run: pm connect <provider>',
      });
    }

    if (connected.length > 1) {
      throw new PMCliError({
        message: 'Multiple providers connected. Use --source to specify which one.',
      });
    }

    return connected[0].name;
  }
}

export const taskMutationService = new TaskMutationService();
