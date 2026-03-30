// src/utils/output.ts

import Table from 'cli-table3';
import chalk from 'chalk';
import type { Task, TaskStatus, ProviderType, ThreadAttachment, ThreadEntry } from '../models/task.js';
import type { ProviderCapabilities, ProviderInfo } from '../models/plugin.js';
import { formatError } from './errors.js';

export type OutputFormat = 'table' | 'json';

export interface JsonEnvelope<T> {
  schemaVersion: '1';
  command: string;
  data: T;
  warnings: string[];
  errors: string[];
  meta: Record<string, unknown>;
}

export interface JsonRenderOptions {
  command?: string;
  warnings?: string[];
  errors?: string[];
  meta?: Record<string, unknown>;
}

export function createJsonEnvelope<T>(
  command: string,
  data: T,
  options: Omit<JsonRenderOptions, 'command'> = {},
): JsonEnvelope<T> {
  return {
    schemaVersion: '1',
    command,
    data,
    warnings: options.warnings ?? [],
    errors: options.errors ?? [],
    meta: {
      ...(Array.isArray(data) ? { count: data.length } : {}),
      ...(options.meta ?? {}),
    },
  };
}

export function renderJsonEnvelope<T>(
  command: string,
  data: T,
  options: Omit<JsonRenderOptions, 'command'> = {},
): void {
  console.log(JSON.stringify(createJsonEnvelope(command, data, options), null, 2));
}

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
 * Format placement entity for human output
 */
function formatPlacement(value: { id: string; name: string } | undefined): string {
  if (!value) return chalk.gray('—');
  return `${value.name} ${chalk.gray(`(${value.id})`)}`;
}

function formatProviderCapabilities(capabilities?: ProviderCapabilities): string {
  if (!capabilities) return chalk.gray('—');

  const labels: Array<[keyof ProviderCapabilities, string]> = [
    ['comments', 'comments'],
    ['thread', 'thread'],
    ['attachmentDownload', 'attachments'],
    ['workspaces', 'workspaces'],
    ['customFields', 'custom fields'],
    ['projectPlacement', 'placement'],
  ];

  const enabled = labels
    .filter(([key]) => capabilities[key])
    .map(([, label]) => label);

  return enabled.length > 0 ? enabled.join(', ') : chalk.gray('—');
}

/**
 * Render a list of tasks
 */
export function renderTasks(tasks: Task[], format: OutputFormat, jsonOptions: JsonRenderOptions = {}): void {
  if (format === 'json') {
    renderJsonEnvelope(jsonOptions.command ?? 'tasks', tasks, jsonOptions);
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
export function renderTask(task: Task, format: OutputFormat, jsonOptions: JsonRenderOptions = {}): void {
  if (format === 'json') {
    renderJsonEnvelope(jsonOptions.command ?? 'task', task, jsonOptions);
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
    ['Project', task.placement?.project ? formatPlacement(task.placement.project) : (task.project || chalk.gray('—'))],
    ['Source', task.source.toUpperCase()],
    ['URL', chalk.underline.blue(task.url)],
  ];

  if (task.placement?.section) {
    details.splice(4, 0, ['Section', formatPlacement(task.placement.section)]);
  }

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

  if (task.customFieldResults && task.customFieldResults.length > 0) {
    console.log();
    console.log(chalk.gray('Custom Fields:'));
    for (const field of task.customFieldResults) {
      const state = field.status === 'applied' ? chalk.green('applied') : chalk.red('failed');
      const value = field.optionNames.length > 0 ? field.optionNames.join(', ') : chalk.gray('(cleared)');
      console.log(`${field.fieldName} ${chalk.gray(`(${field.fieldId})`)}: ${value} ${chalk.gray(`[${state}]`)}`);
    }
  }

  console.log();
}

/**
 * Render provider status
 */
export function renderProviders(
  providers: Array<{ name: string; connected: boolean; workspace?: string; user?: string; capabilities?: ProviderCapabilities }>,
  format: OutputFormat,
  jsonOptions: JsonRenderOptions = {},
): void {
  if (format === 'json') {
    renderJsonEnvelope(jsonOptions.command ?? 'providers', providers, jsonOptions);
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
      chalk.bold('Capabilities'),
    ],
    style: { head: [], border: [] },
  });

  for (const provider of providers) {
    table.push([
      provider.name,
      provider.connected ? chalk.green('Connected') : chalk.red('Disconnected'),
      provider.workspace || chalk.gray('—'),
      provider.user || chalk.gray('—'),
      formatProviderCapabilities(provider.capabilities),
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
export function renderError(message: string | unknown): void {
  const formatted = typeof message === 'string' ? message : formatError(message);
  console.error(chalk.red('✗') + ' ' + formatted);
}

/**
 * Render warning message
 */
export function renderWarning(message: string): void {
  console.error(chalk.yellow('⚠') + ' ' + message);
}

export function renderWarnings(messages: string[]): void {
  for (const message of messages) {
    renderWarning(message);
  }
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
export function renderDashboard(tasks: Task[], format: OutputFormat, jsonOptions: JsonRenderOptions = {}): void {
  if (format === 'json') {
    renderJsonEnvelope(jsonOptions.command ?? 'today', tasks, jsonOptions);
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
  format: OutputFormat,
  jsonOptions: JsonRenderOptions = {},
): void {
  if (format === 'json') {
    renderJsonEnvelope(jsonOptions.command ?? 'summary', { providers, taskCounts }, jsonOptions);
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


/**
 * Render task thread entries
 */
export function renderThreadEntries(entries: ThreadEntry[], format: OutputFormat, jsonOptions: JsonRenderOptions = {}): void {
  if (format === 'json') {
    renderJsonEnvelope(jsonOptions.command ?? 'tasks thread', entries, jsonOptions);
    return;
  }

  if (entries.length === 0) {
    console.log(chalk.gray('No thread entries found.'));
    return;
  }

  for (const entry of entries) {
    const timestamp = entry.createdAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const author = entry.author || 'Unknown';
    console.log(`${chalk.bold(author)} ${chalk.gray(`(${timestamp})`)}`);

    if (entry.body) {
      console.log(entry.body);
    }

    if (entry.attachments && entry.attachments.length > 0) {
      if (entry.body) {
        console.log();
      }

      console.log(chalk.gray(`Attachments (${entry.attachments.length}):`));
      for (const attachment of entry.attachments) {
        console.log(`- ${formatThreadAttachment(attachment)}`);
      }
    }

    console.log();
  }

  console.log(chalk.gray(`${entries.length} thread entr${entries.length === 1 ? 'y' : 'ies'}`));
}

/**
 * Render task attachments without the rest of the thread body.
 */
export function renderTaskAttachments(
  attachments: ThreadAttachment[],
  format: OutputFormat,
  jsonOptions: JsonRenderOptions = {},
): void {
  if (format === 'json') {
    renderJsonEnvelope(jsonOptions.command ?? 'tasks attachments', attachments, jsonOptions);
    return;
  }

  if (attachments.length === 0) {
    console.log(chalk.gray('No attachments found.'));
    return;
  }

  for (const attachment of attachments) {
    console.log(formatThreadAttachment(attachment));
  }

  console.log();
  console.log(chalk.gray(`${attachments.length} attachment${attachments.length === 1 ? '' : 's'}`));
}

function formatThreadAttachment(attachment: ThreadAttachment): string {
  const parts = [
    attachment.name,
    chalk.gray(`[${attachment.kind}]`),
  ];

  if (attachment.localPath) {
    parts.push(chalk.green(`saved: ${attachment.localPath}`));
  } else if (attachment.downloadUrl) {
    parts.push(chalk.underline.blue(attachment.downloadUrl));
  } else if (attachment.viewUrl) {
    parts.push(chalk.underline.blue(attachment.viewUrl));
  } else if (attachment.permalinkUrl) {
    parts.push(chalk.underline.blue(attachment.permalinkUrl));
  }

  return parts.join(' ');
}
