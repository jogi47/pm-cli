import { describe, expect, it } from 'vitest';
import {
  getExitCodeForBulkItemError,
  resolveBulkMutationExitCode,
} from '../../src/lib/bulk-exit-code.js';
import { CLI_EXIT_CODES } from '../../src/lib/exit-code.js';

describe('bulk exit codes', () => {
  describe('getExitCodeForBulkItemError', () => {
    it('maps invalid task IDs to usage', () => {
      expect(getExitCodeForBulkItemError('Invalid task ID format: BAD-ID')).toBe(CLI_EXIT_CODES.USAGE);
    });

    it('maps not-connected errors to auth', () => {
      expect(getExitCodeForBulkItemError('Not connected to asana')).toBe(CLI_EXIT_CODES.AUTH);
    });

    it('maps unknown provider errors to usage', () => {
      expect(getExitCodeForBulkItemError('Unknown provider: foo')).toBe(CLI_EXIT_CODES.USAGE);
    });

    it('maps generic provider failures to failure', () => {
      expect(getExitCodeForBulkItemError('delete denied')).toBe(CLI_EXIT_CODES.FAILURE);
    });
  });

  describe('resolveBulkMutationExitCode', () => {
    it('returns success when all items succeed', () => {
      expect(resolveBulkMutationExitCode([
        { id: 'ASANA-1' },
        { id: 'ASANA-2' },
      ])).toBe(CLI_EXIT_CODES.SUCCESS);
    });

    it('returns partial when some items succeed and some fail', () => {
      expect(resolveBulkMutationExitCode([
        { id: 'ASANA-1' },
        { id: 'LINEAR-2', error: 'linear outage' },
      ])).toBe(CLI_EXIT_CODES.PARTIAL);
    });

    it('classifies a single failed item by error type', () => {
      expect(resolveBulkMutationExitCode([
        { id: 'ASANA-1', error: 'Not connected to asana' },
      ])).toBe(CLI_EXIT_CODES.AUTH);

      expect(resolveBulkMutationExitCode([
        { id: 'BAD-ID', error: 'Invalid task ID format: BAD-ID' },
      ])).toBe(CLI_EXIT_CODES.USAGE);

      expect(resolveBulkMutationExitCode([
        { id: 'ASANA-1', error: 'permission denied' },
      ])).toBe(CLI_EXIT_CODES.FAILURE);
    });

    it('returns failure when all items fail in a multi-id bulk operation', () => {
      expect(resolveBulkMutationExitCode([
        { id: 'ASANA-1', error: 'Not connected to asana' },
        { id: 'LINEAR-2', error: 'Not connected to linear' },
      ])).toBe(CLI_EXIT_CODES.FAILURE);
    });
  });
});
