import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRelativeDateString, getToday, getTodayISO, isOverdue, isToday } from '../../src/utils/date.js';

describe('date utils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns today at local midnight and a local YYYY-MM-DD string', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T06:30:00.000Z'));

    const today = getToday();

    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
    expect(today.getSeconds()).toBe(0);
    expect(today.getMilliseconds()).toBe(0);
    expect(getTodayISO()).toBe('2026-03-15');
  });

  it('detects overdue and today dates correctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T06:30:00.000Z'));

    const today = getToday();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    expect(isOverdue(yesterday)).toBe(true);
    expect(isOverdue(today)).toBe(false);
    expect(isOverdue(tomorrow)).toBe(false);
    expect(isOverdue(undefined)).toBe(false);

    expect(isToday(today)).toBe(true);
    expect(isToday(yesterday)).toBe(false);
    expect(isToday(undefined)).toBe(false);
  });

  it('formats relative date strings across common ranges', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T06:30:00.000Z'));

    const today = getToday();

    expect(getRelativeDateString(undefined)).toBe('');
    expect(getRelativeDateString(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000))).toBe('2 days overdue');
    expect(getRelativeDateString(new Date(today.getTime() - 24 * 60 * 60 * 1000))).toBe('yesterday');
    expect(getRelativeDateString(today)).toBe('today');
    expect(getRelativeDateString(new Date(today.getTime() + 24 * 60 * 60 * 1000))).toBe('tomorrow');
    expect(getRelativeDateString(new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000))).toBe('in 5 days');
    expect(getRelativeDateString(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000))).toBe(
      new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
    );
  });
});
