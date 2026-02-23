import { describe, expect, it } from 'vitest';
import { mapClickUpTask } from '../src/mapper.js';

describe('ClickUp mapper', () => {
  it('maps clickup task fields to Task model', () => {
    const task = mapClickUpTask({
      id: 'abc123',
      name: 'Implement feature',
      description: 'Details',
      status: { status: 'in progress', type: 'active' },
      due_date: String(new Date('2026-01-01T00:00:00.000Z').getTime()),
      assignees: [{ id: 1, username: 'alice', email: 'alice@example.com' }],
      tags: [{ name: 'backend' }, { name: 'urgent' }],
      priority: { id: '2' },
      url: 'https://app.clickup.com/t/abc123',
      list: { id: 'list-1', name: 'Sprint Board' },
      date_created: '1735689600000',
      date_updated: '1735776000000',
    });

    expect(task.id).toBe('CLICKUP-abc123');
    expect(task.externalId).toBe('abc123');
    expect(task.status).toBe('in_progress');
    expect(task.project).toBe('Sprint Board');
    expect(task.priority).toBe('high');
    expect(task.tags).toEqual(['backend', 'urgent']);
  });

  it('maps closed tasks to done', () => {
    const task = mapClickUpTask({
      id: 'abc124',
      name: 'Done task',
      status: { status: 'done', type: 'closed' },
      url: 'https://app.clickup.com/t/abc124',
    });

    expect(task.status).toBe('done');
  });
});
