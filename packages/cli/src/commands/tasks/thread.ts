// src/commands/tasks/thread.ts

import { Args, Command, Flags } from '@oclif/core';
import {
  parseTaskId,
  pluginManager,
  renderError,
  renderTask,
  renderThreadEntries,
  type OutputFormat,
} from 'pm-cli-core';
import '../../init.js';
import { handleCommandError } from '../../lib/command-error.js';

export default class TasksThread extends Command {
  static override description = 'Show task conversation entries, including attachment events (Asana support today)';

  static override examples = [
    '<%= config.bin %> tasks thread ASANA-1234567890',
    '<%= config.bin %> tasks thread ASANA-1234567890 --comments-only --with-task',
    '<%= config.bin %> tasks thread ASANA-1234567890 --download-images --temp-dir /tmp/pm-cli',
    '<%= config.bin %> tasks thread ASANA-1234567890 --json',
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
    'comments-only': Flags.boolean({
      char: 'c',
      description: 'Only show human comments and attachment entries, filter out system activity',
      default: false,
    }),
    'with-task': Flags.boolean({
      description: 'Include the task title and description at the top',
      default: false,
    }),
    limit: Flags.integer({
      char: 'l',
      description: 'Show only the last N thread entries',
    }),
    'download-images': Flags.boolean({
      description: 'Download image attachments to a local temp directory',
      default: false,
    }),
    'temp-dir': Flags.string({
      description: 'Base temp directory for downloaded attachments',
    }),
    cleanup: Flags.boolean({
      description: 'Remove this task\'s previous download directory before downloading',
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
      const [task, entries] = await Promise.all([
        flags['with-task'] ? plugin.getTask(parsed.externalId) : Promise.resolve(null),
        plugin.getTaskThread(parsed.externalId, {
          commentsOnly: flags['comments-only'],
          limit: flags.limit,
          downloadImages: flags['download-images'],
          tempDir: flags['temp-dir'],
          cleanup: flags.cleanup,
        }),
      ]);

      if (flags['with-task']) {
        if (task) {
          if (format === 'json') {
            // handled below in a single JSON payload
          } else {
            renderTask(task, format);
            console.log('--- Thread ------------------------------------------\n');
          }
        }
      }

      if (format === 'json' && flags['with-task']) {
        console.log(JSON.stringify({ task, entries }, null, 2));
        return;
      }

      renderThreadEntries(entries, format);
    } catch (error) {
      handleCommandError(error, 'Failed to fetch task thread');
    }
  }
}
