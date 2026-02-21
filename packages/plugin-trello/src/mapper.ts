import { createTaskId } from '@jogi47/pm-cli-core';
import type { Task, TaskStatus } from '@jogi47/pm-cli-core';
import type { TrelloCard } from './client.js';

function mapListNameToStatus(name: string | undefined): TaskStatus {
  const lower = (name || '').toLowerCase();
  if (lower.includes('done') || lower.includes('complete')) return 'done';
  if (lower.includes('doing') || lower.includes('progress')) return 'in_progress';
  return 'todo';
}

export function mapTrelloCard(card: TrelloCard): Task {
  return {
    id: createTaskId('trello', card.id),
    externalId: card.id,
    title: card.name,
    description: card.desc || undefined,
    status: card.closed ? 'done' : mapListNameToStatus(card.list?.name),
    dueDate: card.due ? new Date(card.due) : undefined,
    assignee: undefined,
    project: card.board?.name,
    tags: card.labels?.map((l) => l.name).filter(Boolean),
    source: 'trello',
    url: card.shortUrl,
    createdAt: undefined,
    updatedAt: card.dateLastActivity ? new Date(card.dateLastActivity) : undefined,
  };
}

export function mapTrelloCards(cards: TrelloCard[]): Task[] {
  return cards.map(mapTrelloCard);
}
