// src/commands/tasks/update.ts

import { Command, Args, Flags } from '@oclif/core';
import { pluginManager, renderTask, renderSuccess, renderError } from '@jogi47/pm-cli-core';
import type { OutputFormat, UpdateTaskInput } from '@jogi47/pm-cli-core';
import '../../init.js';

export default class TasksUpdate extends Command {
  static override description = 'Update a task';

  static override examples = [
    '<%= config.bin %> tasks update ASANA-123456 --title "New title"',
    '<%= config.bin %> tasks update ASANA-123456 --due 2026-03-15 --status in_progress',
    '<%= config.bin %> tasks update ASANA-123456 --description "Updated notes" --json',
  ];

  static override args = {
    id: Args.string({
      description: 'Task ID (format: PROVIDER-externalId)',
      required: true,
    }),
  };

  static override flags = {
    title: Flags.string({
      char: 't',
      description: 'New task title',
    }),
    description: Flags.string({
      char: 'd',
      description: 'New task description',
    }),
    due: Flags.string({
      description: 'New due date (YYYY-MM-DD, or "none" to clear)',
    }),
    status: Flags.string({
      description: 'New status',
      options: ['todo', 'in_progress', 'done'],
    }),
    json: Flags.boolean({
      description: 'Output in JSON format',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TasksUpdate);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    // Ensure at least one update field is provided
    if (!flags.title && !flags.description && !flags.due && !flags.status) {
      renderError('No updates provided. Use --title, --description, --due, or --status.');
      this.exit(1);
      return;
    }

    await pluginManager.initialize();

    // Build updates
    const updates: UpdateTaskInput = {};

    if (flags.title) updates.title = flags.title;
    if (flags.description) updates.description = flags.description;
    if (flags.status) updates.status = flags.status as UpdateTaskInput['status'];

    if (flags.due) {
      if (flags.due === 'none') {
        updates.dueDate = null;
      } else {
        const dueDate = new Date(flags.due);
        if (isNaN(dueDate.getTime())) {
          renderError(`Invalid date format: ${flags.due}. Use YYYY-MM-DD or "none".`);
          this.exit(1);
          return;
        }
        updates.dueDate = dueDate;
      }
    }

    try {
      const task = await pluginManager.updateTask(args.id, updates);
      renderSuccess(`Task updated: ${task.id}`);
      renderTask(task, format);
    } catch (error) {
      renderError(error instanceof Error ? error.message : 'Failed to update task');
      this.exit(1);
    }
  }
}
