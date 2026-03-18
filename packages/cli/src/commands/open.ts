// src/commands/open.ts

import { Command, Args } from '@oclif/core';
import { renderError, taskReadService } from 'pm-cli-core';
import '../init.js';
import { handleCommandError } from '../lib/command-error.js';

export default class Open extends Command {
  static override description = 'Open a task in the browser';

  static override examples = [
    '<%= config.bin %> open ASANA-123456',
    '<%= config.bin %> open NOTION-abc123',
  ];

  static override args = {
    id: Args.string({
      description: 'Task ID (format: PROVIDER-externalId)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Open);

    try {
      const result = await taskReadService.getTask(args.id);
      const task = result.task;
      if (!task) {
        renderError(`Task not found: ${args.id}`);
        this.exit(1);
        return;
      }

      const url = task.url;
      const open = (await import('open')).default;
      await open(url);
      this.log(`Opened in browser: ${url}`);
    } catch (error) {
      handleCommandError(error, 'Failed to open task');
    }
  }
}
