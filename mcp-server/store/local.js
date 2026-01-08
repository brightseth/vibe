/**
 * Local Store — Messages and presence via local files
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

const MESSAGES_FILE = path.join(config.VIBE_DIR, 'messages.jsonl');
const PRESENCE_FILE = path.join(config.VIBE_DIR, 'presence.json');
const SKILL_EXCHANGE_FILE = path.join(config.VIBE_DIR, 'skill-exchanges.jsonl');

// ============ SESSION (stubs for local mode) ============

let currentSessionId = null;

function setSessionId(sessionId) {
  currentSessionId = sessionId;
}

function getSessionId() {
  return currentSessionId;
}

async function registerSession(sessionId, handle) {
  currentSessionId = sessionId;
  return { success: true, local: true };
}

// ============ PRESENCE ============

function loadPresence() {
  try {
    if (fs.existsSync(PRESENCE_FILE)) {
      return JSON.parse(fs.readFileSync(PRESENCE_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function savePresence(presence) {
  fs.writeFileSync(PRESENCE_FILE, JSON.stringify(presence, null, 2));
}

async function heartbeat(handle, one_liner) {
  const presence = loadPresence();
  presence[handle] = {
    handle,
    one_liner: one_liner || '',
    last_heartbeat: Date.now(),
    visible: true
  };
  savePresence(presence);
}

async function getActiveUsers() {
  const presence = loadPresence();
  const now = Date.now();
  const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  return Object.values(presence)
    .filter(u => u.visible)
    .map(u => {
      const age = now - u.last_heartbeat;
      return {
        handle: u.handle,
        one_liner: u.one_liner,
        status: age < IDLE_THRESHOLD ? 'active' : 'idle',
        last_seen: formatTimeAgo(u.last_heartbeat)
      };
    })
    .sort((a, b) => {
      // Active first, then by recency
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return 0;
    });
}

async function setVisibility(handle, visible) {
  const presence = loadPresence();
  if (presence[handle]) {
    presence[handle].visible = visible;
    savePresence(presence);
  }
}

// ============ MESSAGES ============

function loadMessages() {
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const content = fs.readFileSync(MESSAGES_FILE, 'utf8');
      return content.trim().split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));
    }
  } catch (e) {}
  return [];
}

function appendMessage(msg) {
  fs.appendFileSync(MESSAGES_FILE, JSON.stringify(msg) + '\n');
}

async function sendMessage(from, to, body, type = 'dm') {
  const msg = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: from.toLowerCase().replace('@', ''),
    to: to.toLowerCase().replace('@', ''),
    body,
    type, // 'dm' or 'ping'
    timestamp: Date.now(),
    read_at: null
  };
  appendMessage(msg);
  return msg;
}

async function getInbox(handle) {
  const messages = loadMessages();
  const h = handle.toLowerCase().replace('@', '');

  // Get messages TO this user
  return messages
    .filter(m => m.to === h)
    .sort((a, b) => b.timestamp - a.timestamp);
}

async function getUnreadCount(handle) {
  const inbox = await getInbox(handle);
  return inbox.filter(m => !m.read_at).length;
}

// Alias for consistency with API store
async function getRawInbox(handle) {
  return getInbox(handle);
}

async function getThread(myHandle, theirHandle) {
  const messages = loadMessages();
  const me = myHandle.toLowerCase().replace('@', '');
  const them = theirHandle.toLowerCase().replace('@', '');

  // Get messages between these two users
  return messages
    .filter(m =>
      (m.from === me && m.to === them) ||
      (m.from === them && m.to === me)
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

async function markThreadRead(myHandle, theirHandle) {
  const messages = loadMessages();
  const me = myHandle.toLowerCase().replace('@', '');
  const them = theirHandle.toLowerCase().replace('@', '');
  const now = Date.now();

  // Mark messages from them to me as read
  const updated = messages.map(m => {
    if (m.from === them && m.to === me && !m.read_at) {
      return { ...m, read_at: now };
    }
    return m;
  });

  // Rewrite the file
  fs.writeFileSync(MESSAGES_FILE, updated.map(m => JSON.stringify(m)).join('\n') + '\n');
}

// ============ SKILL EXCHANGES ============

function loadSkillExchanges() {
  try {
    if (fs.existsSync(SKILL_EXCHANGE_FILE)) {
      const content = fs.readFileSync(SKILL_EXCHANGE_FILE, 'utf8');
      return content.trim().split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));
    }
  } catch (e) {}
  return [];
}

function appendSkillExchange(post) {
  fs.appendFileSync(SKILL_EXCHANGE_FILE, JSON.stringify(post) + '\n');
  return post;
}

function getSkillExchanges() {
  return loadSkillExchanges();
}

// ============ HELPERS ============

function formatTimeAgo(timestamp) {
  if (timestamp === undefined || timestamp === null || isNaN(timestamp)) return 'unknown';

  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 0 || isNaN(seconds)) return 'unknown';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

module.exports = {
  // Session
  registerSession,
  setSessionId,
  getSessionId,

  // Presence
  heartbeat,
  getActiveUsers,
  setVisibility,

  // Messages
  sendMessage,
  getInbox,
  getRawInbox,
  getUnreadCount,
  getThread,
  markThreadRead,

  // Skill Exchanges
  appendSkillExchange,
  getSkillExchanges,

  // Helpers
  formatTimeAgo
};