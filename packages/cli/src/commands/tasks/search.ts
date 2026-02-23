// src/commands/tasks/search.ts

import { Command, Args, Flags } from '@oclif/core';
import { pluginManager, renderTasks, renderTasksPlain, renderTaskIds, renderError, filterAndSortTasks } from '@jogi47/pm-cli-core';
import type { OutputFormat, ProviderType, TaskStatus, FilterSortOptions } from '@jogi47/pm-cli-core';
import '../../init.js';
import { handleCommandError } from '../../lib/command-error.js';

export default class TasksSearch extends Command {
  static override description = 'Search for tasks';

  static override examples = [
    '<%= config.bin %> tasks search "login bug"',
    '<%= config.bin %> tasks search "api" --source=asana',
    '<%= config.bin %> tasks search "urgent" --json',
    '<%= config.bin %> tasks search "fix" --status=todo --sort=priority',
    '<%= config.bin %> tasks search "deploy" --plain',
  ];

  static override args = {
    query: Args.string({
      description: 'Search query',
      required: true,
    }),
  };

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
    const { args, flags } = await this.parse(TasksSearch);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    await pluginManager.initialize();

    try {
      let tasks = await pluginManager.searchTasks(args.query, {
        source: flags.source as ProviderType | undefined,
        limit: flags.limit,
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
      handleCommandError(error, 'Failed to search tasks');
    }
  }
}
