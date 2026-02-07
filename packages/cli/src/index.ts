// src/index.ts

import { pluginManager } from '@pm-cli/core';
import { AsanaPlugin } from '@pm-cli/plugin-asana';

// Register plugins
pluginManager.registerPlugin(new AsanaPlugin());

export { pluginManager };
