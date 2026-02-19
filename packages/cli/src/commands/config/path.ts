import { Command } from '@oclif/core';
import { configManager } from '@jogi47/pm-cli-core';

export default class ConfigPath extends Command {
  static override description = 'Show configuration file locations';

  async run(): Promise<void> {
    const paths = configManager.getPathSummary();
    this.log(`Project: ${paths.project}`);
    this.log(`User:    ${paths.user}`);
  }
}
