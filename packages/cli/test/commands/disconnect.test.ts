import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  disconnectProvider: vi.fn(),
  renderSuccess: vi.fn(),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  providerSessionService: {
    disconnectProvider: mocks.disconnectProvider,
  },
  renderSuccess: mocks.renderSuccess,
}));

vi.mock('../../src/init.js', () => ({}));
vi.mock('../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: Disconnect } = await import('../../src/commands/disconnect.js');

describe('disconnect command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.disconnectProvider.mockResolvedValue({
      displayName: 'Asana',
      wasConnected: false,
    });
  });

  it('treats an already-disconnected provider as a no-op success', async () => {
    const command = Object.create(Disconnect.prototype) as InstanceType<typeof Disconnect> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
      log: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { provider: 'asana' },
    });
    command.exit = vi.fn();
    command.log = vi.fn();

    await command.run();

    expect(mocks.disconnectProvider).toHaveBeenCalledWith('asana');
    expect(command.log).toHaveBeenCalledWith('Not connected to Asana');
    expect(mocks.renderSuccess).not.toHaveBeenCalled();
    expect(command.exit).not.toHaveBeenCalled();
  });
});
