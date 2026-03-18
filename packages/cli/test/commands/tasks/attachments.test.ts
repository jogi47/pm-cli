import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTaskAttachments: vi.fn(),
  renderTaskAttachments: vi.fn(),
  renderWarnings: vi.fn(),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  taskReadService: {
    getTaskAttachments: mocks.getTaskAttachments,
  },
  renderTaskAttachments: mocks.renderTaskAttachments,
  renderWarnings: mocks.renderWarnings,
}));

vi.mock('../../../src/init.js', () => ({}));
vi.mock('../../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: TasksAttachments } = await import('../../../src/commands/tasks/attachments.js');

describe('tasks attachments command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTaskAttachments.mockResolvedValue({ attachments: [], warnings: [] });
  });

  it('renders attachment results from the read service', async () => {
    mocks.getTaskAttachments.mockResolvedValue({
      attachments: [
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
      ],
      warnings: ['attachment warning'],
    });

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

    expect(mocks.getTaskAttachments).toHaveBeenCalledWith('ASANA-123', {
      downloadImages: true,
      tempDir: '/tmppm-cli',
      cleanup: true,
    });
    expect(mocks.renderWarnings).toHaveBeenCalledWith(['attachment warning']);
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
