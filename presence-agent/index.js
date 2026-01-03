#!/usr/bin/env node
/**
 * /vibe Presence Agent
 *
 * Background daemon that creates ambient presence awareness.
 * Runs via launchd, writes state to ~/.vibe/state.json
 *
 * Consumers:
 * - zsh RPROMPT reads state.json
 * - tmux status reads state.json
 * - Terminal title gets updated via escape sequences
 * - MCP tools can read as fallback
 *
 * Throttling:
 * - Active: poll every 5s
 * - Idle (no terminal interaction): poll every 30s
 * - Background (terminal not frontmost): poll every 60s
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Config
const VIBE_DIR = path.join(process.env.HOME, '.vibe');
const STATE_FILE = path.join(VIBE_DIR, 'state.json');
const CONFIG_FILE = path.join(VIBE_DIR, 'config.json');
const API_URL = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

// Polling intervals (ms)
const ACTIVE_INTERVAL = 5000;      // 5s when active
const IDLE_INTERVAL = 30000;       // 30s when idle
const BACKGROUND_INTERVAL = 60000; // 60s when in background

// State
let currentInterval = ACTIVE_INTERVAL;
let lastActivity = Date.now();
let handle = null;

// Ensure directories exist
function ensureDir() {
  if (!fs.existsSync(VIBE_DIR)) {
    fs.mkdirSync(VIBE_DIR, { recursive: true });
  }
}

// Load config to get handle
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      handle = config.handle;
      return config;
    }
  } catch (e) {}
  return {};
}

// Write state file
function writeState(state) {
  ensureDir();
  const fullState = {
    ...state,
    updatedAt: new Date().toISOString(),
    handle
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(fullState, null, 2));
}

// Update terminal title (works in most terminals)
function updateTerminalTitle(state) {
  const parts = [];

  if (state.online > 0) {
    parts.push(`${state.online} online`);
  }
  if (state.unread > 0) {
    parts.push(`📩 ${state.unread}`);
  }
  if (state.lastActivity) {
    parts.push(state.lastActivity);
  }

  if (parts.length === 0) {
    parts.push('quiet');
  }

  const title = `vibe: ${parts.join(' · ')}`;

  // OSC 0 - Set window title (xterm standard, works everywhere)
  process.stdout.write(`\x1b]0;${title}\x07`);
}

// Update iTerm2 badge (if available)
function updateBadge(state) {
  const parts = [];

  if (state.online > 0) {
    parts.push(`●${state.online}`);
  }
  if (state.unread > 0) {
    parts.push(`✉${state.unread}`);
  }

  const badge = parts.join(' ') || '○';

  // OSC 1337 - iTerm2 badge (base64 encoded)
  const encoded = Buffer.from(badge).toString('base64');
  process.stdout.write(`\x1b]1337;SetBadgeFormat=${encoded}\x07`);
}

// Fetch presence from API
async function fetchPresence() {
  try {
    const res = await fetch(`${API_URL}/api/presence`);
    const data = await res.json();
    return data;
  } catch (e) {
    return null;
  }
}

// Fetch unread count
async function fetchUnread() {
  if (!handle) return 0;
  try {
    const res = await fetch(`${API_URL}/api/messages?user=${handle}`);
    const data = await res.json();
    return data.unread || 0;
  } catch (e) {
    return 0;
  }
}

// Format time ago
function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// Main poll function
async function poll() {
  loadConfig();

  const [presence, unread] = await Promise.all([
    fetchPresence(),
    fetchUnread()
  ]);

  if (!presence) {
    writeState({ error: 'offline', online: 0, unread: 0 });
    return;
  }

  // Build state
  const active = presence.active || [];
  const others = active.filter(u => u.username !== handle);

  // Find most recent activity
  let lastActivity = null;
  if (others.length > 0) {
    const sorted = others.sort((a, b) =>
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
    const recent = sorted[0];
    const mood = recent.mood ? ` ${recent.mood}` : '';
    lastActivity = `@${recent.username}${mood} ${timeAgo(recent.lastSeen)}`;
  }

  const state = {
    online: others.length,
    unread,
    users: others.slice(0, 5).map(u => ({
      handle: u.username,
      mood: u.mood,
      note: u.workingOn,
      lastSeen: u.lastSeen
    })),
    lastActivity
  };

  writeState(state);

  // Update terminal UI if running interactively
  if (process.stdout.isTTY) {
    updateTerminalTitle(state);
    updateBadge(state);
  }
}

// Check if terminal is frontmost (macOS)
function isTerminalActive() {
  return new Promise((resolve) => {
    exec(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
      (err, stdout) => {
        if (err) {
          resolve(true); // Assume active on error
          return;
        }
        const app = stdout.trim().toLowerCase();
        resolve(app.includes('terminal') || app.includes('iterm') || app.includes('ghostty'));
      }
    );
  });
}

// Adjust polling interval based on activity
async function adjustInterval() {
  const isActive = await isTerminalActive();
  const timeSinceActivity = Date.now() - lastActivity;
  const isIdle = timeSinceActivity > 5 * 60 * 1000; // 5 min

  if (!isActive) {
    currentInterval = BACKGROUND_INTERVAL;
  } else if (isIdle) {
    currentInterval = IDLE_INTERVAL;
  } else {
    currentInterval = ACTIVE_INTERVAL;
  }
}

// Touch activity (called when shell prompt is shown)
function touchActivity() {
  lastActivity = Date.now();
}

// Watch for activity file (shell writes to this)
function watchActivity() {
  const activityFile = path.join(VIBE_DIR, '.activity');
  if (fs.existsSync(activityFile)) {
    fs.watchFile(activityFile, { interval: 1000 }, () => {
      touchActivity();
    });
  }
}

// Main loop
async function main() {
  console.log('[vibe-agent] Starting presence agent...');
  console.log(`[vibe-agent] API: ${API_URL}`);
  console.log(`[vibe-agent] State: ${STATE_FILE}`);

  ensureDir();
  loadConfig();
  watchActivity();

  // Initial poll
  await poll();

  // Main loop
  const loop = async () => {
    await adjustInterval();
    await poll();
    setTimeout(loop, currentInterval);
  };

  setTimeout(loop, currentInterval);
}

// Handle signals
process.on('SIGTERM', () => {
  console.log('[vibe-agent] Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[vibe-agent] Interrupted');
  process.exit(0);
});

main();
