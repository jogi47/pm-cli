// src/commands/comment.ts

import { Command, Args } from '@oclif/core';
import { pluginManager, renderError, renderSuccess } from '@jogi47/pm-cli-core';
import '../init.js';

export default class Comment extends Command {
  static override description = 'Add a comment to a task';

  static override examples = [
    '<%= config.bin %> comment ASANA-123456 "Fixed in commit abc"',
    '<%= config.bin %> comment NOTION-abc123 "Needs review"',
  ];

  static override args = {
    id: Args.string({
      description: 'Task ID (format: PROVIDER-externalId)',
      required: true,
    }),
    message: Args.string({
      description: 'Comment text',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Comment);

    await pluginManager.initialize();

    try {
      await pluginManager.addComment(args.id, args.message);
      renderSuccess(`Comment added to ${args.id}`);
    } catch (error) {
      renderError(error instanceof Error ? error.message : 'Failed to add comment');
      this.exit(1);
    }
  }
}
