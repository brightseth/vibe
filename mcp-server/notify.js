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
 * Show a macOS notification
 */
function showNotification(title, message, sound = false) {
  if (os.platform() !== 'darwin') {
    // Only macOS supported for now
    return;
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

module.exports = {
  showNotification,
  checkAndNotify,
  notify
};
