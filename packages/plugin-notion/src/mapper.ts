// src/mapper.ts

import type { Task, TaskStatus } from '@pm-cli/core';
import { createTaskId } from '@pm-cli/core';
import type { NotionPage } from './client.js';

// Property name aliases for detection
const STATUS_NAMES = ['status', 'state'];
const DUE_DATE_NAMES = ['due date', 'due', 'deadline', 'date'];
const ASSIGNEE_NAMES = ['assignee', 'assigned to', 'owner', 'assigned'];
const PRIORITY_NAMES = ['priority'];
const TAGS_NAMES = ['tags', 'labels', 'categories'];

/**
 * Find a property by common name patterns (case-insensitive)
 */
function findProperty(
  properties: NotionPage['properties'],
  aliases: string[]
): { name: string; value: NotionPage['properties'][string] } | null {
  for (const [name, value] of Object.entries(properties)) {
    if (aliases.includes(name.toLowerCase())) {
      return { name, value };
    }
  }
  return null;
}

/**
 * Extract the title from a page (every Notion database has exactly one title property)
 */
function extractTitle(properties: NotionPage['properties']): string {
  for (const value of Object.values(properties)) {
    if (value.type === 'title') {
      return value.title.map((t) => t.plain_text).join('') || 'Untitled';
    }
  }
  return 'Untitled';
}

/**
 * Extract rich text as plain text
 */
function extractRichText(properties: NotionPage['properties'], name: string): string | undefined {
  const prop = properties[name];
  if (!prop || prop.type !== 'rich_text') return undefined;
  const text = prop.rich_text.map((t) => t.plain_text).join('');
  return text || undefined;
}

/**
 * Extract status from a page
 */
function extractStatus(properties: NotionPage['properties']): TaskStatus {
  const statusProp = findProperty(properties, STATUS_NAMES);
  if (!statusProp) return 'todo';

  const prop = statusProp.value;

  if (prop.type === 'status' && prop.status) {
    return mapStatusName(prop.status.name);
  }

  if (prop.type === 'select' && prop.select) {
    return mapStatusName(prop.select.name);
  }

  if (prop.type === 'checkbox') {
    return prop.checkbox ? 'done' : 'todo';
  }

  return 'todo';
}

/**
 * Map a status name string to TaskStatus
 */
function mapStatusName(name: string): TaskStatus {
  const lower = name.toLowerCase();

  // Done variants
  if (
    lower === 'done' ||
    lower === 'complete' ||
    lower === 'completed' ||
    lower === 'closed' ||
    lower === 'resolved'
  ) {
    return 'done';
  }

  // In progress variants
  if (
    lower === 'in progress' ||
    lower === 'in-progress' ||
    lower === 'doing' ||
    lower === 'active' ||
    lower === 'started' ||
    lower === 'working'
  ) {
    return 'in_progress';
  }

  // Default to todo
  return 'todo';
}

/**
 * Extract due date from a page
 */
function extractDueDate(properties: NotionPage['properties']): Date | undefined {
  const dateProp = findProperty(properties, DUE_DATE_NAMES);
  if (!dateProp) return undefined;

  const prop = dateProp.value;
  if (prop.type !== 'date' || !prop.date) return undefined;

  const dateStr = prop.date.start;
  if (!dateStr) return undefined;

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Extract assignee from a page
 */
function extractAssignee(
  properties: NotionPage['properties']
): { name?: string; email?: string } | undefined {
  const assigneeProp = findProperty(properties, ASSIGNEE_NAMES);
  if (!assigneeProp) return undefined;

  const prop = assigneeProp.value;
  if (prop.type !== 'people' || !prop.people || prop.people.length === 0) return undefined;

  const person = prop.people[0];
  const name = 'name' in person ? person.name : undefined;
  const email = 'person' in person && (person as { person?: { email?: string } }).person?.email
    ? (person as { person: { email: string } }).person.email
    : undefined;
  return { name: name || undefined, email };
}

/**
 * Extract priority from a page
 */
function extractPriority(
  properties: NotionPage['properties']
): Task['priority'] | undefined {
  const priorityProp = findProperty(properties, PRIORITY_NAMES);
  if (!priorityProp) return undefined;

  const prop = priorityProp.value;
  if (prop.type !== 'select' || !prop.select) return undefined;

  const lower = prop.select.name.toLowerCase();
  if (lower === 'urgent' || lower === 'critical') return 'urgent';
  if (lower === 'high') return 'high';
  if (lower === 'medium' || lower === 'normal') return 'medium';
  if (lower === 'low') return 'low';

  return undefined;
}

/**
 * Extract tags from a page
 */
function extractTags(properties: NotionPage['properties']): string[] | undefined {
  const tagsProp = findProperty(properties, TAGS_NAMES);
  if (!tagsProp) return undefined;

  const prop = tagsProp.value;
  if (prop.type !== 'multi_select' || !prop.multi_select || prop.multi_select.length === 0) {
    return undefined;
  }

  return prop.multi_select.map((s) => s.name);
}

/**
 * Get the Notion page URL
 */
function getPageUrl(page: NotionPage): string {
  return page.url;
}

/**
 * Map a Notion page to the unified Task model
 */
export function mapNotionPage(page: NotionPage): Task {
  const assignee = extractAssignee(page.properties);

  return {
    id: createTaskId('notion', page.id),
    externalId: page.id,
    title: extractTitle(page.properties),
    description: extractRichText(page.properties, 'Description') ||
                 extractRichText(page.properties, 'Notes') ||
                 undefined,
    status: extractStatus(page.properties),
    dueDate: extractDueDate(page.properties),
    assignee: assignee?.name,
    assigneeEmail: assignee?.email,
    project: undefined, // Notion doesn't have a project concept per se
    tags: extractTags(page.properties),
    source: 'notion',
    url: getPageUrl(page),
    priority: extractPriority(page.properties),
    createdAt: new Date(page.created_time),
    updatedAt: new Date(page.last_edited_time),
  };
}

/**
 * Map multiple Notion pages to tasks
 */
export function mapNotionPages(pages: NotionPage[]): Task[] {
  return pages.map(mapNotionPage);
}
