// src/commands/tasks/overdue.ts

import { Command, Flags } from '@oclif/core';
import { renderError, renderTasks, renderTasksPlain, renderTaskIds, renderWarnings, taskQueryService } from 'pm-cli-core';
import type { ProviderType, TaskStatus } from 'pm-cli-core';
import '../../init.js';
import { handleCommandError } from '../../lib/command-error.js';
import { listOutputFlags, resolveListOutputMode } from '../../lib/output-mode.js';

export default class TasksOverdue extends Command {
  static override description = 'List overdue tasks';

  static override examples = [
    '<%= config.bin %> tasks overdue',
    '<%= config.bin %> tasks overdue --source=asana',
    '<%= config.bin %> tasks overdue --json',
    '<%= config.bin %> tasks overdue --sort=priority',
    '<%= config.bin %> tasks overdue --plain',
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
    const { flags } = await this.parse(TasksOverdue);
    const outputMode = resolveListOutputMode(flags);
    if (outputMode.error) {
      renderError(outputMode.error);
      this.exit(1);
      return;
    }
    const mode = outputMode.mode ?? 'table';

    try {
      const result = await taskQueryService.getOverdueTasks({
        source: flags.source as ProviderType | undefined,
        displayLimit: flags.limit,
        refresh: flags.refresh,
        status: flags.status as TaskStatus | undefined,
        priority: flags.priority ? flags.priority.split(',') : undefined,
        sort: flags.sort as 'due' | 'priority' | 'status' | 'source' | 'title' | undefined,
      });
      const tasks = result.tasks;

      if (mode === 'ids-only') {
        renderWarnings(result.warnings);
        renderTaskIds(tasks);
      } else if (mode === 'plain') {
        renderWarnings(result.warnings);
        renderTasksPlain(tasks);
      } else {
        if (mode === 'json') {
          renderTasks(tasks, mode, {
            command: 'tasks overdue',
            warnings: result.warnings,
          });
        } else {
          renderWarnings(result.warnings);
          renderTasks(tasks, mode);
        }
      }
    } catch (error) {
      handleCommandError(error, 'Failed to fetch tasks');
    }
  }
}
