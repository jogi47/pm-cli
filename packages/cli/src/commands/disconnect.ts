// src/commands/disconnect.ts

import { Command, Args } from '@oclif/core';
import { providerSessionService, renderSuccess } from 'pm-cli-core';
import type { ProviderType } from 'pm-cli-core';
import '../init.js';
import { handleCommandError } from '../lib/command-error.js';

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
      options: ['asana', 'notion', 'trello', 'linear', 'clickup'],
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Disconnect);
    const providerName = args.provider as ProviderType;

    try {
      const result = await providerSessionService.disconnectProvider(providerName);
      if (!result.wasConnected) {
        this.log(`Not connected to ${result.displayName}`);
        return;
      }

      renderSuccess(`Disconnected from ${result.displayName}`);
    } catch (error) {
      handleCommandError(error, 'Failed to disconnect');
    }
  }
}
