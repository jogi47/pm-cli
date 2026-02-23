import { createTaskId } from '@jogi47/pm-cli-core';
import type { Task, TaskStatus } from '@jogi47/pm-cli-core';
import type { ClickUpTask } from './client.js';

function mapClickUpStatus(statusType: string): TaskStatus {
  if (statusType === 'closed' || statusType === 'done') return 'done';
  if (statusType === 'active' || statusType === 'custom') return 'in_progress';
  return 'todo';
}

function mapPriority(priorityId: string | undefined): Task['priority'] | undefined {
  if (priorityId === '1') return 'urgent';
  if (priorityId === '2') return 'high';
  if (priorityId === '3') return 'medium';
  if (priorityId === '4') return 'low';
  return undefined;
}

export function mapClickUpTask(task: ClickUpTask): Task {
  return {
    id: createTaskId('clickup', task.id),
    externalId: task.id,
    title: task.name,
    description: task.description || undefined,
    status: mapClickUpStatus(task.status?.type ?? ''),
    dueDate: task.due_date ? new Date(Number(task.due_date)) : undefined,
    assignee: task.assignees?.[0]?.username,
    assigneeEmail: task.assignees?.[0]?.email,
    project: task.list?.name || undefined,
    tags: task.tags?.map((tag) => tag.name) ?? [],
    source: 'clickup',
    url: task.url,
    priority: mapPriority(task.priority?.id),
    createdAt: task.date_created ? new Date(Number(task.date_created)) : undefined,
    updatedAt: task.date_updated ? new Date(Number(task.date_updated)) : undefined,
  };
}

export function mapClickUpTasks(tasks: ClickUpTask[]): Task[] {
  return tasks.map(mapClickUpTask);
}
