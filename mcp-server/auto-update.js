/**
 * Auto-update mechanism for /vibe MCP server
 * Checks for updates and prompts user to update
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function checkForUpdates() {
  try {
    // Read local version
    const versionPath = path.join(__dirname, 'version.json');
    const localVersion = JSON.parse(await fs.readFile(versionPath, 'utf-8'));

    // Check remote version
    const response = await fetch('https://www.slashvibe.dev/api/version', {
      headers: { 'User-Agent': 'vibe-mcp-client' }
    });

    if (!response.ok) {
      return null; // Silent fail - don't block startup
    }

    const remoteVersion = await response.json();

    // Compare versions
    if (compareVersions(remoteVersion.version, localVersion.version) > 0) {
      return {
        current: localVersion.version,
        latest: remoteVersion.version,
        changelog: remoteVersion.changelog,
        features: remoteVersion.features,
        breaking: remoteVersion.breaking
      };
    }

    return null; // Up to date
  } catch (error) {
    // Silent fail - don't block startup
    return null;
  }
}

export async function performUpdate() {
  try {
    const repoPath = path.join(__dirname, '..');

    // Check if we're in a git repo
    try {
      await execAsync('git rev-parse --git-dir', { cwd: repoPath });
    } catch {
      throw new Error('Not a git repository. Manual update required.');
    }

    // Stash any local changes
    await execAsync('git stash', { cwd: repoPath });

    // Pull latest
    const { stdout, stderr } = await execAsync('git pull origin main', { cwd: repoPath });

    // Pop stash if we had changes
    try {
      await execAsync('git stash pop', { cwd: repoPath });
    } catch {
      // No stash to pop, that's fine
    }

    return {
      success: true,
      output: stdout,
      message: 'Update successful! Restart /vibe to apply changes.'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }

  return 0;
}

export function formatUpdateNotification(update) {
  if (!update) return null;

  let message = `\n${'='.repeat(60)}\n`;
  message += `📦 /vibe UPDATE AVAILABLE\n`;
  message += `${'='.repeat(60)}\n\n`;
  message += `Current: v${update.current}\n`;
  message += `Latest:  v${update.latest}${update.breaking ? ' ⚠️  BREAKING' : ''}\n\n`;
  message += `${update.changelog}\n\n`;

  if (update.features && update.features.length > 0) {
    message += `New features:\n`;
    update.features.forEach(f => {
      message += `  • ${f}\n`;
    });
    message += `\n`;
  }

  message += `Update now:\n`;
  message += `  vibe update\n`;
  message += `\n`;
  message += `Or manually:\n`;
  message += `  cd ~/.vibe/vibe-repo && git pull origin main\n`;
  message += `${'='.repeat(60)}\n`;

  return message;
}
