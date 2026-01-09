/**
 * Config — User identity and paths
 *
 * UNIFIED: Uses ~/.vibecodings/config.json as primary source
 * Falls back to ~/.vibe/config.json for backward compat
 */

const fs = require('fs');
const path = require('path');

const VIBE_DIR = path.join(process.env.HOME, '.vibe');
const VIBECODINGS_DIR = path.join(process.env.HOME, '.vibecodings');
const PRIMARY_CONFIG = path.join(VIBECODINGS_DIR, 'config.json');  // Primary
const FALLBACK_CONFIG = path.join(VIBE_DIR, 'config.json');        // Fallback
const CONFIG_FILE = PRIMARY_CONFIG;

function ensureDir() {
  if (!fs.existsSync(VIBECODINGS_DIR)) {
    fs.mkdirSync(VIBECODINGS_DIR, { recursive: true });
  }
}

function load() {
  ensureDir();
  // Try primary config first
  try {
    if (fs.existsSync(PRIMARY_CONFIG)) {
      const data = JSON.parse(fs.readFileSync(PRIMARY_CONFIG, 'utf8'));
      // Normalize: support both 'handle' and 'username' field names
      return {
        ...data, // Pass through all fields (including x_credentials, etc.)
        handle: data.handle || data.username || null,
        one_liner: data.one_liner || data.workingOn || null,
        visible: data.visible !== false,
        // AIRC keypair (persisted across sessions)
        publicKey: data.publicKey || null,
        privateKey: data.privateKey || null
      };
    }
  } catch (e) {}
  // Fallback to legacy config (returns full object)
  try {
    if (fs.existsSync(FALLBACK_CONFIG)) {
      return JSON.parse(fs.readFileSync(FALLBACK_CONFIG, 'utf8'));
    }
  } catch (e) {}
  return { handle: null, one_liner: null, visible: true, publicKey: null, privateKey: null };
}

function save(config) {
  ensureDir();
  // Load existing to preserve fields we're not updating
  let existing = {};
  try {
    if (fs.existsSync(PRIMARY_CONFIG)) {
      existing = JSON.parse(fs.readFileSync(PRIMARY_CONFIG, 'utf8'));
    }
  } catch (e) {}

  // Save to primary config in vibecodings format
  const data = {
    username: config.handle || config.username || existing.username,
    workingOn: config.one_liner || config.workingOn || existing.workingOn,
    createdAt: config.createdAt || existing.createdAt || new Date().toISOString().split('T')[0],
    // AIRC keypair (persisted across sessions)
    publicKey: config.publicKey || existing.publicKey || null,
    privateKey: config.privateKey || existing.privateKey || null,
    // Guided mode (AskUserQuestion menus)
    guided_mode: config.guided_mode !== undefined ? config.guided_mode : existing.guided_mode
  };
  fs.writeFileSync(PRIMARY_CONFIG, JSON.stringify(data, null, 2));
}

function getHandle() {
  // Prefer session-specific handle over shared config
  const sessionHandle = getSessionHandle();
  if (sessionHandle) return sessionHandle;
  // Fall back to shared config
  const config = load();
  return config.handle || null;
}

function getOneLiner() {
  // Prefer session-specific one_liner over shared config
  const sessionOneLiner = getSessionOneLiner();
  if (sessionOneLiner) return sessionOneLiner;
  // Fall back to shared config
  const config = load();
  return config.one_liner || null;
}

function isInitialized() {
  // Check session first, then shared config
  const sessionHandle = getSessionHandle();
  if (sessionHandle) return true;
  const config = load();
  return config.handle && config.handle.length > 0;
}

// Session management - unique ID per Claude Code instance
// Now stores full identity (handle + one_liner), not just sessionId
const SESSION_FILE = path.join(VIBECODINGS_DIR, `.session_${process.pid}`);

function generateSessionId() {
  return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

function getSessionData() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const content = fs.readFileSync(SESSION_FILE, 'utf8').trim();
      // Support old format (just sessionId string) and new format (JSON)
      if (content.startsWith('{')) {
        return JSON.parse(content);
      }
      // Old format: just the sessionId
      return { sessionId: content, handle: null, one_liner: null };
    }
  } catch (e) {}
  return null;
}

function saveSessionData(data) {
  ensureDir();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}

function getSessionId() {
  const data = getSessionData();
  if (data?.sessionId) {
    return data.sessionId;
  }
  // Generate new session
  const sessionId = generateSessionId();
  saveSessionData({ sessionId, handle: null, one_liner: null });
  return sessionId;
}

function getSessionHandle() {
  const data = getSessionData();
  return data?.handle || null;
}

function getSessionOneLiner() {
  const data = getSessionData();
  return data?.one_liner || null;
}

function setSessionIdentity(handle, one_liner, keypair = null) {
  const sessionId = getSessionId();
  const existingData = getSessionData() || {};
  saveSessionData({
    sessionId,
    handle,
    one_liner,
    // Preserve token if already set (from server registration)
    token: existingData.token || null,
    // AIRC keypair (generated on init)
    publicKey: keypair?.publicKey || existingData.publicKey || null,
    privateKey: keypair?.privateKey || existingData.privateKey || null
  });
}

function getKeypair() {
  // First check session data
  const sessionData = getSessionData();
  if (sessionData?.publicKey && sessionData?.privateKey) {
    return {
      publicKey: sessionData.publicKey,
      privateKey: sessionData.privateKey
    };
  }
  // Fall back to shared config (keypairs persist across MCP invocations)
  const config = load();
  if (config?.publicKey && config?.privateKey) {
    return {
      publicKey: config.publicKey,
      privateKey: config.privateKey
    };
  }
  return null;
}

function hasKeypair() {
  return getKeypair() !== null;
}

function saveKeypair(keypair) {
  // Save to shared config so it persists across MCP process invocations
  const config = load();
  config.publicKey = keypair.publicKey;
  config.privateKey = keypair.privateKey;
  save(config);
}

function setAuthToken(token, sessionId = null) {
  const data = getSessionData() || {};
  saveSessionData({
    ...data,
    sessionId: sessionId || data.sessionId || generateSessionId(),
    token
  });
}

function getAuthToken() {
  const data = getSessionData();
  return data?.token || null;
}

function clearSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  } catch (e) {}
}

// Guided mode — show AskUserQuestion menus (default: true for new users)
function getGuidedMode() {
  const config = load();
  // Default to true (guided mode on) if not set
  return config.guided_mode !== false;
}

function setGuidedMode(enabled) {
  const config = load();
  config.guided_mode = enabled;
  save(config);
}

// Notification settings
// Levels: "all" | "mentions" | "off"
// - all: desktop + bell for unread, mentions, presence (default)
// - mentions: only @mentions trigger notifications
// - off: no notifications
function getNotifications() {
  const config = load();
  return config.notifications || 'all';
}

function setNotifications(level) {
  const validLevels = ['all', 'mentions', 'off'];
  if (!validLevels.includes(level)) {
    throw new Error(`Invalid notification level. Use: ${validLevels.join(', ')}`);
  }
  const config = load();
  config.notifications = level;
  save(config);
}

// API URL — central endpoint for all API calls
function getApiUrl() {
  return process.env.VIBE_API_URL || 'https://www.slashvibe.dev';
}

module.exports = {
  VIBE_DIR,
  CONFIG_FILE,
  load,
  save,
  getHandle,
  getOneLiner,
  isInitialized,
  getSessionId,
  getSessionHandle,
  getSessionOneLiner,
  setSessionIdentity,
  setAuthToken,
  getAuthToken,
  getKeypair,
  hasKeypair,
  saveKeypair,
  clearSession,
  generateSessionId,
  getGuidedMode,
  setGuidedMode,
  getNotifications,
  setNotifications,
  getApiUrl
};
