// src/init.ts
// Plugin initialization - must be imported before using pluginManager

import { pluginManager } from '@jogi47/pm-cli-core';
import { AsanaPlugin } from '@jogi47/pm-cli-plugin-asana';
import { NotionPlugin } from '@jogi47/pm-cli-plugin-notion';
import { TrelloPlugin } from '@jogi47/pm-cli-plugin-trello';
import { LinearPlugin } from '@jogi47/pm-cli-plugin-linear';

let initialized = false;

export function initializePlugins(): void {
  if (initialized) return;

  // Register plugins
  pluginManager.registerPlugin(new AsanaPlugin());
  pluginManager.registerPlugin(new NotionPlugin());
  pluginManager.registerPlugin(new TrelloPlugin());
  pluginManager.registerPlugin(new LinearPlugin());

  initialized = true;
}

// Auto-initialize on import
initializePlugins();
