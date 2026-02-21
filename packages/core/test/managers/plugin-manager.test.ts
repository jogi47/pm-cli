import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pluginManager } from '../../src/managers/plugin-manager.js';
import type { PMPlugin } from '../../src/models/plugin.js';
import type { Task } from '../../src/models/task.js';

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

function buildPlugin(name: Task['source'], tasks: Task[], opts?: { throwAssigned?: boolean }): PMPlugin {
  return {
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
