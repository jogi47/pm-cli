export const CLI_EXIT_CODES = {
  SUCCESS: 0,
  FAILURE: 1,
  USAGE: 2,
  AUTH: 3,
  PARTIAL: 4,
} as const;

export type CliExitCode = typeof CLI_EXIT_CODES[keyof typeof CLI_EXIT_CODES];
