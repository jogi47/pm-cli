# PM CLI — Security Audit & Code Review Report
Date: March 8, 2026

---

## 🛡️ Security Audit Report

**1. Command Injection (Resolved / Low Risk)**
The recent PR successfully hardened the `pm branch` execution. By using `execFileSync` (which avoids spawning a shell) and the new `isValidGitBranchName` & `sanitizeBranchSegment` validation functions, the application is well-protected against malicious task titles aiming to execute arbitrary commands or inject git flags. 

**2. Credential Storage (Low Risk)**
API tokens and credentials (Asana, Notion, Trello, Linear, ClickUp) are stored using `conf` with an `encryptionKey` (`pm-cli-secure-storage-key-v1`). While using a static key is more obfuscation than true encryption, it properly prevents plain-text exposure of credentials in the configuration file, which is a standard approach for CLI tools. Tokens are correctly loaded via environment variables or the configuration store.

**3. File System Vulnerabilities (Medium Risk - Open Finding)**
*   **Finding:** The metadata cache (`~/.cache/pm-cli/cache.json`) powered by `lowdb` is currently stored in plain text.
*   **Impact:** The cache stores `Task` objects. Depending on the task names, descriptions, or comment threads retrieved, sensitive or confidential internal information may be saved in plain text on the user's file system.
*   **Location:** `packages/core/src/managers/cache-manager.ts`

---

## 🔬 Code Review Report

**1. Critical: Hardcoded Provider List in AuthManager**
*   **Finding:** `getConnectedProviders()` in `auth-manager.ts` uses a hardcoded list of providers (`['asana', 'notion', 'trello', 'linear', 'clickup']`). 
*   **Impact:** If a new provider plugin is added, it will never be recognized as "connected" unless this specific array is manually updated. This defeats the purpose of the extensible plugin architecture and can break cross-provider commands like `pm tasks assigned`.
*   **Fix:** It should dynamically retrieve the list of registered providers from the `pluginManager`.

**2. High: Git Branch Sanitization Logic Flaw**
*   **Finding:** The `branch` command creates the branch name by sanitizing individual *segments* (task ID, slugified title, prefix) before joining them together. A task title like `foo..bar` might be allowed by the slugifier, and when joined with the prefix, it creates a final branch name containing `..`, which is invalid.
*   **Impact:** While `execFileSync` prevents command injection, the logic can still generate an invalid git branch name, causing the `pm branch` command to crash unexpectedly for users. The final validation catches it, but the sanitization doesn't prevent it.
*   **Fix:** Ensure the sanitization step properly replaces or removes sequences like `..` or `//` that make a git branch name invalid.

**3. Medium: Incomplete Tests for Git Branch Name Validation**
*   **Finding:** The `isValidGitBranchName` function checks for several complex git rules (like `.lock`, `@{`, `\`, leading `-`), but the test file (`branch.test.ts`) only covers a small subset of these rules.
*   **Impact:** Future refactoring of the branch naming logic could inadvertently break security checks without tests failing.

**4. Medium: Error Suppression in PluginManager Aggregation**
*   **Finding:** When `pluginManager.aggregateTasks` fetches tasks from multiple providers, if one provider fails, the error is caught, logged as a warning, and an empty array `[]` is returned for that source.
*   **Impact:** The command calling this function swallows the error entirely. A user might run `pm today` and miss half their tasks because one API was down, and the CLI won't explicitly indicate that the results are incomplete (other than a console warning).

**5. Medium: Fragile `setByPath` Implementation in ConfigManager**
*   **Finding:** The function that sets nested config keys (`configManager.setByPath`) doesn't correctly handle intermediate keys that exist but aren't objects. It silently overwrites them with an empty object `{}`.

**6. Low: Cache Writes During Read Operations**
*   **Finding:** `cacheManager.getTasks` performs a database write (`this.db.write()`) whenever it encounters an expired cache entry to delete it. Mixing writes into read operations can cause performance hiccups or unexpected behavior.

**7. Low: Inconsistent Error Handling for Bulk Operations**
*   **Finding:** `pluginManager` throws exceptions for single-task operations (like `updateTask`), but for bulk operations (`completeTasks`), it silently catches errors and returns them in an array. This inconsistency makes the manager API unpredictable.
