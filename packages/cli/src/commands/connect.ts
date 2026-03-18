// src/commands/connect.ts

import { Command, Args } from '@oclif/core';
import { input, password } from '@inquirer/prompts';
import { providerSessionService, renderSuccess, renderError, PROVIDER_CREDENTIALS, validateProviderCredentials } from 'pm-cli-core';
import type { ProviderCredentials, ProviderType } from 'pm-cli-core';
import '../init.js';
import { handleCommandError } from '../lib/command-error.js';

export default class Connect extends Command {
  static override description = 'Connect to a project management provider and store credentials locally';

  static override examples = [
    '<%= config.bin %> connect asana',
    '<%= config.bin %> connect linear',
    '<%= config.bin %> connect notion',
    '<%= config.bin %> connect trello',
    '<%= config.bin %> connect clickup',
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

    let connectionState;
    try {
      connectionState = await providerSessionService.getProviderConnectionState(providerName);
    } catch (error) {
      handleCommandError(error, 'Failed to connect');
    }

    if (connectionState.connected && connectionState.info) {
      const info = connectionState.info;
      this.log(`Already connected to ${info.displayName} as ${info.userName}`);
      this.log(`Workspace: ${info.workspace}`);
      this.log('');
      this.log('To reconnect, first run: pm disconnect ' + providerName);
      return;
    }

    // Get credentials config for this provider
    const credConfig = PROVIDER_CREDENTIALS[providerName];
    const credentials: ProviderCredentials = { token: '' };
    this.log(`\nConnecting to ${connectionState.displayName}...\n`);

    // Prompt for each required field
    for (const field of credConfig.requiredFields) {
      const fieldSpec = credConfig.fields[field];
      const label = fieldSpec?.label ?? field;

      if (fieldSpec?.secret) {
        credentials[field] = await password({
          message: label,
          mask: '*',
        });
      } else {
        credentials[field] = await input({
          message: label,
        });
      }
    }

    const missingFields = validateProviderCredentials(providerName, credentials);
    if (missingFields.length > 0) {
      renderError(`Missing required credentials: ${missingFields.join(', ')}`);
      return;
    }

    // Attempt to authenticate
    try {
      const result = await providerSessionService.connectProvider(providerName, credentials);
      const info = result.info;

      this.log('');
      renderSuccess(`Connected to ${info.displayName}!`);
      this.log(`  User: ${info.userName}`);
      this.log(`  Workspace: ${info.workspace}`);
    } catch (error) {
      handleCommandError(error, 'Failed to connect');
    }
  }
}
