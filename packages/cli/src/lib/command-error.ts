import {
  AuthenticationError,
  BulkOperationError,
  formatError,
  NotConnectedError,
  PMCliError,
  renderError,
} from 'pm-cli-core';
import { CLI_EXIT_CODES, type CliExitCode } from './exit-code.js';

export function getExitCodeForError(error: unknown): CliExitCode {
  if (error instanceof AuthenticationError || error instanceof NotConnectedError) {
    return CLI_EXIT_CODES.AUTH;
  }

  if (error instanceof BulkOperationError) {
    return CLI_EXIT_CODES.PARTIAL;
  }

  return CLI_EXIT_CODES.FAILURE;
}

export function handleCommandError(error: unknown, fallback = 'Command failed'): never {
  if (error instanceof PMCliError) {
    renderError(formatError(error));
  } else if (error instanceof Error) {
    renderError(`${fallback}\nWhy: ${error.message}\nHow to fix: Retry with --help for command usage details.`);
  } else {
    renderError(`${fallback}\nWhy: Unknown error type received.\nHow to fix: Rerun with DEBUG=1 and file an issue if it persists.`);
  }

  process.exit(getExitCodeForError(error));
}
