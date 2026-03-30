// src/commands/summary.ts

import { Command, Flags } from '@oclif/core';
import { providerSessionService, renderSummary, renderWarnings, taskQueryService } from 'pm-cli-core';
import type { OutputFormat, Task } from 'pm-cli-core';
import '../init.js';
import { handleCommandError } from '../lib/command-error.js';

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

    try {
      const providers = await providerSessionService.getProviders();
      let warnings: string[] = [];

      let tasks: Task[];
      try {
        const result = await taskQueryService.getAssignedTasks();
        tasks = result.tasks;
        warnings = result.warnings;
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

      if (flags.json) {
        renderSummary(providers, { overdue, dueToday, inProgress, total }, format, {
          command: 'summary',
          warnings,
        });
      } else {
        renderWarnings(warnings);
        renderSummary(providers, { overdue, dueToday, inProgress, total }, format);
      }
    } catch (error) {
      handleCommandError(error, 'Failed to fetch summary');
    }
  }
}
