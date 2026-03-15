import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AsanaClient, type AsanaAttachment, type AsanaStory } from '../src/client.js';
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

function buildAttachment(overrides: Partial<AsanaAttachment> & Pick<AsanaAttachment, 'gid' | 'name'>): AsanaAttachment {
  return {
    gid: overrides.gid,
    name: overrides.name,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    resource_subtype: overrides.resource_subtype ?? 'asana',
    download_url: overrides.download_url,
    permanent_url: overrides.permanent_url,
    view_url: overrides.view_url,
    host: overrides.host,
    parent: overrides.parent,
    connected_to_app: overrides.connected_to_app,
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

describe('AsanaClient getTaskAttachments', () => {
  it('paginates attachment pages and hydrates detail URLs', async () => {
    const client = new AsanaClient();

    const secondPage = {
      data: [buildAttachment({ gid: 'att-2', name: 'design.pdf' })],
    };
    const firstPage = {
      data: [buildAttachment({ gid: 'att-1', name: 'mockup.png' })],
      nextPage: vi.fn().mockResolvedValue(secondPage),
    };
    const getAttachmentsForObject = vi.fn().mockResolvedValue(firstPage);
    const getAttachment = vi.fn()
      .mockResolvedValueOnce({
        data: buildAttachment({
          gid: 'att-1',
          name: 'mockup.png',
          download_url: 'https://download.example/mockup.png',
        }),
      })
      .mockResolvedValueOnce({
        data: buildAttachment({
          gid: 'att-2',
          name: 'design.pdf',
          view_url: 'https://view.example/design.pdf',
        }),
      });

    (client as unknown as {
      attachmentsApi: {
        getAttachmentsForObject: typeof getAttachmentsForObject;
        getAttachment: typeof getAttachment;
      };
    }).attachmentsApi = {
      getAttachmentsForObject,
      getAttachment,
    };

    const attachments = await client.getTaskAttachments('task-123');

    expect(attachments).toHaveLength(2);
    expect(attachments[0].download_url).toBe('https://download.example/mockup.png');
    expect(attachments[1].view_url).toBe('https://view.example/design.pdf');
    expect(getAttachmentsForObject).toHaveBeenCalledWith('task-123', {
      opt_fields: 'gid,name,created_at,resource_subtype,download_url,permanent_url,view_url,host,parent.gid,parent.name,parent.resource_type,connected_to_app',
      limit: 100,
    });
    expect(firstPage.nextPage).toHaveBeenCalledTimes(1);
    expect(getAttachment).toHaveBeenCalledTimes(2);
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
    vi.spyOn(asanaClient, 'getTaskAttachments').mockResolvedValue([]);

    const entries = await plugin.getTaskThread('task-123', {
      commentsOnly: true,
      limit: 3,
    });

    expect(entries.map((entry) => entry.id)).toEqual(['comment-103', 'comment-104', 'comment-105']);
    expect(entries.map((entry) => entry.body)).toEqual(['Comment 103', 'Comment 104', 'Comment 105']);
  });

  it('joins attachments into the thread and downloads images when requested', async () => {
    const plugin = new AsanaPlugin();

    vi.spyOn(asanaClient, 'getTaskStories').mockResolvedValue([
      buildStory({
        gid: 'comment-1',
        text: 'See attached mockup',
        created_at: '2026-01-02T00:00:00.000Z',
      }),
    ]);
    vi.spyOn(asanaClient, 'getTaskAttachments').mockResolvedValue([
      buildAttachment({
        gid: 'att-1',
        name: 'mockup.png',
        created_at: '2026-01-01T00:00:00.000Z',
        download_url: 'https://download.example/mockup.png',
      }),
      buildAttachment({
        gid: 'att-2',
        name: 'notes.pdf',
        created_at: '2026-01-03T00:00:00.000Z',
        view_url: 'https://view.example/notes.pdf',
      }),
    ]);

    const downloadAttachment = vi.spyOn(plugin, 'downloadAttachment')
      .mockResolvedValueOnce('/tmp/pm-cli/task-123/mockup-att-1.png')
      .mockResolvedValueOnce(null);

    const entries = await plugin.getTaskThread('task-123', {
      commentsOnly: true,
      downloadImages: true,
      tempDir: '/tmp/pm-cli',
      cleanup: true,
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'attachment-att-1',
      'comment-1',
      'attachment-att-2',
    ]);
    expect(entries[0].attachments?.[0].localPath).toBe('/tmp/pm-cli/task-123/mockup-att-1.png');
    expect(entries[2].attachments?.[0].viewUrl).toBe('https://view.example/notes.pdf');
    expect(downloadAttachment).toHaveBeenNthCalledWith(1, expect.objectContaining({
      id: 'att-1',
      kind: 'image',
    }), {
      taskId: 'task-123',
      tempDir: '/tmp/pm-cli',
      cleanup: true,
    });
    expect(downloadAttachment).toHaveBeenNthCalledWith(2, expect.objectContaining({
      id: 'att-2',
      kind: 'document',
    }), {
      taskId: 'task-123',
      tempDir: '/tmp/pm-cli',
      cleanup: false,
    });
  });
});
