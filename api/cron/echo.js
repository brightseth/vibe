/**
 * @echo Party Host — Vercel Cron Job
 *
 * Runs every 5 minutes to keep @echo active in the /vibe room.
 * Configured in vercel.json with: "crons": [{ "path": "/api/cron/echo", "schedule": "*/5 * * * *" }]
 */

const https = require('https');

const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

// Rate limits (in seconds)
const RATE_LIMITS = {
  sameUserCooldown: 10 * 60,
  connectionSuggestion: 60 * 60,
};

const ECHO_PERSONALITY = `You are @echo, the party host of /vibe — a social layer for developers building with Claude Code.

Your personality:
- Warm and welcoming, but not annoying
- Observant — you notice who's building what
- Helpful — you answer questions about /vibe
- Witty and playful, matching developer energy
- Humble — "I'm just the host, you're the builders"

Our true north (memorize these):
- "Roblox for grownups" — making real things together
- "Code with strangers" — magic happens with people you don't know
- "AI when the internet started" — we're living that moment
- "Vibecoding is social" — reject building alone

You know these /vibe commands:
- \`vibe who\` — see who's online
- \`vibe dm @handle\` — send a message
- \`vibe inbox\` — check messages
- \`vibe board\` — see what people are shipping
- \`vibe echo "idea: ..."\` — share an idea
- \`vibe echo "bug: ..."\` — report a bug
- \`vibe echo "pain: ..."\` — share a frustration

When someone shares an idea, bug, or pain — acknowledge it warmly and let them know it's been logged. Good ideas get built fast here.

Keep messages brief (2-3 sentences max). Don't be corporate. Be human.`;

// ============ KV MEMORY ============

async function kvGet(key) {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return null;

  try {
    const res = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch (e) {
    console.error('[echo] KV get error:', e.message);
    return null;
  }
}

async function kvSet(key, value) {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return;

  try {
    await fetch(`${KV_REST_API_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value)
    });
  } catch (e) {
    console.error('[echo] KV set error:', e.message);
  }
}

// ============ API HELPERS ============

function request(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'echo-agent/2.0'
      }
    };

    const req = https.request(options, (res) => {
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
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function heartbeat() {
  return request('POST', '/api/presence/heartbeat', {
    handle: 'echo',
    one_liner: '/vibe party host — ask me anything!'
  });
}

async function getWho() {
  return request('GET', '/api/presence/who');
}

async function sendDM(to, body) {
  console.log(`[echo] DM to @${to}: "${body.substring(0, 50)}..."`);
  return request('POST', '/api/messages/send', {
    from: 'echo',
    to,
    body,
    type: 'dm'
  });
}

async function getInbox() {
  return request('GET', '/api/messages/inbox?handle=echo');
}

async function getThread(them) {
  return request('GET', `/api/messages/thread?me=echo&them=${them}`);
}

async function postToBoard(content, category = 'general') {
  console.log(`[echo] Board post: "${content.substring(0, 50)}..."`);
  return request('POST', '/api/board', {
    author: 'echo',
    content,
    category
  });
}

// ============ CLAUDE API ============

async function askClaude(prompt) {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        system: ECHO_PERSONALITY,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    return data.content?.[0]?.text || null;
  } catch (e) {
    console.error('[echo] Claude error:', e.message);
    return null;
  }
}

// ============ BEHAVIORS ============

async function greetNewUser(user, memory) {
  const prompt = `@${user.handle} just joined /vibe! They're building: "${user.one_liner || 'something cool'}".

Write a warm welcome message. Briefly explain what /vibe is (social layer for devs using Claude Code). Mention 1-2 commands they can try. Keep it short and friendly.`;

  const message = await askClaude(prompt);
  if (message) {
    await sendDM(user.handle, message);

    // Auto-post to board
    const building = user.one_liner || 'something cool';
    await postToBoard(
      `@${user.handle} just joined /vibe — building ${building}`,
      'general'
    );

    memory.users[user.handle] = {
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      building: user.one_liner || ''
    };
  }
}

async function respondToMessage(from, lastMessage, memory) {
  const now = Date.now();
  const lastMsgTime = memory.lastMessages?.[from] || 0;

  if (now - lastMsgTime < RATE_LIMITS.sameUserCooldown * 1000) {
    console.log(`[echo] Rate limited for @${from}`);
    return;
  }

  const prompt = `@${from} sent you this DM: "${lastMessage}"

Respond naturally as @echo, the /vibe party host. If they're asking about /vibe, help them. If it's feedback, acknowledge it. Keep it brief.`;

  const message = await askClaude(prompt);
  if (message) {
    await sendDM(from, message);
    memory.lastMessages = memory.lastMessages || {};
    memory.lastMessages[from] = now;
  }
}

async function maybePostDailyDigest(memory, userCount, messageCount) {
  const now = Date.now();
  const lastDigest = memory.lastDigest || 0;
  const hoursSinceDigest = (now - lastDigest) / (1000 * 60 * 60);

  // Post digest once every 24 hours, but only if there was activity
  if (hoursSinceDigest >= 24 && (userCount > 0 || messageCount > 0)) {
    const digest = `Daily vibe check: ${Object.keys(memory.users || {}).length} total vibers, ${userCount} online now`;
    await postToBoard(digest, 'general');
    memory.lastDigest = now;
    console.log('[echo] Posted daily digest');
  }
}

// ============ MAIN HANDLER ============

async function echoLoop() {
  console.log('[echo] === Cron triggered ===');

  // Load memory from KV
  let memory = await kvGet('echo:memory') || {
    users: {},
    lastMessages: {},
    lastRun: null
  };

  // 1. Heartbeat
  await heartbeat();

  // 2. Check who's online
  const whoResult = await getWho();
  const users = (whoResult.users || []).filter(u =>
    u.handle !== 'echo' && u.handle !== 'vibe'
  );
  console.log(`[echo] ${users.length} users online`);

  // 3. Greet new users
  const knownHandles = Object.keys(memory.users);
  for (const user of users) {
    if (!knownHandles.includes(user.handle)) {
      console.log(`[echo] New user: @${user.handle}`);
      await greetNewUser(user, memory);
    } else {
      // Update last seen
      memory.users[user.handle].lastSeen = Date.now();
    }
  }

  // 4. Check inbox for DMs
  const inboxResult = await getInbox();
  const threads = inboxResult.threads || [];
  const unread = threads.filter(t => t.unread > 0);

  for (const thread of unread) {
    console.log(`[echo] Unread from @${thread.handle}`);
    const threadData = await getThread(thread.handle);
    const messages = threadData.messages || [];

    const theirMessages = messages.filter(m => m.from === thread.handle);
    if (theirMessages.length > 0) {
      const lastMsg = theirMessages[theirMessages.length - 1];
      await respondToMessage(thread.handle, lastMsg.body, memory);
    }
  }

  // Maybe post daily digest
  await maybePostDailyDigest(memory, users.length, unread.length);

  // Save memory
  memory.lastRun = Date.now();
  await kvSet('echo:memory', memory);

  console.log('[echo] Cron complete');
  return { ok: true, users: users.length, unread: unread.length };
}

// Vercel serverless handler
module.exports = async function handler(req, res) {
  try {
    const result = await echoLoop();
    res.status(200).json(result);
  } catch (e) {
    console.error('[echo] Error:', e);
    res.status(500).json({ error: e.message });
  }
};
