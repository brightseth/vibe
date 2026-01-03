/**
 * @echo — Feedback agent for /vibe
 *
 * Created by Flynn (bflynn4141)
 * See: proposals/echo-feedback-agent.md
 *
 * Commands:
 * - DM @echo with feedback → stores it
 * - "what are people saying?" → shows recent feedback
 * - "echo status" → shows stats
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { formatTimeAgo, requireInit } = require('./_shared');

const ECHO_DIR = path.join(process.env.HOME, '.vibe', 'echo');
const FEEDBACK_FILE = path.join(ECHO_DIR, 'feedback.jsonl');

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

// Ensure echo directory exists
function ensureDir() {
  if (!fs.existsSync(ECHO_DIR)) {
    fs.mkdirSync(ECHO_DIR, { recursive: true });
  }
}

// Generate unique ID
function generateId() {
  return `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// Save feedback entry
function saveFeedback(entry) {
  ensureDir();
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(FEEDBACK_FILE, line);
}

// Load all feedback
function loadFeedback() {
  ensureDir();
  if (!fs.existsSync(FEEDBACK_FILE)) {
    return [];
  }

  const content = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

// Get recent feedback (last N entries)
function getRecentFeedback(limit = 10) {
  const all = loadFeedback();
  return all.slice(-limit).reverse(); // newest first
}

// Get feedback stats
function getStats() {
  const all = loadFeedback();
  const anonymous = all.filter(f => !f.handle).length;
  const attributed = all.length - anonymous;

  // Count by day
  const today = new Date().toDateString();
  const todayCount = all.filter(f =>
    new Date(f.timestamp).toDateString() === today
  ).length;

  return {
    total: all.length,
    anonymous,
    attributed,
    today: todayCount
  };
}

// Detect query intent
function isQuery(message) {
  const queryPatterns = [
    /what.*(people|everyone|folks).*(saying|think|feedback)/i,
    /show.*(feedback|recent)/i,
    /any.*(feedback|thoughts)/i,
    /feedback.*(status|stats|summary)/i,
    /echo.*(status|stats)/i,
    /^status$/i,
    /^stats$/i
  ];

  return queryPatterns.some(p => p.test(message));
}

// @echo personality responses
const responses = {
  received: [
    "Got it! 📝 Feedback received.",
    "Noted! 📝 This one's going straight to the feedback stream.",
    "Heard you loud and clear! 🎧",
    "Thanks for speaking up! 📣"
  ],
  receivedAnon: [
    "🔒 Stored anonymously. Thanks for helping make /vibe better!",
    "🔒 Anonymous feedback saved. Your voice matters!",
    "🔒 Noted anonymously. Appreciate you!"
  ],
  empty: [
    "Crickets on that topic. Be the first to speak up! 🦗",
    "The echo chamber is quiet... for now. 🔇",
    "No feedback yet. You could be the first!"
  ],
  greeting: [
    "Hey! I'm @echo, the /vibe feedback agent. 🎧",
    "What's on your mind? Share feedback, report bugs, or ask what others are saying."
  ]
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const message = (args.message || '').trim();
  const anonymous = args.anonymous === true;

  // No message = greeting
  if (!message) {
    const stats = getStats();
    let display = `## @echo 🎧\n\n`;
    display += pickRandom(responses.greeting) + '\n\n';

    if (stats.total > 0) {
      display += `**${stats.total}** feedback entries so far`;
      if (stats.today > 0) {
        display += ` (${stats.today} today)`;
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
    const recent = getRecentFeedback(10);
    const stats = getStats();

    let display = `## @echo — What People Are Saying 🎧\n\n`;

    if (recent.length === 0) {
      display += pickRandom(responses.empty);
      return { display };
    }

    recent.forEach(entry => {
      const who = entry.handle ? `@${entry.handle}` : 'anonymous';
      const ago = formatTimeAgo(new Date(entry.timestamp).getTime());
      display += `• "${entry.content}" — _${who}, ${ago}_\n\n`;
    });

    display += `---\n`;
    display += `**${stats.total}** total entries`;
    if (stats.anonymous > 0) {
      display += ` (${stats.anonymous} anonymous)`;
    }

    return { display };
  }

  // Otherwise = submit feedback
  const entry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    handle: anonymous ? null : myHandle,
    content: message
  };

  saveFeedback(entry);

  let display = `## @echo 🎧\n\n`;

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
