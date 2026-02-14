// src/index.ts

import { pluginManager } from '@jogi47/pm-cli-core';
import { AsanaPlugin } from '@jogi47/pm-cli-plugin-asana';

// Register plugins
pluginManager.registerPlugin(new AsanaPlugin());

export { pluginManager };
