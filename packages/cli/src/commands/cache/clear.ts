import { Command, Flags } from '@oclif/core';
import { cacheManager, renderSuccess } from '@jogi47/pm-cli-core';
import type { ProviderType } from '@jogi47/pm-cli-core';
import { handleCommandError } from '../../lib/command-error.js';

export default class CacheClear extends Command {
  static override description = 'Clear all cache or cache for a single provider';

  static override flags = {
    source: Flags.string({ options: ['asana', 'notion'], description: 'Clear cache for one provider only' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(CacheClear);
    try {
      if (flags.source) {
        await cacheManager.invalidateProvider(flags.source as ProviderType);
        renderSuccess(`Cleared cache for ${flags.source}`);
        return;
      }

      await cacheManager.clearAll();
      renderSuccess('Cleared all cache');
    } catch (error) {
      handleCommandError(error, 'Failed to clear cache');
    }
  }
}
