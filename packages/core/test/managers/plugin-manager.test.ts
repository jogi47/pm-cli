import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pluginManager } from '../../src/managers/plugin-manager.js';
import type { PMPlugin } from '../../src/models/plugin.js';
import type { Task, ThreadEntry } from '../../src/models/task.js';

function task(id: string, source: Task['source']): Task {
  return {
    id,
    externalId: id.split('-').slice(1).join('-'),
    title: id,
    status: 'todo',
    source,
    url: `https://example.com/${id}`,
  };
}


function entry(id: string, source: Task['source']): ThreadEntry {
  return {
    id,
    body: `entry-${id}`,
    source,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function buildPlugin(
  name: Task['source'],
  tasks: Task[],
  opts?: { throwAssigned?: boolean; thread?: ThreadEntry[]; supportsThread?: boolean }
): PMPlugin {
  const plugin: PMPlugin = {
    name,
    displayName: name,
    async initialize() {},
    async authenticate() {},
    async disconnect() {},
    async isAuthenticated() { return true; },
    async getInfo() { return { name, displayName: name, connected: true }; },
    async validateConnection() { return true; },
    async getAssignedTasks() {
      if (opts?.throwAssigned) throw new Error('boom');
      return tasks;
    },
    async getOverdueTasks() { return []; },
    async searchTasks() { return tasks; },
    async getTask() { return null; },
    getTaskUrl(externalId: string) { return `https://example.com/${externalId}`; },
    async createTask() { throw new Error('not used'); },
    async updateTask() { throw new Error('not used'); },
    async completeTask() { throw new Error('not used'); },
    async deleteTask() {},
  };

  if (opts?.supportsThread !== false) {
    plugin.getTaskThread = async () => opts?.thread ?? [];
  }

  return plugin;
}

describe('pluginManager aggregation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const manager = pluginManager as unknown as { plugins: Map<string, PMPlugin>; initialized: boolean };
    manager.plugins = new Map();
    manager.initialized = false;
  });

  it('aggregates tasks across providers and de-duplicates by task id', async () => {
    pluginManager.registerPlugin(buildPlugin('asana', [task('ASANA-1', 'asana')]));
    pluginManager.registerPlugin(buildPlugin('notion', [task('NOTION-1', 'notion')]));
    pluginManager.registerPlugin(buildPlugin('trello', [task('TRELLO-1', 'trello'), task('ASANA-1', 'trello')]));

    const result = await pluginManager.aggregateTasks('assigned');
    expect(result.map((t) => t.id)).toEqual(['ASANA-1', 'NOTION-1', 'TRELLO-1']);
  });

  it('continues aggregating when one provider fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    pluginManager.registerPlugin(buildPlugin('asana', [task('ASANA-1', 'asana')]));
    pluginManager.registerPlugin(buildPlugin('linear', [task('LINEAR-1', 'linear')], { throwAssigned: true }));

    const result = await pluginManager.aggregateTasks('assigned');
    expect(result.map((t) => t.id)).toEqual(['ASANA-1']);
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});


describe('pluginManager thread operations', () => {
  beforeEach(() => {
    const manager = pluginManager as unknown as { plugins: Map<string, PMPlugin>; initialized: boolean };
    manager.plugins = new Map();
    manager.initialized = false;
  });

  it('routes thread fetch to provider by task ID', async () => {
    pluginManager.registerPlugin(buildPlugin('asana', [], { thread: [entry('story-1', 'asana')] }));

    const result = await pluginManager.getTaskThread('ASANA-123');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('story-1');
  });

  it('rejects invalid task IDs for thread fetch', async () => {
    pluginManager.registerPlugin(buildPlugin('asana', []));

    await expect(pluginManager.getTaskThread('bad-id')).rejects.toThrow('Invalid task ID format');
  });

  it('rejects when provider does not support thread fetch', async () => {
    pluginManager.registerPlugin(buildPlugin('asana', [], { supportsThread: false }));

    await expect(pluginManager.getTaskThread('ASANA-123')).rejects.toMatchObject({
      name: 'PMCliError',
      message: 'asana does not support task threads',
      reason: 'The plugin does not implement this feature.',
    });
  });
});
