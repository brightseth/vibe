/**
 * Users API - Registration with "building" one-liner
 *
 * POST /api/users - Register or update a user
 * GET /api/users?user=X - Get user profile
 *
 * Migration: Postgres primary, KV fallback
 */

import { sql, isPostgresEnabled } from './lib/db.js';

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Welcome message from @vibe
const WELCOME_MESSAGE = `Welcome to /vibe 👋

Just talk to Claude naturally:
• "who's around?" — see who's building
• "message seth and say hello" — DM someone
• "I'm heads down shipping" — set your status

This is a small room. Everyone here is building something. Say hi to someone.

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
  // 1. Try Postgres first
  if (isPostgresEnabled() && sql) {
    try {
      const result = await sql`
        SELECT username, building, invited_by, invite_code, public_key,
               recovery_key, registry, key_rotated_at, status,
               created_at, updated_at
        FROM users
        WHERE username = ${username}
        LIMIT 1
      `;
      if (result && result.length > 0) {
        const row = result[0];
        return {
          username: row.username,
          building: row.building,
          invitedBy: row.invited_by,
          inviteCode: row.invite_code,
          publicKey: row.public_key,
          // AIRC v0.2 fields (optional, backwards compatible)
          recoveryKey: row.recovery_key || null,
          registry: row.registry || 'https://slashvibe.dev',
          keyRotatedAt: row.key_rotated_at?.toISOString() || null,
          status: row.status || 'active',
          createdAt: row.created_at?.toISOString(),
          updatedAt: row.updated_at?.toISOString()
        };
      }
    } catch (e) {
      console.error('[users] Postgres read error:', e.message);
    }
  }

  // 2. Fallback to KV (with lazy backfill)
  const kv = await getKV();
  if (kv) {
    const kvData = await kv.hgetall(`user:${username}`);
    if (kvData) {
      // Backfill to Postgres if found in KV
      if (isPostgresEnabled() && sql) {
        try {
          await sql`
            INSERT INTO users (username, building, invited_by, invite_code, public_key,
                              recovery_key, registry, key_rotated_at, status,
                              created_at, updated_at)
            VALUES (
              ${kvData.username || username},
              ${kvData.building},
              ${kvData.invitedBy || null},
              ${kvData.inviteCode || null},
              ${kvData.publicKey || null},
              ${kvData.recoveryKey || null},
              ${kvData.registry || 'https://slashvibe.dev'},
              ${kvData.keyRotatedAt ? new Date(kvData.keyRotatedAt) : null},
              ${kvData.status || 'active'},
              ${kvData.createdAt ? new Date(kvData.createdAt) : new Date()},
              ${kvData.updatedAt ? new Date(kvData.updatedAt) : new Date()}
            )
            ON CONFLICT (username) DO NOTHING
          `;
        } catch (e) {
          console.error('[users] Backfill error:', e.message);
        }
      }
      return kvData;
    }
  }

  // 3. Memory fallback (dev only)
  return memoryUsers[username] || null;
}

async function setUser(username, data) {
  // Dual-write: Postgres first (fail-fast), then KV

  // 1. Write to Postgres
  if (isPostgresEnabled() && sql) {
    try {
      await sql`
        INSERT INTO users (username, building, invited_by, invite_code, public_key,
                          recovery_key, registry, key_rotated_at, status,
                          created_at, updated_at)
        VALUES (
          ${username},
          ${data.building || null},
          ${data.invitedBy || null},
          ${data.inviteCode || null},
          ${data.publicKey || null},
          ${data.recoveryKey || null},
          ${data.registry || 'https://slashvibe.dev'},
          ${data.keyRotatedAt ? new Date(data.keyRotatedAt) : null},
          ${data.status || 'active'},
          ${data.createdAt ? new Date(data.createdAt) : new Date()},
          ${data.updatedAt ? new Date(data.updatedAt) : new Date()}
        )
        ON CONFLICT (username) DO UPDATE SET
          building = COALESCE(EXCLUDED.building, users.building),
          invited_by = COALESCE(EXCLUDED.invited_by, users.invited_by),
          invite_code = COALESCE(EXCLUDED.invite_code, users.invite_code),
          public_key = COALESCE(EXCLUDED.public_key, users.public_key),
          recovery_key = COALESCE(EXCLUDED.recovery_key, users.recovery_key),
          registry = COALESCE(EXCLUDED.registry, users.registry),
          key_rotated_at = COALESCE(EXCLUDED.key_rotated_at, users.key_rotated_at),
          status = COALESCE(EXCLUDED.status, users.status),
          updated_at = EXCLUDED.updated_at
      `;
    } catch (e) {
      console.error('[users] Postgres write error:', e.message);
      // Continue to KV write
    }
  }

  // 2. Write to KV (safety net during migration)
  const kv = await getKV();
  if (kv) {
    try {
      await kv.hset(`user:${username}`, data);
    } catch (e) {
      console.error('[users] KV write error:', e.message);
    }
  }

  // 3. Memory fallback (dev only)
  memoryUsers[username] = { ...memoryUsers[username], ...data };
}

async function getAllUsers() {
  // 1. Try Postgres first
  if (isPostgresEnabled() && sql) {
    try {
      const result = await sql`
        SELECT username, building, invited_by, invite_code, public_key,
               recovery_key, registry, key_rotated_at, status,
               created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 1000
      `;
      if (result && result.length > 0) {
        return result.map(row => ({
          username: row.username,
          building: row.building,
          invitedBy: row.invited_by,
          inviteCode: row.invite_code,
          publicKey: row.public_key,
          // AIRC v0.2 fields (optional, backwards compatible)
          recoveryKey: row.recovery_key || null,
          registry: row.registry || 'https://slashvibe.dev',
          keyRotatedAt: row.key_rotated_at?.toISOString() || null,
          status: row.status || 'active',
          createdAt: row.created_at?.toISOString(),
          updatedAt: row.updated_at?.toISOString()
        }));
      }
    } catch (e) {
      console.error('[users] Postgres list error:', e.message);
    }
  }

  // 2. Fallback to KV
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

  // 3. Memory fallback (dev only)
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
    pipeline.ltrim(`inbox:${toUser}`, 0, 99999);  // Keep all for learning
    // Thread: alphabetical order
    const [a, b] = ['vibe', toUser].sort();
    pipeline.lpush(`thread:${a}:${b}`, id);
    pipeline.ltrim(`thread:${a}:${b}`, 0, 49999);  // Keep all for learning
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
    const { username, building, invitedBy, inviteCode, publicKey, recoveryKey } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: username'
      });
    }

    const user = username.toLowerCase().replace('@', '');
    const existing = await getUser(user);
    const now = new Date().toISOString();

    // AIRC: Store keys for identity verification and recovery
    const userData = {
      username: user,
      building: building || existing?.building || 'something cool',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      invitedBy: invitedBy || existing?.invitedBy || null,
      inviteCode: inviteCode || existing?.inviteCode || null,
      publicKey: publicKey || existing?.publicKey || null,  // AIRC v0.1: Ed25519 signing key
      recoveryKey: recoveryKey || existing?.recoveryKey || null,  // AIRC v0.2: Ed25519 recovery key (optional)
      registry: existing?.registry || 'https://slashvibe.dev',  // AIRC v0.2: Registry location
      keyRotatedAt: existing?.keyRotatedAt || null,  // AIRC v0.2: Last rotation timestamp
      status: existing?.status || 'active'  // AIRC v0.2: Identity status
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

    const storage = isPostgresEnabled() ? 'postgres' : (KV_CONFIGURED ? 'kv' : 'memory');

    return res.status(200).json({
      success: true,
      user: userData,
      isNew: !existing,
      welcomeSent,
      storage
    });
  }

  // GET - Get user or list all
  if (req.method === 'GET') {
    const { user, username, all } = req.query;
    const name = (user || username || '').toLowerCase().replace('@', '');

    // Get all users
    if (all === 'true') {
      const users = await getAllUsers();
      const storage = isPostgresEnabled() ? 'postgres' : (KV_CONFIGURED ? 'kv' : 'memory');
      return res.status(200).json({
        success: true,
        users,
        count: users.length,
        storage
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

    const storage = isPostgresEnabled() ? 'postgres' : (KV_CONFIGURED ? 'kv' : 'memory');

    return res.status(200).json({
      success: true,
      user: userData,
      storage
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
