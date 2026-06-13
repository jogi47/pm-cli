import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLI_EXIT_CODES } from '../../../src/lib/exit-code.js';

const mocks = vi.hoisted(() => ({
  getAssignedTasks: vi.fn(),
  renderTasks: vi.fn(),
  renderTasksPlain: vi.fn(),
  renderTaskIds: vi.fn(),
  renderWarnings: vi.fn(),
  renderError: vi.fn(),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  taskQueryService: {
    getAssignedTasks: mocks.getAssignedTasks,
  },
  renderTasks: mocks.renderTasks,
  renderTasksPlain: mocks.renderTasksPlain,
  renderTaskIds: mocks.renderTaskIds,
  renderWarnings: mocks.renderWarnings,
  renderError: mocks.renderError,
}));

vi.mock('../../../src/init.js', () => ({}));
vi.mock('../../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: TasksAssigned } = await import('../../../src/commands/tasks/assigned.js');

describe('tasks assigned command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAssignedTasks.mockResolvedValue({ tasks: [], warnings: [] });
  });

  it('delegates query orchestration to the task query service', async () => {
    const filteredTasks = [
      { id: 'ASANA-2', title: 'todo 1', status: 'todo', source: 'asana', url: 'https://example.com/2' },
      { id: 'ASANA-4', title: 'todo 2', status: 'todo', source: 'asana', url: 'https://example.com/4' },
      { id: 'ASANA-6', title: 'todo 3', status: 'todo', source: 'asana', url: 'https://example.com/6' },
    ];

    mocks.getAssignedTasks.mockResolvedValue({
      tasks: filteredTasks.slice(0, 2),
      warnings: ['partial failure'],
    });

    const command = Object.create(TasksAssigned.prototype) as InstanceType<typeof TasksAssigned> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      flags: {
        source: 'asana',
        limit: 2,
        json: false,
        refresh: false,
        status: 'todo',
        priority: undefined,
        sort: undefined,
        plain: false,
        'ids-only': false,
      },
    });

    await command.run();

    expect(mocks.getAssignedTasks).toHaveBeenCalledWith({
      source: 'asana',
      displayLimit: 2,
      refresh: false,
      status: 'todo',
      priority: undefined,
      sort: undefined,
    });
    expect(mocks.renderWarnings).toHaveBeenCalledWith(['partial failure']);
    expect(mocks.renderTasks).toHaveBeenCalledWith(filteredTasks.slice(0, 2), 'table');
  });

  it('rejects conflicting output flags before querying tasks', async () => {
    const command = Object.create(TasksAssigned.prototype) as InstanceType<typeof TasksAssigned> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      flags: {
        source: 'asana',
        limit: 2,
        json: true,
        refresh: false,
        status: undefined,
        priority: undefined,
        sort: undefined,
        plain: true,
        'ids-only': false,
      },
    });
    command.exit = vi.fn();

    await command.run();

    expect(mocks.getAssignedTasks).not.toHaveBeenCalled();
    expect(mocks.renderError).toHaveBeenCalledWith(
      'Output flags are mutually exclusive. Use only one of --json, --plain, or --ids-only.',
    );
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.USAGE);
  });
});
