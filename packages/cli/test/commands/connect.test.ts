import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLI_EXIT_CODES } from '../../src/lib/exit-code.js';

const mocks = vi.hoisted(() => ({
  getProviderConnectionState: vi.fn(),
  connectProvider: vi.fn(),
  renderSuccess: vi.fn(),
  renderError: vi.fn(),
  handleCommandError: vi.fn(),
  validateProviderCredentials: vi.fn(),
  input: vi.fn(),
  password: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  input: mocks.input,
  password: mocks.password,
}));

vi.mock('pm-cli-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pm-cli-core')>();
  return {
    ...actual,
    providerSessionService: {
      getProviderConnectionState: mocks.getProviderConnectionState,
      connectProvider: mocks.connectProvider,
    },
    renderSuccess: mocks.renderSuccess,
    renderError: mocks.renderError,
    PROVIDER_CREDENTIALS: {
      asana: {
        requiredFields: ['token'],
        fields: {
          token: {
            label: 'Personal Access Token',
            secret: true,
          },
        },
      },
    },
    validateProviderCredentials: mocks.validateProviderCredentials,
  };
});

vi.mock('../../src/init.js', () => ({}));
vi.mock('../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: Connect } = await import('../../src/commands/connect.js');

describe('connect command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderConnectionState.mockResolvedValue({
      displayName: 'Asana',
      connected: false,
    });
    mocks.validateProviderCredentials.mockReturnValue([]);
    mocks.password.mockResolvedValue('asana-token');
    mocks.input.mockResolvedValue('unused');
    mocks.connectProvider.mockResolvedValue({
      alreadyConnected: false,
      info: {
        displayName: 'Asana',
        userName: 'Ada',
        workspace: 'Workspace One',
      },
    });
  });

  it('exits with usage status when prompted credentials are incomplete', async () => {
    mocks.password.mockResolvedValue('');
    mocks.validateProviderCredentials.mockReturnValue(['token']);

    const command = Object.create(Connect.prototype) as InstanceType<typeof Connect> & {
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

    expect(mocks.password).toHaveBeenCalledWith({
      message: 'Personal Access Token',
      mask: '*',
    });
    expect(mocks.renderError).toHaveBeenCalledWith('Missing required credentials: token');
    expect(mocks.connectProvider).not.toHaveBeenCalled();
    expect(command.exit).toHaveBeenCalledWith(CLI_EXIT_CODES.USAGE);
  });

  it('treats already-connected providers as a no-op success', async () => {
    mocks.getProviderConnectionState.mockResolvedValue({
      displayName: 'Asana',
      connected: true,
      info: {
        displayName: 'Asana',
        userName: 'Ada',
        workspace: 'Workspace One',
      },
    });

    const command = Object.create(Connect.prototype) as InstanceType<typeof Connect> & {
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

    expect(mocks.password).not.toHaveBeenCalled();
    expect(mocks.connectProvider).not.toHaveBeenCalled();
    expect(command.log).toHaveBeenNthCalledWith(1, 'Already connected to Asana as Ada');
    expect(command.log).toHaveBeenNthCalledWith(2, 'Workspace: Workspace One');
    expect(command.log).toHaveBeenNthCalledWith(3, '');
    expect(command.log).toHaveBeenNthCalledWith(4, 'To reconnect, first run: pm disconnect asana');
    expect(command.exit).not.toHaveBeenCalled();
  });

  it('delegates auth failures to handleCommandError', async () => {
    const { AuthenticationError } = await import('pm-cli-core');
    const authError = new AuthenticationError('asana', 'Invalid token');
    mocks.connectProvider.mockRejectedValue(authError);

    const command = Object.create(Connect.prototype) as InstanceType<typeof Connect> & {
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

    expect(mocks.handleCommandError).toHaveBeenCalledWith(authError, 'Failed to connect');
  });
});
