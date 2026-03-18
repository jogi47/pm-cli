import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isAttachmentDownloadCapable: vi.fn(),
  isThreadCapable: vi.fn(),
  parseTaskId: vi.fn(),
  initialize: vi.fn(),
  getPlugin: vi.fn(),
  renderError: vi.fn(),
  renderTaskAttachments: vi.fn(),
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
  renderTaskAttachments: mocks.renderTaskAttachments,
}));

vi.mock('../../../src/init.js', () => ({}));
vi.mock('../../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: TasksAttachments } = await import('../../../src/commands/tasks/attachments.js');

describe('tasks attachments command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAttachmentDownloadCapable.mockReturnValue(true);
    mocks.isThreadCapable.mockReturnValue(true);
    mocks.parseTaskId.mockReturnValue({ source: 'asana', externalId: '123' });
    mocks.initialize.mockResolvedValue(undefined);
  });

  it('renders flattened task attachments', async () => {
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
      getTaskThread: vi.fn().mockResolvedValue([
        {
          id: 'attachment-att-1',
          attachments: [{
            id: 'att-1',
            name: 'mockup.png',
            kind: 'image',
            source: 'asana',
          }],
        },
        {
          id: 'attachment-att-2',
          attachments: [{
            id: 'att-2',
            name: 'notes.pdf',
            kind: 'document',
            source: 'asana',
          }],
        },
      ]),
    };

    mocks.getPlugin.mockReturnValue(plugin);

    const command = Object.create(TasksAttachments.prototype) as InstanceType<typeof TasksAttachments> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { id: 'ASANA-123' },
      flags: {
        json: false,
        'download-images': true,
        'temp-dir': '/tmppm-cli',
        cleanup: true,
      },
    });

    await command.run();

    expect(plugin.getTaskThread).toHaveBeenCalledWith('123', {
      downloadImages: true,
      tempDir: '/tmppm-cli',
      cleanup: true,
    });
    expect(mocks.renderTaskAttachments).toHaveBeenCalledWith([
      {
        id: 'att-1',
        name: 'mockup.png',
        kind: 'image',
        source: 'asana',
      },
      {
        id: 'att-2',
        name: 'notes.pdf',
        kind: 'document',
        source: 'asana',
      },
    ], 'table');
  });
});
