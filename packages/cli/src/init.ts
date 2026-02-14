// src/init.ts
// Plugin initialization - must be imported before using pluginManager

import { pluginManager } from '@jogi47/pm-cli-core';
import { AsanaPlugin } from '@jogi47/pm-cli-plugin-asana';

let initialized = false;

export function initializePlugins(): void {
  if (initialized) return;

  // Register plugins
  pluginManager.registerPlugin(new AsanaPlugin());
  pluginManager.registerPlugin(new NotionPlugin());

  initialized = true;
}

// Auto-initialize on import
initializePlugins();
