import type { ProviderType } from '@jogi47/pm-cli-core';

const ASANA_ID_PATTERN = /^\d+$/;

export function splitIdOrName(value: string | undefined, source: ProviderType): { id?: string; name?: string } {
  if (!value) return {};

  if (source === 'asana' && ASANA_ID_PATTERN.test(value)) {
    return { id: value };
  }

  return { name: value };
}
