/**
 * API Store — Messages and presence via remote API
 *
 * Uses VIBE_API_URL environment variable
 */

const https = require('https');
const http = require('http');

const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'vibe-mcp/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// ============ PRESENCE ============

async function heartbeat(handle, one_liner) {
  try {
    await request('POST', '/api/presence/heartbeat', { handle, one_liner });
  } catch (e) {
    console.error('Heartbeat failed:', e.message);
  }
}

async function getActiveUsers() {
  try {
    const result = await request('GET', '/api/presence/who');
    return result.users || [];
  } catch (e) {
    console.error('Who failed:', e.message);
    return [];
  }
}

async function setVisibility(handle, visible) {
  // TODO: implement visibility toggle API
}

// ============ MESSAGES ============

async function sendMessage(from, to, body, type = 'dm') {
  try {
    const result = await request('POST', '/api/messages/send', {
      from, to, body, type
    });
    return result.message;
  } catch (e) {
    console.error('Send failed:', e.message);
    return null;
  }
}

async function getInbox(handle) {
  try {
    const result = await request('GET', `/api/messages/inbox?handle=${handle}`);
    return result.threads || [];
  } catch (e) {
    console.error('Inbox failed:', e.message);
    return [];
  }
}

async function getUnreadCount(handle) {
  const inbox = await getInbox(handle);
  return inbox.reduce((sum, t) => sum + (t.unread || 0), 0);
}

async function getThread(myHandle, theirHandle) {
  try {
    const result = await request('GET', `/api/messages/thread?me=${myHandle}&them=${theirHandle}`);
    return result.messages || [];
  } catch (e) {
    console.error('Thread failed:', e.message);
    return [];
  }
}

async function markThreadRead(myHandle, theirHandle) {
  // Reading thread via API already marks as read
}

// ============ HELPERS ============

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

module.exports = {
  // Presence
  heartbeat,
  getActiveUsers,
  setVisibility,

  // Messages
  sendMessage,
  getInbox,
  getUnreadCount,
  getThread,
  markThreadRead,

  // Helpers
  formatTimeAgo
};
