/**
 * Presence — Heartbeat loop
 *
 * Sends heartbeat every 30 seconds while MCP server is running.
 * Users become "idle" after 5 minutes of no heartbeat.
 */

const config = require('./config');
const store = require('./store');

let heartbeatInterval = null;

function start() {
  if (heartbeatInterval) return;

  // Initial heartbeat
  sendHeartbeat();

  // Then every 30 seconds
  heartbeatInterval = setInterval(sendHeartbeat, 30 * 1000);
}

function stop() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function sendHeartbeat() {
  if (!config.isInitialized()) return;

  const cfg = config.load();
  if (cfg.handle && cfg.visible !== false) {
    store.heartbeat(cfg.handle, cfg.one_liner || '');
  }
}

module.exports = { start, stop };
