// src/commands/tasks/thread.ts

import { Args, Command, Flags } from '@oclif/core';
import {
  parseTaskId,
  pluginManager,
  renderError,
  renderThreadEntries,
  type OutputFormat,
} from '@jogi47/pm-cli-core';
import '../../init.js';
import { handleCommandError } from '../../lib/command-error.js';

export default class TasksThread extends Command {
  static override description = 'Show task conversation/thread entries';

  static override examples = [
    '<%= config.bin %> tasks thread ASANA-1234567890',
    '<%= config.bin %> tasks thread LINEAR-ENG-42 --json',
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
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TasksThread);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    const parsed = parseTaskId(args.id);
    if (!parsed) {
      renderError(`Invalid task ID format: ${args.id}`);
      this.exit(1);
      return;
    }

    await pluginManager.initialize();
    const plugin = pluginManager.getPlugin(parsed.source);

    if (!plugin) {
      renderError(`Unknown provider: ${parsed.source}`);
      this.exit(1);
      return;
    }

    if (!(await plugin.isAuthenticated())) {
      renderError(`Not connected to ${parsed.source}. Run: pm connect ${parsed.source}`);
      this.exit(1);
      return;
    }

    if (!plugin.getTaskThread) {
      renderError(`${parsed.source} does not support task threads`);
      this.exit(1);
      return;
    }

    try {
      const entries = await plugin.getTaskThread(parsed.externalId);
      renderThreadEntries(entries, format);
    } catch (error) {
      handleCommandError(error, 'Failed to fetch task thread');
    }
  }
}
