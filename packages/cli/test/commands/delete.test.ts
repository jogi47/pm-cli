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
    deleteTasks: vi.fn(),
    renderSuccess: vi.fn(),
    renderError: vi.fn(),
    BulkOperationError,
  };
});

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  pluginManager: {
    initialize: mocks.initialize,
    deleteTasks: mocks.deleteTasks,
  },
  renderSuccess: mocks.renderSuccess,
  renderError: mocks.renderError,
  BulkOperationError: mocks.BulkOperationError,
}));

vi.mock('../../src/init.js', () => ({}));

const { default: Delete } = await import('../../src/commands/delete.js');

describe('delete command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initialize.mockResolvedValue(undefined);
  });

  it('renders typed bulk delete errors and exits non-zero', async () => {
    mocks.deleteTasks.mockRejectedValue(new mocks.BulkOperationError('delete', [
      { id: 'ASANA-1' },
      { id: 'LINEAR-2', error: 'delete denied' },
    ]));

    const command = Object.create(Delete.prototype) as InstanceType<typeof Delete> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      argv: ['ASANA-1', 'LINEAR-2'],
      flags: { json: false, force: true },
    });
    command.exit = vi.fn();

    await command.run();

    expect(mocks.renderSuccess).toHaveBeenCalledWith('Deleted: ASANA-1');
    expect(mocks.renderError).toHaveBeenCalledWith('LINEAR-2: delete denied');
    expect(command.exit).toHaveBeenCalledWith(1);
  });

  it('requires confirmation when --force is not provided in non-interactive mode', async () => {
    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });

    const command = Object.create(Delete.prototype) as InstanceType<typeof Delete> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      argv: ['ASANA-1'],
      flags: { json: false, force: false },
    });
    command.exit = vi.fn();

    try {
      await command.run();
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    }

    expect(mocks.initialize).not.toHaveBeenCalled();
    expect(mocks.deleteTasks).not.toHaveBeenCalled();
    expect(mocks.renderError).toHaveBeenCalledWith('Delete requires confirmation. Re-run with --force to confirm.');
    expect(command.exit).toHaveBeenCalledWith(1);
  });
});
