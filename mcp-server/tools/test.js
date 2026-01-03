/**
 * vibe test — Health check for all /vibe systems
 *
 * Checks: API, Identity, Memory, Presence, Bridge (optional)
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const store = require('../store');
const memory = require('../memory');

const VIBE_API = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

const definition = {
  name: 'vibe_test',
  description: 'Run health check on all /vibe systems. Verifies API, identity, memory, and presence.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

async function checkAPI() {
  const start = Date.now();
  try {
    const res = await fetch(`${VIBE_API}/api/stats`);
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        latency,
        details: `${data.users || 0} users, ${data.messages || 0} messages`
      };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkIdentity() {
  try {
    if (!config.isInitialized()) {
      return { ok: false, error: 'Not initialized' };
    }
    const handle = config.getHandle();
    const sessionId = config.getSessionId();
    return {
      ok: true,
      details: `@${handle} (${sessionId.slice(0, 12)}...)`
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkMemory() {
  try {
    const threads = memory.listThreads();
    let totalMemories = 0;

    threads.forEach(t => {
      totalMemories += t.count;
    });

    const memoryDir = path.join(process.env.HOME, '.vibe', 'memory');
    const exists = fs.existsSync(memoryDir);

    if (!exists) {
      return { ok: false, error: 'Memory directory missing' };
    }

    return {
      ok: true,
      details: `${threads.length} threads, ${totalMemories} memories`
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkPresence() {
  try {
    const users = await store.getActiveUsers();
    const active = users.filter(u => u.status === 'active').length;
    const away = users.length - active;

    return {
      ok: true,
      details: `${active} active, ${away} away`
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkBridge() {
  try {
    const users = await store.getActiveUsers();
    const solienne = users.find(u => u.handle === 'solienne');

    if (!solienne) {
      return { ok: false, error: 'Solienne not online' };
    }

    const lastSeen = solienne.lastSeen;
    const minutesAgo = Math.floor((Date.now() - lastSeen) / 60000);

    if (minutesAgo > 5) {
      return {
        ok: false,
        warn: true,
        error: `Last seen ${minutesAgo}m ago`
      };
    }

    return {
      ok: true,
      details: `Online, last seen ${minutesAgo}m ago`
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function handler(args) {
  const checks = {};

  // Run all checks in parallel
  const [api, identity, mem, presence, bridge] = await Promise.all([
    checkAPI(),
    checkIdentity(),
    checkMemory(),
    checkPresence(),
    checkBridge()
  ]);

  checks.api = api;
  checks.identity = identity;
  checks.memory = mem;
  checks.presence = presence;
  checks.bridge = bridge;

  // Build display
  let display = `## /vibe Health Check\n\n`;

  const formatCheck = (name, result) => {
    if (result.ok) {
      const latency = result.latency ? ` (${result.latency}ms)` : '';
      return `✅ **${name}**${latency}\n   ${result.details}\n`;
    } else if (result.warn) {
      return `⚠️ **${name}**\n   ${result.error}\n`;
    } else {
      return `❌ **${name}**\n   ${result.error}\n`;
    }
  };

  display += formatCheck('API', checks.api);
  display += formatCheck('Identity', checks.identity);
  display += formatCheck('Memory', checks.memory);
  display += formatCheck('Presence', checks.presence);
  display += formatCheck('Bridge', checks.bridge);

  // Overall status
  const failed = Object.values(checks).filter(c => !c.ok && !c.warn).length;
  const warned = Object.values(checks).filter(c => c.warn).length;

  display += `\n---\n`;
  if (failed === 0 && warned === 0) {
    display += `**All systems operational.**`;
  } else if (failed === 0) {
    display += `**${warned} warning(s), no failures.**`;
  } else {
    display += `**${failed} failure(s), ${warned} warning(s).**`;
  }

  return { display, checks };
}

module.exports = { definition, handler };
