import { describe, expect, it, vi } from 'vitest';
import { PMCliError } from '../../src/utils/errors.js';
import { BulkOperationError } from '../../src/utils/errors.js';
import { TaskMutationService } from '../../src/services/task-mutation-service.js';
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

describe('TaskMutationService', () => {
  it('selects the only connected provider for create when source is omitted', async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getConnectedPlugins: vi.fn().mockResolvedValue([{ name: 'asana' }]),
      createTask: vi.fn().mockResolvedValue(task()),
      updateTask: vi.fn(),
      addComment: vi.fn(),
      completeTasks: vi.fn(),
      deleteTasks: vi.fn(),
    };

    const service = new TaskMutationService(manager);
    const result = await service.createTasks({
      inputs: [{ title: 'New task' }],
    });

    expect(manager.getConnectedPlugins).toHaveBeenCalled();
    expect(manager.createTask).toHaveBeenCalledWith('asana', { title: 'New task' });
    expect(result.data).toHaveLength(1);
  });

  it('rejects ambiguous provider selection for create', async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getConnectedPlugins: vi.fn().mockResolvedValue([{ name: 'asana' }, { name: 'linear' }]),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      addComment: vi.fn(),
      completeTasks: vi.fn(),
      deleteTasks: vi.fn(),
    };

    const service = new TaskMutationService(manager);

    await expect(service.createTasks({
      inputs: [{ title: 'New task' }],
    })).rejects.toMatchObject({
      message: 'Multiple providers connected. Use --source to specify which one.',
    });
  });

  it('normalizes bulk completion errors into stable items', async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getConnectedPlugins: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      addComment: vi.fn(),
      completeTasks: vi.fn().mockRejectedValue(new BulkOperationError('complete', [
        { id: 'ASANA-1', task: task({ id: 'ASANA-1', title: 'Fix login' }) },
        { id: 'LINEAR-2', error: 'linear outage' },
      ])),
      deleteTasks: vi.fn(),
    };

    const service = new TaskMutationService(manager);
    const result = await service.completeTasks(['ASANA-1', 'LINEAR-2']);

    expect(result.items).toEqual([
      {
        id: 'ASANA-1',
        data: expect.objectContaining({ id: 'ASANA-1', title: 'Fix login' }),
        error: undefined,
      },
      {
        id: 'LINEAR-2',
        data: undefined,
        error: 'linear outage',
      },
    ]);
  });

  it('passes comment capability errors through the shared mutation boundary', async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getConnectedPlugins: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      addComment: vi.fn().mockRejectedValue(new PMCliError({ message: 'notion does not support comments' })),
      completeTasks: vi.fn(),
      deleteTasks: vi.fn(),
    };

    const service = new TaskMutationService(manager);

    await expect(service.addComment('NOTION-1', 'hello')).rejects.toMatchObject({
      message: 'notion does not support comments',
    });
  });
});
