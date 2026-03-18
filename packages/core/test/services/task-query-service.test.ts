import { describe, expect, it, vi } from 'vitest';
import { ProviderError } from '../../src/utils/errors.js';
import { TaskQueryService } from '../../src/services/task-query-service.js';
import type { Task } from '../../src/models/task.js';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'ASANA-1',
    externalId: '1',
    title: 'Task',
    status: 'todo',
    source: 'asana',
    url: 'https://example.com/1',
    ...overrides,
  };
}

describe('TaskQueryService', () => {
  it('initializes plugins, inflates fetch limits, filters, sorts, and limits assigned tasks', async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      aggregateTasks: vi.fn().mockResolvedValue({
        tasks: [
          task({ id: 'ASANA-2', title: 'Bravo', status: 'todo' }),
          task({ id: 'ASANA-1', title: 'Alpha', status: 'todo' }),
          task({ id: 'ASANA-3', title: 'Done', status: 'done' }),
        ],
        errors: [new ProviderError('asana', 'failed to fetch assigned tasks')],
      }),
      searchTasks: vi.fn(),
    };

    const service = new TaskQueryService(manager);
    const result = await service.getAssignedTasks({
      source: 'asana',
      displayLimit: 1,
      refresh: true,
      status: 'todo',
      sort: 'title',
    });

    expect(manager.initialize).toHaveBeenCalled();
    expect(manager.aggregateTasks).toHaveBeenCalledWith('assigned', {
      source: 'asana',
      fetchLimit: 100,
      refresh: true,
    });
    expect(result.tasks.map((item) => item.id)).toEqual(['ASANA-1']);
    expect(result.warnings).toEqual(['[asana] failed to fetch assigned tasks']);
  });

  it('queries search results and keeps the full set when no display limit is provided', async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      aggregateTasks: vi.fn(),
      searchTasks: vi.fn().mockResolvedValue({
        tasks: [
          task({ id: 'ASANA-3', title: 'Charlie' }),
          task({ id: 'ASANA-2', title: 'Bravo' }),
          task({ id: 'ASANA-1', title: 'Alpha' }),
        ],
        errors: [],
      }),
    };

    const service = new TaskQueryService(manager);
    const result = await service.searchTasks({
      query: 'bug',
      sort: 'title',
    });

    expect(manager.initialize).toHaveBeenCalled();
    expect(manager.searchTasks).toHaveBeenCalledWith('bug', {
      source: undefined,
      fetchLimit: undefined,
    });
    expect(result.tasks.map((item) => item.id)).toEqual(['ASANA-1', 'ASANA-2', 'ASANA-3']);
    expect(result.warnings).toEqual([]);
  });
});
