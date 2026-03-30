// src/commands/providers.ts

import { Command, Flags } from '@oclif/core';
import { providerSessionService, renderProviders } from 'pm-cli-core';
import type { OutputFormat } from 'pm-cli-core';
import '../init.js';

export default class Providers extends Command {
  static override description = 'List configured providers and their connection status';

  static override examples = [
    '<%= config.bin %> providers',
    '<%= config.bin %> providers --json',
  ];

  static override flags = {
    json: Flags.boolean({
      description: 'Output in JSON format',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Providers);
    const format: OutputFormat = flags.json ? 'json' : 'table';
    const providersInfo = await providerSessionService.getProviders();

    const displayData = providersInfo.map((p) => ({
      name: p.displayName,
      connected: p.connected,
      workspace: p.workspace,
      user: p.userName,
      capabilities: p.capabilities,
    }));

    if (flags.json) {
      renderProviders(displayData, format, { command: 'providers' });
    } else {
      renderProviders(displayData, format);
    }
  }
}
