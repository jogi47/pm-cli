// src/utils/output.ts

import Table from 'cli-table3';
import chalk from 'chalk';
import type { Task, TaskStatus } from '../models/task.js';

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
