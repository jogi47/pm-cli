import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheManager } from '@jogi47/pm-cli-core';
import { AsanaPlugin, asanaClient } from '../src/index.js';
import type { AsanaTask } from '../src/client.js';

function buildAsanaTask(overrides: Partial<AsanaTask> = {}): AsanaTask {
  return {
    gid: '12345',
    name: 'Updated Task',
    completed: false,
    projects: [{ gid: 'proj-1', name: 'Teacher Feature Development' }],
    memberships: [{ project: { gid: 'proj-1', name: 'Teacher Feature Development' } }],
    permalink_url: 'https://app.asana.com/0/0/12345',
    created_at: '2026-01-01T00:00:00Z',
    modified_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('AsanaPlugin updateTask custom fields', () => {
  let plugin: AsanaPlugin;

  beforeEach(() => {
    plugin = new AsanaPlugin();
    vi.restoreAllMocks();
    vi.spyOn(cacheManager, 'invalidateProvider').mockResolvedValue();
  });

  it('resolves field values from task memberships when --project is not provided', async () => {
    vi.spyOn(asanaClient, 'getTask').mockResolvedValue(buildAsanaTask());
    vi.spyOn(asanaClient, 'getCustomFieldSettingsForProject').mockResolvedValue([
      {
        customField: {
          gid: 'cf-importance',
          name: 'Importance',
          resourceSubtype: 'enum',
          enumOptions: [
            { gid: 'opt-high', name: 'High' },
            { gid: 'opt-low', name: 'Low' },
          ],
        },
      },
      {
        customField: {
          gid: 'cf-other',
          name: 'Other',
          resourceSubtype: 'multi_enum',
          enumOptions: [
            { gid: 'opt-bugs', name: 'Bugs' },
            { gid: 'opt-analytics', name: 'Analytics' },
          ],
        },
      },
    ]);

    const updateSpy = vi.spyOn(asanaClient, 'updateTask').mockResolvedValue(buildAsanaTask());

    const task = await plugin.updateTask('12345', {
      customFields: [
        { field: 'Importance', values: ['High'] },
        { field: 'Other', values: ['Bugs', 'Analytics'] },
      ],
    });

    expect(updateSpy).toHaveBeenCalledWith(
      '12345',
      expect.objectContaining({
        customFields: {
          'cf-importance': 'opt-high',
          'cf-other': ['opt-bugs', 'opt-analytics'],
        },
      })
    );
    expect(task.customFieldResults).toEqual([
      {
        fieldId: 'cf-importance',
        fieldName: 'Importance',
        type: 'enum',
        optionIds: ['opt-high'],
        optionNames: ['High'],
        status: 'applied',
      },
      {
        fieldId: 'cf-other',
        fieldName: 'Other',
        type: 'multi_enum',
        optionIds: ['opt-bugs', 'opt-analytics'],
        optionNames: ['Bugs', 'Analytics'],
        status: 'applied',
      },
    ]);
  });

  it('supports ID-based updates and clear operations', async () => {
    vi.spyOn(asanaClient, 'getTask').mockResolvedValue(buildAsanaTask());
    vi.spyOn(asanaClient, 'getCustomFieldSettingsForProject').mockResolvedValue([
      {
        customField: {
          gid: 'cf-importance',
          name: 'Importance',
          resourceSubtype: 'enum',
          enumOptions: [{ gid: 'opt-high', name: 'High' }],
        },
      },
      {
        customField: {
          gid: 'cf-other',
          name: 'Other',
          resourceSubtype: 'multi_enum',
          enumOptions: [{ gid: 'opt-bugs', name: 'Bugs' }],
        },
      },
    ]);

    const updateSpy = vi.spyOn(asanaClient, 'updateTask').mockResolvedValue(buildAsanaTask());

    await plugin.updateTask('12345', {
      customFields: [
        { field: 'cf-importance', values: [] },
        { field: 'cf-other', values: [] },
      ],
    });

    expect(updateSpy).toHaveBeenCalledWith(
      '12345',
      expect.objectContaining({
        customFields: {
          'cf-importance': null,
          'cf-other': [],
        },
      })
    );
  });

  it('fails when enum field receives multiple values', async () => {
    vi.spyOn(asanaClient, 'getTask').mockResolvedValue(buildAsanaTask());
    vi.spyOn(asanaClient, 'getCustomFieldSettingsForProject').mockResolvedValue([
      {
        customField: {
          gid: 'cf-importance',
          name: 'Importance',
          resourceSubtype: 'enum',
          enumOptions: [
            { gid: 'opt-high', name: 'High' },
            { gid: 'opt-low', name: 'Low' },
          ],
        },
      },
    ]);

    await expect(plugin.updateTask('12345', {
      customFields: [{ field: 'Importance', values: ['High', 'Low'] }],
    })).rejects.toThrow('expects a single value');
  });

  it('fails on ambiguous field names across memberships', async () => {
    vi.spyOn(asanaClient, 'getTask').mockResolvedValue(buildAsanaTask({
      memberships: [
        { project: { gid: 'proj-1', name: 'Teacher Feature Development' } },
        { project: { gid: 'proj-2', name: 'Another Project' } },
      ],
      projects: [
        { gid: 'proj-1', name: 'Teacher Feature Development' },
        { gid: 'proj-2', name: 'Another Project' },
      ],
    }));

    vi.spyOn(asanaClient, 'getCustomFieldSettingsForProject').mockImplementation(async (projectGid: string) => {
      if (projectGid === 'proj-1') {
        return [{
          customField: {
            gid: 'cf-department-1',
            name: 'Department',
            resourceSubtype: 'enum',
            enumOptions: [{ gid: 'opt-fe', name: 'Frontend' }],
          },
        }];
      }

      return [{
        customField: {
          gid: 'cf-department-2',
          name: 'Department',
          resourceSubtype: 'enum',
          enumOptions: [{ gid: 'opt-content', name: 'Content' }],
        },
      }];
    });

    await expect(plugin.updateTask('12345', {
      customFields: [{ field: 'Department', values: ['Frontend'] }],
    })).rejects.toThrow('Ambiguous custom field');
  });
});
