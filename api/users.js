/**
 * Users API - Registration with "building" one-liner
 *
 * POST /api/users - Register or update a user
 * GET /api/users?user=X - Get user profile
 */

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Welcome message from @vibe
const WELCOME_MESSAGE = `Hey! Welcome to /vibe 👋

A few things to try:
• \`vibe who\` — see who's building right now
• \`vibe dm @seth "hello!"\` — say hi to someone
• \`vibe status shipping\` — share what you're up to

This is a small room. Everyone here is building something. Be curious about what others are working on.

— @vibe`;

// In-memory fallback with seed data
let memoryUsers = {
  seth: {
    username: 'seth',
    building: 'MCP server for social',
    createdAt: new Date().toISOString(),
    invitedBy: null
  },
  stan: {
    username: 'stan',
    building: 'file watcher analytics',
    createdAt: new Date().toISOString(),
    invitedBy: 'seth'
  },
  gene: {
    username: 'gene',
    building: 'autonomous artist agents',
    createdAt: new Date().toISOString(),
    invitedBy: 'seth'
  }
};

async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

async function getUser(username) {
  const kv = await getKV();
  if (kv) {
    return await kv.hgetall(`user:${username}`);
  }
  return memoryUsers[username] || null;
}

async function setUser(username, data) {
  const kv = await getKV();
  if (kv) {
    await kv.hset(`user:${username}`, data);
  }
  memoryUsers[username] = { ...memoryUsers[username], ...data };
}

async function getAllUsers() {
  const kv = await getKV();
  if (kv) {
    const keys = await kv.keys('user:*');
    if (keys.length === 0) return [];
    const users = [];
    for (const key of keys) {
      const user = await kv.hgetall(key);
      if (user) users.push(user);
    }
    return users;
  }
  return Object.values(memoryUsers);
}

// Send welcome DM from @vibe (system account, no auth required)
async function sendWelcomeDM(toUser) {
  const kv = await getKV();
  const id = 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

  const message = {
    id,
    from: 'vibe',
    to: toUser,
    text: WELCOME_MESSAGE,
    createdAt: new Date().toISOString(),
    read: false,
    system: true  // Mark as system message
  };

  if (kv) {
    const pipeline = kv.pipeline();
    pipeline.set(`msg:${id}`, message);
    pipeline.lpush(`inbox:${toUser}`, id);
    pipeline.ltrim(`inbox:${toUser}`, 0, 999);
    // Thread: alphabetical order
    const [a, b] = ['vibe', toUser].sort();
    pipeline.lpush(`thread:${a}:${b}`, id);
    pipeline.ltrim(`thread:${a}:${b}`, 0, 499);
    await pipeline.exec();
  } else {
    // Memory fallback
    if (!memoryUsers._messages) memoryUsers._messages = {};
    memoryUsers._messages[id] = message;
  }

  return message;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Register or update user
  if (req.method === 'POST') {
    const { username, building, invitedBy, inviteCode, publicKey } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: username'
      });
    }

    const user = username.toLowerCase().replace('@', '');
    const existing = await getUser(user);
    const now = new Date().toISOString();

    // AIRC: Store public key for identity verification
    const userData = {
      username: user,
      building: building || existing?.building || 'something cool',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      invitedBy: invitedBy || existing?.invitedBy || null,
      inviteCode: inviteCode || existing?.inviteCode || null,
      publicKey: publicKey || existing?.publicKey || null  // AIRC: Ed25519 public key
    };

    await setUser(user, userData);

    // Send welcome DM to new users
    let welcomeSent = false;
    if (!existing) {
      try {
        await sendWelcomeDM(user);
        welcomeSent = true;
      } catch (e) {
        console.error(`[users] Failed to send welcome DM to @${user}:`, e.message);
      }
    }

    return res.status(200).json({
      success: true,
      user: userData,
      isNew: !existing,
      welcomeSent,
      storage: KV_CONFIGURED ? 'kv' : 'memory'
    });
  }

  // GET - Get user or list all
  if (req.method === 'GET') {
    const { user, username, all } = req.query;
    const name = (user || username || '').toLowerCase().replace('@', '');

    // Get all users
    if (all === 'true') {
      const users = await getAllUsers();
      return res.status(200).json({
        success: true,
        users,
        count: users.length,
        storage: KV_CONFIGURED ? 'kv' : 'memory'
      });
    }

    // Get specific user
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: user'
      });
    }

    const userData = await getUser(name);

    if (!userData) {
      return res.status(404).json({
        success: false,
        error: `User @${name} not found`
      });
    }

    return res.status(200).json({
      success: true,
      user: userData,
      storage: KV_CONFIGURED ? 'kv' : 'memory'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
