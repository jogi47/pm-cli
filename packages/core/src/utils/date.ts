// src/utils/date.ts

/**
 * Get today's date at midnight (local time)
 */
export function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return getToday().toISOString().split('T')[0];
}

/**
 * Check if a date is overdue (before today)
 */
export function isOverdue(date: Date | undefined): boolean {
  if (!date) return false;
  return date < getToday();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | undefined): boolean {
  if (!date) return false;
  const today = getToday();
  return date.toDateString() === today.toDateString();
}

/**
 * Get relative date string
 */
export function getRelativeDateString(date: Date | undefined): string {
  if (!date) return '';

  const today = getToday();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === -1) return 'yesterday';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays <= 7) return `in ${diffDays} days`;

  return date.toLocaleDateString();
}
