import { describe, expect, it } from 'vitest';
import {
  PROVIDER_CREDENTIALS,
  validateProviderCredentials,
} from '../../src/models/plugin.js';

describe('provider credential specs', () => {
  it('exposes explicit credential specs for providers', () => {
    expect(PROVIDER_CREDENTIALS.notion).toEqual({
      requiredFields: ['token', 'databaseId'],
      fields: {
        token: {
          label: 'Integration Token (from https://www.notion.so/my-integrations)',
          envVar: 'NOTION_TOKEN',
          secret: true,
        },
        databaseId: {
          label: 'Task Database ID (from database URL)',
          envVar: 'NOTION_DATABASE_ID',
        },
      },
    });
  });

  it('validates missing required credentials from the provider spec', () => {
    expect(validateProviderCredentials('trello', { token: '' })).toEqual(['apiKey', 'token']);
    expect(validateProviderCredentials('notion', { token: 'notion-token', databaseId: 'db-123' })).toEqual([]);
  });
});
