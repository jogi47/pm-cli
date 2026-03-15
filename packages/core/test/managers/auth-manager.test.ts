import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authManager } from '../../src/managers/auth-manager.js';
import { pluginManager } from '../../src/managers/plugin-manager.js';
import type { PMPlugin } from '../../src/models/plugin.js';
import type { Task } from '../../src/models/task.js';

function buildPlugin(name: Task['source']): PMPlugin {
  return {
    name,
    displayName: name,
    async initialize() {},
    async authenticate() {},
    async disconnect() {},
    async isAuthenticated() { return true; },
    async getInfo() { return { name, displayName: name, connected: true }; },
    async validateConnection() { return true; },
    async getAssignedTasks() { return []; },
    async getOverdueTasks() { return []; },
    async searchTasks() { return []; },
    async getTask() { return null; },
    getTaskUrl(externalId: string) { return `https://example.com/${externalId}`; },
    async createTask() { throw new Error('not used'); },
    async updateTask() { throw new Error('not used'); },
    async completeTask() { throw new Error('not used'); },
    async deleteTask() {},
  };
}

describe('authManager getConnectedProviders', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const manager = pluginManager as unknown as { plugins: Map<string, PMPlugin>; initialized: boolean };
    manager.plugins = new Map();
    manager.initialized = false;
  });

  it('returns only providers registered in the plugin manager', () => {
    pluginManager.registerPlugin(buildPlugin('asana'));

    vi.spyOn(authManager, 'hasCredentials').mockImplementation((provider) => (
      provider === 'asana' || provider === 'linear'
    ));

    expect(authManager.getConnectedProviders()).toEqual(['asana']);
  });
});
