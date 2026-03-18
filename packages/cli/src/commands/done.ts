// src/commands/done.ts

import { Command, Args, Flags } from '@oclif/core';
import { renderSuccess, renderError, renderWarnings, taskMutationService } from 'pm-cli-core';
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

    const result = await taskMutationService.completeTasks(taskIds);
    const hasErrors = result.items.some((item) => Boolean(item.error));

    renderWarnings(result.warnings);

    if (flags.json) {
      console.log(JSON.stringify(result.items, null, 2));
      if (hasErrors) this.exit(1);
      return;
    }

    for (const item of result.items) {
      if (item.data) {
        renderSuccess(`Completed: ${item.id} — ${item.data.title}`);
      } else {
        renderError(`${item.id}: ${item.error}`);
      }
    }

    if (hasErrors) {
      this.exit(1);
    }
  }
}
