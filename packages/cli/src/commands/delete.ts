// src/commands/delete.ts

import { Command, Args, Flags } from '@oclif/core';
import { confirm } from '@inquirer/prompts';
import { renderError, renderSuccess, renderWarnings, taskMutationService } from 'pm-cli-core';
import '../init.js';

export default class Delete extends Command {
  static override description = 'Delete one or more tasks';

  static override examples = [
    '<%= config.bin %> delete ASANA-123456 --force',
    '<%= config.bin %> delete ASANA-123456 ASANA-789012 --force',
    '<%= config.bin %> delete ASANA-123456 --json --force',
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
    force: Flags.boolean({
      char: 'f',
      description: 'Skip the delete confirmation prompt',
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

    const confirmed = flags.force || await confirmDelete(taskIds);
    if (!confirmed) {
      renderError(process.stdin.isTTY
        ? 'Delete cancelled.'
        : 'Delete requires confirmation. Re-run with --force to confirm.');
      this.exit(1);
      return;
    }

    const result = await taskMutationService.deleteTasks(taskIds);
    const hasErrors = result.items.some((item) => Boolean(item.error));

    renderWarnings(result.warnings);

    if (flags.json) {
      console.log(JSON.stringify(result.items, null, 2));
      if (hasErrors) this.exit(1);
      return;
    }

    for (const item of result.items) {
      if (item.error) {
        renderError(`${item.id}: ${item.error}`);
      } else {
        renderSuccess(`Deleted: ${item.id}`);
      }
    }

    if (hasErrors) this.exit(1);
  }
}

async function confirmDelete(taskIds: string[]): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return false;
  }

  return confirm({
    message: `Delete ${taskIds.length} task${taskIds.length === 1 ? '' : 's'}? This cannot be undone.`,
    default: false,
  });
}
