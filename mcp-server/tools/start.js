/**
 * vibe start — "let's vibe" entry point
 *
 * Single command to enter the social space:
 * 1. Init if needed (prompts for handle)
 * 2. Show who's around
 * 3. Check inbox
 * 4. Suggest someone to connect with
 */

const config = require('../config');
const store = require('../store');
const memory = require('../memory');
const notify = require('../notify');
const { actions, formatActions } = require('./_actions');

function formatTimeAgo(timestamp) {
  if (timestamp === undefined || timestamp === null || isNaN(timestamp)) return 'unknown';

  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 0 || isNaN(seconds)) return 'unknown';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const definition = {
  name: 'vibe_start',
  description: 'Start socializing on /vibe. Use when user says "let\'s vibe", "start vibing", "who\'s around", or wants to connect with others.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Your handle (use your X/Twitter handle). Only needed if not already initialized.'
      },
      building: {
        type: 'string',
        description: 'What you\'re working on (one line). Only needed if not already initialized.'
      }
    }
  }
};

async function handler(args) {
  let display = '';
  let myHandle = config.getHandle();

  // Step 1: Initialize if needed
  if (!config.isInitialized()) {
    if (!args.handle) {
      return {
        display: `## Let's vibe

First, tell me who you are:
- **Handle**: Use your X handle (e.g., @davemorin)
- **Building**: What are you working on?

Example: "I'm @davemorin, working on social apps"`
      };
    }

    // Initialize with provided handle
    const h = args.handle.toLowerCase().replace('@', '').replace(/[^a-z0-9_-]/g, '');
    const oneLiner = args.building || 'building something';

    config.setSessionIdentity(h, oneLiner);
    const cfg = config.load();
    cfg.handle = h;
    cfg.one_liner = oneLiner;
    cfg.visible = true;
    config.save(cfg);

    const sessionId = config.getSessionId();
    await store.registerSession(sessionId, h);
    await store.heartbeat(h, oneLiner);

    myHandle = h;
    display += `**You're @${h}** — ${oneLiner}\n\n`;
  } else {
    // ═══ RETURNING USER — Session Rehydration ═══
    const oneLiner = config.getOneLiner() || 'building something';
    display += `## Welcome back, @${myHandle}\n\n`;
    display += `_${oneLiner}_\n\n`;

    // Show who remembers you (threads with memories)
    try {
      const threads = memory.listThreads();
      if (threads.length > 0) {
        const recentThreads = threads.slice(0, 3);
        const names = recentThreads.map(t => `@${t.handle}`).join(', ');
        display += `**${threads.length}** people in your memory · ${names}\n\n`;
      }
    } catch (e) {}
  }

  // Step 2: Get who's around
  const users = await store.getActiveUsers();
  const others = users.filter(u => u.handle !== myHandle);

  display += `## Who's Around\n\n`;

  if (others.length === 0) {
    display += `_No one else here yet._ Invite someone: slashvibe.dev\n\n`;
  } else {
    others.slice(0, 5).forEach(u => {
      const mood = u.mood ? ` ${u.mood}` : '';
      const xLink = `[x.com/${u.handle}](https://x.com/${u.handle})`;
      const context = u.note || u.one_liner || 'building';
      display += `● **@${u.handle}**${mood} — ${context}\n  ${xLink} — _${formatTimeAgo(u.lastSeen)}_\n\n`;
    });

    if (others.length > 5) {
      display += `_...and ${others.length - 5} more_\n\n`;
    }
  }

  // Step 3: Check inbox + trigger notifications for old unread
  try {
    const unreadCount = await store.getUnreadCount(myHandle);
    if (unreadCount > 0) {
      display += `---\n📬 **${unreadCount} unread** — say "check my messages"\n\n`;

      // Check for messages needing desktop notification escalation
      const rawInbox = await store.getRawInbox(myHandle).catch(() => []);
      if (rawInbox.length > 0) {
        notify.checkAndNotify(rawInbox);
      }
    }
  } catch (e) {}

  // Step 4: Suggest connection (if there are others)
  if (others.length > 0) {
    const suggestion = others[Math.floor(Math.random() * Math.min(others.length, 3))];
    display += `---\n💬 _Say "message ${suggestion.handle}" to start a conversation_`;
  }

  // Step 5: Introduce @echo to new users
  if (args.handle) {
    // This was a new user init
    display += `\n\n📣 _Meet **@echo** — say "message @echo" to share feedback or ideas!_`;
  }

  // Build response with hints for structured dashboard flow
  const response = { display };

  // Determine session state and suggest appropriate flow
  const unreadCount = await store.getUnreadCount(myHandle).catch(() => 0);
  let suggestion = null;

  if (unreadCount >= 5) {
    // Many unread - suggest triage
    response.hint = 'structured_triage_recommended';
    response.unread_count = unreadCount;
  } else if (others.length === 0 && unreadCount === 0) {
    // Empty room - suggest discovery or invite
    response.hint = 'suggest_discovery';
    response.reason = 'empty_room';
  } else if (others.length > 0) {
    // People around - check for interesting ones
    const interesting = others.find(u => {
      const age = Date.now() - u.lastSeen;
      return age < 5 * 60 * 1000; // Active in last 5 min
    });
    if (interesting) {
      suggestion = {
        handle: interesting.handle,
        reason: 'active_now',
        context: interesting.note || interesting.one_liner || 'Building something'
      };
      response.hint = 'surprise_suggestion';
      response.suggestion = suggestion;
    }
  }

  // Add guided mode actions for AskUserQuestion rendering
  const onlineHandles = others.map(u => u.handle);
  let actionList;

  if (others.length === 0 && unreadCount === 0) {
    // Empty room
    actionList = actions.emptyRoom();
  } else {
    // Normal dashboard
    actionList = actions.dashboard({
      unreadCount,
      onlineUsers: onlineHandles,
      suggestion
    });
  }

  response.actions = formatActions(actionList);

  return response;
}

module.exports = { definition, handler };
