import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import type { ProviderType } from '../models/task.js';
import { PMCliError } from '../utils/errors.js';

export interface PMCliConfig {
  defaultSource?: ProviderType;
  defaultLimit?: number;
  defaultSort?: 'due' | 'priority' | 'status' | 'source' | 'title';
  aliases?: Record<string, string>;
  trello?: {
    statusMap?: Record<string, string>;
  };
  notion?: {
    propertyMap?: Record<string, string>;
  };
}

const DEFAULT_CONFIG: PMCliConfig = {
  aliases: {},
  trello: { statusMap: {} },
  notion: { propertyMap: {} },
};

class ConfigManager {
  private readonly userConfigPath = join(homedir(), '.config', 'pm-cli', 'config.json');
  private readonly projectConfigPath = resolve(process.cwd(), '.pmrc.json');

  getUserConfigPath(): string {
    return this.userConfigPath;
  }

  getProjectConfigPath(): string {
    return this.projectConfigPath;
  }

  getPathSummary(): { project: string; user: string } {
    return { project: this.projectConfigPath, user: this.userConfigPath };
  }

  getMergedConfig(): PMCliConfig {
    const userConfig = this.readConfigFile(this.userConfigPath);
    const projectConfig = this.readConfigFile(this.projectConfigPath);
    return this.merge(DEFAULT_CONFIG, userConfig, projectConfig);
  }

  initProjectConfig(overwrite = false): string {
    if (existsSync(this.projectConfigPath) && !overwrite) {
      throw new PMCliError({
        message: `Project config already exists at ${this.projectConfigPath}`,
        reason: 'An existing .pmrc.json file was found in this project.',
        suggestion: 'Use `pm config set <key> <value>` to modify values or remove the file and rerun init.',
      });
    }

    this.ensureParentDir(this.projectConfigPath);
    writeFileSync(this.projectConfigPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, 'utf8');
    return this.projectConfigPath;
  }

  getValue(key: string): unknown {
    const config = this.getMergedConfig();
    return this.getByPath(config, key);
  }

  setProjectValue(key: string, value: unknown): string {
    const current = this.readConfigFile(this.projectConfigPath);
    const updated = structuredClone(current);
    this.setByPath(updated as Record<string, unknown>, key, value);
    this.ensureParentDir(this.projectConfigPath);
    writeFileSync(this.projectConfigPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    return this.projectConfigPath;
  }

  listConfig(): PMCliConfig {
    return this.getMergedConfig();
  }

  private readConfigFile(path: string): PMCliConfig {
    if (!existsSync(path)) return {};

    try {
      const content = readFileSync(path, 'utf8').trim();
      if (!content) return {};
      const parsed = JSON.parse(content) as PMCliConfig;
      return parsed ?? {};
    } catch (error) {
      throw new PMCliError({
        message: `Failed to read config: ${path}`,
        reason: error instanceof Error ? error.message : 'Invalid JSON content.',
        suggestion: 'Fix the JSON syntax in the file and rerun your command.',
      });
    }
  }

  private ensureParentDir(path: string): void {
    mkdirSync(dirname(path), { recursive: true });
  }

  private merge(...configs: PMCliConfig[]): PMCliConfig {
    let result: PMCliConfig = {};
    for (const config of configs) {
      result = {
        ...result,
        ...config,
        aliases: { ...(result.aliases ?? {}), ...(config.aliases ?? {}) },
        trello: {
          statusMap: {
            ...(result.trello?.statusMap ?? {}),
            ...(config.trello?.statusMap ?? {}),
          },
        },
        notion: {
          propertyMap: {
            ...(result.notion?.propertyMap ?? {}),
            ...(config.notion?.propertyMap ?? {}),
          },
        },
      };
    }
    return result;
  }

  private getByPath(obj: unknown, keyPath: string): unknown {
    return keyPath.split('.').reduce<unknown>((acc, key) => {
      if (acc === null || typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[key];
    }, obj);
  }

  private setByPath(obj: Record<string, unknown>, keyPath: string, value: unknown): void {
    const keys = keyPath.split('.');
    if (keys.length === 0) return;

    let current: Record<string, unknown> = obj;
    for (let index = 0; index < keys.length - 1; index++) {
      const key = keys[index];
      const existing = current[key];
      if (existing === null || typeof existing !== 'object' || Array.isArray(existing)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }
}

export const configManager = new ConfigManager();
