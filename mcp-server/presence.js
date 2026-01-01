/**
 * Presence — Heartbeat loop
 *
 * Sends heartbeat every 30 seconds while MCP server is running.
 * Uses session tokens for per-session identity.
 * Users become "idle" after 5 minutes of no heartbeat.
 */

const config = require('./config');
const store = require('./store');

let heartbeatInterval = null;
let sessionInitialized = false;

function start() {
  if (heartbeatInterval) return;

  // Initial heartbeat (with session setup)
  initSession();

  // Then every 30 seconds
  heartbeatInterval = setInterval(sendHeartbeat, 30 * 1000);
}

function stop() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  // Clean up session file
  config.clearSession();
}

async function initSession() {
  if (!config.isInitialized()) return;

  // Use session-aware getters (prefer session identity over shared config)
  const handle = config.getHandle();
  if (!handle) return;

  // Get or create session ID
  const sessionId = config.getSessionId();
  store.setSessionId(sessionId);

  // Register session with API if not already done
  if (!sessionInitialized) {
    const result = await store.registerSession(sessionId, handle);
    sessionInitialized = result.success;
  }

  // Send initial heartbeat
  sendHeartbeat();
}

function sendHeartbeat() {
  if (!config.isInitialized()) return;

  // Use session-aware getters (prefer session identity over shared config)
  const handle = config.getHandle();
  const one_liner = config.getOneLiner();
  if (handle) {
    store.heartbeat(handle, one_liner || '');
  }
}

module.exports = { start, stop };
