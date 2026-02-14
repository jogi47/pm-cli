// src/commands/tasks/create.ts

import { Command, Args, Flags } from '@oclif/core';
import { pluginManager, renderTask, renderSuccess, renderError } from '@jogi47/pm-cli-core';
import type { OutputFormat, ProviderType } from '@jogi47/pm-cli-core';
import '../../init.js';

export default class TasksCreate extends Command {
  static override description = 'Create a new task';

  static override examples = [
    '<%= config.bin %> tasks create "Fix login bug"',
    '<%= config.bin %> tasks create "Update docs" --source=asana --due=2026-03-01',
    '<%= config.bin %> tasks create "Review PR" --description="Check the auth changes" --json',
  ];

  static override args = {
    title: Args.string({
      description: 'Task title',
      required: true,
    }),
  };

  static override flags = {
    description: Flags.string({
      char: 'd',
      description: 'Task description',
    }),
    source: Flags.string({
      char: 's',
      description: 'Target provider (asana, notion)',
      options: ['asana', 'notion'],
    }),
    project: Flags.string({
      char: 'p',
      description: 'Project ID to add task to',
    }),
    due: Flags.string({
      description: 'Due date (YYYY-MM-DD)',
    }),
    assignee: Flags.string({
      char: 'a',
      description: 'Assignee email',
    }),
    json: Flags.boolean({
      description: 'Output in JSON format',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TasksCreate);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    await pluginManager.initialize();

    // Determine target provider
    let source: ProviderType;
    if (flags.source) {
      source = flags.source as ProviderType;
    } else {
      const connected = await pluginManager.getConnectedPlugins();
      if (connected.length === 0) {
        renderError('No providers connected. Run: pm connect <provider>');
        this.exit(1);
        return;
      }
      if (connected.length > 1) {
        renderError('Multiple providers connected. Use --source to specify which one.');
        this.exit(1);
        return;
      }
      source = connected[0].name;
    }

    // Parse due date if provided
    let dueDate: Date | undefined;
    if (flags.due) {
      dueDate = new Date(flags.due);
      if (isNaN(dueDate.getTime())) {
        renderError(`Invalid date format: ${flags.due}. Use YYYY-MM-DD.`);
        this.exit(1);
        return;
      }
    }

    try {
      const task = await pluginManager.createTask(source, {
        title: args.title,
        description: flags.description,
        dueDate,
        projectId: flags.project,
        assigneeEmail: flags.assignee,
      });

      renderSuccess(`Task created: ${task.id}`);
      renderTask(task, format);
    } catch (error) {
      renderError(error instanceof Error ? error.message : 'Failed to create task');
      this.exit(1);
    }
  }
}
