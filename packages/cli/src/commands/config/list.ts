import { Flags, Command } from '@oclif/core';
import { configManager } from '@jogi47/pm-cli-core';
import { handleCommandError } from '../../lib/command-error.js';

export default class ConfigList extends Command {
  static override description = 'List merged configuration values';

  static override flags = {
    json: Flags.boolean({ default: true, description: 'Output as JSON' }),
  };

  async run(): Promise<void> {
    await this.parse(ConfigList);
    try {
      this.log(JSON.stringify(configManager.listConfig(), null, 2));
    } catch (error) {
      handleCommandError(error, 'Failed to list config');
    }
  }
}
