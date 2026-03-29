import { describe, expect, it } from 'vitest';
import { resolveListOutputMode } from '../../src/lib/output-mode.js';

describe('resolveListOutputMode', () => {
  it('defaults to table output', () => {
    expect(resolveListOutputMode({})).toEqual({ mode: 'table' });
  });

  it('selects json output', () => {
    expect(resolveListOutputMode({ json: true, plain: false, 'ids-only': false })).toEqual({ mode: 'json' });
  });

  it('selects plain output', () => {
    expect(resolveListOutputMode({ json: false, plain: true, 'ids-only': false })).toEqual({ mode: 'plain' });
  });

  it('selects ids-only output', () => {
    expect(resolveListOutputMode({ json: false, plain: false, 'ids-only': true })).toEqual({ mode: 'ids-only' });
  });

  it('rejects conflicting output flags', () => {
    expect(resolveListOutputMode({ json: true, plain: true, 'ids-only': false })).toEqual({
      error: 'Output flags are mutually exclusive. Use only one of --json, --plain, or --ids-only.',
    });
  });
});
