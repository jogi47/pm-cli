// src/commands/done.ts

import { Command, Args, Flags } from '@oclif/core';
import { pluginManager, renderSuccess, renderError } from '@pm-cli/core';
import '../init.js';

export default class Done extends Command {
  static override description = 'Mark one or more tasks as done';

  static override examples = [
    '<%= config.bin %> done ASANA-123456',
    '<%= config.bin %> done ASANA-123456 ASANA-789012',
    '<%= config.bin %> done ASANA-123456 --json',
  ];

  static override strict = false;

  static override args = {
    ids: Args.string({
      description: 'Task ID(s) to complete (format: PROVIDER-externalId)',
      required: true,
    }),
  };

  static override flags = {
    json: Flags.boolean({
      description: 'Output in JSON format',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(Done);
    const taskIds = argv as string[];

    if (taskIds.length === 0) {
      renderError('Please provide at least one task ID.');
      this.exit(1);
      return;
    }

    await pluginManager.initialize();

    const results = await pluginManager.completeTasks(taskIds);

    if (flags.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    let hasErrors = false;
    for (const result of results) {
      if (result.task) {
        renderSuccess(`Completed: ${result.id} — ${result.task.title}`);
      } else {
        renderError(`${result.id}: ${result.error}`);
        hasErrors = true;
      }
    }

    if (hasErrors) {
      this.exit(1);
    }
  }
}
