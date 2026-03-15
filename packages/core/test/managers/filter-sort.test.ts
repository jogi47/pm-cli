import { describe, expect, it } from 'vitest';
import { filterAndSortTasks } from '../../src/managers/plugin-manager.js';
import type { Task } from '../../src/models/task.js';

function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'ASANA-1',
    externalId: '1',
    title: 'Test task',
    status: 'todo',
    source: 'asana',
    url: 'https://example.com/1',
    ...overrides,
  };
}

describe('filterAndSortTasks', () => {
  it('applies status and priority filters together', () => {
    const tasks = [
      mockTask({ id: 'ASANA-1', status: 'todo', priority: 'high' }),
      mockTask({ id: 'ASANA-2', status: 'todo', priority: 'low' }),
      mockTask({ id: 'ASANA-3', status: 'in_progress', priority: 'high' }),
    ];

    const result = filterAndSortTasks(tasks, {
      status: 'todo',
      priority: ['high', 'urgent'],
    });

    expect(result.map((task) => task.id)).toEqual(['ASANA-1']);
  });

  it('sorts by due date with undated tasks last', () => {
    const tasks = [
      mockTask({ id: 'ASANA-1', dueDate: new Date('2026-03-20T00:00:00.000Z') }),
      mockTask({ id: 'ASANA-2', dueDate: undefined }),
      mockTask({ id: 'ASANA-3', dueDate: new Date('2026-03-10T00:00:00.000Z') }),
    ];

    const result = filterAndSortTasks(tasks, { sort: 'due' });

    expect(result.map((task) => task.id)).toEqual(['ASANA-3', 'ASANA-1', 'ASANA-2']);
  });

  it('sorts by priority, status, title, and source', () => {
    expect(filterAndSortTasks([
      mockTask({ id: 'ASANA-1', priority: 'low' }),
      mockTask({ id: 'ASANA-2', priority: 'urgent' }),
      mockTask({ id: 'ASANA-3', priority: 'high' }),
      mockTask({ id: 'ASANA-4', priority: undefined }),
    ], { sort: 'priority' }).map((task) => task.id)).toEqual(['ASANA-2', 'ASANA-3', 'ASANA-1', 'ASANA-4']);

    expect(filterAndSortTasks([
      mockTask({ id: 'ASANA-1', status: 'done' }),
      mockTask({ id: 'ASANA-2', status: 'todo' }),
      mockTask({ id: 'ASANA-3', status: 'in_progress' }),
    ], { sort: 'status' }).map((task) => task.id)).toEqual(['ASANA-3', 'ASANA-2', 'ASANA-1']);

    expect(filterAndSortTasks([
      mockTask({ id: 'ASANA-1', title: 'Zebra' }),
      mockTask({ id: 'ASANA-2', title: 'apple' }),
      mockTask({ id: 'ASANA-3', title: 'Mango' }),
    ], { sort: 'title' }).map((task) => task.id)).toEqual(['ASANA-2', 'ASANA-3', 'ASANA-1']);

    expect(filterAndSortTasks([
      mockTask({ id: 'NOTION-1', source: 'notion' }),
      mockTask({ id: 'ASANA-1', source: 'asana' }),
      mockTask({ id: 'LINEAR-1', source: 'linear' }),
    ], { sort: 'source' }).map((task) => task.id)).toEqual(['ASANA-1', 'LINEAR-1', 'NOTION-1']);
  });

  it('does not mutate the original input array when sorting', () => {
    const tasks = [
      mockTask({ id: 'ASANA-1', title: 'Bravo' }),
      mockTask({ id: 'ASANA-2', title: 'Alpha' }),
    ];
    const originalOrder = tasks.map((task) => task.id);

    const result = filterAndSortTasks(tasks, { sort: 'title' });

    expect(result.map((task) => task.id)).toEqual(['ASANA-2', 'ASANA-1']);
    expect(tasks.map((task) => task.id)).toEqual(originalOrder);
  });
});
