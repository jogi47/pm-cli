import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isAttachmentDownloadCapable: vi.fn(),
  isThreadCapable: vi.fn(),
  parseTaskId: vi.fn(),
  initialize: vi.fn(),
  getPlugin: vi.fn(),
  renderError: vi.fn(),
  renderTask: vi.fn(),
  renderThreadEntries: vi.fn(),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  isAttachmentDownloadCapable: mocks.isAttachmentDownloadCapable,
  isThreadCapable: mocks.isThreadCapable,
  parseTaskId: mocks.parseTaskId,
  pluginManager: {
    initialize: mocks.initialize,
    getPlugin: mocks.getPlugin,
  },
  renderError: mocks.renderError,
  renderTask: mocks.renderTask,
  renderThreadEntries: mocks.renderThreadEntries,
}));

vi.mock('../../../src/init.js', () => ({}));
vi.mock('../../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: TasksThread } = await import('../../../src/commands/tasks/thread.js');

describe('tasks thread command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAttachmentDownloadCapable.mockReturnValue(true);
    mocks.isThreadCapable.mockReturnValue(true);
    mocks.parseTaskId.mockReturnValue({ source: 'asana', externalId: '123' });
    mocks.initialize.mockResolvedValue(undefined);
  });

  it('does not render task details before thread fetch succeeds', async () => {
    const threadError = new Error('temporary Asana failure');
    const plugin = {
      capabilities: {
        comments: true,
        thread: true,
        attachmentDownload: true,
        workspaces: false,
        customFields: true,
        projectPlacement: true,
      },
      isAuthenticated: vi.fn().mockResolvedValue(true),
      getTask: vi.fn().mockResolvedValue({
        id: 'ASANA-123',
        externalId: '123',
        title: 'Demo task',
        status: 'todo',
        source: 'asana',
        url: 'https://app.asana.com/0/0/123',
      }),
      getTaskThread: vi.fn().mockRejectedValue(threadError),
    };

    mocks.getPlugin.mockReturnValue(plugin);

    const command = Object.create(TasksThread.prototype) as InstanceType<typeof TasksThread> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { id: 'ASANA-123' },
      flags: {
        json: false,
        'comments-only': false,
        'with-task': true,
        limit: undefined,
        'download-images': false,
        'temp-dir': undefined,
        cleanup: false,
      },
    });

    await command.run();

    expect(plugin.getTask).toHaveBeenCalledWith('123');
    expect(plugin.getTaskThread).toHaveBeenCalledWith('123', {
      commentsOnly: false,
      limit: undefined,
      downloadImages: false,
      tempDir: undefined,
      cleanup: false,
    });
    expect(mocks.renderTask).not.toHaveBeenCalled();
    expect(mocks.renderThreadEntries).not.toHaveBeenCalled();
    expect(mocks.handleCommandError).toHaveBeenCalledWith(threadError, 'Failed to fetch task thread');
  });
});
