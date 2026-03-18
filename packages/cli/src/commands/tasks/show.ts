// src/commands/tasks/show.ts

import { Command, Args, Flags } from '@oclif/core';
import { renderTask, renderError, taskReadService } from 'pm-cli-core';
import type { OutputFormat } from 'pm-cli-core';
import '../../init.js';
import { handleCommandError } from '../../lib/command-error.js';

export default class TasksShow extends Command {
  static override description = 'Show task details';

  static override examples = [
    '<%= config.bin %> tasks show ASANA-1234567890',
    '<%= config.bin %> tasks show NOTION-abc123def456',
    '<%= config.bin %> tasks show ASANA-1234567890 --json',
  ];

  static override args = {
    id: Args.string({
      description: 'Task ID (format: PROVIDER-externalId)',
      required: true,
    }),
  };

  static override flags = {
    json: Flags.boolean({
      description: 'Output in JSON format',
      default: false,
    }),
    open: Flags.boolean({
      char: 'o',
      description: 'Open task in browser',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TasksShow);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    try {
      const result = await taskReadService.getTask(args.id);
      const task = result.task;

      if (!task) {
        renderError(`Task not found: ${args.id}`);
        this.exit(1);
        return;
      }

      // Open in browser if requested
      if (flags.open) {
        const open = (await import('open')).default;
        await open(task.url);
        this.log(`Opened in browser: ${task.url}`);
        return;
      }

      renderTask(task, format);
    } catch (error) {
      handleCommandError(error, 'Failed to fetch task');
    }
  }
}
