import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  searchTasks: vi.fn(),
  renderTasks: vi.fn(),
  renderTasksPlain: vi.fn(),
  renderTaskIds: vi.fn(),
  renderWarnings: vi.fn(),
  renderError: vi.fn(),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  taskQueryService: {
    searchTasks: mocks.searchTasks,
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

const { default: TasksSearch } = await import('../../../src/commands/tasks/search.js');

describe('tasks search command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchTasks.mockResolvedValue({ tasks: [], warnings: [] });
  });

  it('delegates search orchestration to the task query service', async () => {
    const sortedTasks = [
      { id: 'ASANA-3', title: 'alpha', status: 'todo', source: 'asana', url: 'https://example.com/3' },
      { id: 'ASANA-2', title: 'bravo', status: 'todo', source: 'asana', url: 'https://example.com/2' },
      { id: 'ASANA-1', title: 'charlie', status: 'todo', source: 'asana', url: 'https://example.com/1' },
    ];

    mocks.searchTasks.mockResolvedValue({
      tasks: sortedTasks.slice(0, 2),
      warnings: ['search warning'],
    });

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

    expect(mocks.searchTasks).toHaveBeenCalledWith({
      query: 'bug',
      source: 'asana',
      displayLimit: 2,
      status: undefined,
      priority: undefined,
      sort: 'title',
    });
    expect(mocks.renderWarnings).toHaveBeenCalledWith(['search warning']);
    expect(mocks.renderTasks).toHaveBeenCalledWith(sortedTasks.slice(0, 2), 'table');
  });

  it('rejects conflicting output flags before querying tasks', async () => {
    const command = Object.create(TasksSearch.prototype) as InstanceType<typeof TasksSearch> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { query: 'bug' },
      flags: {
        source: 'asana',
        limit: 2,
        json: true,
        status: undefined,
        priority: undefined,
        sort: undefined,
        plain: true,
        'ids-only': false,
      },
    });
    command.exit = vi.fn();

    await command.run();

    expect(mocks.searchTasks).not.toHaveBeenCalled();
    expect(mocks.renderError).toHaveBeenCalledWith(
      'Output flags are mutually exclusive. Use only one of --json, --plain, or --ids-only.',
    );
    expect(command.exit).toHaveBeenCalledWith(1);
  });

  it('passes warnings through the shared json renderer instead of stderr', async () => {
    mocks.searchTasks.mockResolvedValue({
      tasks: [
        { id: 'ASANA-3', title: 'alpha', status: 'todo', source: 'asana', url: 'https://example.com/3' },
      ],
      warnings: ['search warning'],
    });

    const command = Object.create(TasksSearch.prototype) as InstanceType<typeof TasksSearch> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { query: 'bug' },
      flags: {
        source: 'asana',
        limit: 2,
        json: true,
        status: undefined,
        priority: undefined,
        sort: undefined,
        plain: false,
        'ids-only': false,
      },
    });

    await command.run();

    expect(mocks.renderWarnings).not.toHaveBeenCalled();
    expect(mocks.renderTasks).toHaveBeenCalledWith([
      { id: 'ASANA-3', title: 'alpha', status: 'todo', source: 'asana', url: 'https://example.com/3' },
    ], 'json', {
      command: 'tasks search',
      warnings: ['search warning'],
    });
  });
});
