import { createTaskId } from '@jogi47/pm-cli-core';
import type { Task } from '@jogi47/pm-cli-core';

export function mapTemplateTask(input: { id: string; title: string; url: string }): Task {
  return {
    id: createTaskId('asana', input.id),
    externalId: input.id,
    title: input.title,
    status: 'todo',
    source: 'asana',
    url: input.url,
  };
}
