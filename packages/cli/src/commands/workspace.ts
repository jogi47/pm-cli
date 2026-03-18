// src/commands/workspace.ts

import { Command, Args, Flags } from '@oclif/core';
import { select } from '@inquirer/prompts';
import { providerSessionService, renderSuccess, renderInfo } from 'pm-cli-core';
import type { ProviderType } from 'pm-cli-core';
import '../init.js';
import { handleCommandError } from '../lib/command-error.js';

export default class Workspace extends Command {
  static override description = 'List or switch workspaces for providers that support multiple workspaces';

  static override examples = [
    '<%= config.bin %> workspace',
    '<%= config.bin %> workspace list',
    '<%= config.bin %> workspace switch --source=asana',
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
      description: 'Provider to manage workspaces for (Asana is the main supported path today)',
      options: ['asana', 'notion', 'trello', 'linear', 'clickup'],
      default: 'asana',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Workspace);
    const providerName = flags.source as ProviderType;
    try {
      const state = await providerSessionService.getWorkspaceState(providerName);

      if (args.action === 'list') {
        this.log(`\n${state.displayName} Workspaces:\n`);
        for (const ws of state.workspaces) {
          const marker = ws.id === state.currentWorkspace?.id ? ' (current)' : '';
          this.log(`  ${ws.name}${marker}`);
        }
        this.log('');
        renderInfo(`Use "pm workspace switch -s ${providerName}" to change workspace`);
      } else if (args.action === 'switch') {
        if (state.workspaces.length === 1) {
          renderInfo('Only one workspace available');
          return;
        }

        const answer = await select({
          message: 'Select workspace',
          choices: state.workspaces.map(ws => ({
            name: ws.name + (ws.id === state.currentWorkspace?.id ? ' (current)' : ''),
            value: ws.id,
          })),
        });

        const nextState = await providerSessionService.switchWorkspace(providerName, answer);
        renderSuccess(`Switched to workspace: ${nextState.currentWorkspace?.name}`);
      }
    } catch (error) {
      handleCommandError(error, 'Failed to manage workspace');
    }
  }
}
