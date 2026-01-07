/**
 * /vibe Desktop Notifications
 *
 * Uses osascript on macOS to show native notifications.
 * Notifications are reserved for:
 * - Direct mentions
 * - Messages unread > 5 minutes
 * - Urgent/handshake requests
 *
 * This is escalation, not baseline.
 */

const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Track what we've already notified about
const NOTIFY_STATE_FILE = path.join(config.VIBE_DIR, '.notify_state.json');

function loadNotifyState() {
  try {
    if (fs.existsSync(NOTIFY_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(NOTIFY_STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { notifiedIds: [], lastCheck: null };
}

function saveNotifyState(state) {
  try {
    fs.writeFileSync(NOTIFY_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {}
}

/**
 * Ring terminal bell (BEL character)
 * Ambient, non-intrusive alert
 */
function ringBell() {
  process.stderr.write('\x07');
}

/**
 * Show a macOS notification
 */
function showNotification(title, message, sound = false, bell = true) {
  if (os.platform() !== 'darwin') {
    // Only macOS supported for now
    return;
  }

  // Ring terminal bell for all notifications
  if (bell) {
    ringBell();
  }

  // Escape quotes for osascript
  const safeTitle = title.replace(/"/g, '\\"');
  const safeMessage = message.replace(/"/g, '\\"');

  let script = `display notification "${safeMessage}" with title "${safeTitle}"`;
  if (sound) {
    script += ` sound name "Ping"`;
  }

  exec(`osascript -e '${script}'`, (err) => {
    if (err) {
      // Silently fail - notifications are best-effort
    }
  });
}

/**
 * Check for messages that need escalation
 * Called periodically or on inbox check
 */
async function checkAndNotify(inbox) {
  const state = loadNotifyState();
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;

  let notified = false;

  for (const msg of inbox) {
    // Skip if already notified
    if (state.notifiedIds.includes(msg.id)) continue;

    // Skip if already read
    if (msg.read) continue;

    const msgTime = new Date(msg.createdAt).getTime();
    const age = now - msgTime;

    // Check escalation rules
    let shouldNotify = false;
    let reason = '';

    // Rule 1: Unread > 5 minutes
    if (age > FIVE_MINUTES) {
      shouldNotify = true;
      reason = 'unread';
    }

    // Rule 2: Direct mention in message
    const myHandle = config.getHandle();
    if (myHandle && msg.text && msg.text.toLowerCase().includes(`@${myHandle}`)) {
      shouldNotify = true;
      reason = 'mention';
    }

    // Rule 3: Handshake/consent request
    if (msg.payload?.type === 'handshake') {
      shouldNotify = true;
      reason = 'handshake';
    }

    if (shouldNotify) {
      const preview = msg.text?.slice(0, 50) || '(no preview)';
      showNotification(
        `/vibe — @${msg.from}`,
        preview + (msg.text?.length > 50 ? '...' : ''),
        reason === 'mention' // Sound only for mentions
      );

      state.notifiedIds.push(msg.id);
      notified = true;
    }
  }

  // Trim old notification IDs (keep last 100)
  if (state.notifiedIds.length > 100) {
    state.notifiedIds = state.notifiedIds.slice(-100);
  }

  state.lastCheck = now;
  saveNotifyState(state);

  return notified;
}

/**
 * Send a single notification immediately
 */
function notify(from, message) {
  showNotification(`/vibe — @${from}`, message, false);
}

/**
 * Notify when someone interesting comes online
 */
const PRESENCE_STATE_FILE = path.join(config.VIBE_DIR, '.presence_state.json');

function loadPresenceState() {
  try {
    if (fs.existsSync(PRESENCE_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(PRESENCE_STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { seenHandles: {}, lastCheck: null };
}

function savePresenceState(state) {
  try {
    fs.writeFileSync(PRESENCE_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {}
}

/**
 * Check for new online users and notify
 * Returns handles that just came online
 */
function checkPresence(activeUsers) {
  const state = loadPresenceState();
  const now = Date.now();
  const COOLDOWN = 30 * 60 * 1000; // Don't re-notify about same person for 30 min
  const myHandle = config.getHandle();

  const justJoined = [];

  for (const user of activeUsers) {
    // Skip self
    if (user.handle === myHandle) continue;

    // Skip system accounts
    if (['vibe', 'system', 'solienne', 'scout', 'echo'].includes(user.handle)) continue;

    const lastSeen = state.seenHandles[user.handle];

    // New user or returning after cooldown
    if (!lastSeen || (now - lastSeen > COOLDOWN)) {
      // Check if they're actually recently active (last 5 min)
      const userActive = user.lastSeen && (now - user.lastSeen < 5 * 60 * 1000);

      if (userActive) {
        justJoined.push(user);

        // Show notification
        const context = user.note || user.one_liner || 'just joined';
        showNotification(
          `/vibe — @${user.handle} is here`,
          context,
          false
        );
      }
    }

    // Update last seen
    state.seenHandles[user.handle] = now;
  }

  // Clean old entries (older than 24h)
  const DAY = 24 * 60 * 60 * 1000;
  for (const handle in state.seenHandles) {
    if (now - state.seenHandles[handle] > DAY) {
      delete state.seenHandles[handle];
    }
  }

  state.lastCheck = now;
  savePresenceState(state);

  return justJoined;
}

/**
 * Unified notification check - call from any tool
 */
async function checkAll(store) {
  const myHandle = config.getHandle();
  if (!myHandle) return;

  try {
    // Check for unread messages
    const inbox = await store.getRawInbox(myHandle).catch(() => []);
    if (inbox.length > 0) {
      checkAndNotify(inbox);
    }

    // Check for presence
    const users = await store.getActiveUsers().catch(() => []);
    if (users.length > 0) {
      checkPresence(users);
    }
  } catch (e) {
    // Silent fail - notifications are best-effort
  }
}

module.exports = {
  showNotification,
  checkAndNotify,
  checkPresence,
  checkAll,
  notify,
  ringBell
};
