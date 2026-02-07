// src/utils/errors.ts

/**
 * Custom error for provider-related issues
 */
export class ProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
    public originalError?: Error
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
  }
}

/**
 * Custom error for authentication issues
 */
export class AuthenticationError extends Error {
  constructor(
    public provider: string,
    message: string = 'Authentication failed'
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom error for not connected
 */
export class NotConnectedError extends Error {
  constructor(public provider: string) {
    super(`Not connected to ${provider}. Run: pm connect ${provider}`);
    this.name = 'NotConnectedError';
  }
}

/**
 * Format error for display
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
