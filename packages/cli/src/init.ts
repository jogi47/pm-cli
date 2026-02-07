// src/init.ts
// Plugin initialization - must be imported before using pluginManager

import { pluginManager } from '@pm-cli/core';
import { AsanaPlugin } from '@pm-cli/plugin-asana';

let initialized = false;

export function initializePlugins(): void {
  if (initialized) return;

  // Register plugins
  pluginManager.registerPlugin(new AsanaPlugin());

  initialized = true;
}

// Auto-initialize on import
initializePlugins();
