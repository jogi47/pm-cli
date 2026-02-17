// src/commands/tasks/update.ts

import { Command, Args, Flags } from '@oclif/core';
import { pluginManager, renderTask, renderSuccess, renderError } from '@jogi47/pm-cli-core';
import type { CustomFieldInput, OutputFormat, ProviderType, UpdateTaskInput } from '@jogi47/pm-cli-core';
import { parseTaskId } from '@jogi47/pm-cli-core';
import { parseCustomFieldFlags } from '../../lib/task-field-parser.js';
import { splitIdOrName } from '../../lib/task-id-resolver.js';
import '../../init.js';

export default class TasksUpdate extends Command {
  static override description = 'Update a task';

  static override examples = [
    '<%= config.bin %> tasks update ASANA-123456 --title "New title"',
    '<%= config.bin %> tasks update ASANA-123456 --due 2026-03-15 --status in_progress',
    '<%= config.bin %> tasks update ASANA-123456 --field "Importance=High" --field "Other=Bugs,Analytics"',
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
    project: Flags.string({
      char: 'p',
      description: 'Project ID or name to scope --field resolution',
    }),
    workspace: Flags.string({
      description: 'Workspace ID or name to scope project resolution for --field',
    }),
    field: Flags.string({
      description: 'Custom field assignment: <Field>=<Value[,Value]> (repeatable)',
      multiple: true,
    }),
    refresh: Flags.boolean({
      description: 'Bypass metadata cache for project/custom-field resolution',
      default: false,
    }),
    json: Flags.boolean({
      description: 'Output in JSON format',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TasksUpdate);
    const format: OutputFormat = flags.json ? 'json' : 'table';

    const parsedFields = parseCustomFieldFlags(flags.field);
    if (parsedFields.error) {
      renderError(parsedFields.error);
      this.exit(1);
      return;
    }

    // Ensure at least one update field is provided
    if (!flags.title && !flags.description && !flags.due && !flags.status && parsedFields.fields.length === 0) {
      renderError('No updates provided. Use --title, --description, --due, --status, or --field.');
      this.exit(1);
      return;
    }

    await pluginManager.initialize();

    const parsedTaskId = parseTaskId(args.id);
    if (!parsedTaskId) {
      renderError(`Invalid task ID format: ${args.id}`);
      this.exit(1);
      return;
    }

    let dueDate: Date | null | undefined;
    if (flags.due) {
      if (flags.due === 'none') {
        dueDate = null;
      } else {
        dueDate = new Date(flags.due);
        if (isNaN(dueDate.getTime())) {
          renderError(`Invalid date format: ${flags.due}. Use YYYY-MM-DD or "none".`);
          this.exit(1);
          return;
        }
      }
    }

    const updates = buildUpdateTaskInput({
      title: flags.title,
      description: flags.description,
      status: flags.status as UpdateTaskInput['status'] | undefined,
      dueDate,
      project: flags.project,
      workspace: flags.workspace,
      refresh: flags.refresh,
      customFields: parsedFields.fields,
      source: parsedTaskId.source,
    });

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

export function buildUpdateTaskInput(args: {
  title?: string;
  description?: string;
  status?: UpdateTaskInput['status'];
  dueDate?: Date | null;
  project?: string;
  workspace?: string;
  refresh: boolean;
  customFields: CustomFieldInput[];
  source: ProviderType;
}): UpdateTaskInput {
  const updates: UpdateTaskInput = {};

  if (args.title !== undefined) updates.title = args.title;
  if (args.description !== undefined) updates.description = args.description;
  if (args.status !== undefined) updates.status = args.status;
  if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
  if (args.customFields.length > 0) updates.customFields = args.customFields;
  if (args.refresh) updates.refresh = true;

  const project = splitIdOrName(args.project, args.source);
  if (project.id) updates.projectId = project.id;
  if (project.name) updates.projectName = project.name;

  const workspace = splitIdOrName(args.workspace, args.source);
  if (workspace.id) updates.workspaceId = workspace.id;
  if (workspace.name) updates.workspaceName = workspace.name;

  return updates;
}
