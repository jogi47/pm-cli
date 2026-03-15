import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  BulkOperationError,
  NotConnectedError,
  ProviderError,
  formatError,
} from '../../src/utils/errors.js';

describe('error utils', () => {
  it('preserves provider error context', () => {
    const originalError = new Error('rate limited');
    const error = new ProviderError('asana', 'request failed', originalError);

    expect(error.message).toBe('[asana] request failed');
    expect(error.originalError).toBe(originalError);
  });

  it('builds authentication and not-connected errors with expected defaults', () => {
    expect(new AuthenticationError('asana').message).toBe('[asana] Authentication failed');
    expect(new AuthenticationError('asana', 'Token expired').message).toBe('[asana] Token expired');

    const notConnected = new NotConnectedError('asana');
    expect(notConnected.message).toBe('Not connected to asana');
    expect(notConnected.suggestion).toBe('Run: pm connect asana');
  });

  it('tracks bulk-operation failures and formats generic errors', () => {
    const error = new BulkOperationError('delete', [
      { id: 'ASANA-1' },
      { id: 'ASANA-2', error: 'permission denied' },
    ]);

    expect(error.failedCount).toBe(1);
    expect(error.message).toBe('Bulk delete completed with 1 error');

    expect(formatError(new Error('boom'))).toBe('boom');
    expect(formatError('string error')).toBe('string error');
    expect(formatError(42)).toBe('42');
    expect(formatError(null)).toBe('null');
  });
});
