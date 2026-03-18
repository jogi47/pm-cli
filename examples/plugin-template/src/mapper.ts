import { createTaskId } from 'pm-cli-core';
import type { ProviderType, Task } from 'pm-cli-core';

const provider: ProviderType = 'asana'; // replace with your provider

export function mapTemplateTask(input: { id: string; title: string; url: string }): Task {
  return {
    id: createTaskId(provider, input.id),
    externalId: input.id,
    title: input.title,
    status: 'todo',
    source: provider,
    url: input.url,
  };
}
