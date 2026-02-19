import { Args, Command } from '@oclif/core';
import { configManager, renderSuccess } from '@jogi47/pm-cli-core';
import { handleCommandError } from '../../lib/command-error.js';

export default class ConfigSet extends Command {
  static override description = 'Set a project-level config value in .pmrc.json';

  static override args = {
    key: Args.string({ required: true, description: 'Dot-notation key, e.g. defaultLimit or aliases.today' }),
    value: Args.string({ required: true, description: 'JSON value or string value' }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(ConfigSet);
    try {
      const parsedValue = parseValue(args.value);
      const path = configManager.setProjectValue(args.key, parsedValue);
      renderSuccess(`Updated ${args.key} in ${path}`);
    } catch (error) {
      handleCommandError(error, 'Failed to update config');
    }
  }
}

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
