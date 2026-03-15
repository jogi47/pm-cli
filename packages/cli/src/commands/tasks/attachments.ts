import { Args, Command, Flags } from '@oclif/core';
import {
  parseTaskId,
  pluginManager,
  renderError,
  renderTaskAttachments,
  type OutputFormat,
  type ThreadAttachment,
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
      renderError(`${parsed.source} does not support task attachments`);
      this.exit(1);
      return;
    }

    try {
      const entries = await plugin.getTaskThread(parsed.externalId, {
        downloadImages: flags['download-images'],
        tempDir: flags['temp-dir'],
        cleanup: flags.cleanup,
      });

      renderTaskAttachments(dedupeAttachments(entries), format);
    } catch (error) {
      handleCommandError(error, 'Failed to fetch task attachments');
    }
  }
}

function dedupeAttachments(entries: Array<{ attachments?: ThreadAttachment[] }>): ThreadAttachment[] {
  const attachments = entries.flatMap((entry) => entry.attachments || []);
  const deduped = new Map<string, ThreadAttachment>();

  for (const attachment of attachments) {
    if (!deduped.has(attachment.id)) {
      deduped.set(attachment.id, attachment);
    }
  }

  return Array.from(deduped.values());
}
