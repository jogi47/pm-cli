// src/commands/tasks/overdue.ts

import { Command, Flags } from '@oclif/core';
import { pluginManager, renderTasks, renderTasksPlain, renderTaskIds, renderError, filterAndSortTasks } from '@jogi47/pm-cli-core';
import type { OutputFormat, ProviderType, TaskStatus, FilterSortOptions } from '@jogi47/pm-cli-core';
import '../../init.js';
import { handleCommandError } from '../../lib/command-error.js';

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
    json: Flags.boolean({
      description: 'Output in JSON format',
      default: false,
    }),
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
    plain: Flags.boolean({
      description: 'Tab-separated output, no colors or borders',
      default: false,
    }),
    'ids-only': Flags.boolean({
      description: 'Output just task IDs, one per line',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(TasksOverdue);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    await pluginManager.initialize();

    try {
      let tasks = await pluginManager.aggregateTasks('overdue', {
        source: flags.source as ProviderType | undefined,
        limit: flags.limit,
        refresh: flags.refresh,
      });

      const filterOpts: FilterSortOptions = {};
      if (flags.status) filterOpts.status = flags.status as TaskStatus;
      if (flags.priority) filterOpts.priority = flags.priority.split(',');
      if (flags.sort) filterOpts.sort = flags.sort as FilterSortOptions['sort'];
      if (filterOpts.status || filterOpts.priority || filterOpts.sort) {
        tasks = filterAndSortTasks(tasks, filterOpts);
      }

      if (flags['ids-only']) {
        renderTaskIds(tasks);
      } else if (flags.plain) {
        renderTasksPlain(tasks);
      } else {
        renderTasks(tasks, format);
      }
    } catch (error) {
      handleCommandError(error, 'Failed to fetch tasks');
    }
  }
}
