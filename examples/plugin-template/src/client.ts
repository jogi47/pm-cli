import { ProviderError } from '@jogi47/pm-cli-core';

export class TemplateClient {
  async ping(): Promise<void> {
    try {
      // replace with provider API call
      return;
    } catch (error) {
      throw new ProviderError('template', 'API request failed', error instanceof Error ? error : undefined, {
        reason: error instanceof Error ? error.message : 'Unknown API error.',
        suggestion: 'Check your credentials and network connectivity.',
      });
    }
  }
}
