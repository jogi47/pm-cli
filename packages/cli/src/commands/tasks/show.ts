// src/commands/tasks/show.ts

import { Command, Args, Flags } from '@oclif/core';
import { pluginManager, renderTask, renderError, parseTaskId } from '@jogi47/pm-cli-core';
import type { OutputFormat } from '@jogi47/pm-cli-core';
import '../../init.js';

export default class TasksShow extends Command {
  static override description = 'Show task details';

  static override examples = [
    '<%= config.bin %> tasks show ASANA-1234567890',
    '<%= config.bin %> tasks show NOTION-abc123def456',
    '<%= config.bin %> tasks show ASANA-1234567890 --json',
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
    open: Flags.boolean({
      char: 'o',
      description: 'Open task in browser',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TasksShow);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    // Parse task ID
    const parsed = parseTaskId(args.id);
    if (!parsed) {
      renderError(`Invalid task ID format: ${args.id}`);
      renderError('Expected format: PROVIDER-externalId (e.g., ASANA-1234567890)');
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

    try {
      const task = await plugin.getTask(parsed.externalId);

      if (!task) {
        renderError(`Task not found: ${args.id}`);
        this.exit(1);
        return;
      }

      // Open in browser if requested
      if (flags.open) {
        const open = (await import('open')).default;
        await open(task.url);
        this.log(`Opened in browser: ${task.url}`);
        return;
      }

      renderTask(task, format);
    } catch (error) {
      renderError(error instanceof Error ? error.message : 'Failed to fetch task');
      this.exit(1);
    }
  }
}
