import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  searchTasks: vi.fn(),
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
    searchTasks: mocks.searchTasks,
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

const { default: TasksSearch } = await import('../../../src/commands/tasks/search.js');

describe('tasks search command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initialize.mockResolvedValue(undefined);
    mocks.filterAndSortTasks.mockImplementation((tasks: unknown[]) => tasks);
  });

  it('uses an inflated fetch limit and applies the display limit after sorting', async () => {
    const sortedTasks = [
      { id: 'ASANA-3', title: 'alpha', status: 'todo', source: 'asana', url: 'https://example.com/3' },
      { id: 'ASANA-2', title: 'bravo', status: 'todo', source: 'asana', url: 'https://example.com/2' },
      { id: 'ASANA-1', title: 'charlie', status: 'todo', source: 'asana', url: 'https://example.com/1' },
    ];

    mocks.searchTasks.mockResolvedValue({
      tasks: [...sortedTasks],
      errors: [],
    });
    mocks.filterAndSortTasks.mockReturnValue(sortedTasks);

    const command = Object.create(TasksSearch.prototype) as InstanceType<typeof TasksSearch> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { query: 'bug' },
      flags: {
        source: 'asana',
        limit: 2,
        json: false,
        status: undefined,
        priority: undefined,
        sort: 'title',
        plain: false,
        'ids-only': false,
      },
    });

    await command.run();

    expect(mocks.searchTasks).toHaveBeenCalledWith('bug', {
      source: 'asana',
      fetchLimit: 100,
    });
    expect(mocks.filterAndSortTasks).toHaveBeenCalled();
    expect(mocks.renderTasks).toHaveBeenCalledWith(sortedTasks.slice(0, 2), 'table');
  });
});
