import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  aggregateTasks: vi.fn(),
  renderTasks: vi.fn(),
  renderTasksPlain: vi.fn(),
  renderTaskIds: vi.fn(),
  renderWarning: vi.fn(),
  filterAndSortTasks: vi.fn(),
  formatError: vi.fn((error: { message?: string }) => error.message ?? 'warning'),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  pluginManager: {
    initialize: mocks.initialize,
    aggregateTasks: mocks.aggregateTasks,
  },
  renderTasks: mocks.renderTasks,
  renderTasksPlain: mocks.renderTasksPlain,
  renderTaskIds: mocks.renderTaskIds,
  renderWarning: mocks.renderWarning,
  filterAndSortTasks: mocks.filterAndSortTasks,
  formatError: mocks.formatError,
}));

vi.mock('../../../src/init.js', () => ({}));
vi.mock('../../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: TasksAssigned } = await import('../../../src/commands/tasks/assigned.js');

describe('tasks assigned command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initialize.mockResolvedValue(undefined);
    mocks.filterAndSortTasks.mockImplementation((tasks: unknown[]) => tasks);
  });

  it('uses an inflated fetch limit and applies the display limit after filtering', async () => {
    const filteredTasks = [
      { id: 'ASANA-2', title: 'todo 1', status: 'todo', source: 'asana', url: 'https://example.com/2' },
      { id: 'ASANA-4', title: 'todo 2', status: 'todo', source: 'asana', url: 'https://example.com/4' },
      { id: 'ASANA-6', title: 'todo 3', status: 'todo', source: 'asana', url: 'https://example.com/6' },
    ];

    mocks.aggregateTasks.mockResolvedValue({
      tasks: [
        { id: 'ASANA-1', title: 'done 1', status: 'done', source: 'asana', url: 'https://example.com/1' },
        ...filteredTasks,
      ],
      errors: [],
    });
    mocks.filterAndSortTasks.mockReturnValue(filteredTasks);

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

    expect(mocks.aggregateTasks).toHaveBeenCalledWith('assigned', {
      source: 'asana',
      fetchLimit: 100,
      refresh: false,
    });
    expect(mocks.filterAndSortTasks).toHaveBeenCalled();
    expect(mocks.renderTasks).toHaveBeenCalledWith(filteredTasks.slice(0, 2), 'table');
  });
});
