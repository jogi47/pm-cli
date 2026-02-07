// src/commands/tasks/overdue.ts

import { Command, Flags } from '@oclif/core';
import { pluginManager, renderTasks, renderError } from '@pm-cli/core';
import type { OutputFormat, ProviderType } from '@pm-cli/core';
import '../../init.js';

export default class TasksOverdue extends Command {
  static override description = 'List overdue tasks';

  static override examples = [
    '<%= config.bin %> tasks overdue',
    '<%= config.bin %> tasks overdue --source=asana',
    '<%= config.bin %> tasks overdue --json',
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
    const { flags } = await this.parse(TasksOverdue);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    await pluginManager.initialize();

    try {
      const tasks = await pluginManager.aggregateTasks('overdue', {
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
