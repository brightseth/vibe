/**
 * Messages API - Terminal-native messaging for Claude Code users
 *
 * Uses Vercel KV (Redis) for persistence across cold starts
 * Falls back to in-memory if KV not configured
 *
 * POST /api/messages - Send a message
 * GET /api/messages?user=X - Get inbox for user X
 * GET /api/messages?user=X&with=Y - Get thread between X and Y
 */

// Check if KV is configured via environment variables
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Key for all messages
const MESSAGES_KEY = 'vibe:messages';

// In-memory fallback
let memoryMessages = [];

// KV wrapper functions
async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

async function getMessages() {
  const kv = await getKV();
  if (kv) {
    const messages = await kv.get(MESSAGES_KEY);
    return messages || [];
  }
  return memoryMessages;
}

async function saveMessages(messages) {
  const kv = await getKV();
  if (kv) {
    await kv.set(MESSAGES_KEY, messages);
  }
  memoryMessages = messages;
}

function generateId() {
  return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Send a message
  if (req.method === 'POST') {
    const { from, to, text } = req.body;

    if (!from || !to || !text) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: from, to, text"
      });
    }

    const message = {
      id: generateId(),
      from: from.toLowerCase().replace('@', ''),
      to: to.toLowerCase().replace('@', ''),
      text: text.substring(0, 500),
      createdAt: new Date().toISOString(),
      read: false
    };

    const messages = await getMessages();
    messages.push(message);
    await saveMessages(messages);

    return res.status(200).json({
      success: true,
      message,
      display: `Message sent to @${message.to}`,
      storage: KV_CONFIGURED ? 'kv' : 'memory'
    });
  }

  // DELETE - Disabled for Phase 1 alpha (security)
  if (req.method === 'DELETE') {
    return res.status(403).json({
      success: false,
      error: 'DELETE disabled for alpha'
    });
  }

  // GET - Fetch messages
  if (req.method === 'GET') {
    const { user, with: withUser, markRead } = req.query;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: user"
      });
    }

    const username = user.toLowerCase().replace('@', '');
    let messages = await getMessages();

    // Get thread with specific user
    if (withUser) {
      const otherUser = withUser.toLowerCase().replace('@', '');

      // Auto-mark received messages as read when viewing thread
      let updated = false;
      const now = new Date().toISOString();
      messages = messages.map(m => {
        if (m.from === otherUser && m.to === username && !m.read) {
          updated = true;
          return { ...m, read: true, readAt: now };
        }
        return m;
      });
      if (updated) {
        await saveMessages(messages);
      }

      const thread = messages
        .filter(m =>
          (m.from === username && m.to === otherUser) ||
          (m.from === otherUser && m.to === username)
        )
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(m => ({
          ...m,
          timeAgo: timeAgo(m.createdAt),
          direction: m.from === username ? 'sent' : 'received'
        }));

      return res.status(200).json({
        success: true,
        thread,
        with: otherUser,
        count: thread.length,
        storage: KV_CONFIGURED ? 'kv' : 'memory'
      });
    }

    // Get sent messages (outbox with read receipts)
    const { sent } = req.query;
    if (sent === 'true') {
      const outbox = messages
        .filter(m => m.from === username)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(m => ({
          ...m,
          timeAgo: timeAgo(m.createdAt),
          readStatus: m.read ? `Read ${timeAgo(m.readAt)}` : 'Delivered'
        }));

      return res.status(200).json({
        success: true,
        sent: outbox,
        total: outbox.length,
        storage: KV_CONFIGURED ? 'kv' : 'memory'
      });
    }

    // Get inbox
    const inbox = messages
      .filter(m => m.to === username)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(m => ({
        ...m,
        timeAgo: timeAgo(m.createdAt)
      }));

    const unread = inbox.filter(m => !m.read).length;

    // Mark as read if requested
    if (markRead === 'true') {
      let updated = false;
      messages = messages.map(m => {
        if (m.to === username && !m.read) {
          updated = true;
          return { ...m, read: true };
        }
        return m;
      });
      if (updated) {
        await saveMessages(messages);
      }
    }

    // Group by sender
    const bySender = {};
    inbox.forEach(m => {
      if (!bySender[m.from]) {
        bySender[m.from] = [];
      }
      bySender[m.from].push(m);
    });

    return res.status(200).json({
      success: true,
      inbox,
      unread,
      bySender,
      total: inbox.length,
      storage: KV_CONFIGURED ? 'kv' : 'memory'
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
