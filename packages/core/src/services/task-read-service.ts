import {
  isAttachmentDownloadCapable,
  isThreadCapable,
  type PMPluginBase,
  type ThreadQueryOptions,
} from '../models/plugin.js';
import { parseTaskId, type ProviderType, type ThreadAttachment, type ThreadEntry, type Task } from '../models/task.js';
import { NotConnectedError, PMCliError } from '../utils/errors.js';
import { pluginManager } from '../managers/plugin-manager.js';
import type { GetTaskResult } from './shared/result.js';

type TaskReadPluginManager = Pick<typeof pluginManager, 'initialize' | 'getPlugin'>;

export interface GetTaskThreadOptions extends ThreadQueryOptions {
  includeTask?: boolean;
}

export interface GetTaskThreadResult {
  task?: Task | null;
  entries: ThreadEntry[];
  warnings: string[];
}

export interface GetTaskAttachmentsResult {
  attachments: ThreadAttachment[];
  warnings: string[];
}

type ResolvedTaskReadContext = {
  plugin: PMPluginBase;
  externalId: string;
  source: ProviderType;
};

function dedupeAttachments(entries: Array<{ attachments?: ThreadAttachment[] }>): ThreadAttachment[] {
  const deduped = new Map<string, ThreadAttachment>();

  for (const attachment of entries.flatMap((entry) => entry.attachments || [])) {
    if (!deduped.has(attachment.id)) {
      deduped.set(attachment.id, attachment);
    }
  }

  return Array.from(deduped.values());
}

export class TaskReadService {
  constructor(private readonly manager: TaskReadPluginManager = pluginManager) {}

  async getTask(taskId: string): Promise<GetTaskResult> {
    const context = await this.resolveTaskReadContext(taskId);
    const task = await context.plugin.getTask(context.externalId);
    return { task, warnings: [] };
  }

  async getTaskThread(taskId: string, options: GetTaskThreadOptions = {}): Promise<GetTaskThreadResult> {
    const { includeTask, ...threadOptions } = options;
    const context = await this.resolveTaskReadContext(taskId, {
      requireThread: true,
      requireAttachmentDownload: Boolean(threadOptions.downloadImages),
    });

    const [task, entries] = await Promise.all([
      includeTask ? context.plugin.getTask(context.externalId) : Promise.resolve(undefined),
      (context.plugin as PMPluginBase & { getTaskThread(externalId: string, options?: ThreadQueryOptions): Promise<ThreadEntry[]> })
        .getTaskThread(context.externalId, threadOptions),
    ]);

    return {
      task,
      entries,
      warnings: [],
    };
  }

  async getTaskAttachments(taskId: string, options: ThreadQueryOptions = {}): Promise<GetTaskAttachmentsResult> {
    const { entries } = await this.getTaskThread(taskId, {
      ...options,
      includeTask: false,
    });

    return {
      attachments: dedupeAttachments(entries),
      warnings: [],
    };
  }

  async getTaskForBranch(taskId: string): Promise<GetTaskResult> {
    return this.getTask(taskId);
  }

  private async resolveTaskReadContext(
    taskId: string,
    requirements: {
      requireThread?: boolean;
      requireAttachmentDownload?: boolean;
    } = {}
  ): Promise<ResolvedTaskReadContext> {
    await this.manager.initialize();

    const parsed = parseTaskId(taskId);
    if (!parsed) {
      throw new PMCliError({
        message: `Invalid task ID format: ${taskId}`,
        reason: 'Task IDs must look like ASANA-123 or NOTION-abc.',
        suggestion: 'Copy an ID from `pm tasks assigned --ids-only` and try again.',
      });
    }

    const plugin = this.manager.getPlugin(parsed.source);
    if (!plugin) {
      throw new PMCliError({
        message: `Unknown provider: ${parsed.source}`,
        reason: 'The provider is not registered.',
        suggestion: 'Use `pm providers` to list available providers.',
      });
    }

    if (!(await plugin.isAuthenticated())) {
      throw new NotConnectedError(parsed.source);
    }

    if (requirements.requireThread) {
      if (!plugin.capabilities.thread) {
        throw new PMCliError({
          message: `${parsed.source} does not support task threads`,
          reason: 'The provider capability manifest marks task thread support as unavailable.',
          suggestion: 'Use `pm providers` to list available providers and their capabilities.',
        });
      }

      if (!isThreadCapable(plugin)) {
        throw new PMCliError({
          message: `${parsed.source} does not support task threads`,
          reason: 'The provider declared thread support, but the required method is missing.',
          suggestion: 'Use `pm providers` to list available providers and their capabilities.',
        });
      }
    }

    if (requirements.requireAttachmentDownload) {
      if (!plugin.capabilities.attachmentDownload) {
        throw new PMCliError({
          message: `${parsed.source} does not support attachment downloads`,
          reason: 'The provider capability manifest marks attachment download support as unavailable.',
          suggestion: 'Retry without --download-images or use the provider UI directly.',
        });
      }

      if (!isAttachmentDownloadCapable(plugin)) {
        throw new PMCliError({
          message: `${parsed.source} does not support attachment downloads`,
          reason: 'The provider declared attachment download support, but the required method is missing.',
          suggestion: 'Retry without --download-images or use the provider UI directly.',
        });
      }
    }

    return {
      plugin,
      externalId: parsed.externalId,
      source: parsed.source,
    };
  }
}

export const taskReadService = new TaskReadService();
