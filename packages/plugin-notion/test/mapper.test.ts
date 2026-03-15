import { describe, expect, it } from 'vitest';
import { mapNotionPage, mapNotionPages } from '../src/mapper.js';
import type { NotionPage } from '../src/client.js';

function buildPage(properties: Record<string, unknown>): NotionPage {
  return {
    id: 'page-123',
    url: 'https://www.notion.so/page-123',
    created_time: '2026-03-10T00:00:00.000Z',
    last_edited_time: '2026-03-11T00:00:00.000Z',
    properties,
  } as unknown as NotionPage;
}

describe('mapNotionPage', () => {
  it('maps a full page using common property aliases', () => {
    const page = buildPage({
      Name: {
        type: 'title',
        title: [{ plain_text: 'Ship test coverage' }],
      },
      State: {
        type: 'status',
        status: { name: 'In Progress' },
      },
      Deadline: {
        type: 'date',
        date: { start: '2026-03-20' },
      },
      Owner: {
        type: 'people',
        people: [{
          id: 'user-1',
          name: 'Ada Lovelace',
          type: 'person',
          person: { email: 'ada@example.com' },
        }],
      },
      Priority: {
        type: 'select',
        select: { name: 'Critical' },
      },
      Labels: {
        type: 'multi_select',
        multi_select: [{ name: 'backend' }, { name: 'bug' }],
      },
      Notes: {
        type: 'rich_text',
        rich_text: [{ plain_text: 'Carry over note text' }],
      },
    });

    const task = mapNotionPage(page);

    expect(task).toMatchObject({
      id: 'NOTION-page-123',
      externalId: 'page-123',
      title: 'Ship test coverage',
      description: 'Carry over note text',
      status: 'in_progress',
      assignee: 'Ada Lovelace',
      assigneeEmail: 'ada@example.com',
      priority: 'urgent',
      tags: ['backend', 'bug'],
      source: 'notion',
      url: 'https://www.notion.so/page-123',
    });
    expect(task.dueDate?.toISOString()).toBe('2026-03-20T00:00:00.000Z');
  });

  it('handles checkbox status, missing rich text, and bot assignees gracefully', () => {
    const page = buildPage({
      Title: {
        type: 'title',
        title: [],
      },
      Status: {
        type: 'checkbox',
        checkbox: true,
      },
      Assignee: {
        type: 'people',
        people: [{
          id: 'bot-1',
          name: 'Notion Bot',
          type: 'bot',
          bot: {},
        }],
      },
      Description: {
        type: 'rich_text',
        rich_text: [],
      },
      Tags: {
        type: 'multi_select',
        multi_select: [],
      },
    });

    const task = mapNotionPage(page);

    expect(task.title).toBe('Untitled');
    expect(task.status).toBe('done');
    expect(task.assignee).toBe('Notion Bot');
    expect(task.assigneeEmail).toBeUndefined();
    expect(task.description).toBeUndefined();
    expect(task.tags).toBeUndefined();
  });

  it('falls back cleanly for unknown status and invalid dates', () => {
    const page = buildPage({
      Name: {
        type: 'title',
        title: [{ plain_text: 'Backlog cleanup' }],
      },
      Status: {
        type: 'select',
        select: { name: 'Queued' },
      },
      Due: {
        type: 'date',
        date: { start: 'not-a-date' },
      },
      Priority: {
        type: 'select',
        select: { name: 'Unknown' },
      },
    });

    const task = mapNotionPage(page);

    expect(task.status).toBe('todo');
    expect(task.dueDate).toBeUndefined();
    expect(task.priority).toBeUndefined();
  });
});

describe('mapNotionPages', () => {
  it('maps arrays of pages', () => {
    const pages = [
      buildPage({
        Name: {
          type: 'title',
          title: [{ plain_text: 'One' }],
        },
      }),
      buildPage({
        Name: {
          type: 'title',
          title: [{ plain_text: 'Two' }],
        },
      }),
    ];

    expect(mapNotionPages(pages).map((task) => task.title)).toEqual(['One', 'Two']);
  });
});
