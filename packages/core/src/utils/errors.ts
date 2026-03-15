export interface ErrorDetails {
  message: string;
  reason?: string;
  suggestion?: string;
  docsUrl?: string;
}

export interface BulkOperationResult {
  error?: string;
}

export class PMCliError extends Error {
  public reason?: string;
  public suggestion?: string;
  public docsUrl?: string;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'PMCliError';
    this.reason = details.reason;
    this.suggestion = details.suggestion;
    this.docsUrl = details.docsUrl;
  }
}

/**
 * Custom error for provider-related issues
 */
export class ProviderError extends PMCliError {
  constructor(
    public provider: string,
    message: string,
    public originalError?: Error,
    details?: Omit<ErrorDetails, 'message'>
  ) {
    super({
      message: `[${provider}] ${message}`,
      reason: details?.reason,
      suggestion: details?.suggestion,
      docsUrl: details?.docsUrl,
    });
    this.name = 'ProviderError';
  }
}

/**
 * Custom error for authentication issues
 */
export class AuthenticationError extends PMCliError {
  constructor(
    public provider: string,
    message: string = 'Authentication failed',
    details?: Omit<ErrorDetails, 'message'>
  ) {
    super({
      message: `[${provider}] ${message}`,
      reason: details?.reason,
      suggestion: details?.suggestion ?? `Reconnect with: pm connect ${provider}`,
      docsUrl: details?.docsUrl,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom error for not connected
 */
export class NotConnectedError extends PMCliError {
  constructor(public provider: string) {
    super({
      message: `Not connected to ${provider}`,
      reason: `No credentials were found for ${provider}.`,
      suggestion: `Run: pm connect ${provider}`,
    });
    this.name = 'NotConnectedError';
  }
}

/**
 * Typed error for bulk operations that contain one or more item-level failures.
 */
export class BulkOperationError<T extends BulkOperationResult> extends PMCliError {
  public failedCount: number;

  constructor(
    public operation: string,
    public results: T[],
    details?: Omit<ErrorDetails, 'message'>
  ) {
    const failedCount = results.filter((result) => Boolean(result.error)).length;
    super({
      message: `Bulk ${operation} completed with ${failedCount} error${failedCount === 1 ? '' : 's'}`,
      reason: details?.reason,
      suggestion: details?.suggestion,
      docsUrl: details?.docsUrl,
    });
    this.name = 'BulkOperationError';
    this.failedCount = failedCount;
  }
}

/**
 * Format error for display
 */
export function formatError(error: unknown): string {
  if (error instanceof PMCliError) {
    const lines = [error.message];
    if (error.reason) lines.push(`Why: ${error.reason}`);
    if (error.suggestion) lines.push(`How to fix: ${error.suggestion}`);
    if (error.docsUrl) lines.push(`Docs: ${error.docsUrl}`);
    return lines.join('\n');
  }

  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
