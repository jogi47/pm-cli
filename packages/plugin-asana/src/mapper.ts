// src/mapper.ts

import type { Task, TaskStatus } from '@jogi47/pm-cli-core';
import type { AsanaTask } from './client.js';
import { createTaskId } from '@jogi47/pm-cli-core';

/**
 * Map Asana task to unified Task model
 */
export function mapAsanaTask(asanaTask: AsanaTask): Task {
  return {
    id: createTaskId('asana', asanaTask.gid),
    externalId: asanaTask.gid,
    title: asanaTask.name,
    description: asanaTask.notes || undefined,
    status: mapAsanaStatus(asanaTask),
    dueDate: parseDueDate(asanaTask.due_on || asanaTask.due_at),
    assignee: asanaTask.assignee?.name,
    assigneeEmail: asanaTask.assignee?.email,
    project: asanaTask.projects?.[0]?.name,
    tags: asanaTask.tags?.map((t) => t.name),
    source: 'asana',
    url: asanaTask.permalink_url,
    createdAt: new Date(asanaTask.created_at),
    updatedAt: new Date(asanaTask.modified_at),
  };
}

/**
 * Map Asana completion status to TaskStatus
 */
function mapAsanaStatus(task: AsanaTask): TaskStatus {
  if (task.completed) {
    return 'done';
  }

  // Check section name for status hints
  const sectionName = task.memberships?.[0]?.section?.name?.toLowerCase();

  if (sectionName) {
    if (sectionName.includes('progress') || sectionName.includes('doing') || sectionName === 'today') {
      return 'in_progress';
    }
    if (sectionName.includes('done') || sectionName.includes('complete')) {
      return 'done';
    }
  }

  return 'todo';
}

/**
 * Parse Asana date string to Date object
 */
function parseDueDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Map multiple Asana tasks
 */
export function mapAsanaTasks(tasks: AsanaTask[]): Task[] {
  return tasks.map(mapAsanaTask);
}
