import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveCreateSource: vi.fn(),
  createTasks: vi.fn(),
  renderTask: vi.fn(),
  renderTasks: vi.fn(),
  renderSuccess: vi.fn(),
  renderWarnings: vi.fn(),
  renderError: vi.fn(),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  taskMutationService: {
    resolveCreateSource: mocks.resolveCreateSource,
    createTasks: mocks.createTasks,
  },
  renderTask: mocks.renderTask,
  renderTasks: mocks.renderTasks,
  renderSuccess: mocks.renderSuccess,
  renderWarnings: mocks.renderWarnings,
  renderError: mocks.renderError,
}));

vi.mock('../../../src/init.js', () => ({}));
vi.mock('../../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: TasksCreate } = await import('../../../src/commands/tasks/create.js');

describe('tasks create command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCreateSource.mockResolvedValue('asana');
  });

  it('does not emit human success output when --json is enabled', async () => {
    const createdTask = {
      id: 'ASANA-1',
      title: 'Ship JSON-safe create',
      status: 'todo',
      source: 'asana',
      url: 'https://example.com/tasks/1',
    };

    mocks.createTasks.mockResolvedValue({
      data: [createdTask],
      warnings: ['cache miss'],
    });

    const command = Object.create(TasksCreate.prototype) as InstanceType<typeof TasksCreate> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { title: 'Ship JSON-safe create' },
      flags: {
        description: undefined,
        title: undefined,
        source: 'asana',
        project: undefined,
        section: undefined,
        workspace: undefined,
        difficulty: undefined,
        field: undefined,
        refresh: false,
        due: undefined,
        assignee: undefined,
        json: true,
      },
    });

    await command.run();

    expect(mocks.renderSuccess).not.toHaveBeenCalled();
    expect(mocks.renderWarnings).not.toHaveBeenCalled();
    expect(mocks.renderTask).toHaveBeenCalledWith(createdTask, 'json', {
      command: 'tasks create',
      warnings: ['cache miss'],
    });
  });
});
