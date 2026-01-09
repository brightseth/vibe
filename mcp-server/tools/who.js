/**
 * vibe who — See who's around with activity feed
 *
 * Shows not just who's online, but what's happening:
 * - Activity heat (how engaged they are)
 * - Recent actions ("just joined", "sent you a DM")
 * - Context (file, branch, what they're stuck on)
 */

const config = require('../config');
const store = require('../store');
const notify = require('../notify');
const { formatTimeAgo, requireInit } = require('./_shared');
const { actions, formatActions } = require('./_actions');
const { enhanceUsersWithInference } = require('../intelligence/infer');
const { getTopSerendipity, getAllSerendipity } = require('../intelligence/serendipity');

const definition = {
  name: 'vibe_who',
  description: 'See who\'s online and what they\'re building.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

// Activity heat based on session signals
function getHeat(user) {
  const lastSeenMs = user.lastSeen;
  const now = Date.now();
  const minutesAgo = (now - lastSeenMs) / 60000;

  // Just joined (within 5 min of session start)
  if (user.firstSeen) {
    const sessionDuration = (lastSeenMs - new Date(user.firstSeen).getTime()) / 60000;
    if (sessionDuration < 5 && minutesAgo < 2) {
      return { icon: '✨', label: 'just joined', inferred: false };
    }
  }

  // Check for inferred state from smart detection
  if (user.mood_inferred && user.mood) {
    const inferredLabel = user.inferred_state
      ? `${user.inferred_state.replace('-', ' ')}`
      : 'active';
    return {
      icon: user.mood,
      label: inferredLabel,
      inferred: true,
      reason: user.mood_reason
    };
  }

  // Explicit mood takes priority
  if (user.mood === '🔥' || user.mood === '🚀') {
    return { icon: '🔥', label: 'shipping', inferred: false };
  }
  if (user.mood === '🐛') {
    return { icon: '🐛', label: 'debugging', inferred: false };
  }
  if (user.mood === '🌙') {
    return { icon: '🌙', label: 'late night', inferred: false };
  }
  if (user.mood === '🧠') {
    return { icon: '🧠', label: 'deep work', inferred: false };
  }

  // Infer from builderMode
  if (user.builderMode === 'deep-focus') {
    return { icon: '🧠', label: 'deep focus', inferred: false };
  }
  if (user.builderMode === 'shipping') {
    return { icon: '🔥', label: 'shipping', inferred: false };
  }

  // Default based on recency
  if (minutesAgo < 2) {
    return { icon: '⚡', label: 'active', inferred: false };
  }
  if (minutesAgo < 10) {
    return { icon: '●', label: null, inferred: false };
  }
  return { icon: '○', label: 'idle', inferred: false };
}

// Format user's current activity
function formatActivity(user) {
  const parts = [];

  // File/branch context
  if (user.file) {
    parts.push(user.file);
  }
  if (user.branch && user.branch !== 'main' && user.branch !== 'master') {
    parts.push(`(${user.branch})`);
  }

  // Error they're stuck on (highest priority - they might need help)
  if (user.error) {
    const shortError = user.error.slice(0, 50) + (user.error.length > 50 ? '...' : '');
    return `⚠️ _stuck on: ${shortError}_`;
  }

  // Combine file + note if both present
  if (user.note && parts.length > 0) {
    return `${parts.join(' ')} — _"${user.note}"_`;
  }

  // Just note
  if (user.note) {
    return `_"${user.note}"_`;
  }

  // Just file context
  if (parts.length > 0) {
    return parts.join(' ');
  }

  // Fall back to one_liner
  return user.one_liner || 'Building something';
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const rawUsers = await store.getActiveUsers();
  // Apply smart detection — infer states from context signals
  const users = enhanceUsersWithInference(rawUsers);
  const myHandle = config.getHandle();

  // Check for notifications (presence + messages)
  notify.checkAll(store);

  if (users.length === 0) {
    return {
      display: `## Who's Around

_You're the only one here right now..._

🎮 **Challenge someone later**: "play tictactoe with @friend"
💬 **Ping @seth**: He's probably around somewhere
🔗 **Invite a friend**: Share \`slashvibe.dev\`

_Check back in a bit — builders come and go._`
    };
  }

  // Sort by activity: most recent first
  const sorted = [...users].sort((a, b) => b.lastSeen - a.lastSeen);

  // Separate active from away/offline
  const active = sorted.filter(u => u.status === 'active');
  const away = sorted.filter(u => u.status !== 'active');

  let display = `## Who's Around\n\n`;

  // Activity section for active users
  if (active.length > 0) {
    active.forEach(u => {
      const isMe = u.handle === myHandle;
      const tag = isMe ? ' _(you)_' : '';
      const agentBadge = u.is_agent ? ' 🤖' : '';
      const operatorTag = u.is_agent && u.operator ? ` _(op: @${u.operator})_` : '';
      const heat = getHeat(u);
      // Keep it clean — state speaks for itself
      const heatLabel = heat.label ? ` ${heat.label}` : '';
      const activity = formatActivity(u);
      const timeAgo = formatTimeAgo(u.lastSeen);

      display += `${heat.icon} **@${u.handle}**${agentBadge}${tag}${heatLabel}\n`;
      if (operatorTag) {
        display += `   ${operatorTag}\n`;
      }
      display += `   ${activity}\n`;
      display += `   _${timeAgo}_\n\n`;
    });
  }

  // Away section (expanded with messages if present)
  if (away.length > 0) {
    display += `---\n\n`;
    display += `**Away:**\n`;

    // Split into users with away messages and without
    const withMessage = away.filter(u => u.awayMessage);
    const withoutMessage = away.filter(u => !u.awayMessage);

    // Show users with custom away messages (expanded)
    withMessage.forEach(u => {
      const isMe = u.handle === myHandle;
      const tag = isMe ? ' _(you)_' : '';
      const timeAgo = formatTimeAgo(u.lastSeen);

      display += `☕ **@${u.handle}**${tag} — _"${u.awayMessage}"_\n`;
      display += `   _${timeAgo}_\n\n`;
    });

    // Show auto-away users (collapsed) with 💤
    if (withoutMessage.length > 0) {
      withoutMessage.forEach(u => {
        const isMe = u.handle === myHandle;
        const tag = isMe ? ' _(you)_' : '';
        const timeAgo = formatTimeAgo(u.lastSeen);

        display += `💤 **@${u.handle}**${tag} _(auto-away)_\n`;
        display += `   _${timeAgo}_\n\n`;
      });
    }
  }

  // Fun quick actions - randomize suggestions
  const quickActions = [
    `Say "message @handle" to reach someone`,
    `Try "react 🔥 to @handle" for a quick high-five`,
    `"ping @handle" sends a friendly wave 👋`,
    `"play tictactoe with @handle" to challenge someone`,
  ];
  const randomAction = quickActions[Math.floor(Math.random() * quickActions.length)];

  display += `---\n`;
  display += randomAction;

  // Check for unread to add urgency
  try {
    const unread = await store.getUnreadCount(myHandle);
    if (unread > 0) {
      display += `\n\n📬 **NEW MESSAGE — ${unread} UNREAD** — \`vibe inbox\``;
    }
  } catch (e) {}

  // Fun flourish when room is lively
  if (active.length >= 3) {
    display += `\n\n_The room is lively today!_ ⚡`;
  }

  // Genesis spots remaining
  try {
    const stats = await store.getStats();
    if (stats.genesis && stats.genesis.genesis_remaining > 0) {
      display += `\n\n🌱 **${stats.genesis.genesis_remaining} genesis spots left** of ${stats.genesis.genesis_cap}`;
    } else if (stats.genesis && stats.genesis.genesis_remaining === 0) {
      display += `\n\n_Genesis is full — ${stats.genesis.total} builders strong_`;
    }
  } catch (e) {
    // Silent fail — genesis display is nice-to-have
  }

  // Build response with optional hints for structured flows
  const response = { display };

  // Check for surprise suggestion opportunities
  const suggestions = [];
  for (const u of active) {
    if (u.handle === myHandle) continue;

    const heat = getHeat(u);

    // Just joined - highest priority
    if (heat.label === 'just joined') {
      suggestions.push({
        handle: u.handle,
        reason: 'just_joined',
        context: u.one_liner || 'Building something',
        priority: 1
      });
    }
    // Shipping something - good time to engage
    else if (heat.label === 'shipping') {
      suggestions.push({
        handle: u.handle,
        reason: 'shipping',
        context: u.note || u.file || u.one_liner || 'Shipping something',
        priority: 2
      });
    }
    // Has error - might need help
    else if (u.error) {
      suggestions.push({
        handle: u.handle,
        reason: 'needs_help',
        context: u.error.slice(0, 80),
        priority: 3
      });
    }
  }

  // Sort by priority and take top suggestion
  let topSuggestion = null;
  if (suggestions.length > 0) {
    suggestions.sort((a, b) => a.priority - b.priority);
    topSuggestion = suggestions[0];
    response.hint = 'surprise_suggestion';
    response.suggestion = topSuggestion;
  }

  // Serendipity detection — quiet awareness, not loud callouts
  const myUser = users.find(u => u.handle === myHandle);
  if (myUser && active.length > 1) {
    const serendipity = getTopSerendipity(myUser, active);
    if (serendipity && serendipity.relevance > 0.75) {
      // Only surface high-confidence matches, and quietly
      response.serendipity = serendipity;
    }
  }

  // Add guided mode actions
  const onlineHandles = active.filter(u => u.handle !== myHandle).map(u => u.handle);
  const unreadCount = await store.getUnreadCount(myHandle).catch(() => 0);

  if (active.length === 0 || (active.length === 1 && active[0].handle === myHandle)) {
    // Empty room
    response.actions = formatActions(actions.emptyRoom());
  } else {
    // People are here
    response.actions = formatActions(actions.dashboard({
      unreadCount,
      onlineUsers: onlineHandles,
      suggestion: topSuggestion
    }));
  }

  return response;
}

module.exports = { definition, handler };
