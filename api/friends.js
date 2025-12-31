/**
 * Friends API - Friend network management
 *
 * Your network = people you invited + people who invited you + people you've messaged
 *
 * POST /api/friends - Create a friend connection or register invite
 * GET /api/friends?user=X - Get friend list for user X
 */

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// In-memory fallback with seed data
let memoryFriends = {
  seth: ['stan', 'gene', 'boreta'],
  stan: ['seth'],
  gene: ['seth'],
  boreta: ['seth']
};

let memoryInvites = {};

async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

async function getFriends(username) {
  const kv = await getKV();
  if (kv) {
    const friends = await kv.smembers(`friends:${username}`);
    return friends || [];
  }
  return memoryFriends[username] || [];
}

async function addFriend(user1, user2) {
  const kv = await getKV();
  if (kv) {
    // Bidirectional friendship
    await kv.sadd(`friends:${user1}`, user2);
    await kv.sadd(`friends:${user2}`, user1);
  } else {
    if (!memoryFriends[user1]) memoryFriends[user1] = [];
    if (!memoryFriends[user2]) memoryFriends[user2] = [];
    if (!memoryFriends[user1].includes(user2)) memoryFriends[user1].push(user2);
    if (!memoryFriends[user2].includes(user1)) memoryFriends[user2].push(user1);
  }
}

async function registerInvite(from, inviteCode) {
  const kv = await getKV();
  if (kv) {
    await kv.set(`invite:${inviteCode}`, from, { ex: 86400 * 7 }); // 7 day expiry
  } else {
    memoryInvites[inviteCode] = from;
  }
}

async function getInviter(inviteCode) {
  const kv = await getKV();
  if (kv) {
    return await kv.get(`invite:${inviteCode}`);
  }
  return memoryInvites[inviteCode] || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Create friend connection or register invite
  if (req.method === 'POST') {
    const { from, to, inviteCode, claimInvite } = req.body;

    // Register an invite code
    if (from && inviteCode && !to && !claimInvite) {
      const user = from.toLowerCase().replace('@', '');
      await registerInvite(user, inviteCode);

      return res.status(200).json({
        success: true,
        action: 'invite_registered',
        from: user,
        inviteCode,
        expiresIn: '7 days',
        storage: KV_CONFIGURED ? 'kv' : 'memory'
      });
    }

    // Claim an invite (new user joining via invite code)
    if (claimInvite && from) {
      const newUser = from.toLowerCase().replace('@', '');
      const inviter = await getInviter(claimInvite);

      if (inviter) {
        await addFriend(newUser, inviter);
        return res.status(200).json({
          success: true,
          action: 'invite_claimed',
          user: newUser,
          invitedBy: inviter,
          friends: [inviter],
          storage: KV_CONFIGURED ? 'kv' : 'memory'
        });
      }

      return res.status(200).json({
        success: true,
        action: 'user_registered',
        user: newUser,
        inviteCode: claimInvite,
        inviterFound: false,
        storage: KV_CONFIGURED ? 'kv' : 'memory'
      });
    }

    // Direct friend connection
    if (from && to) {
      const user1 = from.toLowerCase().replace('@', '');
      const user2 = to.toLowerCase().replace('@', '');

      await addFriend(user1, user2);

      return res.status(200).json({
        success: true,
        action: 'friend_added',
        connection: [user1, user2],
        storage: KV_CONFIGURED ? 'kv' : 'memory'
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid request. Need from+to, from+inviteCode, or from+claimInvite'
    });
  }

  // GET - Get friend list
  if (req.method === 'GET') {
    const { user, username } = req.query;
    const name = (user || username || '').toLowerCase().replace('@', '');

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: user'
      });
    }

    const friendUsernames = await getFriends(name);

    // Get friend details (building status, etc.)
    const friends = [];
    for (const friendName of friendUsernames) {
      friends.push({
        username: friendName,
        building: null // Would be fetched from users API in production
      });
    }

    return res.status(200).json({
      success: true,
      user: name,
      friends,
      count: friends.length,
      storage: KV_CONFIGURED ? 'kv' : 'memory'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
