import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    deleteTasks: vi.fn(),
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

    expect(mocks.deleteTasks).not.toHaveBeenCalled();
    expect(mocks.renderError).toHaveBeenCalledWith('Delete requires confirmation. Re-run with --force to confirm.');
    expect(command.exit).toHaveBeenCalledWith(1);
  });

  it('emits only JSON to stdout in --json mode', async () => {
    const logs: string[] = [];
    const consoleLog = vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });

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

    try {
      await command.run();
    } finally {
      consoleLog.mockRestore();
    }

    expect(mocks.renderWarnings).toHaveBeenCalledWith(['partial delete']);
    expect(mocks.renderSuccess).not.toHaveBeenCalled();
    expect(mocks.renderError).not.toHaveBeenCalled();
    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0])).toEqual([
      { id: 'ASANA-1' },
      { id: 'LINEAR-2', error: 'delete denied' },
    ]);
    expect(command.exit).toHaveBeenCalledWith(1);
  });
});
