// src/commands/connect.ts

import { Command, Args } from '@oclif/core';
import { input, password } from '@inquirer/prompts';
import { pluginManager, renderSuccess, renderError, PROVIDER_CREDENTIALS } from '@jogi47/pm-cli-core';
import type { ProviderCredentials, ProviderType } from '@jogi47/pm-cli-core';
import '../init.js';
import { handleCommandError } from '../lib/command-error.js';

export default class Connect extends Command {
  static override description = 'Connect to a project management provider';

  static override examples = [
    '<%= config.bin %> connect asana',
    '<%= config.bin %> connect notion',
  ];

  static override args = {
    provider: Args.string({
      description: 'Provider to connect to',
      required: true,
      options: ['asana', 'notion', 'trello', 'linear', 'clickup'],
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Connect);
    const providerName = args.provider as ProviderType;

    await pluginManager.initialize();
    const plugin = pluginManager.getPlugin(providerName);

    if (!plugin) {
      renderError(`Unknown provider: ${providerName}`);
      return;
    }

    // Check if already connected
    if (await plugin.isAuthenticated()) {
      const info = await plugin.getInfo();
      this.log(`Already connected to ${plugin.displayName} as ${info.userName}`);
      this.log(`Workspace: ${info.workspace}`);
      this.log('');
      this.log('To reconnect, first run: pm disconnect ' + providerName);
      return;
    }

    // Get credentials config for this provider
    const credConfig = PROVIDER_CREDENTIALS[providerName];
    const credentials: ProviderCredentials = { token: '' };

    this.log(`\nConnecting to ${plugin.displayName}...\n`);

    // Prompt for each required field
    for (const field of credConfig.fields) {
      const label = credConfig.labels[field];

      if (field === 'token') {
        credentials.token = await password({
          message: label,
          mask: '*',
        });
      } else {
        credentials[field] = await input({
          message: label,
        });
      }
    }

    // Attempt to authenticate
    try {
      await plugin.authenticate(credentials);

      const info = await plugin.getInfo();
      this.log('');
      renderSuccess(`Connected to ${plugin.displayName}!`);
      this.log(`  User: ${info.userName}`);
      this.log(`  Workspace: ${info.workspace}`);
    } catch (error) {
      handleCommandError(error, 'Failed to connect');
    }
  }
}
