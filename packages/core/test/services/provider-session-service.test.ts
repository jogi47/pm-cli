import { describe, expect, it, vi } from 'vitest';
import { NotConnectedError } from '../../src/utils/errors.js';
import { ProviderSessionService } from '../../src/services/provider-session-service.js';
import type { PMPluginBase, ProviderInfo } from '../../src/models/plugin.js';

function providerInfo(overrides: Partial<ProviderInfo> = {}): ProviderInfo {
  return {
    name: 'asana',
    displayName: 'Asana',
    connected: true,
    capabilities: {
      comments: true,
      thread: true,
      attachmentDownload: true,
      workspaces: true,
      customFields: true,
      projectPlacement: true,
    },
    ...overrides,
  };
}

function plugin(overrides: Partial<PMPluginBase> & Record<string, unknown> = {}): PMPluginBase & Record<string, unknown> {
  return {
    name: 'asana',
    displayName: 'Asana',
    capabilities: {
      comments: true,
      thread: true,
      attachmentDownload: true,
      workspaces: true,
      customFields: true,
      projectPlacement: true,
    },
    async initialize() {},
    async authenticate() {},
    async disconnect() {},
    async isAuthenticated() { return true; },
    async getInfo() { return providerInfo(); },
    async validateConnection() { return true; },
    async getAssignedTasks() { return []; },
    async getOverdueTasks() { return []; },
    async searchTasks() { return []; },
    async getTask() { return null; },
    getTaskUrl(externalId: string) { return `https://example.com/${externalId}`; },
    async createTask() { throw new Error('not used'); },
    async updateTask() { throw new Error('not used'); },
    async completeTask() { throw new Error('not used'); },
    async deleteTask() {},
    ...overrides,
  };
}

describe('ProviderSessionService', () => {
  it('returns connected provider state without prompting command code to inspect plugins directly', async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getPlugin: vi.fn().mockReturnValue(plugin()),
      getProvidersInfo: vi.fn(),
    };

    const service = new ProviderSessionService(manager);
    const result = await service.getProviderConnectionState('asana');

    expect(result).toEqual({
      displayName: 'Asana',
      connected: true,
      info: providerInfo(),
    });
  });

  it('returns a no-op disconnect result when the provider is already disconnected', async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getPlugin: vi.fn().mockReturnValue(plugin({
        async isAuthenticated() { return false; },
      })),
      getProvidersInfo: vi.fn(),
    };

    const service = new ProviderSessionService(manager);
    const result = await service.disconnectProvider('asana');

    expect(result).toEqual({
      displayName: 'Asana',
      wasConnected: false,
    });
  });

  it('delegates provider listing to the plugin manager', async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getPlugin: vi.fn(),
      getProvidersInfo: vi.fn().mockResolvedValue([providerInfo()]),
    };

    const service = new ProviderSessionService(manager);
    await expect(service.getProviders()).resolves.toEqual([providerInfo()]);
  });

  it('rejects workspace access when the provider is not connected', async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getPlugin: vi.fn().mockReturnValue(plugin({
        async isAuthenticated() { return false; },
      })),
      getProvidersInfo: vi.fn(),
    };

    const service = new ProviderSessionService(manager);

    await expect(service.getWorkspaceState('asana')).rejects.toBeInstanceOf(NotConnectedError);
  });

  it('switches workspaces through the shared session boundary', async () => {
    const workspaces = [
      { id: 'ws-1', name: 'Workspace One' },
      { id: 'ws-2', name: 'Workspace Two' },
    ];
    let current = workspaces[0];
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getPlugin: vi.fn().mockReturnValue(plugin({
        getWorkspaces() { return workspaces; },
        getCurrentWorkspace() { return current; },
        setWorkspace(workspaceId: string) {
          current = workspaces.find((workspace) => workspace.id === workspaceId)!;
        },
      })),
      getProvidersInfo: vi.fn(),
    };

    const service = new ProviderSessionService(manager);
    const result = await service.switchWorkspace('asana', 'ws-2');

    expect(result.currentWorkspace).toEqual({ id: 'ws-2', name: 'Workspace Two' });
    expect(result.workspaces).toEqual(workspaces);
  });
});
