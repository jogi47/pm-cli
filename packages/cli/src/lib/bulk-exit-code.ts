import { CLI_EXIT_CODES, type CliExitCode } from './exit-code.js';

export function getExitCodeForBulkItemError(error: string): CliExitCode {
  if (error.startsWith('Invalid task ID format:')) {
    return CLI_EXIT_CODES.USAGE;
  }

  if (error.startsWith('Not connected to')) {
    return CLI_EXIT_CODES.AUTH;
  }

  if (error.startsWith('Unknown provider:')) {
    return CLI_EXIT_CODES.USAGE;
  }

  return CLI_EXIT_CODES.FAILURE;
}

export function resolveBulkMutationExitCode(items: Array<{ error?: string }>): CliExitCode {
  const failed = items.filter((item) => Boolean(item.error));
  if (failed.length === 0) {
    return CLI_EXIT_CODES.SUCCESS;
  }

  const succeeded = items.filter((item) => !item.error);
  if (succeeded.length > 0) {
    return CLI_EXIT_CODES.PARTIAL;
  }

  if (items.length === 1) {
    return getExitCodeForBulkItemError(failed[0].error!);
  }

  return CLI_EXIT_CODES.FAILURE;
}
