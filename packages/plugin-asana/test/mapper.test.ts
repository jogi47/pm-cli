// test/mapper.test.ts

import { describe, it, expect } from 'vitest';
import { mapAsanaTask } from '../src/mapper.js';
import type { AsanaTask } from '../src/client.js';

describe('Asana Mapper', () => {
  const mockAsanaTask: AsanaTask = {
    gid: '12345',
    name: 'Test Task',
    notes: 'Task description',
    completed: false,
    due_on: '2024-12-31',
    assignee: {
      gid: 'user123',
      name: 'John Doe',
      email: 'john@example.com',
    },
    projects: [{ gid: 'proj1', name: 'My Project' }],
    tags: [{ gid: 'tag1', name: 'urgent' }],
    permalink_url: 'https://app.asana.com/0/0/12345',
    created_at: '2024-01-01T00:00:00Z',
    modified_at: '2024-01-15T00:00:00Z',
  };

  it('should map basic task properties', () => {
    const task = mapAsanaTask(mockAsanaTask);

    expect(task.id).toBe('ASANA-12345');
    expect(task.externalId).toBe('12345');
    expect(task.title).toBe('Test Task');
    expect(task.description).toBe('Task description');
    expect(task.source).toBe('asana');
  });

  it('should map assignee information', () => {
    const task = mapAsanaTask(mockAsanaTask);

    expect(task.assignee).toBe('John Doe');
    expect(task.assigneeEmail).toBe('john@example.com');
  });

  it('should map project name', () => {
    const task = mapAsanaTask(mockAsanaTask);
    expect(task.project).toBe('My Project');
    expect(task.placement?.project).toEqual({ id: 'proj1', name: 'My Project' });
  });

  it('should map section placement when membership section exists', () => {
    const withSection: AsanaTask = {
      ...mockAsanaTask,
      memberships: [{ section: { gid: 'sec1', name: 'Prioritised' } }],
    };

    const task = mapAsanaTask(withSection);
    expect(task.placement?.section).toEqual({ id: 'sec1', name: 'Prioritised' });
  });

  it('should map tags', () => {
    const task = mapAsanaTask(mockAsanaTask);
    expect(task.tags).toEqual(['urgent']);
  });

  it('should set status to done for completed tasks', () => {
    const completedTask = { ...mockAsanaTask, completed: true };
    const task = mapAsanaTask(completedTask);
    expect(task.status).toBe('done');
  });

  it('should set status to todo for incomplete tasks', () => {
    const task = mapAsanaTask(mockAsanaTask);
    expect(task.status).toBe('todo');
  });

  it('should parse due date correctly', () => {
    const task = mapAsanaTask(mockAsanaTask);
    expect(task.dueDate).toBeInstanceOf(Date);
    expect(task.dueDate?.toISOString().split('T')[0]).toBe('2024-12-31');
  });

  it('should handle missing optional fields', () => {
    const minimalTask: AsanaTask = {
      gid: '99999',
      name: 'Minimal Task',
      completed: false,
      permalink_url: 'https://app.asana.com/0/0/99999',
      created_at: '2024-01-01T00:00:00Z',
      modified_at: '2024-01-01T00:00:00Z',
    };

    const task = mapAsanaTask(minimalTask);
    expect(task.id).toBe('ASANA-99999');
    expect(task.title).toBe('Minimal Task');
    expect(task.description).toBeUndefined();
    expect(task.assignee).toBeUndefined();
    expect(task.project).toBeUndefined();
    expect(task.tags).toBeUndefined();
    expect(task.dueDate).toBeUndefined();
  });
});
