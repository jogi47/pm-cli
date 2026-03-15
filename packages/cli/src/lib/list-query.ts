export function getFetchLimit(displayLimit?: number): number | undefined {
  if (displayLimit === undefined) {
    return undefined;
  }

  return Math.max(displayLimit * 3, 100);
}

export function applyDisplayLimit<T>(items: T[], displayLimit?: number): T[] {
  if (displayLimit === undefined) {
    return items;
  }

  return items.slice(0, displayLimit);
}
