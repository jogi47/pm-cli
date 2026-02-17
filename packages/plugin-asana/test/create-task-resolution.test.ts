import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheManager } from '@jogi47/pm-cli-core';
import { AsanaPlugin, asanaClient } from '../src/index.js';
import type { AsanaTask } from '../src/client.js';

function buildAsanaTask(overrides: Partial<AsanaTask> = {}): AsanaTask {
  return {
    gid: '12345',
    name: 'Created Task',
    completed: false,
    projects: [{ gid: 'proj-1', name: 'Project One' }],
    permalink_url: 'https://app.asana.com/0/0/12345',
    created_at: '2026-01-01T00:00:00Z',
    modified_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('AsanaPlugin createTask resolution', () => {
  let plugin: AsanaPlugin;

  beforeEach(() => {
    plugin = new AsanaPlugin();
    vi.restoreAllMocks();
    vi.spyOn(cacheManager, 'invalidateProvider').mockResolvedValue();
  });

  it('resolves project and section by name and creates task with memberships', async () => {
    vi.spyOn(asanaClient, 'getWorkspaces').mockReturnValue([
      { gid: 'ws-1', name: 'Workspace One' },
      { gid: 'ws-2', name: 'Workspace Two' },
    ]);
    vi.spyOn(asanaClient, 'getDefaultWorkspace').mockReturnValue({ gid: 'ws-1', name: 'Workspace One' });
    vi.spyOn(asanaClient, 'getProjects').mockImplementation(async (workspaceGid: string) => {
      if (workspaceGid === 'ws-1') {
        return [{ gid: 'proj-a', name: 'Backlog', workspace: { gid: 'ws-1', name: 'Workspace One' } }];
      }

      return [{ gid: 'proj-b', name: 'Teacher Feature Development', workspace: { gid: 'ws-2', name: 'Workspace Two' } }];
    });
    vi.spyOn(asanaClient, 'getSectionsForProject').mockResolvedValue([
      { gid: 'sec-prio', name: 'Prioritised' },
      { gid: 'sec-doing', name: 'Doing' },
    ]);

    const createSpy = vi.spyOn(asanaClient, 'createTask').mockResolvedValue(
      buildAsanaTask({
        projects: [{ gid: 'proj-b', name: 'Teacher Feature Development' }],
        memberships: [{ section: { gid: 'sec-prio', name: 'Prioritised' } }],
      })
    );

    const task = await plugin.createTask({
      title: 'Create with placement',
      projectName: 'Teacher Feature Development',
      sectionName: 'Prioritised',
      refresh: true,
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Create with placement',
        workspaceGid: 'ws-2',
        memberships: [{ project: 'proj-b', section: 'sec-prio' }],
      })
    );
    expect(task.placement?.project).toEqual({ id: 'proj-b', name: 'Teacher Feature Development' });
    expect(task.placement?.section).toEqual({ id: 'sec-prio', name: 'Prioritised' });
  });

  it('fails with disambiguation details when project name matches multiple workspaces', async () => {
    vi.spyOn(asanaClient, 'getWorkspaces').mockReturnValue([
      { gid: 'ws-1', name: 'Workspace One' },
      { gid: 'ws-2', name: 'Workspace Two' },
    ]);
    vi.spyOn(asanaClient, 'getDefaultWorkspace').mockReturnValue({ gid: 'ws-1', name: 'Workspace One' });
    vi.spyOn(asanaClient, 'getProjects').mockImplementation(async (workspaceGid: string) => [{
      gid: `proj-${workspaceGid}`,
      name: 'Shared Project',
      workspace: { gid: workspaceGid, name: workspaceGid === 'ws-1' ? 'Workspace One' : 'Workspace Two' },
    }]);

    await expect(plugin.createTask({ title: 'Ambiguous', projectName: 'Shared Project' }))
      .rejects
      .toThrow('Ambiguous project: "Shared Project"');
  });

  it('fails with available section list when section name is missing', async () => {
    vi.spyOn(asanaClient, 'getWorkspaces').mockReturnValue([{ gid: 'ws-1', name: 'Workspace One' }]);
    vi.spyOn(asanaClient, 'getDefaultWorkspace').mockReturnValue({ gid: 'ws-1', name: 'Workspace One' });
    vi.spyOn(asanaClient, 'getProjects').mockResolvedValue([
      { gid: 'proj-1', name: 'Teacher Feature Development', workspace: { gid: 'ws-1', name: 'Workspace One' } },
    ]);
    vi.spyOn(asanaClient, 'getSectionsForProject').mockResolvedValue([
      { gid: 'sec-1', name: 'Backlog' },
      { gid: 'sec-2', name: 'Doing' },
    ]);

    await expect(plugin.createTask({
      title: 'Missing section',
      projectName: 'Teacher Feature Development',
      sectionName: 'Prioritised',
    })).rejects.toThrow('Available sections');
  });

  it('passes refresh to project and section resolution APIs', async () => {
    vi.spyOn(asanaClient, 'getWorkspaces').mockReturnValue([{ gid: 'ws-1', name: 'Workspace One' }]);
    vi.spyOn(asanaClient, 'getDefaultWorkspace').mockReturnValue({ gid: 'ws-1', name: 'Workspace One' });

    const getProjectsSpy = vi.spyOn(asanaClient, 'getProjects').mockResolvedValue([
      { gid: 'proj-1', name: 'Teacher Feature Development', workspace: { gid: 'ws-1', name: 'Workspace One' } },
    ]);

    const getSectionsSpy = vi.spyOn(asanaClient, 'getSectionsForProject').mockResolvedValue([
      { gid: 'sec-prio', name: 'Prioritised' },
    ]);

    vi.spyOn(asanaClient, 'createTask').mockResolvedValue(
      buildAsanaTask({
        projects: [{ gid: 'proj-1', name: 'Teacher Feature Development' }],
        memberships: [{ section: { gid: 'sec-prio', name: 'Prioritised' } }],
      })
    );

    await plugin.createTask({
      title: 'Refresh metadata',
      workspaceName: 'Workspace One',
      projectName: 'Teacher Feature Development',
      sectionName: 'Prioritised',
      refresh: true,
    });

    expect(getProjectsSpy).toHaveBeenCalledWith('ws-1', { refresh: true });
    expect(getSectionsSpy).toHaveBeenCalledWith('proj-1', { refresh: true });
  });

  it('keeps project-id create working when project listing fails', async () => {
    vi.spyOn(asanaClient, 'getWorkspaces').mockReturnValue([{ gid: 'ws-1', name: 'Workspace One' }]);
    vi.spyOn(asanaClient, 'getDefaultWorkspace').mockReturnValue({ gid: 'ws-1', name: 'Workspace One' });
    vi.spyOn(asanaClient, 'getProjects').mockRejectedValue(new Error('projects endpoint unavailable'));

    const createSpy = vi.spyOn(asanaClient, 'createTask').mockResolvedValue(
      buildAsanaTask({
        projects: [{ gid: 'proj-123', name: 'Known Project' }],
      })
    );

    await plugin.createTask({
      title: 'Project ID only',
      projectId: 'proj-123',
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projects: ['proj-123'],
        memberships: undefined,
      })
    );
  });

  it('sets Difficulty custom field option when --difficulty is provided', async () => {
    vi.spyOn(asanaClient, 'getWorkspaces').mockReturnValue([{ gid: 'ws-1', name: 'Workspace One' }]);
    vi.spyOn(asanaClient, 'getDefaultWorkspace').mockReturnValue({ gid: 'ws-1', name: 'Workspace One' });
    vi.spyOn(asanaClient, 'getProjects').mockResolvedValue([
      { gid: 'proj-1', name: 'Teacher Feature Development', workspace: { gid: 'ws-1', name: 'Workspace One' } },
    ]);
    vi.spyOn(asanaClient, 'getCustomFieldSettingsForProject').mockResolvedValue([
      {
        customField: {
          gid: 'cf-difficulty',
          name: 'Difficulty',
          resourceSubtype: 'enum',
          enumOptions: [
            { gid: 'opt-xs', name: 'XS' },
            { gid: 'opt-s', name: 'S' },
            { gid: 'opt-m', name: 'M' },
          ],
        },
      },
    ]);

    const createSpy = vi.spyOn(asanaClient, 'createTask').mockResolvedValue(
      buildAsanaTask({
        projects: [{ gid: 'proj-1', name: 'Teacher Feature Development' }],
      })
    );

    await plugin.createTask({
      title: 'Set difficulty',
      projectName: 'Teacher Feature Development',
      difficulty: 'S',
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        customFields: { 'cf-difficulty': 'opt-s' },
      })
    );
  });

  it('fails with available options when difficulty option is missing', async () => {
    vi.spyOn(asanaClient, 'getWorkspaces').mockReturnValue([{ gid: 'ws-1', name: 'Workspace One' }]);
    vi.spyOn(asanaClient, 'getDefaultWorkspace').mockReturnValue({ gid: 'ws-1', name: 'Workspace One' });
    vi.spyOn(asanaClient, 'getProjects').mockResolvedValue([
      { gid: 'proj-1', name: 'Teacher Feature Development', workspace: { gid: 'ws-1', name: 'Workspace One' } },
    ]);
    vi.spyOn(asanaClient, 'getCustomFieldSettingsForProject').mockResolvedValue([
      {
        customField: {
          gid: 'cf-difficulty',
          name: 'Difficulty',
          resourceSubtype: 'enum',
          enumOptions: [
            { gid: 'opt-xs', name: 'XS' },
            { gid: 'opt-s', name: 'S' },
          ],
        },
      },
    ]);

    await expect(plugin.createTask({
      title: 'Bad difficulty',
      projectName: 'Teacher Feature Development',
      difficulty: 'L',
    })).rejects.toThrow('Available options: XS, S');
  });
});
