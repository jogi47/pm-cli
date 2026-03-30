import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getProviders: vi.fn(),
  renderProviders: vi.fn(),
}));

vi.mock('pm-cli-core', () => ({
  providerSessionService: {
    getProviders: mocks.getProviders,
  },
  renderProviders: mocks.renderProviders,
}));

vi.mock('../../src/init.js', () => ({}));

const { default: Providers } = await import('../../src/commands/providers.js');

describe('providers command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes provider capabilities to the shared renderer', async () => {
    mocks.getProviders.mockResolvedValue([
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

  it('uses the shared json envelope renderer in json mode', async () => {
    mocks.getProviders.mockResolvedValue([
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
      flags: { json: true },
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
    ], 'json', {
      command: 'providers',
    });
  });
});
