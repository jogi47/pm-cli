// src/commands/workspace.ts

import { Command, Args, Flags } from '@oclif/core';
import { select } from '@inquirer/prompts';
import { pluginManager, renderSuccess, renderError, renderInfo } from '@jogi47/pm-cli-core';
import type { ProviderType } from '@jogi47/pm-cli-core';
import '../init.js';

export default class Workspace extends Command {
  static override description = 'List or switch Asana workspace';

  static override examples = [
    '<%= config.bin %> workspace',
    '<%= config.bin %> workspace list',
    '<%= config.bin %> workspace switch',
    '<%= config.bin %> workspace --source=asana',
  ];

  static override args = {
    action: Args.string({
      description: 'Action to perform',
      required: false,
      options: ['list', 'switch'],
      default: 'list',
    }),
  };

  static override flags = {
    source: Flags.string({
      char: 's',
      description: 'Provider to manage workspace for',
      options: ['asana', 'notion'],
      default: 'asana',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Workspace);
    const providerName = flags.source as ProviderType;

    await pluginManager.initialize();
    const plugin = pluginManager.getPlugin(providerName);

    if (!plugin) {
      renderError(`Plugin not found: ${providerName}`);
      return;
    }

    if (!(await plugin.isAuthenticated())) {
      renderError(`Not connected to ${plugin.displayName}. Run: pm connect ${providerName}`);
      return;
    }

    // Check if plugin supports workspaces
    if (!plugin.supportsWorkspaces?.()) {
      renderError(`${plugin.displayName} does not support multiple workspaces`);
      return;
    }

    const workspaces = plugin.getWorkspaces?.() || [];
    const current = plugin.getCurrentWorkspace?.();

    if (workspaces.length === 0) {
      renderError('No workspaces found');
      return;
    }

    if (args.action === 'list') {
      this.log(`\n${plugin.displayName} Workspaces:\n`);
      for (const ws of workspaces) {
        const marker = ws.id === current?.id ? ' (current)' : '';
        this.log(`  ${ws.name}${marker}`);
      }
      this.log('');
      renderInfo(`Use "pm workspace switch -s ${providerName}" to change workspace`);
    } else if (args.action === 'switch') {
      if (workspaces.length === 1) {
        renderInfo('Only one workspace available');
        return;
      }

      const answer = await select({
        message: 'Select workspace',
        choices: workspaces.map(ws => ({
          name: ws.name + (ws.id === current?.id ? ' (current)' : ''),
          value: ws.id,
        })),
      });

      plugin.setWorkspace?.(answer);
      const newWorkspace = plugin.getCurrentWorkspace?.();
      renderSuccess(`Switched to workspace: ${newWorkspace?.name}`);
    }
  }
}
