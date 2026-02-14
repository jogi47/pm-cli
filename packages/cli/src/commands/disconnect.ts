// src/commands/disconnect.ts

import { Command, Args } from '@oclif/core';
import { pluginManager, renderSuccess, renderError } from '@jogi47/pm-cli-core';
import type { ProviderType } from '@jogi47/pm-cli-core';
import '../init.js';

export default class Disconnect extends Command {
  static override description = 'Disconnect from a project management provider';

  static override examples = [
    '<%= config.bin %> disconnect asana',
    '<%= config.bin %> disconnect notion',
  ];

  static override args = {
    provider: Args.string({
      description: 'Provider to disconnect from',
      required: true,
      options: ['asana', 'notion'],
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Disconnect);
    const providerName = args.provider as ProviderType;

    await pluginManager.initialize();
    const plugin = pluginManager.getPlugin(providerName);

    if (!plugin) {
      renderError(`Unknown provider: ${providerName}`);
      return;
    }

    // Check if connected
    if (!(await plugin.isAuthenticated())) {
      this.log(`Not connected to ${plugin.displayName}`);
      return;
    }

    try {
      await plugin.disconnect();
      renderSuccess(`Disconnected from ${plugin.displayName}`);
    } catch (error) {
      renderError(`Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.exit(1);
    }
  }
}
