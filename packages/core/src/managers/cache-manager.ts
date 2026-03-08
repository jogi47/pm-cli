// src/managers/cache-manager.ts

import { Low, Adapter } from 'lowdb';
import { TextFile } from 'lowdb/node';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';
import type { Task, ProviderType } from '../models/task.js';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  key: string;
}

interface CacheStore {
  tasks: Record<string, CacheEntry<Task[]>>;
  taskDetails: Record<string, CacheEntry<Task>>;
}

class EncryptedJSONFile implements Adapter<CacheStore> {
  private adapter: TextFile;
  private key = crypto.createHash('sha256').update('pm-cli-secure-storage-key-v1').digest();

  constructor(filename: string) {
    this.adapter = new TextFile(filename);
  }

  async read(): Promise<CacheStore | null> {
    const data = await this.adapter.read();
    if (!data) return null;
    try {
      const parts = data.split(':');
      const iv = Buffer.from(parts.shift()!, 'hex');
      const encryptedText = Buffer.from(parts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return JSON.parse(decrypted.toString());
    } catch (e) {
      // If decryption fails (e.g. file was plaintext before this update), treat as empty
      return null;
    }
  }

  async write(obj: CacheStore): Promise<void> {
    const text = JSON.stringify(obj);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const data = iv.toString('hex') + ':' + encrypted.toString('hex');
    await this.adapter.write(data);
  }
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class CacheManager {
  private db: Low<CacheStore> | null = null;
  private dbPath: string;
  private initialized = false;

  constructor() {
    const cacheDir = join(homedir(), '.cache', 'pm-cli');
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    this.dbPath = join(cacheDir, 'cache.json');
  }

  /**
   * Initialize the database
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const adapter = new EncryptedJSONFile(this.dbPath);
    this.db = new Low(adapter, { tasks: {}, taskDetails: {} });
    await this.db.read();
    this.initialized = true;
  }

  /**
   * Generate cache key for task lists
   */
  private getCacheKey(
    operation: 'assigned' | 'overdue' | 'search',
    provider: ProviderType,
    extra?: string
  ): string {
    const parts: string[] = [operation, provider];
    if (extra) parts.push(extra);
    return parts.join(':');
  }

  /**
   * Get cached tasks
   */
  async getTasks(
    operation: 'assigned' | 'overdue' | 'search',
    provider: ProviderType,
    extra?: string
  ): Promise<Task[] | null> {
    await this.ensureInitialized();

    const key = this.getCacheKey(operation, provider, extra);
    const entry = this.db!.data.tasks[key];

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete this.db!.data.tasks[key];
      // Do not write to db on read operations to avoid side effects
      return null;
    }

    return entry.data;
  }

  /**
   * Cache tasks
   */
  async setTasks(
    operation: 'assigned' | 'overdue' | 'search',
    provider: ProviderType,
    tasks: Task[],
    extra?: string,
    ttl: number = DEFAULT_TTL
  ): Promise<void> {
    await this.ensureInitialized();

    const key = this.getCacheKey(operation, provider, extra);
    const now = Date.now();

    this.db!.data.tasks[key] = {
      key,
      data: tasks,
      cachedAt: now,
      expiresAt: now + ttl,
    };

    await this.db!.write();
  }

  /**
   * Get cached task details
   */
  async getTaskDetail(taskId: string): Promise<Task | null> {
    await this.ensureInitialized();

    const entry = this.db!.data.taskDetails[taskId];

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete this.db!.data.taskDetails[taskId];
      // Do not write to db on read operations to avoid side effects
      return null;
    }

    return entry.data;
  }

  /**
   * Cache task details
   */
  async setTaskDetail(task: Task, ttl: number = DEFAULT_TTL): Promise<void> {
    await this.ensureInitialized();

    const now = Date.now();

    this.db!.data.taskDetails[task.id] = {
      key: task.id,
      data: task,
      cachedAt: now,
      expiresAt: now + ttl,
    };

    await this.db!.write();
  }

  /**
   * Invalidate all cache for a provider
   */
  async invalidateProvider(provider: ProviderType): Promise<void> {
    await this.ensureInitialized();

    // Remove tasks
    for (const key of Object.keys(this.db!.data.tasks)) {
      if (key.includes(`:${provider}`)) {
        delete this.db!.data.tasks[key];
      }
    }

    // Remove task details
    for (const key of Object.keys(this.db!.data.taskDetails)) {
      if (key.startsWith(`${provider.toUpperCase()}-`)) {
        delete this.db!.data.taskDetails[key];
      }
    }

    await this.db!.write();
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    this.db!.data = { tasks: {}, taskDetails: {} };
    await this.db!.write();
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{ taskLists: number; taskDetails: number; path: string }> {
    await this.ensureInitialized();
    return {
      taskLists: Object.keys(this.db!.data.tasks).length,
      taskDetails: Object.keys(this.db!.data.taskDetails).length,
      path: this.dbPath,
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
