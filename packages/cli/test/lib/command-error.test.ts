import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthenticationError,
  BulkOperationError,
  NotConnectedError,
  PMCliError,
} from 'pm-cli-core';
import { getExitCodeForError, handleCommandError } from '../../src/lib/command-error.js';
import { CLI_EXIT_CODES } from '../../src/lib/exit-code.js';

const mocks = vi.hoisted(() => ({
  renderError: vi.fn(),
}));

vi.mock('pm-cli-core', async () => {
  const actual = await vi.importActual<typeof import('pm-cli-core')>('pm-cli-core');
  return {
    ...actual,
    renderError: mocks.renderError,
  };
});

describe('command error exit codes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps auth and connection failures to exit code 3', () => {
    expect(getExitCodeForError(new AuthenticationError('asana'))).toBe(CLI_EXIT_CODES.AUTH);
    expect(getExitCodeForError(new NotConnectedError('asana'))).toBe(CLI_EXIT_CODES.AUTH);
  });

  it('maps partial bulk failures to exit code 4', () => {
    expect(getExitCodeForError(new BulkOperationError('delete', [
      { id: 'ASANA-1' },
      { id: 'ASANA-2', error: 'permission denied' },
    ]))).toBe(CLI_EXIT_CODES.PARTIAL);
  });

  it('maps generic command failures to exit code 1', () => {
    expect(getExitCodeForError(new PMCliError({ message: 'boom' }))).toBe(CLI_EXIT_CODES.FAILURE);
    expect(getExitCodeForError(new Error('boom'))).toBe(CLI_EXIT_CODES.FAILURE);
    expect(getExitCodeForError('boom')).toBe(CLI_EXIT_CODES.FAILURE);
  });

  it('maps connection-shaped PMCliError messages to exit code 3', () => {
    expect(getExitCodeForError(new PMCliError({
      message: 'No providers connected. Run: pm connect <provider>',
    }))).toBe(CLI_EXIT_CODES.AUTH);

    expect(getExitCodeForError(new PMCliError({
      message: 'Something else failed',
      suggestion: 'Run: pm connect asana',
    }))).toBe(CLI_EXIT_CODES.AUTH);
  });

  it('renders the error and exits with the mapped code', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
      throw new Error(`exit:${String(code)}`);
    }) as never);

    try {
      expect(() => handleCommandError(new NotConnectedError('asana'))).toThrow('exit:3');
    } finally {
      exitSpy.mockRestore();
    }

    expect(mocks.renderError).toHaveBeenCalled();
  });
});
