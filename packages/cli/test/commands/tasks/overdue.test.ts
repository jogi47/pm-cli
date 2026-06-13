import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLI_EXIT_CODES } from '../../../src/lib/exit-code.js';

const mocks = vi.hoisted(() => ({
  getOverdueTasks: vi.fn(),
  renderTasks: vi.fn(),
  renderTasksPlain: vi.fn(),
  renderTaskIds: vi.fn(),
  renderWarnings: vi.fn(),
  renderError: vi.fn(),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  taskQueryService: {
    getOverdueTasks: mocks.getOverdueTasks,
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

const { default: TasksOverdue } = await import('../../../src/commands/tasks/overdue.js');

describe('tasks overdue command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOverdueTasks.mockResolvedValue({ tasks: [], warnings: [] });
  });

  it('rejects conflicting output flags before querying tasks', async () => {
    const command = Object.create(TasksOverdue.prototype) as InstanceType<typeof TasksOverdue> & {
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

    expect(mocks.getOverdueTasks).not.toHaveBeenCalled();
    expect(mocks.renderError).toHaveBeenCalledWith(
      'Output flags are mutually exclusive. Use only one of --json, --plain, or --ids-only.',
    );
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.USAGE);
  });
});
