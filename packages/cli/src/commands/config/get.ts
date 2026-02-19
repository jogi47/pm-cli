import { Args, Command } from '@oclif/core';
import { configManager } from '@jogi47/pm-cli-core';
import { handleCommandError } from '../../lib/command-error.js';

export default class ConfigGet extends Command {
  static override description = 'Get a config value from merged project and user configuration';

  static override args = {
    key: Args.string({ required: true, description: 'Dot-notation key, e.g. defaultSource or notion.propertyMap.status' }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(ConfigGet);
    try {
      const value = configManager.getValue(args.key);
      if (value === undefined) {
        this.log('null');
        return;
      }
      this.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
    } catch (error) {
      handleCommandError(error, 'Failed to read config value');
    }
  }
}
