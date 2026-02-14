// src/commands/tasks/assigned.ts

import { Command, Flags } from '@oclif/core';
import { pluginManager, renderTasks, renderError } from '@jogi47/pm-cli-core';
import type { OutputFormat, ProviderType } from '@jogi47/pm-cli-core';
import '../../init.js';

export default class TasksAssigned extends Command {
  static override description = 'List tasks assigned to you';

  static override examples = [
    '<%= config.bin %> tasks assigned',
    '<%= config.bin %> tasks assigned --source=asana',
    '<%= config.bin %> tasks assigned --limit=10 --json',
    '<%= config.bin %> tasks assigned --refresh',
  ];

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
    refresh: Flags.boolean({
      char: 'r',
      description: 'Bypass cache and fetch fresh data',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(TasksAssigned);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    await pluginManager.initialize();

    try {
      const tasks = await pluginManager.aggregateTasks('assigned', {
        source: flags.source as ProviderType | undefined,
        limit: flags.limit,
        refresh: flags.refresh,
      });

      renderTasks(tasks, format);
    } catch (error) {
      renderError(error instanceof Error ? error.message : 'Failed to fetch tasks');
      this.exit(1);
    }
  }
}
