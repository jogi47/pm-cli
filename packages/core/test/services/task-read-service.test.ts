import { describe, expect, it, vi } from 'vitest';
import { NotConnectedError } from '../../src/utils/errors.js';
import { TaskReadService } from '../../src/services/task-read-service.js';
import type { PMPluginBase } from '../../src/models/plugin.js';
import type { Task, ThreadEntry } from '../../src/models/task.js';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'ASANA-123',
    externalId: '123',
    title: 'Demo task',
    status: 'todo',
    source: 'asana',
    url: 'https://app.asana.com/0/0/123',
    ...overrides,
  };
}

function plugin(overrides: Partial<PMPluginBase> = {}): PMPluginBase {
  return {
    name: 'asana',
    displayName: 'Asana',
    capabilities: {
      comments: true,
      thread: true,
      attachmentDownload: true,
      workspaces: true,
      customFields: true,
      projectPlacement: true,
    },
    async initialize() {},
    async authenticate() {},
    async disconnect() {},
    async isAuthenticated() { return true; },
    async getInfo() { return { name: 'asana', displayName: 'Asana', connected: true, capabilities: this.capabilities }; },
    async validateConnection() { return true; },
    async getAssignedTasks() { return []; },
    async getOverdueTasks() { return []; },
    async searchTasks() { return []; },
    async getTask() { return task(); },
    getTaskUrl(externalId: string) { return `https://app.asana.com/0/0/${externalId}`; },
    async createTask() { throw new Error('not used'); },
    async updateTask() { throw new Error('not used'); },
    async completeTask() { throw new Error('not used'); },
    async deleteTask() {},
    ...overrides,
  };
}

describe('TaskReadService', () => {
  it('rejects invalid task ids', async () => {
    const service = new TaskReadService({
      initialize: vi.fn().mockResolvedValue(undefined),
      getPlugin: vi.fn(),
    });

    await expect(service.getTask('bad-id')).rejects.toMatchObject({
      message: 'Invalid task ID format: bad-id',
    });
  });

  it('rejects when the provider is not connected', async () => {
    const disconnectedPlugin = plugin({
      isAuthenticated: vi.fn().mockResolvedValue(false),
    });
    const service = new TaskReadService({
      initialize: vi.fn().mockResolvedValue(undefined),
      getPlugin: vi.fn().mockReturnValue(disconnectedPlugin),
    });

    await expect(service.getTask('ASANA-123')).rejects.toBeInstanceOf(NotConnectedError);
  });

  it('rejects unsupported thread access consistently', async () => {
    const noThreadPlugin = plugin({
      capabilities: {
        comments: true,
        thread: false,
        attachmentDownload: false,
        workspaces: true,
        customFields: true,
        projectPlacement: true,
      },
    });
    const service = new TaskReadService({
      initialize: vi.fn().mockResolvedValue(undefined),
      getPlugin: vi.fn().mockReturnValue(noThreadPlugin),
    });

    await expect(service.getTaskThread('ASANA-123')).rejects.toMatchObject({
      message: 'asana does not support task threads',
    });
  });

  it('deduplicates attachments returned across thread entries', async () => {
    const threadPlugin = {
      ...plugin(),
      getTaskThread: vi.fn().mockResolvedValue([
        {
          id: 'entry-1',
          body: 'body 1',
          source: 'asana',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          attachments: [{ id: 'att-1', name: 'mockup.png', kind: 'image', source: 'asana' }],
        },
        {
          id: 'entry-2',
          body: 'body 2',
          source: 'asana',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          attachments: [
            { id: 'att-1', name: 'mockup.png', kind: 'image', source: 'asana' },
            { id: 'att-2', name: 'notes.pdf', kind: 'document', source: 'asana' },
          ],
        },
      ] satisfies ThreadEntry[]),
    };
    const service = new TaskReadService({
      initialize: vi.fn().mockResolvedValue(undefined),
      getPlugin: vi.fn().mockReturnValue(threadPlugin),
    });

    const result = await service.getTaskAttachments('ASANA-123');

    expect(result.attachments).toEqual([
      { id: 'att-1', name: 'mockup.png', kind: 'image', source: 'asana' },
      { id: 'att-2', name: 'notes.pdf', kind: 'document', source: 'asana' },
    ]);
  });

  it('returns combined task and thread payloads when requested', async () => {
    const threadPlugin = {
      ...plugin(),
      getTask: vi.fn().mockResolvedValue(task()),
      getTaskThread: vi.fn().mockResolvedValue([
        { id: 'entry-1', body: 'hello', source: 'asana', createdAt: new Date('2026-01-01T00:00:00.000Z') },
      ] satisfies ThreadEntry[]),
    };
    const service = new TaskReadService({
      initialize: vi.fn().mockResolvedValue(undefined),
      getPlugin: vi.fn().mockReturnValue(threadPlugin),
    });

    const result = await service.getTaskThread('ASANA-123', { includeTask: true });

    expect(threadPlugin.getTask).toHaveBeenCalledWith('123');
    expect(threadPlugin.getTaskThread).toHaveBeenCalledWith('123', {});
    expect(result.task?.id).toBe('ASANA-123');
    expect(result.entries).toHaveLength(1);
  });
});
