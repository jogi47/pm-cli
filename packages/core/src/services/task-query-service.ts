import { filterAndSortTasks, pluginManager, type FilterSortOptions } from '../managers/plugin-manager.js';
import type { TaskStatus, ProviderType } from '../models/task.js';
import { type QueryTasksResult } from './shared/result.js';
import { providerErrorsToWarnings } from './shared/warnings.js';

export interface TaskQueryInput {
  source?: ProviderType;
  displayLimit?: number;
  refresh?: boolean;
  status?: TaskStatus;
  priority?: string[];
  sort?: FilterSortOptions['sort'];
}

export interface SearchTasksInput extends TaskQueryInput {
  query: string;
}

type TaskQueryPluginManager = Pick<typeof pluginManager, 'initialize' | 'aggregateTasks' | 'searchTasks'>;

function getFetchLimit(displayLimit?: number): number | undefined {
  if (displayLimit === undefined) {
    return undefined;
  }

  return Math.max(displayLimit * 3, 100);
}

function applyDisplayLimit<T>(items: T[], displayLimit?: number): T[] {
  if (displayLimit === undefined) {
    return items;
  }

  return items.slice(0, displayLimit);
}

function toFilterSortOptions(input: TaskQueryInput): FilterSortOptions | undefined {
  const options: FilterSortOptions = {};

  if (input.status) options.status = input.status;
  if (input.priority && input.priority.length > 0) options.priority = input.priority;
  if (input.sort) options.sort = input.sort;

  return options.status || options.priority || options.sort ? options : undefined;
}

export class TaskQueryService {
  constructor(private readonly manager: TaskQueryPluginManager = pluginManager) {}

  async getAssignedTasks(input: TaskQueryInput = {}): Promise<QueryTasksResult> {
    await this.manager.initialize();

    const result = await this.manager.aggregateTasks('assigned', {
      source: input.source,
      fetchLimit: getFetchLimit(input.displayLimit),
      refresh: input.refresh,
    });

    return {
      tasks: this.finalizeTasks(result.tasks, input),
      warnings: providerErrorsToWarnings(result.errors),
    };
  }

  async getOverdueTasks(input: TaskQueryInput = {}): Promise<QueryTasksResult> {
    await this.manager.initialize();

    const result = await this.manager.aggregateTasks('overdue', {
      source: input.source,
      fetchLimit: getFetchLimit(input.displayLimit),
      refresh: input.refresh,
    });

    return {
      tasks: this.finalizeTasks(result.tasks, input),
      warnings: providerErrorsToWarnings(result.errors),
    };
  }

  async searchTasks(input: SearchTasksInput): Promise<QueryTasksResult> {
    await this.manager.initialize();

    const result = await this.manager.searchTasks(input.query, {
      source: input.source,
      fetchLimit: getFetchLimit(input.displayLimit),
    });

    return {
      tasks: this.finalizeTasks(result.tasks, input),
      warnings: providerErrorsToWarnings(result.errors),
    };
  }

  private finalizeTasks(tasks: QueryTasksResult['tasks'], input: TaskQueryInput): QueryTasksResult['tasks'] {
    const filterOptions = toFilterSortOptions(input);
    const filteredTasks = filterOptions ? filterAndSortTasks(tasks, filterOptions) : tasks;
    return applyDisplayLimit(filteredTasks, input.displayLimit);
  }
}

export const taskQueryService = new TaskQueryService();
