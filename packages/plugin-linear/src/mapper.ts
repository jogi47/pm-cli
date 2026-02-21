import { createTaskId } from '@jogi47/pm-cli-core';
import type { Task, TaskStatus } from '@jogi47/pm-cli-core';
import type { LinearIssue } from './client.js';

function mapLinearStatus(type: string | null | undefined): TaskStatus {
  if (type === 'completed' || type === 'canceled') return 'done';
  if (type === 'started') return 'in_progress';
  return 'todo';
}

function mapPriority(priority: number): Task['priority'] | undefined {
  if (priority === 1) return 'urgent';
  if (priority === 2) return 'high';
  if (priority === 3) return 'medium';
  if (priority === 4) return 'low';
  return undefined;
}

export function mapLinearIssue(issue: LinearIssue): Task {
  return {
    id: createTaskId('linear', issue.identifier),
    externalId: issue.identifier,
    title: issue.title,
    description: issue.description || undefined,
    status: mapLinearStatus(issue.state?.type),
    dueDate: issue.dueDate ? new Date(issue.dueDate) : undefined,
    assignee: issue.assignee?.name || undefined,
    assigneeEmail: issue.assignee?.email || undefined,
    project: issue.project?.name || issue.team?.name || undefined,
    tags: issue.labels.nodes.map((label) => label.name),
    source: 'linear',
    url: issue.url,
    priority: mapPriority(issue.priority),
    createdAt: new Date(issue.createdAt),
    updatedAt: new Date(issue.updatedAt),
  };
}

export function mapLinearIssues(issues: LinearIssue[]): Task[] {
  return issues.map(mapLinearIssue);
}
