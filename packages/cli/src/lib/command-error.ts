import { formatError, PMCliError, renderError } from '@jogi47/pm-cli-core';

export function handleCommandError(error: unknown, fallback = 'Command failed'): never {
  if (error instanceof PMCliError) {
    renderError(formatError(error));
  } else if (error instanceof Error) {
    renderError(`${fallback}\nWhy: ${error.message}\nHow to fix: Retry with --help for command usage details.`);
  } else {
    renderError(`${fallback}\nWhy: Unknown error type received.\nHow to fix: Rerun with DEBUG=1 and file an issue if it persists.`);
  }

  process.exit(1);
}
