// src/commands/delete.ts

import { Command, Args, Flags } from '@oclif/core';
import { confirm } from '@inquirer/prompts';
import { renderError, renderJsonEnvelope, renderSuccess, renderWarnings, taskMutationService } from 'pm-cli-core';
import '../init.js';
import { resolveBulkMutationExitCode } from '../lib/bulk-exit-code.js';
import { handleCommandError } from '../lib/command-error.js';
import { CLI_EXIT_CODES } from '../lib/exit-code.js';

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
      this.exit(CLI_EXIT_CODES.USAGE);
      return;
    }

    const confirmed = flags.force || await confirmDelete(taskIds);
    if (!confirmed) {
      if (process.stdin.isTTY) {
        renderError('Delete cancelled.');
        this.exit(CLI_EXIT_CODES.FAILURE);
      } else {
        renderError('Delete requires confirmation. Re-run with --force to confirm.');
        this.exit(CLI_EXIT_CODES.USAGE);
      }
      return;
    }

    let result;
    try {
      result = await taskMutationService.deleteTasks(taskIds);
    } catch (error) {
      handleCommandError(error, 'Failed to delete tasks');
    }

    const exitCode = resolveBulkMutationExitCode(result.items);
    const errors = result.items
      .filter((item) => item.error)
      .map((item) => `${item.id}: ${item.error}`);

    if (flags.json) {
      renderJsonEnvelope('delete', result.items, {
        warnings: result.warnings,
        errors,
      });
      if (exitCode !== CLI_EXIT_CODES.SUCCESS) {
        this.exit(exitCode);
      }
      return;
    }

    renderWarnings(result.warnings);

    for (const item of result.items) {
      if (item.error) {
        renderError(`${item.id}: ${item.error}`);
      } else {
        renderSuccess(`Deleted: ${item.id}`);
      }
    }

    if (exitCode !== CLI_EXIT_CODES.SUCCESS) {
      this.exit(exitCode);
    }
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
