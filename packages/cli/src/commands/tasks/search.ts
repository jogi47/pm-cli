// src/commands/tasks/search.ts

import { Command, Args, Flags } from '@oclif/core';
import { pluginManager, renderTasks, renderError } from '@jogi47/pm-cli-core';
import type { OutputFormat, ProviderType } from '@jogi47/pm-cli-core';
import '../../init.js';

export default class TasksSearch extends Command {
  static override description = 'Search for tasks';

  static override examples = [
    '<%= config.bin %> tasks search "login bug"',
    '<%= config.bin %> tasks search "api" --source=asana',
    '<%= config.bin %> tasks search "urgent" --json',
  ];

  static override args = {
    query: Args.string({
      description: 'Search query',
      required: true,
    }),
  };

  static override flags = {
    source: Flags.string({
      char: 's',
      description: 'Filter by provider (asana, notion)',
      options: ['asana', 'notion'],
    }),
    limit: Flags.integer({
      char: 'l',
      description: 'Maximum number of tasks to show',
      default: 25,
    }),
    json: Flags.boolean({
      description: 'Output in JSON format',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TasksSearch);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    await pluginManager.initialize();

    try {
      const tasks = await pluginManager.searchTasks(args.query, {
        source: flags.source as ProviderType | undefined,
        limit: flags.limit,
      });

      renderTasks(tasks, format);
    } catch (error) {
      renderError(error instanceof Error ? error.message : 'Failed to search tasks');
      this.exit(1);
    }
  }
}
