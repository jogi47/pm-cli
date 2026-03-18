import type { ProviderError } from '../../utils/errors.js';
import { formatError } from '../../utils/errors.js';

export function providerErrorsToWarnings(errors: ProviderError[]): string[] {
  return normalizeWarnings(errors.map((error) => formatError(error)));
}

export function normalizeWarnings(warnings: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const warning of warnings) {
    const trimmed = warning.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}
