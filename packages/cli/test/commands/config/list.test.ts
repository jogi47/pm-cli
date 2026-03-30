import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listConfig: vi.fn(),
  renderJsonEnvelope: vi.fn(),
  handleCommandError: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  configManager: {
    listConfig: mocks.listConfig,
  },
  renderJsonEnvelope: mocks.renderJsonEnvelope,
}));

vi.mock('../../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: ConfigList } = await import('../../../src/commands/config/list.js');

describe('config list command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the shared json envelope renderer', async () => {
    mocks.listConfig.mockReturnValue({
      defaultSource: 'asana',
      defaultLimit: 25,
    });

    const command = Object.create(ConfigList.prototype) as InstanceType<typeof ConfigList> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      flags: { json: true },
    });

    await command.run();

    expect(mocks.renderJsonEnvelope).toHaveBeenCalledWith('config list', {
      defaultSource: 'asana',
      defaultLimit: 25,
    });
  });
});
