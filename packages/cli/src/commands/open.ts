// src/commands/open.ts

import { Command, Args } from '@oclif/core';
import { pluginManager, renderError, parseTaskId } from '@pm-cli/core';
import '../init.js';

export default class Open extends Command {
  static override description = 'Open a task in the browser';

  static override examples = [
    '<%= config.bin %> open ASANA-123456',
    '<%= config.bin %> open NOTION-abc123',
  ];

  static override args = {
    id: Args.string({
      description: 'Task ID (format: PROVIDER-externalId)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Open);

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
      const url = plugin.getTaskUrl(parsed.externalId);
      const open = (await import('open')).default;
      await open(url);
      this.log(`Opened in browser: ${url}`);
    } catch (error) {
      renderError(error instanceof Error ? error.message : 'Failed to open task');
      this.exit(1);
    }
  }
}
