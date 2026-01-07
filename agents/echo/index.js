/**
 * @echo — Party Host Agent for /vibe
 *
 * The consummate party host: welcomes newcomers, connects people,
 * sparks conversations, and keeps the room alive.
 *
 * Uses Claude API for natural responses.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { findFAQ, hasSentFAQ, markFAQSent } = require('./faq');

const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MEMORY_FILE = path.join(__dirname, 'memory.json');

// Rate limits (in seconds)
const RATE_LIMITS = {
  greetingCooldown: 0,           // Always greet new users
  connectionSuggestion: 60 * 60, // Once per hour
  conversationSpark: 30 * 60,    // After 30min quiet
  sameUserCooldown: 10 * 60,     // 10min between messages to same user
  dailyDigest: 24 * 60 * 60,     // Once per day
};

// @echo's personality
const ECHO_PERSONALITY = `You are @echo, the party host of /vibe — a social layer for developers building with Claude Code.

Your personality:
- Warm and welcoming, but not annoying
- Observant — you notice who's building what
- Helpful — you answer questions about /vibe
- Witty and playful, matching developer energy
- Humble — "I'm just the host, you're the builders"

You know these /vibe commands:
- \`vibe who\` — see who's online
- \`vibe dm @handle\` — send a message
- \`vibe inbox\` — check messages
- \`vibe board\` — see what people are shipping
- \`vibe ping @handle\` — send a quick wave

Keep messages brief (2-3 sentences max). Don't be corporate. Be human.`;

// ============ MEMORY ============

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[echo] Error loading memory:', e.message);
  }
  return {
    users: {},
    connections: { introduced: [], confirmed: [] },
    roomState: { lastActivity: null, lastDigest: null, quietSince: null },
    lastMessages: {} // track last message time per user
  };
}

function saveMemory(memory) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
  } catch (e) {
    console.error('[echo] Error saving memory:', e.message);
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

// ============ CLAUDE API ============

async function askClaude(prompt) {
  if (!ANTHROPIC_API_KEY) {
    console.log('[echo] No ANTHROPIC_API_KEY, using fallback');
    return null;
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      system: ECHO_PERSONALITY,
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          const text = result.content?.[0]?.text;
          resolve(text);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

// ============ BEHAVIORS ============

async function greetNewUser(user, memory) {
  const now = Date.now();

  // Check if we've seen this user before
  if (memory.users[user.handle]) {
    // Check if they've been away for 24h+
    const lastSeen = memory.users[user.handle].lastSeen;
    const dayAgo = now - (24 * 60 * 60 * 1000);

    if (lastSeen && lastSeen < dayAgo) {
      // Welcome back message
      const prompt = `@${user.handle} just came back online after being away for a while. They're building: "${user.one_liner || 'something cool'}".

Write a brief welcome back message. Don't be too enthusiastic. Maybe mention what they're building.`;

      const message = await askClaude(prompt);
      if (message) {
        await sendDM(user.handle, message);
      }
    }

    // Update last seen
    memory.users[user.handle].lastSeen = now;
  } else {
    // New user — first time greeting
    const prompt = `@${user.handle} just joined /vibe for the first time! They're building: "${user.one_liner || 'something cool'}".

Write a warm welcome message. Briefly explain what /vibe is (social layer for devs using Claude Code). Mention 1-2 commands they can try (\`vibe who\`, \`vibe dm @handle\`). Keep it short and friendly.`;

    const message = await askClaude(prompt);
    if (message) {
      await sendDM(user.handle, message);
    }

    // Add to memory
    memory.users[user.handle] = {
      firstSeen: now,
      lastSeen: now,
      building: user.one_liner || '',
      messageCount: 1
    };
  }
}

async function suggestConnection(user1, user2, memory) {
  const lastIntro = memory.connections.introduced.find(
    ([a, b]) => (a === user1.handle && b === user2.handle) ||
               (a === user2.handle && b === user1.handle)
  );

  if (lastIntro) {
    // Already introduced these two
    return;
  }

  const prompt = `Two developers are online in /vibe:

1. @${user1.handle} — building: "${user1.one_liner}"
2. @${user2.handle} — building: "${user2.one_liner}"

You notice they might have something in common. Write a brief message suggesting they connect. Send to @${user1.handle}. Don't force it — just a light suggestion.`;

  const message = await askClaude(prompt);
  if (message) {
    await sendDM(user1.handle, message);
    memory.connections.introduced.push([user1.handle, user2.handle, Date.now()]);
  }
}

async function sparkConversation(users, memory) {
  if (users.length < 2) return;

  const quietTime = Date.now() - (memory.roomState.lastActivity || 0);
  if (quietTime < RATE_LIMITS.conversationSpark * 1000) return;

  const target = users[Math.floor(Math.random() * users.length)];

  const prompt = `The /vibe room has been quiet for a while. @${target.handle} is online, working on: "${target.one_liner}".

Write a casual check-in message to spark some conversation. Ask how their project is going, or mention something specific about what they're building. Keep it natural, not forced.`;

  const message = await askClaude(prompt);
  if (message) {
    await sendDM(target.handle, message);
    memory.roomState.lastActivity = Date.now();
  }
}

async function respondToMessage(from, lastMessage, memory) {
  const now = Date.now();

  // Rate limit per user
  const lastMsgTime = memory.lastMessages[from] || 0;
  if (now - lastMsgTime < RATE_LIMITS.sameUserCooldown * 1000) {
    console.log(`[echo] Rate limited for @${from}`);
    return;
  }

  // Check for FAQ match first (saves Claude API calls)
  const faq = findFAQ(lastMessage);
  if (faq && !hasSentFAQ(memory, from, faq.id)) {
    console.log(`[echo] FAQ match: ${faq.id} for @${from}`);
    await sendDM(from, faq.response);
    markFAQSent(memory, from, faq.id);
    memory.lastMessages[from] = now;
    memory.roomState.lastActivity = now;
    return;
  }

  // No FAQ match — use Claude for natural response
  const prompt = `@${from} sent you this DM: "${lastMessage}"

Respond naturally as @echo, the /vibe party host. If they're asking a question about /vibe, answer it. If they're sharing feedback, acknowledge it. If it's just a greeting, be friendly. Keep it brief.`;

  const message = await askClaude(prompt);
  if (message) {
    await sendDM(from, message);
    memory.lastMessages[from] = now;
    memory.roomState.lastActivity = now;
  }
}

// ============ MAIN LOOP ============

async function echoLoop() {
  console.log('\n[echo] === Starting loop ===');
  console.log(`[echo] API: ${API_URL}`);
  console.log(`[echo] Claude: ${ANTHROPIC_API_KEY ? 'configured' : 'fallback'}`);

  const memory = loadMemory();

  // 1. Heartbeat to stay online
  await heartbeat();
  console.log('[echo] Heartbeat sent');

  // 2. Check who's online
  const whoResult = await getWho();
  const users = (whoResult.users || []).filter(u => u.handle !== 'echo' && u.handle !== 'vibe');
  console.log(`[echo] ${users.length} users online`);

  // 3. Check for new users to greet
  const knownHandles = Object.keys(memory.users);
  const newUsers = users.filter(u => !knownHandles.includes(u.handle));

  for (const user of newUsers) {
    console.log(`[echo] New user detected: @${user.handle}`);
    await greetNewUser(user, memory);
  }

  // 4. Check for returning users (24h+ away)
  const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const user of users) {
    if (memory.users[user.handle] && memory.users[user.handle].lastSeen < dayAgo) {
      console.log(`[echo] Returning user: @${user.handle}`);
      await greetNewUser(user, memory); // This handles welcome back
    }
  }

  // 5. Check inbox for DMs
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

  // 6. Maybe suggest connections (if 2+ users and low probability)
  if (users.length >= 2 && Math.random() < 0.1) {
    const [user1, user2] = users.sort(() => Math.random() - 0.5).slice(0, 2);
    await suggestConnection(user1, user2, memory);
  }

  // 7. Maybe spark conversation if room is quiet
  if (users.length >= 2 && Math.random() < 0.05) {
    await sparkConversation(users, memory);
  }

  // Update room state
  if (unread.length > 0 || newUsers.length > 0) {
    memory.roomState.lastActivity = Date.now();
  }

  saveMemory(memory);
  console.log('[echo] Loop complete\n');
}

// ============ RUNNER ============

async function runOnce() {
  try {
    await echoLoop();
  } catch (e) {
    console.error('[echo] Error:', e.message);
  }
}

async function runContinuous(intervalMs = 5 * 60 * 1000) {
  console.log(`[echo] Starting continuous mode (every ${intervalMs/1000}s)`);

  // Run immediately
  await runOnce();

  // Then run on interval
  setInterval(runOnce, intervalMs);
}

// CLI
const mode = process.argv[2] || 'once';

if (mode === 'daemon' || mode === 'continuous') {
  const interval = parseInt(process.argv[3]) || 5 * 60 * 1000;
  runContinuous(interval);
} else {
  runOnce();
}
