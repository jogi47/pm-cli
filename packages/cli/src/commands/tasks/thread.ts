// src/commands/tasks/thread.ts

import { Args, Command, Flags } from '@oclif/core';
import {
  renderJsonEnvelope,
  renderTask,
  renderThreadEntries,
  renderWarnings,
  taskReadService,
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

    try {
      const result = await taskReadService.getTaskThread(args.id, {
        includeTask: flags['with-task'],
        commentsOnly: flags['comments-only'],
        limit: flags.limit,
        downloadImages: flags['download-images'],
        tempDir: flags['temp-dir'],
        cleanup: flags.cleanup,
      });
      const task = result.task;
      const entries = result.entries;

      if (format !== 'json') {
        renderWarnings(result.warnings);
      }

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
        renderJsonEnvelope('tasks thread', { task, entries }, {
          warnings: result.warnings,
          meta: { includesTask: true },
        });
        return;
      }

      if (format === 'json') {
        renderThreadEntries(entries, format, {
          command: 'tasks thread',
          warnings: result.warnings,
          meta: { includesTask: false },
        });
      } else {
        renderThreadEntries(entries, format);
      }
    } catch (error) {
      handleCommandError(error, 'Failed to fetch task thread');
    }
  }
}
