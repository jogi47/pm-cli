import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    completeTasks: vi.fn(),
    renderSuccess: vi.fn(),
    renderError: vi.fn(),
    renderWarnings: vi.fn(),
  };
});

vi.mock('pm-cli-core', () => ({
  taskMutationService: {
    completeTasks: mocks.completeTasks,
  },
  renderSuccess: mocks.renderSuccess,
  renderError: mocks.renderError,
  renderWarnings: mocks.renderWarnings,
}));

vi.mock('../../src/init.js', () => ({}));

const { default: Done } = await import('../../src/commands/done.js');

describe('done command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.completeTasks.mockResolvedValue({ items: [], warnings: [] });
  });

  it('renders normalized bulk completion results and exits non-zero on item errors', async () => {
    mocks.completeTasks.mockResolvedValue({
      items: [
        {
          id: 'ASANA-1',
          data: {
            id: 'ASANA-1',
            title: 'Fix login',
          },
        },
        {
          id: 'LINEAR-2',
          error: 'linear outage',
        },
      ],
      warnings: [],
    });

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

    expect(mocks.completeTasks).toHaveBeenCalledWith(['ASANA-1', 'LINEAR-2']);
    expect(mocks.renderSuccess).toHaveBeenCalledWith('Completed: ASANA-1 — Fix login');
    expect(mocks.renderError).toHaveBeenCalledWith('LINEAR-2: linear outage');
    expect(command.exit).toHaveBeenCalledWith(1);
  });

  it('emits only JSON to stdout in --json mode', async () => {
    const logs: string[] = [];
    const consoleLog = vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });

    mocks.completeTasks.mockResolvedValue({
      items: [
        {
          id: 'ASANA-1',
          data: {
            id: 'ASANA-1',
            title: 'Fix login',
          },
        },
        {
          id: 'LINEAR-2',
          error: 'linear outage',
        },
      ],
      warnings: ['partial completion'],
    });

    const command = Object.create(Done.prototype) as InstanceType<typeof Done> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      argv: ['ASANA-1', 'LINEAR-2'],
      flags: { json: true },
    });
    command.exit = vi.fn();

    try {
      await command.run();
    } finally {
      consoleLog.mockRestore();
    }

    expect(mocks.renderWarnings).toHaveBeenCalledWith(['partial completion']);
    expect(mocks.renderSuccess).not.toHaveBeenCalled();
    expect(mocks.renderError).not.toHaveBeenCalled();
    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0])).toEqual([
      {
        id: 'ASANA-1',
        data: {
          id: 'ASANA-1',
          title: 'Fix login',
        },
      },
      {
        id: 'LINEAR-2',
        error: 'linear outage',
      },
    ]);
    expect(command.exit).toHaveBeenCalledWith(1);
  });
});
