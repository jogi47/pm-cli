import { afterEach, describe, expect, it } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cacheManager } from '../../src/managers/cache-manager.js';
import type { Task } from '../../src/models/task.js';

function buildTask(): Task {
  return {
    id: 'ASANA-123',
    externalId: '123',
    title: 'Secret roadmap task',
    description: 'Confidential notes',
    status: 'todo',
    source: 'asana',
    url: 'https://app.asana.com/0/0/123',
  };
}

describe('cacheManager encryption', () => {
  const filePath = join(tmpdir(), `pm-cli-cache-test-${process.pid}.json`);

  afterEach(async () => {
    const manager = cacheManager as unknown as {
      db: unknown;
      dbPath: string;
      initialized: boolean;
    };
    manager.db = null;
    manager.dbPath = filePath;
    manager.initialized = false;
    await rm(filePath, { force: true });
  });

  it('writes encrypted cache data to disk and reads it back', async () => {
    const manager = cacheManager as unknown as {
      db: unknown;
      dbPath: string;
      initialized: boolean;
    };
    manager.db = null;
    manager.dbPath = filePath;
    manager.initialized = false;

    const task = buildTask();
    await cacheManager.setTasks('assigned', 'asana', [task]);

    const raw = await readFile(filePath, 'utf8');
    expect(raw).not.toContain(task.title);
    expect(raw).not.toContain(task.description!);
    expect(() => JSON.parse(raw)).toThrow();

    const cached = await cacheManager.getTasks('assigned', 'asana');
    expect(cached).toEqual([task]);
  });
});
