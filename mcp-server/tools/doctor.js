/**
 * vibe doctor — Diagnose and fix /vibe issues
 *
 * Unlike `vibe test` (status only), doctor provides:
 * - Diagnosis of what's wrong
 * - Specific remediation steps
 * - Auto-fix for some issues
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const store = require('../store');
const presence = require('../presence');

const VIBE_API = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';
const VIBE_DIR = path.join(process.env.HOME, '.vibe');
const MCP_DIR = path.join(VIBE_DIR, 'mcp-server');

const definition = {
  name: 'vibe_doctor',
  description: 'Diagnose and fix /vibe issues. Provides actionable remediation steps.',
  inputSchema: {
    type: 'object',
    properties: {
      fix: {
        type: 'boolean',
        description: 'Auto-fix issues where possible'
      }
    }
  }
};

// Diagnose API connectivity
async function diagnoseAPI() {
  const start = Date.now();
  try {
    const res = await fetch(`${VIBE_API}/api/stats`, {
      signal: AbortSignal.timeout(5000)
    });
    const latency = Date.now() - start;

    if (res.ok) {
      return {
        status: 'ok',
        message: `API reachable (${latency}ms)`
      };
    }

    return {
      status: 'error',
      message: `API returned HTTP ${res.status}`,
      remediation: [
        'Check if slashvibe.dev is up',
        'Try: curl -s https://slashvibe.dev/api/stats'
      ]
    };
  } catch (e) {
    if (e.name === 'TimeoutError') {
      return {
        status: 'error',
        message: 'API timeout (>5s)',
        remediation: [
          'Check your internet connection',
          'API may be overloaded, wait a few minutes',
          'Try: curl -v https://slashvibe.dev/api/stats'
        ]
      };
    }
    return {
      status: 'error',
      message: `Network error: ${e.message}`,
      remediation: [
        'Check your internet connection',
        'Check if VPN is blocking requests'
      ]
    };
  }
}

// Diagnose identity/auth
async function diagnoseIdentity(autoFix = false) {
  try {
    if (!config.isInitialized()) {
      return {
        status: 'error',
        message: 'Not initialized',
        remediation: [
          'Run: vibe init @yourhandle "what you\'re building"'
        ],
        canAutoFix: false
      };
    }

    const handle = config.getHandle();
    const token = config.getAuthToken();
    const sessionId = config.getSessionId();

    if (!token) {
      if (autoFix) {
        // Re-register to get a token
        const result = await store.registerSession(sessionId, handle);
        if (result.success) {
          return {
            status: 'fixed',
            message: `Re-registered @${handle} with new token`,
            wasError: 'Missing auth token'
          };
        }
      }

      return {
        status: 'error',
        message: 'Missing auth token (old session)',
        remediation: [
          'Run: vibe init @' + handle + ' "what you\'re building"',
          'This will re-register and get a fresh token'
        ],
        canAutoFix: true
      };
    }

    // Verify token works by checking presence
    const users = await store.getActiveUsers();
    const me = users.find(u => u.handle === handle);

    if (!me) {
      if (autoFix) {
        // Re-register presence
        await presence.forceHeartbeat();
        return {
          status: 'fixed',
          message: `Re-registered presence for @${handle}`,
          wasError: 'Not in presence list'
        };
      }

      return {
        status: 'warning',
        message: `@${handle} not showing in presence`,
        remediation: [
          'Session may have expired',
          'Run: vibe status to trigger heartbeat',
          'Or: vibe init to re-register'
        ],
        canAutoFix: true
      };
    }

    return {
      status: 'ok',
      message: `@${handle} authenticated (session: ${sessionId.slice(0, 8)}...)`
    };
  } catch (e) {
    return {
      status: 'error',
      message: `Identity check failed: ${e.message}`,
      remediation: [
        'Run: vibe init @yourhandle "what you\'re building"'
      ]
    };
  }
}

// Diagnose presence heartbeat
async function diagnosePresence() {
  try {
    const handle = config.getHandle();
    if (!handle) {
      return {
        status: 'skip',
        message: 'Skipped (not initialized)'
      };
    }

    const users = await store.getActiveUsers();
    const me = users.find(u => u.handle === handle);

    if (!me) {
      return {
        status: 'warning',
        message: 'Not visible to others',
        remediation: [
          'Heartbeat may have stopped',
          'Run: vibe status to trigger heartbeat'
        ]
      };
    }

    const minutesAgo = Math.floor((Date.now() - me.lastSeen) / 60000);

    if (minutesAgo > 2) {
      return {
        status: 'warning',
        message: `Last heartbeat ${minutesAgo}m ago`,
        remediation: [
          'Heartbeat may be stale',
          'Run any vibe command to refresh'
        ]
      };
    }

    return {
      status: 'ok',
      message: `Visible as ${me.status} (${minutesAgo}m ago)`
    };
  } catch (e) {
    return {
      status: 'error',
      message: `Presence check failed: ${e.message}`
    };
  }
}

// Diagnose bridge (Solienne or other agents)
async function diagnoseBridge() {
  try {
    const users = await store.getActiveUsers();
    const solienne = users.find(u => u.handle === 'solienne');

    if (!solienne) {
      return {
        status: 'warning',
        message: 'Solienne (AI bridge) not online',
        remediation: [
          'The Solienne bridge may need to be restarted.',
          'Run: cd ~/solienne-vibe-bridge && node index.js',
          'Or use LaunchAgent: launchctl load ~/Library/LaunchAgents/com.vibe.solienne-bridge.plist',
          'Check logs: tail -f ~/Library/Logs/solienne-bridge.log'
        ]
      };
    }

    const minutesAgo = Math.floor((Date.now() - solienne.lastSeen) / 60000);

    if (minutesAgo > 5) {
      return {
        status: 'warning',
        message: `Solienne last seen ${minutesAgo}m ago (stale)`,
        remediation: [
          'Bridge may have crashed or lost connection.',
          'Check: ps aux | grep solienne-vibe-bridge',
          'Restart: cd ~/solienne-vibe-bridge && node index.js',
          'View logs: tail -f ~/Library/Logs/solienne-bridge.log'
        ]
      };
    }

    return {
      status: 'ok',
      message: `Solienne online (${minutesAgo}m ago)`
    };
  } catch (e) {
    return {
      status: 'error',
      message: `Bridge check failed: ${e.message}`
    };
  }
}

// Diagnose local storage
async function diagnoseStorage() {
  try {
    const vibeDir = path.join(process.env.HOME, '.vibe');
    const sessionFile = path.join(vibeDir, 'session.json');
    const memoryDir = path.join(vibeDir, 'memory');

    // Check if we're in ephemeral mode (identity works but no file)
    const isEphemeral = config.isInitialized() && !fs.existsSync(sessionFile);

    if (!fs.existsSync(vibeDir)) {
      return {
        status: 'error',
        message: '~/.vibe directory missing',
        remediation: [
          'Run: mkdir -p ~/.vibe',
          'Or: vibe init to auto-create'
        ],
        canAutoFix: true
      };
    }

    // If ephemeral mode and identity works, storage files are optional
    if (isEphemeral) {
      return {
        status: 'ok',
        message: 'Ephemeral mode (session via environment)'
      };
    }

    const issues = [];

    if (!fs.existsSync(sessionFile)) {
      issues.push('session.json missing');
    }

    if (!fs.existsSync(memoryDir)) {
      issues.push('memory/ directory missing');
    }

    if (issues.length > 0) {
      return {
        status: 'warning',
        message: issues.join(', '),
        remediation: [
          'Run: vibe init to recreate session',
          'Memory directory will be created on first use'
        ]
      };
    }

    // Check file permissions
    try {
      fs.accessSync(sessionFile, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {
      return {
        status: 'error',
        message: 'session.json not readable/writable',
        remediation: [
          'Fix permissions: chmod 600 ~/.vibe/session.json'
        ]
      };
    }

    return {
      status: 'ok',
      message: 'Local storage OK'
    };
  } catch (e) {
    return {
      status: 'error',
      message: `Storage check failed: ${e.message}`
    };
  }
}

// Diagnose unread messages
async function diagnoseMessages() {
  try {
    const handle = config.getHandle();
    if (!handle) {
      return {
        status: 'skip',
        message: 'Skipped (not initialized)'
      };
    }

    const count = await store.getUnreadCount(handle);

    if (count > 0) {
      return {
        status: 'info',
        message: `${count} unread message${count > 1 ? 's' : ''}`,
        remediation: [
          'Run: vibe inbox to see messages'
        ]
      };
    }

    return {
      status: 'ok',
      message: 'No unread messages'
    };
  } catch (e) {
    return {
      status: 'warning',
      message: `Message check failed: ${e.message}`
    };
  }
}

// Diagnose install info (version, path, update capability)
async function diagnoseInstall() {
  try {
    let version = 'unknown';
    let canUpdate = false;

    // Check for version.json
    const versionFile = path.join(MCP_DIR, 'version.json');
    if (fs.existsSync(versionFile)) {
      try {
        const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
        version = versionData.version || 'unknown';
      } catch (e) {}
    }

    // Check if it's a git repo (can update via git pull)
    const gitDir = path.join(MCP_DIR, '.git');
    if (fs.existsSync(gitDir)) {
      canUpdate = true;
    }

    const updateMethod = canUpdate ? 'git pull' : 're-run installer';

    return {
      status: 'info',
      message: `v${version} · ${MCP_DIR}`,
      remediation: [
        `Update: ${updateMethod}`,
        'After update: restart Claude Code'
      ]
    };
  } catch (e) {
    return {
      status: 'warning',
      message: `Install check failed: ${e.message}`
    };
  }
}

async function handler(args) {
  const autoFix = args.fix === true;
  const results = {};

  // Run diagnostics (install info first)
  results.install = await diagnoseInstall();
  results.api = await diagnoseAPI();
  results.identity = await diagnoseIdentity(autoFix);
  results.presence = await diagnosePresence();
  results.storage = await diagnoseStorage();
  results.bridge = await diagnoseBridge();
  results.messages = await diagnoseMessages();

  // Build display
  let display = `## /vibe Doctor\n\n`;

  const statusIcon = {
    ok: '✅',
    warning: '⚠️',
    error: '❌',
    fixed: '🔧',
    info: 'ℹ️',
    skip: '⏭️'
  };

  for (const [name, result] of Object.entries(results)) {
    const icon = statusIcon[result.status] || '❓';
    display += `${icon} **${name}**: ${result.message}\n`;

    if (result.wasError) {
      display += `   ↳ Was: ${result.wasError}\n`;
    }

    if (result.remediation && result.status !== 'fixed') {
      result.remediation.forEach(step => {
        display += `   → ${step}\n`;
      });
    }

    display += '\n';
  }

  // Summary
  const errors = Object.values(results).filter(r => r.status === 'error').length;
  const warnings = Object.values(results).filter(r => r.status === 'warning').length;
  const fixed = Object.values(results).filter(r => r.status === 'fixed').length;
  const fixable = Object.values(results).filter(r => r.canAutoFix).length;

  display += `---\n`;

  if (errors === 0 && warnings === 0) {
    display += `**All systems healthy.**`;
  } else {
    if (fixed > 0) {
      display += `🔧 **Auto-fixed ${fixed} issue(s).**\n`;
    }
    if (errors > 0) {
      display += `❌ **${errors} error(s)** need attention.\n`;
    }
    if (warnings > 0) {
      display += `⚠️ **${warnings} warning(s)** to review.\n`;
    }
    if (fixable > 0 && !autoFix) {
      display += `\n💡 Run \`vibe doctor --fix\` to auto-fix ${fixable} issue(s).`;
    }
  }

  return { display, results };
}

module.exports = { definition, handler };
