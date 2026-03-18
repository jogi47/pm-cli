import { Args, Command, Flags } from '@oclif/core';
import {
  renderTaskAttachments,
  renderWarnings,
  taskReadService,
  type OutputFormat,
} from 'pm-cli-core';
import '../../init.js';
import { handleCommandError } from '../../lib/command-error.js';

export default class TasksAttachments extends Command {
  static override description = 'Show task attachments without the full thread (currently best on Asana)';

  static override examples = [
    '<%= config.bin %> tasks attachments ASANA-1234567890',
    '<%= config.bin %> tasks attachments ASANA-1234567890 --download-images --temp-dir /tmp/pm-cli',
    '<%= config.bin %> tasks attachments ASANA-1234567890 --json',
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
    'download-images': Flags.boolean({
      description: 'Download image attachments to a local temp directory when the provider exposes them',
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
    const { args, flags } = await this.parse(TasksAttachments);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    try {
      const result = await taskReadService.getTaskAttachments(args.id, {
        downloadImages: flags['download-images'],
        tempDir: flags['temp-dir'],
        cleanup: flags.cleanup,
      });

      renderWarnings(result.warnings);

      renderTaskAttachments(result.attachments, format);
    } catch (error) {
      handleCommandError(error, 'Failed to fetch task attachments');
    }
  }
}
