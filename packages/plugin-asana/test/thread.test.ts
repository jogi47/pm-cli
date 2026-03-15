import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AsanaClient, type AsanaStory } from '../src/client.js';
import { AsanaPlugin, asanaClient } from '../src/index.js';

function buildStory(overrides: Partial<AsanaStory> & Pick<AsanaStory, 'gid' | 'created_at'>): AsanaStory {
  return {
    gid: overrides.gid,
    text: overrides.text ?? `Story ${overrides.gid}`,
    resource_subtype: overrides.resource_subtype ?? 'comment_added',
    created_at: overrides.created_at,
    created_by: overrides.created_by ?? { gid: 'user-1', name: 'Asana User' },
  };
}

describe('AsanaClient getTaskStories', () => {
  it('paginates through all story pages', async () => {
    const client = new AsanaClient();

    const finalPage = {
      data: [buildStory({ gid: 'story-3', created_at: '2026-01-03T00:00:00.000Z' })],
    };
    const secondPage = {
      data: [buildStory({ gid: 'story-2', created_at: '2026-01-02T00:00:00.000Z' })],
      nextPage: vi.fn().mockResolvedValue(finalPage),
    };
    const firstPage = {
      data: [buildStory({ gid: 'story-1', created_at: '2026-01-01T00:00:00.000Z' })],
      nextPage: vi.fn().mockResolvedValue(secondPage),
    };
    const getStoriesForTask = vi.fn().mockResolvedValue(firstPage);

    (client as unknown as {
      storiesApi: { getStoriesForTask: typeof getStoriesForTask };
    }).storiesApi = { getStoriesForTask };

    const stories = await client.getTaskStories('task-123');

    expect(stories.map((story) => story.gid)).toEqual(['story-1', 'story-2', 'story-3']);
    expect(getStoriesForTask).toHaveBeenCalledWith('task-123', {
      opt_fields: 'gid,text,resource_subtype,created_at,created_by.gid,created_by.name',
      limit: 100,
    });
    expect(firstPage.nextPage).toHaveBeenCalledTimes(1);
    expect(secondPage.nextPage).toHaveBeenCalledTimes(1);
  });
});

describe('AsanaPlugin getTaskThread', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the newest comments after filtering and sorting', async () => {
    const plugin = new AsanaPlugin();
    const baseTime = Date.parse('2026-01-01T00:00:00.000Z');
    const stories = Array.from({ length: 105 }, (_, index) => buildStory({
      gid: `comment-${index + 1}`,
      text: `Comment ${index + 1}`,
      created_at: new Date(baseTime + index * 60_000).toISOString(),
    }));

    stories.push(
      buildStory({
        gid: 'system-1',
        text: 'Task moved to Doing',
        resource_subtype: 'section_changed',
        created_at: new Date(baseTime + 105 * 60_000).toISOString(),
      }),
      buildStory({
        gid: 'system-2',
        text: 'Marked complete',
        resource_subtype: 'marked_complete',
        created_at: new Date(baseTime + 106 * 60_000).toISOString(),
      })
    );

    vi.spyOn(asanaClient, 'getTaskStories').mockResolvedValue([...stories].reverse());

    const entries = await plugin.getTaskThread('task-123', {
      commentsOnly: true,
      limit: 3,
    });

    expect(entries.map((entry) => entry.id)).toEqual(['comment-103', 'comment-104', 'comment-105']);
    expect(entries.map((entry) => entry.body)).toEqual(['Comment 103', 'Comment 104', 'Comment 105']);
  });
});
