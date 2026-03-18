// src/commands/branch.ts

import { Command, Args, Flags } from '@oclif/core';
import { slugify, renderError, renderSuccess, taskReadService } from 'pm-cli-core';
import { execFileSync } from 'node:child_process';
import '../init.js';
import { handleCommandError } from '../lib/command-error.js';
import { isValidGitBranchName, sanitizeBranchSegment } from '../lib/branch-name.js';


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

    try {
      const result = await taskReadService.getTaskForBranch(args.id);
      const task = result.task;
      if (!task) {
        renderError(`Task not found: ${args.id}`);
        this.exit(1);
        return;
      }

      const slug = sanitizeBranchSegment(slugify(task.title));
      const taskIdSegment = sanitizeBranchSegment(`${task.source}-${task.externalId}`);
      let branchName = flags['no-id'] ? slug : `${taskIdSegment}-${slug}`;
      if (flags.prefix) {
        branchName = `${flags.prefix}/${branchName}`;
      }

      branchName = sanitizeBranchSegment(branchName);
      if (!branchName || !isValidGitBranchName(branchName)) {
        renderError('Could not build a valid and safe git branch name from the selected task.');
        this.exit(1);
        return;
      }

      execFileSync('git', ['branch', branchName], { stdio: 'pipe' });
      renderSuccess(`Created branch: ${branchName}`);

      if (flags.checkout) {
        execFileSync('git', ['checkout', branchName], { stdio: 'pipe' });
        renderSuccess(`Switched to branch: ${branchName}`);
      }
    } catch (error) {
      handleCommandError(error, 'Failed to create branch');
    }
  }
}
