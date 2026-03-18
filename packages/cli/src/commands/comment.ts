// src/commands/comment.ts

import { Command, Args } from '@oclif/core';
import { renderSuccess, renderWarnings, taskMutationService } from 'pm-cli-core';
import '../init.js';
import { handleCommandError } from '../lib/command-error.js';

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

    try {
      const result = await taskMutationService.addComment(args.id, args.message);
      renderWarnings(result.warnings);
      renderSuccess(`Comment added to ${args.id}`);
    } catch (error) {
      handleCommandError(error, 'Failed to add comment');
    }
  }
}
