import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLI_EXIT_CODES } from '../../src/lib/exit-code.js';

const mocks = vi.hoisted(() => {
  return {
    completeTasks: vi.fn(),
    renderJsonEnvelope: vi.fn(),
    renderSuccess: vi.fn(),
    renderError: vi.fn(),
    renderWarnings: vi.fn(),
  };
});

vi.mock('pm-cli-core', () => ({
  taskMutationService: {
    completeTasks: mocks.completeTasks,
  },
  renderJsonEnvelope: mocks.renderJsonEnvelope,
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
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.PARTIAL);
  });

  it('emits only JSON to stdout in --json mode', async () => {
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

    await command.run();

    expect(mocks.renderWarnings).not.toHaveBeenCalled();
    expect(mocks.renderSuccess).not.toHaveBeenCalled();
    expect(mocks.renderError).not.toHaveBeenCalled();
    expect(mocks.renderJsonEnvelope).toHaveBeenCalledWith('done', [
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
    ], {
      warnings: ['partial completion'],
      errors: ['LINEAR-2: linear outage'],
    });
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.PARTIAL);
  });

  it('exits with auth when a single task is not connected', async () => {
    mocks.completeTasks.mockResolvedValue({
      items: [{ id: 'ASANA-1', error: 'Not connected to asana' }],
      warnings: [],
    });

    const command = Object.create(Done.prototype) as InstanceType<typeof Done> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      argv: ['ASANA-1'],
      flags: { json: false },
    });
    command.exit = vi.fn();

    await command.run();

    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.AUTH);
  });

  it('exits with usage when a single task has an invalid ID', async () => {
    mocks.completeTasks.mockResolvedValue({
      items: [{ id: 'BAD-ID', error: 'Invalid task ID format: BAD-ID' }],
      warnings: [],
    });

    const command = Object.create(Done.prototype) as InstanceType<typeof Done> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      argv: ['BAD-ID'],
      flags: { json: false },
    });
    command.exit = vi.fn();

    await command.run();

    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.USAGE);
  });

  it('exits with failure when every task fails in a multi-id completion', async () => {
    mocks.completeTasks.mockResolvedValue({
      items: [
        { id: 'ASANA-1', error: 'Not connected to asana' },
        { id: 'LINEAR-2', error: 'Not connected to linear' },
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

    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.FAILURE);
  });
});
