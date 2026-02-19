import { Command } from '@oclif/core';
import { cacheManager } from '@jogi47/pm-cli-core';
import { statSync } from 'node:fs';
import { handleCommandError } from '../../lib/command-error.js';

export default class CacheStats extends Command {
  static override description = 'Show cache statistics';

  async run(): Promise<void> {
    try {
      const stats = await cacheManager.getStats();
      let sizeBytes = 0;
      try {
        sizeBytes = statSync(stats.path).size;
      } catch {
        sizeBytes = 0;
      }

      this.log(`Path: ${stats.path}`);
      this.log(`Task list entries: ${stats.taskLists}`);
      this.log(`Task detail entries: ${stats.taskDetails}`);
      this.log(`Size: ${sizeBytes} bytes`);
    } catch (error) {
      handleCommandError(error, 'Failed to read cache stats');
    }
  }
}
