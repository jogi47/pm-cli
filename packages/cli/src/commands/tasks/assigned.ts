// src/commands/tasks/assigned.ts

import { Command, Flags } from '@oclif/core';
import { renderError, renderTasks, renderTasksPlain, renderTaskIds, renderWarnings, taskQueryService } from 'pm-cli-core';
import type { ProviderType, TaskStatus } from 'pm-cli-core';
import '../../init.js';
import { handleCommandError } from '../../lib/command-error.js';
import { listOutputFlags, resolveListOutputMode } from '../../lib/output-mode.js';

export default class TasksAssigned extends Command {
  static override description = 'List tasks assigned to you';

  static override examples = [
    '<%= config.bin %> tasks assigned',
    '<%= config.bin %> tasks assigned --source=asana',
    '<%= config.bin %> tasks assigned --limit=10 --json',
    '<%= config.bin %> tasks assigned --refresh',
    '<%= config.bin %> tasks assigned --status=todo',
    '<%= config.bin %> tasks assigned --sort=priority',
    '<%= config.bin %> tasks assigned --plain',
    '<%= config.bin %> tasks assigned --ids-only',
  ];

  static override flags = {
    source: Flags.string({
      char: 's',
      description: 'Filter by provider (asana, notion, trello, linear, clickup)',
      options: ['asana', 'notion', 'trello', 'linear', 'clickup'],
    }),
    limit: Flags.integer({
      char: 'l',
      description: 'Maximum number of tasks to show',
      default: 25,
    }),
    ...listOutputFlags,
    refresh: Flags.boolean({
      char: 'r',
      description: 'Bypass cache and fetch fresh data',
      default: false,
    }),
    status: Flags.string({
      description: 'Filter by status (todo, in_progress, done)',
      options: ['todo', 'in_progress', 'done'],
    }),
    priority: Flags.string({
      description: 'Filter by priority (comma-separated: low,medium,high,urgent)',
    }),
    sort: Flags.string({
      description: 'Sort by field (due, priority, status, source, title)',
      options: ['due', 'priority', 'status', 'source', 'title'],
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(TasksAssigned);
    const outputMode = resolveListOutputMode(flags);
    if (outputMode.error) {
      renderError(outputMode.error);
      this.exit(1);
      return;
    }
    const mode = outputMode.mode ?? 'table';

    try {
      const result = await taskQueryService.getAssignedTasks({
        source: flags.source as ProviderType | undefined,
        displayLimit: flags.limit,
        refresh: flags.refresh,
        status: flags.status as TaskStatus | undefined,
        priority: flags.priority ? flags.priority.split(',') : undefined,
        sort: flags.sort as 'due' | 'priority' | 'status' | 'source' | 'title' | undefined,
      });
      const tasks = result.tasks;

      renderWarnings(result.warnings);

      if (mode === 'ids-only') {
        renderTaskIds(tasks);
      } else if (mode === 'plain') {
        renderTasksPlain(tasks);
      } else {
        renderTasks(tasks, mode);
      }
    } catch (error) {
      handleCommandError(error, 'Failed to fetch tasks');
    }
  }
}
