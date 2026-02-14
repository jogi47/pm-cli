// src/utils/output.ts

import Table from 'cli-table3';
import chalk from 'chalk';
import type { Task, TaskStatus, ProviderType } from '../models/task.js';
import type { ProviderInfo } from '../models/plugin.js';

export type OutputFormat = 'table' | 'json';

/**
 * Status display configuration
 */
const STATUS_DISPLAY: Record<TaskStatus, { label: string; color: (s: string) => string }> = {
  todo: { label: 'To Do', color: chalk.gray },
  in_progress: { label: 'In Progress', color: chalk.yellow },
  done: { label: 'Done', color: chalk.green },
};

/**
 * Format a date for display
 */
function formatDate(date: Date | undefined): string {
  if (!date) return chalk.gray('—');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (diffDays < 0) {
    return chalk.red(`${dateStr} (${Math.abs(diffDays)}d overdue)`);
  } else if (diffDays === 0) {
    return chalk.yellow(`${dateStr} (today)`);
  } else if (diffDays === 1) {
    return chalk.cyan(`${dateStr} (tomorrow)`);
  } else if (diffDays <= 7) {
    return chalk.white(`${dateStr} (${diffDays}d)`);
  }
  return chalk.gray(dateStr);
}

/**
 * Format status for display
 */
function formatStatus(status: TaskStatus): string {
  const config = STATUS_DISPLAY[status];
  return config.color(config.label);
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Render a list of tasks
 */
export function renderTasks(tasks: Task[], format: OutputFormat): void {
  if (format === 'json') {
    console.log(JSON.stringify(tasks, null, 2));
    return;
  }

  if (tasks.length === 0) {
    console.log(chalk.gray('No tasks found.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Title'),
      chalk.bold('Status'),
      chalk.bold('Due'),
      chalk.bold('Project'),
    ],
    colWidths: [20, 40, 15, 20, 20],
    wordWrap: true,
    style: {
      head: [],
      border: [],
    },
  });

  for (const task of tasks) {
    table.push([
      chalk.cyan(task.id),
      truncate(task.title, 38),
      formatStatus(task.status),
      formatDate(task.dueDate),
      task.project ? truncate(task.project, 18) : chalk.gray('—'),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.gray(`\n${tasks.length} task(s) found`));
}

/**
 * Render a single task in detail
 */
export function renderTask(task: Task, format: OutputFormat): void {
  if (format === 'json') {
    console.log(JSON.stringify(task, null, 2));
    return;
  }

  console.log();
  console.log(chalk.bold.cyan(`${task.id}`));
  console.log(chalk.bold.white(task.title));
  console.log();

  const details: [string, string][] = [
    ['Status', formatStatus(task.status)],
    ['Due Date', formatDate(task.dueDate)],
    ['Assignee', task.assignee || chalk.gray('Unassigned')],
    ['Project', task.project || chalk.gray('—')],
    ['Source', task.source.toUpperCase()],
    ['URL', chalk.underline.blue(task.url)],
  ];

  if (task.tags && task.tags.length > 0) {
    details.push(['Tags', task.tags.map(t => chalk.bgGray(` ${t} `)).join(' ')]);
  }

  const maxLabelLength = Math.max(...details.map(([label]) => label.length));

  for (const [label, value] of details) {
    console.log(`${chalk.gray(label.padEnd(maxLabelLength + 2))}${value}`);
  }

  if (task.description) {
    console.log();
    console.log(chalk.gray('Description:'));
    console.log(task.description);
  }

  console.log();
}

/**
 * Render provider status
 */
export function renderProviders(
  providers: Array<{ name: string; connected: boolean; workspace?: string; user?: string }>,
  format: OutputFormat
): void {
  if (format === 'json') {
    console.log(JSON.stringify(providers, null, 2));
    return;
  }

  if (providers.length === 0) {
    console.log(chalk.gray('No providers configured.'));
    console.log(chalk.gray('Run `pm connect <provider>` to get started.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Provider'),
      chalk.bold('Status'),
      chalk.bold('Workspace'),
      chalk.bold('User'),
    ],
    style: { head: [], border: [] },
  });

  for (const provider of providers) {
    table.push([
      provider.name,
      provider.connected ? chalk.green('Connected') : chalk.red('Disconnected'),
      provider.workspace || chalk.gray('—'),
      provider.user || chalk.gray('—'),
    ]);
  }

  console.log(table.toString());
}

/**
 * Render success message
 */
export function renderSuccess(message: string): void {
  console.log(chalk.green('✓') + ' ' + message);
}

/**
 * Render error message
 */
export function renderError(message: string): void {
  console.log(chalk.red('✗') + ' ' + message);
}

/**
 * Render warning message
 */
export function renderWarning(message: string): void {
  console.log(chalk.yellow('⚠') + ' ' + message);
}

/**
 * Render info message
 */
export function renderInfo(message: string): void {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

/**
 * Render a morning dashboard grouping tasks by overdue / due today / in progress
 */
export function renderDashboard(tasks: Task[], format: OutputFormat): void {
  if (format === 'json') {
    console.log(JSON.stringify(tasks, null, 2));
    return;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue: Task[] = [];
  const dueToday: Task[] = [];
  const inProgress: Task[] = [];

  for (const task of tasks) {
    if (task.dueDate) {
      const taskDate = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate());
      if (taskDate.getTime() < today.getTime() && task.status !== 'done') {
        overdue.push(task);
        continue;
      }
      if (taskDate.getTime() === today.getTime() && task.status !== 'done') {
        dueToday.push(task);
        continue;
      }
    }
    if (task.status === 'in_progress') {
      inProgress.push(task);
    }
  }

  // Sort overdue by most overdue first
  overdue.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const printSection = (header: string, color: (s: string) => string, sectionTasks: Task[]) => {
    if (sectionTasks.length === 0) return;
    console.log();
    console.log(color(`── ${header} (${sectionTasks.length}) ──`));
    for (const task of sectionTasks) {
      const due = task.dueDate
        ? task.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '';
      console.log(`  ${chalk.cyan(task.id)}  ${truncate(task.title, 45)}  ${formatStatus(task.status)}  ${due ? chalk.gray(due) : ''}`);
    }
  };

  if (overdue.length === 0 && dueToday.length === 0 && inProgress.length === 0) {
    console.log(chalk.green('✓ All clear! No overdue, due-today, or in-progress tasks.'));
    return;
  }

  printSection('Overdue', chalk.red, overdue);
  printSection('Due Today', chalk.yellow, dueToday);
  printSection('In Progress', chalk.blue, inProgress);

  console.log();
  console.log(chalk.gray(`${overdue.length} overdue · ${dueToday.length} due today · ${inProgress.length} in progress`));
}

/**
 * Render provider and task count summary
 */
export function renderSummary(
  providers: ProviderInfo[],
  taskCounts: { overdue: number; dueToday: number; inProgress: number; total: number },
  format: OutputFormat
): void {
  if (format === 'json') {
    console.log(JSON.stringify({ providers, taskCounts }, null, 2));
    return;
  }

  console.log();
  console.log(chalk.bold('Providers'));
  for (const p of providers) {
    const status = p.connected ? chalk.green('● connected') : chalk.red('○ disconnected');
    console.log(`  ${p.displayName.padEnd(10)} ${status}${p.workspace ? chalk.gray(`  ${p.workspace}`) : ''}`);
  }

  console.log();
  console.log(chalk.bold('Tasks'));
  console.log(`  Overdue:      ${taskCounts.overdue > 0 ? chalk.red(String(taskCounts.overdue)) : chalk.gray('0')}`);
  console.log(`  Due today:    ${taskCounts.dueToday > 0 ? chalk.yellow(String(taskCounts.dueToday)) : chalk.gray('0')}`);
  console.log(`  In progress:  ${taskCounts.inProgress > 0 ? chalk.blue(String(taskCounts.inProgress)) : chalk.gray('0')}`);
  console.log(`  Total open:   ${chalk.white(String(taskCounts.total))}`);
  console.log();
}

/**
 * Render tasks as plain tab-separated text (no ANSI colors)
 */
export function renderTasksPlain(tasks: Task[]): void {
  for (const task of tasks) {
    const due = task.dueDate ? task.dueDate.toISOString().split('T')[0] : '';
    console.log([task.id, task.title, task.status, due, task.project || ''].join('\t'));
  }
}

/**
 * Render just task IDs, one per line
 */
export function renderTaskIds(tasks: Task[]): void {
  for (const task of tasks) {
    console.log(task.id);
  }
}
