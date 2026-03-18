import { isWorkspaceCapable, type ProviderCredentials, type ProviderInfo, type Workspace } from '../models/plugin.js';
import type { ProviderType } from '../models/task.js';
import { pluginManager } from '../managers/plugin-manager.js';
import { NotConnectedError, PMCliError } from '../utils/errors.js';

type ProviderSessionPluginManager = Pick<typeof pluginManager, 'initialize' | 'getPlugin' | 'getProvidersInfo'>;

export interface ConnectProviderResult {
  info: ProviderInfo;
  alreadyConnected: boolean;
}

export interface ProviderConnectionState {
  displayName: string;
  connected: boolean;
  info?: ProviderInfo;
}

export interface DisconnectProviderResult {
  displayName: string;
  wasConnected: boolean;
}

export interface ProviderWorkspaceState {
  providerName: ProviderType;
  displayName: string;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
}

export class ProviderSessionService {
  constructor(private readonly manager: ProviderSessionPluginManager = pluginManager) {}

  async getProviderConnectionState(provider: ProviderType): Promise<ProviderConnectionState> {
    const plugin = await this.requirePlugin(provider);
    const connected = await plugin.isAuthenticated();

    return {
      displayName: plugin.displayName,
      connected,
      info: connected ? await plugin.getInfo() : undefined,
    };
  }

  async connectProvider(provider: ProviderType, credentials: ProviderCredentials): Promise<ConnectProviderResult> {
    const plugin = await this.requirePlugin(provider);

    if (await plugin.isAuthenticated()) {
      return {
        info: await plugin.getInfo(),
        alreadyConnected: true,
      };
    }

    await plugin.authenticate(credentials);
    return {
      info: await plugin.getInfo(),
      alreadyConnected: false,
    };
  }

  async disconnectProvider(provider: ProviderType): Promise<DisconnectProviderResult> {
    const plugin = await this.requirePlugin(provider);

    if (!(await plugin.isAuthenticated())) {
      return {
        displayName: plugin.displayName,
        wasConnected: false,
      };
    }

    await plugin.disconnect();
    return {
      displayName: plugin.displayName,
      wasConnected: true,
    };
  }

  async getProviders(): Promise<ProviderInfo[]> {
    await this.manager.initialize();
    return this.manager.getProvidersInfo();
  }

  async getWorkspaceState(provider: ProviderType): Promise<ProviderWorkspaceState> {
    const plugin = await this.requireConnectedWorkspacePlugin(provider);

    const workspaces = plugin.getWorkspaces();
    if (workspaces.length === 0) {
      throw new PMCliError({
        message: 'No workspaces found',
      });
    }

    return {
      providerName: provider,
      displayName: plugin.displayName,
      workspaces,
      currentWorkspace: plugin.getCurrentWorkspace(),
    };
  }

  async switchWorkspace(provider: ProviderType, workspaceId: string): Promise<ProviderWorkspaceState> {
    const plugin = await this.requireConnectedWorkspacePlugin(provider);
    plugin.setWorkspace(workspaceId);

    return {
      providerName: provider,
      displayName: plugin.displayName,
      workspaces: plugin.getWorkspaces(),
      currentWorkspace: plugin.getCurrentWorkspace(),
    };
  }

  private async requirePlugin(provider: ProviderType) {
    await this.manager.initialize();
    const plugin = this.manager.getPlugin(provider);

    if (!plugin) {
      throw new PMCliError({
        message: `Unknown provider: ${provider}`,
        reason: 'The provider is not registered.',
        suggestion: 'Use `pm providers` to list available providers.',
      });
    }

    return plugin;
  }

  private async requireConnectedWorkspacePlugin(provider: ProviderType) {
    const plugin = await this.requirePlugin(provider);

    if (!(await plugin.isAuthenticated())) {
      throw new NotConnectedError(provider);
    }

    if (!plugin.capabilities.workspaces) {
      throw new PMCliError({
        message: `${plugin.displayName} does not support multiple workspaces`,
        reason: 'The provider capability manifest marks workspace support as unavailable.',
        suggestion: 'Use `pm providers` to review provider capabilities.',
      });
    }

    if (!isWorkspaceCapable(plugin)) {
      throw new PMCliError({
        message: `${plugin.displayName} does not support multiple workspaces`,
        reason: 'The provider declared workspace support, but the required methods are missing.',
        suggestion: 'Use `pm providers` to review provider capabilities.',
      });
    }

    return plugin;
  }
}

export const providerSessionService = new ProviderSessionService();
