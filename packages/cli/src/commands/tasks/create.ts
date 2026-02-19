// src/commands/tasks/create.ts

import { Command, Args, Flags } from '@oclif/core';
import { pluginManager, renderTask, renderSuccess, renderError, renderTasks } from '@jogi47/pm-cli-core';
import type { CreateTaskInput, CustomFieldInput, OutputFormat, ProviderType } from '@jogi47/pm-cli-core';
import { mergeLegacyDifficultyField, parseCustomFieldFlags } from '../../lib/task-field-parser.js';
import { splitIdOrName } from '../../lib/task-id-resolver.js';
import '../../init.js';
import { handleCommandError } from '../../lib/command-error.js';

export default class TasksCreate extends Command {
  static override description = 'Create a new task';

  static override examples = [
    '<%= config.bin %> tasks create "Fix login bug"',
    '<%= config.bin %> tasks create "This is automated ticket" --source=asana --project "Teacher Feature Development" --section "Prioritised"',
    '<%= config.bin %> tasks create "Tune lesson plan UX" --source=asana --project "Teacher Feature Development" --section "Prioritised" --difficulty "S"',
    '<%= config.bin %> tasks create "Cover flow API integration" --source=asana --project "Teacher Feature Development" --section "Prioritised" --field "Difficulty=XS" --field "Other=Bugs,Analytics"',
    '<%= config.bin %> tasks create --source=asana --project "Teacher Feature Development" --section "Prioritised" --title "Fix login bug" --title "Ship onboarding follow-up"',
    '<%= config.bin %> tasks create --source=asana --project "Teacher Feature Development" --title "Task A" --title "Task B" --field "Difficulty=S" --assignee dev@company.com',
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
      description: 'Target provider (asana, notion)',
      options: ['asana', 'notion'],
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
      const createdTasks = [];

      for (const input of inputs) {
        const task = await pluginManager.createTask(source, input);
        createdTasks.push(task);
      }

      if (createdTasks.length === 1) {
        renderSuccess(`Task created: ${createdTasks[0].id}`);
        renderTask(createdTasks[0], format);
      } else {
        renderSuccess(`${createdTasks.length} tasks created`);
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
    difficulty: args.difficulty,
    customFields: args.customFields,
    refresh: args.refresh,
  };

  const project = splitIdOrName(args.project, args.source);
  if (project.id) input.projectId = project.id;
  if (project.name) input.projectName = project.name;

  const section = splitIdOrName(args.section, args.source);
  if (section.id) input.sectionId = section.id;
  if (section.name) input.sectionName = section.name;

  const workspace = splitIdOrName(args.workspace, args.source);
  if (workspace.id) input.workspaceId = workspace.id;
  if (workspace.name) input.workspaceName = workspace.name;

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
