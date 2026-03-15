// src/init.ts
// Plugin initialization - must be imported before using pluginManager

import { pluginManager } from 'pm-cli-core';
import { AsanaPlugin } from 'pm-cli-plugin-asana';
import { NotionPlugin } from 'pm-cli-plugin-notion';
import { TrelloPlugin } from 'pm-cli-plugin-trello';
import { LinearPlugin } from 'pm-cli-plugin-linear';
import { ClickUpPlugin } from 'pm-cli-plugin-clickup';

let initialized = false;

export function initializePlugins(): void {
  if (initialized) return;

  // Register plugins
  pluginManager.registerPlugin(new AsanaPlugin());
  pluginManager.registerPlugin(new NotionPlugin());
  pluginManager.registerPlugin(new TrelloPlugin());
  pluginManager.registerPlugin(new LinearPlugin());
  pluginManager.registerPlugin(new ClickUpPlugin());

  initialized = true;
}

// Auto-initialize on import
initializePlugins();
