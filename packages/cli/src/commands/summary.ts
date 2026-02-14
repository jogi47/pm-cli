// src/commands/summary.ts

import { Command, Flags } from '@oclif/core';
import { pluginManager, renderSummary, renderError } from '@jogi47/pm-cli-core';
import type { OutputFormat, Task } from '@jogi47/pm-cli-core';
import '../init.js';

export default class Summary extends Command {
  static override description = 'Show provider connection status and task count statistics';

  static override examples = [
    '<%= config.bin %> summary',
    '<%= config.bin %> summary --json',
  ];

  static override flags = {
    json: Flags.boolean({
      description: 'Output in JSON format',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Summary);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    await pluginManager.initialize();

    try {
      const providers = await pluginManager.getProvidersInfo();

      let tasks: Task[];
      try {
        tasks = await pluginManager.aggregateTasks('assigned');
      } catch {
        tasks = [];
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let overdue = 0;
      let dueToday = 0;
      let inProgress = 0;
      let total = 0;

      for (const task of tasks) {
        if (task.status === 'done') continue;
        total++;
        if (task.status === 'in_progress') inProgress++;
        if (task.dueDate) {
          const taskDate = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate());
          if (taskDate.getTime() < today.getTime()) overdue++;
          else if (taskDate.getTime() === today.getTime()) dueToday++;
        }
      }

      renderSummary(providers, { overdue, dueToday, inProgress, total }, format);
    } catch (error) {
      renderError(error instanceof Error ? error.message : 'Failed to fetch summary');
      this.exit(1);
    }
  }
}
