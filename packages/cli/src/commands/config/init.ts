import { Flags, Command } from '@oclif/core';
import { configManager, renderSuccess } from '@jogi47/pm-cli-core';
import { handleCommandError } from '../../lib/command-error.js';

export default class ConfigInit extends Command {
  static override description = 'Create a default .pmrc.json in the current project';

  static override flags = {
    force: Flags.boolean({ char: 'f', default: false, description: 'Overwrite existing .pmrc.json' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigInit);
    try {
      const path = configManager.initProjectConfig(flags.force);
      renderSuccess(`Created project config at ${path}`);
    } catch (error) {
      handleCommandError(error, 'Failed to initialize project config');
    }
  }
}
