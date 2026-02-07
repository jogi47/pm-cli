// src/managers/auth-manager.ts

import Conf from 'conf';
import type { ProviderType } from '../models/task.js';
import type { ProviderCredentials } from '../models/plugin.js';

interface StoredCredential {
  type: 'api_key' | 'oauth';
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  metadata?: Record<string, string>;
}

interface AuthStore {
  credentials: Partial<Record<ProviderType, StoredCredential>>;
}

const ENCRYPTION_KEY = 'pm-cli-secure-storage-key-v1';

class AuthManager {
  private store: Conf<AuthStore>;

  constructor() {
    this.store = new Conf<AuthStore>({
      projectName: 'pm-cli',
      schema: {
        credentials: {
          type: 'object',
          default: {},
        },
      },
      encryptionKey: ENCRYPTION_KEY,
    });
  }

  /**
   * Get stored credentials for a provider
   */
  getCredentials(provider: ProviderType): ProviderCredentials | null {
    // First check environment variables
    const envToken = this.getEnvToken(provider);
    if (envToken) {
      return { token: envToken };
    }

    // Then check stored credentials
    const stored = this.store.get(`credentials.${provider}`) as StoredCredential | undefined;
    if (!stored) return null;

    // Check if expired
    if (stored.expiresAt && Date.now() > stored.expiresAt) {
      return null;
    }

    return {
      token: stored.token,
      ...stored.metadata,
    };
  }

  /**
   * Store credentials for a provider
   */
  setCredentials(
    provider: ProviderType,
    credentials: ProviderCredentials,
    options?: { expiresIn?: number }
  ): void {
    // Extract metadata, filtering out undefined values and the token
    const metadata: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (key !== 'token' && value !== undefined) {
        metadata[key] = value;
      }
    }

    const stored: StoredCredential = {
      type: 'api_key',
      token: credentials.token,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    if (options?.expiresIn) {
      stored.expiresAt = Date.now() + options.expiresIn;
    }

    this.store.set(`credentials.${provider}`, stored);
  }

  /**
   * Remove credentials for a provider
   */
  removeCredentials(provider: ProviderType): void {
    this.store.delete(`credentials.${provider}` as keyof AuthStore);
  }

  /**
   * Check if credentials exist for a provider
   */
  hasCredentials(provider: ProviderType): boolean {
    return this.getCredentials(provider) !== null;
  }

  /**
   * Get all connected providers
   */
  getConnectedProviders(): ProviderType[] {
    const providers: ProviderType[] = ['asana', 'notion'];
    return providers.filter(p => this.hasCredentials(p));
  }

  /**
   * Get token from environment variable
   */
  private getEnvToken(provider: ProviderType): string | undefined {
    const envVars: Record<ProviderType, string> = {
      asana: 'ASANA_TOKEN',
      notion: 'NOTION_TOKEN',
    };
    return process.env[envVars[provider]];
  }

  /**
   * Clear all stored credentials
   */
  clearAll(): void {
    this.store.clear();
  }

  /**
   * Get the config file path (for debugging)
   */
  getConfigPath(): string {
    return this.store.path;
  }
}

// Export singleton instance
export const authManager = new AuthManager();
