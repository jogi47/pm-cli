// src/commands/delete.ts

import { Command, Args, Flags } from '@oclif/core';
import { pluginManager, renderError, renderSuccess } from '@jogi47/pm-cli-core';
import '../init.js';

export default class Delete extends Command {
  static override description = 'Delete one or more tasks';

  static override examples = [
    '<%= config.bin %> delete ASANA-123456',
    '<%= config.bin %> delete ASANA-123456 ASANA-789012',
    '<%= config.bin %> delete ASANA-123456 --json',
  ];

  static override strict = false;

  static override args = {
    ids: Args.string({
      description: 'Task ID(s) to delete (format: PROVIDER-externalId)',
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
    const { argv, flags } = await this.parse(Delete);
    const taskIds = argv as string[];

    if (taskIds.length === 0) {
      renderError('Please provide at least one task ID.');
      this.exit(1);
      return;
    }

    await pluginManager.initialize();

    const results = await pluginManager.deleteTasks(taskIds);

    if (flags.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    let hasErrors = false;
    for (const result of results) {
      if (result.error) {
        renderError(`${result.id}: ${result.error}`);
        hasErrors = true;
      } else {
        renderSuccess(`Deleted: ${result.id}`);
      }
    }

    if (hasErrors) {
      this.exit(1);
    }
  }
}
