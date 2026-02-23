// src/commands/today.ts

import { Command, Flags } from '@oclif/core';
import { pluginManager, renderDashboard, renderError } from '@jogi47/pm-cli-core';
import type { OutputFormat, ProviderType } from '@jogi47/pm-cli-core';
import '../init.js';
import { handleCommandError } from '../lib/command-error.js';

export default class Today extends Command {
  static override description = 'Morning dashboard — overdue, due today, and in-progress tasks';

  static override examples = [
    '<%= config.bin %> today',
    '<%= config.bin %> today --source=asana',
    '<%= config.bin %> today --json',
  ];

  static override flags = {
    source: Flags.string({
      char: 's',
      description: 'Filter by provider (asana, notion, trello, linear, clickup)',
      options: ['asana', 'notion', 'trello', 'linear', 'clickup'],
    }),
    json: Flags.boolean({
      description: 'Output in JSON format',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Today);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    await pluginManager.initialize();

    try {
      const tasks = await pluginManager.aggregateTasks('assigned', {
        source: flags.source as ProviderType | undefined,
      });

      renderDashboard(tasks, format);
    } catch (error) {
      handleCommandError(error, 'Failed to fetch tasks');
    }
  }
}
