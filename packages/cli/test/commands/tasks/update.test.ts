import { describe, expect, it } from 'vitest';
import { buildUpdateTaskInput } from '../../../src/commands/tasks/update.js';

describe('tasks update helpers', () => {
  it('builds update input with custom fields and project/workspace scope', () => {
    const updates = buildUpdateTaskInput({
      title: 'Updated',
      description: 'Body',
      status: 'in_progress',
      dueDate: new Date('2026-03-10T00:00:00.000Z'),
      project: 'Teacher Feature Development',
      workspace: 'Engineering',
      refresh: true,
      customFields: [
        { field: 'Importance', values: ['High'] },
        { field: 'Other', values: ['Bugs', 'Analytics'] },
      ],
      source: 'asana',
    });

    expect(updates).toEqual({
      title: 'Updated',
      description: 'Body',
      status: 'in_progress',
      dueDate: new Date('2026-03-10T00:00:00.000Z'),
      projectName: 'Teacher Feature Development',
      workspaceName: 'Engineering',
      refresh: true,
      customFields: [
        { field: 'Importance', values: ['High'] },
        { field: 'Other', values: ['Bugs', 'Analytics'] },
      ],
    });
  });

  it('treats numeric project/workspace values as IDs for Asana', () => {
    const updates = buildUpdateTaskInput({
      project: '1210726476060870',
      workspace: '1133182398393200',
      refresh: false,
      customFields: [{ field: '1207357939780562', values: ['1207357939780564'] }],
      source: 'asana',
    });

    expect(updates).toEqual({
      projectId: '1210726476060870',
      workspaceId: '1133182398393200',
      customFields: [{ field: '1207357939780562', values: ['1207357939780564'] }],
    });
  });
});
