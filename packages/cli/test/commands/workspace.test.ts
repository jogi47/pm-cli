import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getWorkspaceState: vi.fn(),
  switchWorkspace: vi.fn(),
  renderSuccess: vi.fn(),
  renderInfo: vi.fn(),
  handleCommandError: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  select: mocks.select,
}));

vi.mock('pm-cli-core', () => ({
  providerSessionService: {
    getWorkspaceState: mocks.getWorkspaceState,
    switchWorkspace: mocks.switchWorkspace,
  },
  renderSuccess: mocks.renderSuccess,
  renderInfo: mocks.renderInfo,
}));

vi.mock('../../src/init.js', () => ({}));
vi.mock('../../src/lib/command-error.js', () => ({
  handleCommandError: mocks.handleCommandError,
}));

const { default: Workspace } = await import('../../src/commands/workspace.js');

describe('workspace command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWorkspaceState.mockResolvedValue({
      providerName: 'asana',
      displayName: 'Asana',
      workspaces: [
        { id: 'ws-1', name: 'Workspace One' },
      ],
      currentWorkspace: { id: 'ws-1', name: 'Workspace One' },
    });
  });

  it('treats switch requests with only one workspace as a no-op success', async () => {
    const command = Object.create(Workspace.prototype) as InstanceType<typeof Workspace> & {
      parse: ReturnType<typeof vi.fn>;
      exit: ReturnType<typeof vi.fn>;
      log: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      args: { action: 'switch' },
      flags: { source: 'asana' },
    });
    command.exit = vi.fn();
    command.log = vi.fn();

    await command.run();

    expect(mocks.getWorkspaceState).toHaveBeenCalledWith('asana');
    expect(mocks.renderInfo).toHaveBeenCalledWith('Only one workspace available');
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.switchWorkspace).not.toHaveBeenCalled();
    expect(command.exit).not.toHaveBeenCalled();
  });
});
