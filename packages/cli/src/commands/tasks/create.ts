// src/commands/tasks/create.ts

import { Command, Args, Flags } from '@oclif/core';
import { renderTask, renderSuccess, renderError, renderTasks, renderWarnings, taskMutationService } from 'pm-cli-core';
import type { CreateTaskInput, CustomFieldInput, OutputFormat, ProviderType } from 'pm-cli-core';
import { mergeLegacyDifficultyField, parseCustomFieldFlags } from '../../lib/task-field-parser.js';
import { splitIdOrName } from '../../lib/task-id-resolver.js';
import '../../init.js';
import { handleCommandError } from '../../lib/command-error.js';

export default class TasksCreate extends Command {
  static override description = 'Create a new task';

  static override examples = [
    '<%= config.bin %> tasks create "Fix login bug"',
    '<%= config.bin %> tasks create "Automated ticket" --source=asana --project "Platform Roadmap" --section "Ready"',
    '<%= config.bin %> tasks create "Tune dashboard UX" --source=asana --project "Platform Roadmap" --section "Ready" --difficulty "S"',
    '<%= config.bin %> tasks create "Ship API integration" --source=asana --project "Platform Roadmap" --section "Ready" --field "Difficulty=XS" --field "Area=Backend,Analytics"',
    '<%= config.bin %> tasks create --source=asana --project "Platform Roadmap" --section "Ready" --title "Fix login bug" --title "Ship onboarding follow-up"',
    '<%= config.bin %> tasks create --source=asana --project "Platform Roadmap" --title "Task A" --title "Task B" --field "Difficulty=S" --assignee engineer@example.com',
    '<%= config.bin %> tasks create "Fix login redirect bug" --source=asana --project 1210726476060870 --section 1210726344951110 --json',
  ];

  static override args = {
    title: Args.string({
      description: 'Task title',
      required: false,
    }),
  };

  static override flags = {
    description: Flags.string({
      char: 'd',
      description: 'Task description',
    }),
    title: Flags.string({
      char: 't',
      description: 'Task title (repeatable for bulk creation)',
      multiple: true,
    }),
    source: Flags.string({
      char: 's',
      description: 'Target provider (asana, notion, trello, linear, clickup)',
      options: ['asana', 'notion', 'trello', 'linear', 'clickup'],
    }),
    project: Flags.string({
      char: 'p',
      description: 'Project ID or name to add task to',
    }),
    section: Flags.string({
      description: 'Section/column ID or name within the project (requires --project)',
    }),
    workspace: Flags.string({
      description: 'Workspace ID or name for disambiguation',
    }),
    difficulty: Flags.string({
      description: 'Difficulty option name (Asana project custom field, requires --project)',
    }),
    field: Flags.string({
      description: 'Custom field assignment: <Field>=<Value[,Value]> (repeatable)',
      multiple: true,
    }),
    refresh: Flags.boolean({
      description: 'Bypass metadata cache for project/section resolution',
      default: false,
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

    const parsedFields = parseCustomFieldFlags(flags.field);
    if (parsedFields.error) {
      renderError(parsedFields.error);
      this.exit(1);
      return;
    }

    const customFields = mergeLegacyDifficultyField(parsedFields.fields, flags.difficulty);

    const validationError = validateCreateFlags(flags.project, flags.section, flags.difficulty, customFields);
    if (validationError) {
      renderError(validationError);
      this.exit(1);
      return;
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

    const titles = resolveTaskTitles(args.title, flags.title);
    if (titles.length === 0) {
      renderError('Provide at least one title as an argument or via --title');
      this.exit(1);
      return;
    }

    try {
      const source = await taskMutationService.resolveCreateSource(flags.source as ProviderType | undefined);
      const inputs = buildCreateTaskInputs({
        titles,
        description: flags.description,
        dueDate,
        assigneeEmail: flags.assignee,
        project: flags.project,
        section: flags.section,
        workspace: flags.workspace,
        difficulty: flags.difficulty,
        customFields,
        refresh: flags.refresh,
        source,
      });
      const result = await taskMutationService.createTasks({
        source,
        inputs,
      });
      renderWarnings(result.warnings);
      const createdTasks = result.data;

      if (createdTasks.length === 1) {
        if (!flags.json) {
          renderSuccess(`Task created: ${createdTasks[0].id}`);
        }
        renderTask(createdTasks[0], format);
      } else {
        if (!flags.json) {
          renderSuccess(`${createdTasks.length} tasks created`);
        }
        renderTasks(createdTasks, format);
      }
    } catch (error) {
      handleCommandError(error, 'Failed to create task');
    }
  }

}
export { splitIdOrName } from '../../lib/task-id-resolver.js';

export function resolveTaskTitles(argTitle: string | undefined, flagTitles: string[] | undefined): string[] {
  const titles = [argTitle, ...(flagTitles || [])]
    .map(title => title?.trim())
    .filter((title): title is string => Boolean(title));

  return Array.from(new Set(titles));
}

export function buildCreateTaskInputs(args: {
  titles: string[];
  description?: string;
  dueDate?: Date;
  assigneeEmail?: string;
  project?: string;
  section?: string;
  workspace?: string;
  difficulty?: string;
  customFields?: CustomFieldInput[];
  refresh: boolean;
  source: ProviderType;
}): CreateTaskInput[] {
  return args.titles.map(title => buildCreateTaskInput({
    title,
    description: args.description,
    dueDate: args.dueDate,
    assigneeEmail: args.assigneeEmail,
    project: args.project,
    section: args.section,
    workspace: args.workspace,
    difficulty: args.difficulty,
    customFields: args.customFields,
    refresh: args.refresh,
    source: args.source,
  }));
}

export function buildCreateTaskInput(args: {
  title: string;
  description?: string;
  dueDate?: Date;
  assigneeEmail?: string;
  project?: string;
  section?: string;
  workspace?: string;
  difficulty?: string;
  customFields?: CustomFieldInput[];
  refresh: boolean;
  source: ProviderType;
}): CreateTaskInput {
  const input: CreateTaskInput = {
    title: args.title,
    description: args.description,
    dueDate: args.dueDate,
    assigneeEmail: args.assigneeEmail,
  };

  if (args.difficulty || (args.customFields && args.customFields.length > 0)) {
    input.providerOptions = {};
    if (args.difficulty) input.providerOptions.difficulty = args.difficulty;
    if (args.customFields && args.customFields.length > 0) input.providerOptions.customFields = args.customFields;
  }

  const project = splitIdOrName(args.project, args.source);
  const section = splitIdOrName(args.section, args.source);
  const workspace = splitIdOrName(args.workspace, args.source);
  const placement = {
    containerId: project.id,
    containerName: project.name,
    parentId: section.id,
    parentName: section.name,
  };
  const hasPlacement = Object.values(placement).some((value) => value !== undefined);

  if (hasPlacement || workspace.id || workspace.name || args.refresh) {
    input.context = {};
    if (workspace.id) input.context.workspaceId = workspace.id;
    if (workspace.name) input.context.workspaceName = workspace.name;
    if (args.refresh) input.context.refresh = true;

    if (hasPlacement) {
      input.context.placement = placement;
    }
  }

  return input;
}

export function validateCreateFlags(
  project: string | undefined,
  section: string | undefined,
  difficulty: string | undefined,
  customFields: CustomFieldInput[] | undefined
): string | null {
  if (section && !project) {
    return '--section requires --project';
  }

  if (difficulty && !project) {
    return '--difficulty requires --project';
  }

  if (customFields && customFields.length > 0 && !project) {
    return '--field requires --project';
  }

  return null;
}
