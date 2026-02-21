import { describe, it, expect } from 'vitest';
import { mapTrelloCard } from '../src/mapper.js';
import type { TrelloCard } from '../src/client.js';

describe('Trello mapper', () => {
  it('maps core task fields', () => {
    const card: TrelloCard = {
      id: 'c1',
      name: 'Fix login',
      desc: 'Investigate auth callback',
      due: '2026-01-02T00:00:00.000Z',
      idMembers: [],
      labels: [{ id: 'l1', name: 'bug' }],
      shortUrl: 'https://trello.com/c/c1',
      dateLastActivity: '2026-01-01T10:00:00.000Z',
      board: { id: 'b1', name: 'Platform' },
      list: { id: 'lst', name: 'In Progress' },
    };

    const task = mapTrelloCard(card);
    expect(task.id).toBe('TRELLO-c1');
    expect(task.status).toBe('in_progress');
    expect(task.project).toBe('Platform');
    expect(task.tags).toEqual(['bug']);
  });
});
