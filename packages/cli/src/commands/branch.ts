// src/commands/branch.ts

import { Command, Args, Flags } from '@oclif/core';
import { pluginManager, parseTaskId, slugify, renderError, renderSuccess } from '@jogi47/pm-cli-core';
import { execSync } from 'node:child_process';
import '../init.js';

export default class Branch extends Command {
  static override description = 'Create a git branch from a task';

  static override examples = [
    '<%= config.bin %> branch ASANA-123456 --prefix feat',
    '<%= config.bin %> branch NOTION-abc123 --prefix fix --checkout',
    '<%= config.bin %> branch ASANA-123456 --no-id',
  ];

  static override args = {
    id: Args.string({
      description: 'Task ID (format: PROVIDER-externalId)',
      required: true,
    }),
  };

  static override flags = {
    prefix: Flags.string({
      char: 'p',
      description: 'Branch prefix (feat, fix, chore)',
      options: ['feat', 'fix', 'chore'],
    }),
    checkout: Flags.boolean({
      char: 'c',
      description: 'Also switch to the new branch',
      default: false,
    }),
    'no-id': Flags.boolean({
      description: 'Omit task ID from branch name',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Branch);

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

      const slug = slugify(task.title);
      let branchName = flags['no-id'] ? slug : `${args.id.toLowerCase()}-${slug}`;
      if (flags.prefix) {
        branchName = `${flags.prefix}/${branchName}`;
      }

      execSync(`git branch ${branchName}`, { stdio: 'pipe' });
      renderSuccess(`Created branch: ${branchName}`);

      if (flags.checkout) {
        execSync(`git checkout ${branchName}`, { stdio: 'pipe' });
        renderSuccess(`Switched to branch: ${branchName}`);
      }
    } catch (error) {
      renderError(error instanceof Error ? error.message : 'Failed to create branch');
      this.exit(1);
    }
  }
}
