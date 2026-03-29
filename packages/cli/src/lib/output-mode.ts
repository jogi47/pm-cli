import { Flags } from '@oclif/core';
import type { OutputFormat } from 'pm-cli-core';

export interface ListOutputModeFlags {
  json?: boolean;
  plain?: boolean;
  'ids-only'?: boolean;
}

export type ListOutputMode = OutputFormat | 'plain' | 'ids-only';

export const listOutputFlags = {
  json: Flags.boolean({
    description: 'Output in JSON format',
    default: false,
  }),
  plain: Flags.boolean({
    description: 'Tab-separated output, no colors or borders',
    default: false,
  }),
  'ids-only': Flags.boolean({
    description: 'Output just task IDs, one per line',
    default: false,
  }),
};

export function resolveListOutputMode(
  flags: ListOutputModeFlags,
): { error: string; mode?: never } | { error?: never; mode: ListOutputMode } {
  const enabled = [flags.json, flags.plain, flags['ids-only']].filter(Boolean).length;

  if (enabled > 1) {
    return {
      error: 'Output flags are mutually exclusive. Use only one of --json, --plain, or --ids-only.',
    };
  }

  if (flags['ids-only']) {
    return { mode: 'ids-only' };
  }

  if (flags.plain) {
    return { mode: 'plain' };
  }

  if (flags.json) {
    return { mode: 'json' };
  }

  return { mode: 'table' };
}
