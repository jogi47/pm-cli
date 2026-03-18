import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authManager } from '../../src/managers/auth-manager.js';
import { pluginManager } from '../../src/managers/plugin-manager.js';
import type { PMPlugin } from '../../src/models/plugin.js';
import type { Task } from '../../src/models/task.js';

function buildPlugin(name: Task['source']): PMPlugin {
  return {
    name,
    displayName: name,
    capabilities: {
      comments: false,
      thread: false,
      attachmentDownload: false,
      workspaces: false,
      customFields: false,
      projectPlacement: false,
    },
    async initialize() {},
    async authenticate() {},
    async disconnect() {},
    async isAuthenticated() { return true; },
    async getInfo() { return { name, displayName: name, connected: true, capabilities: this.capabilities }; },
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

  it('requires both Notion env vars to build env credentials', () => {
    const originalToken = process.env.NOTION_TOKEN;
    const originalDatabaseId = process.env.NOTION_DATABASE_ID;

    try {
      process.env.NOTION_TOKEN = 'notion-token';
      delete process.env.NOTION_DATABASE_ID;
      expect(authManager.getCredentials('notion')).toBeNull();

      process.env.NOTION_DATABASE_ID = 'database-123';
      expect(authManager.getCredentials('notion')).toEqual({
        token: 'notion-token',
        databaseId: 'database-123',
      });
    } finally {
      if (originalToken === undefined) delete process.env.NOTION_TOKEN;
      else process.env.NOTION_TOKEN = originalToken;

      if (originalDatabaseId === undefined) delete process.env.NOTION_DATABASE_ID;
      else process.env.NOTION_DATABASE_ID = originalDatabaseId;
    }
  });

  it('builds Trello env credentials from the shared credential spec', () => {
    const originalApiKey = process.env.TRELLO_API_KEY;
    const originalToken = process.env.TRELLO_TOKEN;

    try {
      process.env.TRELLO_API_KEY = 'trello-key';
      delete process.env.TRELLO_TOKEN;
      expect(authManager.getCredentials('trello')).toBeNull();

      process.env.TRELLO_TOKEN = 'trello-token';
      expect(authManager.getCredentials('trello')).toEqual({
        apiKey: 'trello-key',
        token: 'trello-token',
      });
    } finally {
      if (originalApiKey === undefined) delete process.env.TRELLO_API_KEY;
      else process.env.TRELLO_API_KEY = originalApiKey;

      if (originalToken === undefined) delete process.env.TRELLO_TOKEN;
      else process.env.TRELLO_TOKEN = originalToken;
    }
  });

  it('rejects storing incomplete credentials for providers with multiple required fields', () => {
    expect(() => authManager.setCredentials('notion', { token: 'notion-token' })).toThrow(
      'Missing required credentials for notion: databaseId'
    );
  });
});
