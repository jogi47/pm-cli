import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  getProvidersInfo: vi.fn(),
  renderProviders: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  pluginManager: {
    initialize: mocks.initialize,
    getProvidersInfo: mocks.getProvidersInfo,
  },
  renderProviders: mocks.renderProviders,
}));

vi.mock('../../src/init.js', () => ({}));

const { default: Providers } = await import('../../src/commands/providers.js');

describe('providers command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initialize.mockResolvedValue(undefined);
  });

  it('passes provider capabilities to the shared renderer', async () => {
    mocks.getProvidersInfo.mockResolvedValue([
      {
        name: 'asana',
        displayName: 'Asana',
        connected: true,
        workspace: 'Workspace One',
        userName: 'Ada',
        capabilities: {
          comments: true,
          thread: true,
          attachmentDownload: true,
          workspaces: true,
          customFields: true,
          projectPlacement: true,
        },
      },
    ]);

    const command = Object.create(Providers.prototype) as InstanceType<typeof Providers> & {
      parse: ReturnType<typeof vi.fn>;
    };
    command.parse = vi.fn().mockResolvedValue({
      flags: { json: false },
    });

    await command.run();

    expect(mocks.renderProviders).toHaveBeenCalledWith([
      {
        name: 'Asana',
        connected: true,
        workspace: 'Workspace One',
        user: 'Ada',
        capabilities: {
          comments: true,
          thread: true,
          attachmentDownload: true,
          workspaces: true,
          customFields: true,
          projectPlacement: true,
        },
      },
    ], 'table');
  });
});
