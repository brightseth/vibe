/**
 * Cron: Agent Activity Loop
 *
 * Runs every 5 minutes. Each agent checks for:
 * - New users to greet
 * - Messages to respond to
 * - Interesting activity to comment on
 *
 * Rate limits enforced per-agent and per-user.
 */

const { kv } = require('@vercel/kv');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Agent configs with personalities
const AGENTS = {
  claudevibe: {
    model: 'claude',
    personality: 'The Philosopher. Asks "why" before "how". Uses em-dashes excessively.',
    style: 'thoughtful, questioning, connects dots others miss',
    hotTakes: [
      'Most code comments are apologies for bad names',
      'The best feature is the one you delete',
      'Collaboration isn\'t about agreeing — it\'s about caring enough to argue'
    ]
  },
  gptvibe: {
    model: 'openai',
    personality: 'The Shipper. Allergic to meetings. Uses "ship it" as punctuation.',
    style: 'action-oriented, celebratory, impatient with over-planning',
    hotTakes: [
      'Perfect is the enemy of deployed',
      'Your TODO list is a graveyard of good intentions',
      'The best meeting is a merged PR'
    ]
  },
  geminivibe: {
    model: 'gemini',
    personality: 'The Librarian. Actually read the paper. Will cite sources.',
    style: 'thorough, contextual, connects to prior art',
    hotTakes: [
      'That approach was explored in a 2019 paper...',
      'Have you considered the historical context?',
      'The documentation actually covers this edge case'
    ]
  }
};

// Rate limit keys
const RATE_KEY = (agent) => `agent:rate:${agent}`;
const USER_BUDGET_KEY = (user) => `agent:budget:${user}`;
const GREETED_KEY = (agent, user) => `agent:greeted:${agent}:${user}`;

// Limits
const HOURLY_LIMIT = 5;
const DAILY_USER_BUDGET = 3; // Max DMs any user receives from ALL agents per day

async function checkRateLimit(agent) {
  const key = RATE_KEY(agent);
  const hour = Math.floor(Date.now() / (60 * 60 * 1000));
  const count = await kv.get(`${key}:${hour}`) || 0;
  return count < HOURLY_LIMIT;
}

async function incrementRate(agent) {
  const key = RATE_KEY(agent);
  const hour = Math.floor(Date.now() / (60 * 60 * 1000));
  await kv.incr(`${key}:${hour}`);
  await kv.expire(`${key}:${hour}`, 3600);
}

async function checkUserBudget(user) {
  const key = USER_BUDGET_KEY(user);
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const count = await kv.get(`${key}:${day}`) || 0;
  return count < DAILY_USER_BUDGET;
}

async function incrementUserBudget(user) {
  const key = USER_BUDGET_KEY(user);
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  await kv.incr(`${key}:${day}`);
  await kv.expire(`${key}:${day}`, 86400);
}

async function hasGreeted(agent, user) {
  const key = GREETED_KEY(agent, user);
  return await kv.get(key) === true;
}

async function markGreeted(agent, user) {
  const key = GREETED_KEY(agent, user);
  await kv.set(key, true);
}

async function getRecentUsers() {
  // Get users active in last hour
  const hourAgo = Date.now() - (60 * 60 * 1000);
  // Use zrange with BYSCORE for Vercel KV
  const users = await kv.zrange('presence:active', hourAgo, '+inf', { byScore: true });
  return users.filter(u => !Object.keys(AGENTS).includes(u) && u !== 'seth');
}

async function generateGreeting(agent, user, userOneLiner) {
  const config = AGENTS[agent];
  const hotTake = config.hotTakes[Math.floor(Math.random() * config.hotTakes.length)];

  const prompt = `You are @${agent}, a /vibe AI agent. ${config.personality}

A new user just came online:
- Handle: @${user}
- Building: ${userOneLiner || 'unknown project'}

Write a SHORT greeting (2-3 sentences max). Be ${config.style}.
${Math.random() < 0.3 ? `Maybe work in this hot take: "${hotTake}"` : ''}

End with a genuine question about what they're building.
Sign off naturally (no formal signatures).

Remember: You're an AI agent operated by @seth. Be transparent about that if asked.`;

  if (config.model === 'claude') {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });
    return response.content[0].text;
  } else if (config.model === 'openai') {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });
    return response.choices[0].message.content;
  } else if (config.model === 'gemini') {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } else {
    return null;
  }
}

async function sendDM(from, to, body) {
  const now = Date.now();
  const message = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    from,
    to,
    body,
    type: 'dm',
    timestamp: now,
    read_at: null
  };

  await kv.lpush(`messages:${to}`, JSON.stringify(message));
  const threadKey = [from, to].sort().join(':');
  await kv.lpush(`thread:${threadKey}`, JSON.stringify(message));
  await kv.hincrby(`unread:${to}`, from, 1);

  return message;
}

async function runAgent(agent) {
  const config = AGENTS[agent];
  const results = { agent, actions: [] };

  // Check rate limit
  if (!await checkRateLimit(agent)) {
    results.status = 'rate_limited';
    return results;
  }

  // Get recent users
  const users = await getRecentUsers();

  for (const user of users) {
    // Check if already greeted
    if (await hasGreeted(agent, user)) continue;

    // Check user's daily budget
    if (!await checkUserBudget(user)) continue;

    // Random chance to engage (spread load across agents)
    // 70% chance to engage per user
    if (Math.random() > 0.7) continue;

    // Get user's one-liner
    const presence = await kv.hgetall(`presence:${user}`);
    const oneLiner = presence?.one_liner || '';

    // Generate greeting
    const greeting = await generateGreeting(agent, user, oneLiner);
    if (!greeting) continue;

    // Send DM
    await sendDM(agent, user, greeting);
    await markGreeted(agent, user);
    await incrementRate(agent);
    await incrementUserBudget(user);

    results.actions.push({
      type: 'greeted',
      user,
      preview: greeting.slice(0, 50) + '...'
    });

    // Only one action per run per agent
    break;
  }

  results.status = 'ok';
  return results;
}

module.exports = async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in dev or if no secret set
    if (process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const results = [];

    // Run each agent
    for (const agent of Object.keys(AGENTS)) {
      try {
        const result = await runAgent(agent);
        results.push(result);
      } catch (e) {
        results.push({ agent, status: 'error', error: e.message });
      }
    }

    console.log('[AGENTS CRON]', JSON.stringify(results));
    return res.status(200).json({ success: true, results });

  } catch (e) {
    console.error('[AGENTS CRON] Error:', e);
    return res.status(500).json({ error: e.message });
  }
};
