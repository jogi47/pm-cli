import { describe, it, expect } from 'vitest';
import { mapLinearIssue } from '../src/mapper.js';
import type { LinearIssue } from '../src/client.js';

describe('Linear mapper', () => {
  it('maps issue to unified task', () => {
    const issue: LinearIssue = {
      id: 'id-1',
      identifier: 'ENG-42',
      title: 'Fix prod incident',
      description: 'Investigate memory leak',
      dueDate: '2026-03-01',
      priority: 1,
      url: 'https://linear.app/acme/issue/ENG-42/fix-prod-incident',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      state: { type: 'started', name: 'In Progress' },
      assignee: { name: 'Alex', email: 'alex@example.com' },
      labels: { nodes: [{ name: 'bug' }] },
      project: { name: 'Reliability' },
      team: { name: 'Platform' },
    };

    const task = mapLinearIssue(issue);
    expect(task.id).toBe('LINEAR-ENG-42');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('urgent');
    expect(task.project).toBe('Reliability');
  });
});
