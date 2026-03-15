import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class BulkOperationError<T extends { error?: string }> extends Error {
    results: T[];

    constructor(public operation: string, results: T[]) {
      super(`Bulk ${operation} completed with errors`);
      this.name = 'BulkOperationError';
      this.results = results;
    }
  }

  return {
    initialize: vi.fn(),
    completeTasks: vi.fn(),
    renderSuccess: vi.fn(),
    renderError: vi.fn(),
    BulkOperationError,
  };
});

vi.mock('pm-cli-core', () => ({
  pluginManager: {
    initialize: mocks.initialize,
    completeTasks: mocks.completeTasks,
  },
  renderSuccess: mocks.renderSuccess,
  renderError: mocks.renderError,
  BulkOperationError: mocks.BulkOperationError,
}));

vi.mock('../../src/init.js', () => ({}));

const { default: Done } = await import('../../src/commands/done.js');

describe('done command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initialize.mockResolvedValue(undefined);
  });

  it('renders partial successes from typed bulk errors and exits non-zero', async () => {
    mocks.completeTasks.mockRejectedValue(new mocks.BulkOperationError('complete', [
      {
        id: 'ASANA-1',
        task: {
          id: 'ASANA-1',
          title: 'Fix login',
        },
      },
      {
        id: 'LINEAR-2',
        error: 'linear outage',
      },
    ]));

    const command = Object.create(Done.prototype) as InstanceType<typeof Done> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      argv: ['ASANA-1', 'LINEAR-2'],
      flags: { json: false },
    });
    command.exit = vi.fn();

    await command.run();

    expect(mocks.renderSuccess).toHaveBeenCalledWith('Completed: ASANA-1 — Fix login');
    expect(mocks.renderError).toHaveBeenCalledWith('LINEAR-2: linear outage');
    expect(command.exit).toHaveBeenCalledWith(1);
  });
});
