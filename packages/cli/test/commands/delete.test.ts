import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLI_EXIT_CODES } from '../../src/lib/exit-code.js';

const mocks = vi.hoisted(() => {
  return {
    deleteTasks: vi.fn(),
    renderJsonEnvelope: vi.fn(),
    renderSuccess: vi.fn(),
    renderError: vi.fn(),
    renderWarnings: vi.fn(),
  };
});

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  taskMutationService: {
    deleteTasks: mocks.deleteTasks,
  },
  renderJsonEnvelope: mocks.renderJsonEnvelope,
  renderSuccess: mocks.renderSuccess,
  renderError: mocks.renderError,
  renderWarnings: mocks.renderWarnings,
}));

vi.mock('../../src/init.js', () => ({}));

const { default: Delete } = await import('../../src/commands/delete.js');

describe('delete command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteTasks.mockResolvedValue({ items: [], warnings: [] });
  });

  it('renders normalized bulk delete errors and exits non-zero', async () => {
    mocks.deleteTasks.mockResolvedValue({
      items: [
        { id: 'ASANA-1' },
        { id: 'LINEAR-2', error: 'delete denied' },
      ],
      warnings: [],
    });

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

    expect(mocks.deleteTasks).toHaveBeenCalledWith(['ASANA-1', 'LINEAR-2']);
    expect(mocks.renderSuccess).toHaveBeenCalledWith('Deleted: ASANA-1');
    expect(mocks.renderError).toHaveBeenCalledWith('LINEAR-2: delete denied');
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.PARTIAL);
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

    expect(mocks.deleteTasks).not.toHaveBeenCalled();
    expect(mocks.renderError).toHaveBeenCalledWith('Delete requires confirmation. Re-run with --force to confirm.');
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.USAGE);
  });

  it('emits only JSON to stdout in --json mode', async () => {
    mocks.deleteTasks.mockResolvedValue({
      items: [
        { id: 'ASANA-1' },
        { id: 'LINEAR-2', error: 'delete denied' },
      ],
      warnings: ['partial delete'],
    });

    const command = Object.create(Delete.prototype) as InstanceType<typeof Delete> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      argv: ['ASANA-1', 'LINEAR-2'],
      flags: { json: true, force: true },
    });
    command.exit = vi.fn();

    await command.run();

    expect(mocks.renderWarnings).not.toHaveBeenCalled();
    expect(mocks.renderSuccess).not.toHaveBeenCalled();
    expect(mocks.renderError).not.toHaveBeenCalled();
    expect(mocks.renderJsonEnvelope).toHaveBeenCalledWith('delete', [
      { id: 'ASANA-1' },
      { id: 'LINEAR-2', error: 'delete denied' },
    ], {
      warnings: ['partial delete'],
      errors: ['LINEAR-2: delete denied'],
    });
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.PARTIAL);
  });

  it('exits with auth when a single task is not connected', async () => {
    mocks.deleteTasks.mockResolvedValue({
      items: [{ id: 'ASANA-1', error: 'Not connected to asana' }],
      warnings: [],
    });

    const command = Object.create(Delete.prototype) as InstanceType<typeof Delete> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      argv: ['ASANA-1'],
      flags: { json: false, force: true },
    });
    command.exit = vi.fn();

    await command.run();

    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.AUTH);
  });

  it('exits with usage when a single task has an invalid ID', async () => {
    mocks.deleteTasks.mockResolvedValue({
      items: [{ id: 'BAD-ID', error: 'Invalid task ID format: BAD-ID' }],
      warnings: [],
    });

    const command = Object.create(Delete.prototype) as InstanceType<typeof Delete> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      argv: ['BAD-ID'],
      flags: { json: false, force: true },
    });
    command.exit = vi.fn();

    await command.run();

    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.USAGE);
  });

  it('exits with failure when every task fails in a multi-id delete', async () => {
    mocks.deleteTasks.mockResolvedValue({
      items: [
        { id: 'ASANA-1', error: 'Not connected to asana' },
        { id: 'LINEAR-2', error: 'Not connected to linear' },
      ],
      warnings: [],
    });

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

    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.FAILURE);
  });

  it('exits with failure when delete is cancelled interactively', async () => {
    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    });

    const { confirm } = await import('@inquirer/prompts');
    vi.mocked(confirm).mockResolvedValue(false);

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

    expect(mocks.deleteTasks).not.toHaveBeenCalled();
    expect(mocks.renderError).toHaveBeenCalledWith('Delete cancelled.');
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.FAILURE);
  });
});
