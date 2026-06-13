import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLI_EXIT_CODES } from '../../../src/lib/exit-code.js';

const mocks = vi.hoisted(() => ({
  parseTaskId: vi.fn(),
  updateTask: vi.fn(),
  renderTask: vi.fn(),
  renderSuccess: vi.fn(),
  renderWarnings: vi.fn(),
  renderError: vi.fn(),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  parseTaskId: mocks.parseTaskId,
  taskMutationService: {
    updateTask: mocks.updateTask,
  },
  renderTask: mocks.renderTask,
  renderSuccess: mocks.renderSuccess,
  renderWarnings: mocks.renderWarnings,
  renderError: mocks.renderError,
}));

vi.mock('../../../src/init.js', () => ({}));
vi.mock('../../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: TasksUpdate } = await import('../../../src/commands/tasks/update.js');

describe('tasks update command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseTaskId.mockReturnValue({ source: 'asana', externalId: '123' });
  });

  it('does not emit human success output when --json is enabled', async () => {
    const updatedTask = {
      id: 'ASANA-123',
      title: 'Ship JSON-safe update',
      status: 'in_progress',
      source: 'asana',
      url: 'https://example.com/tasks/123',
    };

    mocks.updateTask.mockResolvedValue({
      data: updatedTask,
      warnings: ['stale cache'],
    });

    const command = Object.create(TasksUpdate.prototype) as InstanceType<typeof TasksUpdate> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { id: 'ASANA-123' },
      flags: {
        title: 'Ship JSON-safe update',
        description: undefined,
        due: undefined,
        status: undefined,
        project: undefined,
        workspace: undefined,
        field: undefined,
        refresh: false,
        json: true,
      },
    });

    await command.run();

    expect(mocks.renderSuccess).not.toHaveBeenCalled();
    expect(mocks.renderWarnings).not.toHaveBeenCalled();
    expect(mocks.renderTask).toHaveBeenCalledWith(updatedTask, 'json', {
      command: 'tasks update',
      warnings: ['stale cache'],
    });
  });

  it('exits with usage when no updates are provided', async () => {
    const command = Object.create(TasksUpdate.prototype) as InstanceType<typeof TasksUpdate> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { id: 'ASANA-123' },
      flags: {
        title: undefined,
        description: undefined,
        due: undefined,
        status: undefined,
        project: undefined,
        workspace: undefined,
        field: undefined,
        refresh: false,
        json: false,
      },
    });
    command.exit = vi.fn();

    await command.run();

    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(mocks.renderError).toHaveBeenCalledWith(
      'No updates provided. Use --title, --description, --due, --status, or --field.',
    );
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.USAGE);
  });

  it('exits with usage when the task ID format is invalid', async () => {
    mocks.parseTaskId.mockReturnValue(null);

    const command = Object.create(TasksUpdate.prototype) as InstanceType<typeof TasksUpdate> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { id: 'BAD-ID' },
      flags: {
        title: 'Updated title',
        description: undefined,
        due: undefined,
        status: undefined,
        project: undefined,
        workspace: undefined,
        field: undefined,
        refresh: false,
        json: false,
      },
    });
    command.exit = vi.fn();

    await command.run();

    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(mocks.renderError).toHaveBeenCalledWith('Invalid task ID format: BAD-ID');
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.USAGE);
  });
});
