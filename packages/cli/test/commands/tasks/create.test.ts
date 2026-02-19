import { describe, expect, it } from 'vitest';
import { buildCreateTaskInput, buildCreateTaskInputs, resolveTaskTitles, splitIdOrName, validateCreateFlags } from '../../../src/commands/tasks/create.js';

describe('tasks create helpers', () => {
  it('splits Asana numeric values as IDs', () => {
    expect(splitIdOrName('1210726476060870', 'asana')).toEqual({ id: '1210726476060870' });
  });

  it('keeps non-id values as names', () => {
    expect(splitIdOrName('Teacher Feature Development', 'asana')).toEqual({ name: 'Teacher Feature Development' });
  });

  it('treats numeric notion values as names (no Asana ID coercion)', () => {
    expect(splitIdOrName('12345', 'notion')).toEqual({ name: '12345' });
  });

  it('builds create input with project/section/workspace name fields', () => {
    const input = buildCreateTaskInput({
      title: 'New task',
      description: 'Task details',
      project: 'Teacher Feature Development',
      section: 'Prioritised',
      workspace: 'Engineering',
      difficulty: 'S',
      refresh: true,
      source: 'asana',
    });

    expect(input).toEqual({
      title: 'New task',
      description: 'Task details',
      dueDate: undefined,
      assigneeEmail: undefined,
      difficulty: 'S',
      refresh: true,
      projectName: 'Teacher Feature Development',
      sectionName: 'Prioritised',
      workspaceName: 'Engineering',
    });
  });

  it('builds bulk create inputs with shared custom flags for every title', () => {
    const inputs = buildCreateTaskInputs({
      titles: ['Task A', 'Task B'],
      description: 'Shared details',
      assigneeEmail: 'dev@company.com',
      project: 'Teacher Feature Development',
      section: 'Prioritised',
      difficulty: 'S',
      customFields: [{ field: 'Other', values: ['Bugs', 'Analytics'] }],
      refresh: true,
      source: 'asana',
    });

    expect(inputs).toEqual([
      {
        title: 'Task A',
        description: 'Shared details',
        dueDate: undefined,
        assigneeEmail: 'dev@company.com',
        difficulty: 'S',
        customFields: [{ field: 'Other', values: ['Bugs', 'Analytics'] }],
        refresh: true,
        projectName: 'Teacher Feature Development',
        sectionName: 'Prioritised',
      },
      {
        title: 'Task B',
        description: 'Shared details',
        dueDate: undefined,
        assigneeEmail: 'dev@company.com',
        difficulty: 'S',
        customFields: [{ field: 'Other', values: ['Bugs', 'Analytics'] }],
        refresh: true,
        projectName: 'Teacher Feature Development',
        sectionName: 'Prioritised',
      },
    ]);
  });

  it('resolves titles from argument and repeated --title values', () => {
    expect(resolveTaskTitles('First task', ['Second task', 'Third task'])).toEqual([
      'First task',
      'Second task',
      'Third task',
    ]);
  });

  it('deduplicates and trims resolved titles', () => {
    expect(resolveTaskTitles('  First task  ', ['First task', '  ', 'Second task'])).toEqual([
      'First task',
      'Second task',
    ]);
  });

  it('returns empty titles list when no title is provided', () => {
    expect(resolveTaskTitles(undefined, undefined)).toEqual([]);
  });

  it('validates that section requires project', () => {
    expect(validateCreateFlags(undefined, 'Prioritised', undefined, [])).toBe('--section requires --project');
    expect(validateCreateFlags('Teacher Feature Development', 'Prioritised', undefined, [])).toBeNull();
  });

  it('validates that difficulty requires project', () => {
    expect(validateCreateFlags(undefined, undefined, 'S', [])).toBe('--difficulty requires --project');
    expect(validateCreateFlags('Teacher Feature Development', undefined, 'S', [])).toBeNull();
  });

  it('validates that field requires project', () => {
    expect(validateCreateFlags(undefined, undefined, undefined, [{ field: 'Difficulty', values: ['S'] }])).toBe('--field requires --project');
    expect(validateCreateFlags('Teacher Feature Development', undefined, undefined, [{ field: 'Difficulty', values: ['S'] }])).toBeNull();
  });
});
