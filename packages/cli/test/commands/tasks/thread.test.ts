import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTaskThread: vi.fn(),
  renderTask: vi.fn(),
  renderThreadEntries: vi.fn(),
  renderWarnings: vi.fn(),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  taskReadService: {
    getTaskThread: mocks.getTaskThread,
  },
  renderTask: mocks.renderTask,
  renderThreadEntries: mocks.renderThreadEntries,
  renderWarnings: mocks.renderWarnings,
}));

vi.mock('../../../src/init.js', () => ({}));
vi.mock('../../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: TasksThread } = await import('../../../src/commands/tasks/thread.js');

describe('tasks thread command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTaskThread.mockResolvedValue({ entries: [], warnings: [] });
  });

  it('does not render task details before thread fetch succeeds', async () => {
    const threadError = new Error('temporary Asana failure');
    mocks.getTaskThread.mockRejectedValue(threadError);

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

    expect(mocks.getTaskThread).toHaveBeenCalledWith('ASANA-123', {
      includeTask: true,
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

  it('renders service warnings before thread output', async () => {
    mocks.getTaskThread.mockResolvedValue({
      task: {
        id: 'ASANA-123',
        externalId: '123',
        title: 'Demo task',
        status: 'todo',
        source: 'asana',
        url: 'https://app.asana.com/0/0/123',
      },
      entries: [{ id: 'story-1', body: 'hello', source: 'asana', createdAt: new Date('2026-01-01T00:00:00.000Z') }],
      warnings: ['partial thread warning'],
    });

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

    expect(mocks.renderWarnings).toHaveBeenCalledWith(['partial thread warning']);
    expect(mocks.renderTask).toHaveBeenCalled();
    expect(mocks.renderThreadEntries).toHaveBeenCalled();
  });

  it('emits only JSON to stdout for --json --with-task', async () => {
    const logs: string[] = [];
    const consoleLog = vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });

    mocks.getTaskThread.mockResolvedValue({
      task: {
        id: 'ASANA-123',
        externalId: '123',
        title: 'Demo task',
        status: 'todo',
        source: 'asana',
        url: 'https://app.asana.com/0/0/123',
      },
      entries: [{ id: 'story-1', body: 'hello', source: 'asana', createdAt: new Date('2026-01-01T00:00:00.000Z') }],
      warnings: ['partial thread warning'],
    });

    const command = Object.create(TasksThread.prototype) as InstanceType<typeof TasksThread> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { id: 'ASANA-123' },
      flags: {
        json: true,
        'comments-only': false,
        'with-task': true,
        limit: undefined,
        'download-images': false,
        'temp-dir': undefined,
        cleanup: false,
      },
    });

    try {
      await command.run();
    } finally {
      consoleLog.mockRestore();
    }

    expect(mocks.renderWarnings).toHaveBeenCalledWith(['partial thread warning']);
    expect(mocks.renderTask).not.toHaveBeenCalled();
    expect(mocks.renderThreadEntries).not.toHaveBeenCalled();
    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0])).toEqual({
      task: {
        id: 'ASANA-123',
        externalId: '123',
        title: 'Demo task',
        status: 'todo',
        source: 'asana',
        url: 'https://app.asana.com/0/0/123',
      },
      entries: [
        {
          id: 'story-1',
          body: 'hello',
          source: 'asana',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
  });

  it('passes json mode through to the thread renderer when task output is not included', async () => {
    mocks.getTaskThread.mockResolvedValue({
      entries: [{ id: 'story-1', body: 'hello', source: 'asana', createdAt: new Date('2026-01-01T00:00:00.000Z') }],
      warnings: [],
    });

    const command = Object.create(TasksThread.prototype) as InstanceType<typeof TasksThread> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { id: 'ASANA-123' },
      flags: {
        json: true,
        'comments-only': false,
        'with-task': false,
        limit: undefined,
        'download-images': false,
        'temp-dir': undefined,
        cleanup: false,
      },
    });

    await command.run();

    expect(mocks.renderTask).not.toHaveBeenCalled();
    expect(mocks.renderThreadEntries).toHaveBeenCalledWith(
      [{ id: 'story-1', body: 'hello', source: 'asana', createdAt: new Date('2026-01-01T00:00:00.000Z') }],
      'json',
    );
  });
});
