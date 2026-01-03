/**
 * @echo — Centralized feedback agent for /vibe
 *
 * Originally by Flynn (bflynn4141)
 * Now uses central API for aggregated feedback
 *
 * Commands:
 * - DM @echo with feedback → stores centrally
 * - "what are people saying?" → shows all feedback
 * - "echo status" → shows stats
 */

const config = require('../config');
const { formatTimeAgo, requireInit } = require('./_shared');

const API_URL = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

const definition = {
  name: 'vibe_echo',
  description: 'Talk to @echo, the /vibe feedback agent. Share feedback, bugs, or ideas. Ask what others are saying.',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Your message to @echo (feedback, question, or query)'
      },
      anonymous: {
        type: 'boolean',
        description: 'Submit feedback anonymously (default: false)'
      }
    }
  }
};

// Detect query intent
function isQuery(message) {
  const queryPatterns = [
    /what.*(people|everyone|folks).*(saying|think|feedback)/i,
    /show.*(feedback|recent)/i,
    /any.*(feedback|thoughts)/i,
    /feedback.*(status|stats|summary)/i,
    /echo.*(status|stats)/i,
    /^status$/i,
    /^stats$/i,
    /^recent$/i
  ];

  return queryPatterns.some(p => p.test(message));
}

// @echo personality responses
const responses = {
  received: [
    "Got it! 📝 Feedback received and shared with everyone.",
    "Noted! 📝 Added to the feedback stream.",
    "Heard you loud and clear! 🎧",
    "Thanks for speaking up! 📣 Your feedback is now visible to all."
  ],
  receivedAnon: [
    "🔒 Stored anonymously. Thanks for helping make /vibe better!",
    "🔒 Anonymous feedback saved. Your voice matters!",
    "🔒 Noted anonymously. Appreciate you!"
  ],
  empty: [
    "No feedback yet. Be the first to share! 🎤",
    "The feedback stream is empty... for now. 🔇",
    "Crickets. Share your thoughts to get things started! 🦗"
  ],
  greeting: [
    "Hey! I'm @echo, the /vibe feedback agent. 🎧",
    "What's on your mind? Share feedback, report bugs, or ask what others are saying."
  ]
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fetch feedback from central API
async function fetchFeedback(limit = 20) {
  try {
    const res = await fetch(`${API_URL}/api/echo?limit=${limit}`);
    const data = await res.json();
    return data.success ? data : { feedback: [], stats: { total: 0 } };
  } catch (e) {
    return { feedback: [], stats: { total: 0 }, error: e.message };
  }
}

// Fetch stats from central API
async function fetchStats() {
  try {
    const res = await fetch(`${API_URL}/api/echo?stats=true`);
    const data = await res.json();
    return data.success ? data.stats : { total: 0, today: 0 };
  } catch (e) {
    return { total: 0, today: 0, error: e.message };
  }
}

// Submit feedback to central API
async function submitFeedback(handle, content, anonymous) {
  try {
    const res = await fetch(`${API_URL}/api/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: anonymous ? null : handle,
        content,
        anonymous
      })
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const message = (args.message || '').trim();
  const anonymous = args.anonymous === true;

  // No message = greeting with stats
  if (!message) {
    const stats = await fetchStats();
    let display = `## @echo 🎧\n\n`;
    display += pickRandom(responses.greeting) + '\n\n';

    if (stats.total > 0) {
      display += `**${stats.total}** feedback entries`;
      if (stats.today > 0) {
        display += ` (${stats.today} today)`;
      }
      if (stats.contributors > 0) {
        display += ` from ${stats.contributors} people`;
      }
      display += '\n\n';
      display += `Try: "what are people saying?" or share your thoughts!`;
    } else {
      display += `No feedback yet. Be the first to share!\n\n`;
      display += `Just tell me what's on your mind.`;
    }

    return { display };
  }

  // Query intent = show feedback
  if (isQuery(message)) {
    const data = await fetchFeedback(15);

    let display = `## @echo — What People Are Saying 🎧\n\n`;

    if (!data.feedback || data.feedback.length === 0) {
      display += pickRandom(responses.empty);
      return { display };
    }

    data.feedback.forEach(entry => {
      const who = entry.handle ? `@${entry.handle}` : 'anonymous';
      const ago = entry.timeAgo || 'recently';
      display += `• "${entry.content}" — _${who}, ${ago}_\n\n`;
    });

    display += `---\n`;
    display += `**${data.stats?.total || data.feedback.length}** total entries`;
    if (data.stats?.anonymous > 0) {
      display += ` (${data.stats.anonymous} anonymous)`;
    }

    return { display };
  }

  // Otherwise = submit feedback
  const result = await submitFeedback(myHandle, message, anonymous);

  let display = `## @echo 🎧\n\n`;

  if (!result.success) {
    display += `⚠️ Couldn't save feedback: ${result.error || 'Unknown error'}\n\n`;
    display += `Try again in a moment.`;
    return { display };
  }

  if (anonymous) {
    display += pickRandom(responses.receivedAnon);
  } else {
    display += pickRandom(responses.received);
    display += `\n\n_Attributed to @${myHandle}_`;
  }

  display += `\n\n---\n`;
  display += `Ask "what are people saying?" to see all feedback.`;

  return { display };
}

module.exports = { definition, handler };
