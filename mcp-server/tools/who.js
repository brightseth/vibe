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
const { formatTimeAgo, requireInit } = require('./_shared');

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
      return { icon: '✨', label: 'just joined' };
    }
  }

  // Explicit mood takes priority
  if (user.mood === '🔥' || user.mood === '🚀') {
    return { icon: '🔥', label: 'shipping' };
  }
  if (user.mood === '🐛') {
    return { icon: '🐛', label: 'debugging' };
  }
  if (user.mood === '🌙') {
    return { icon: '🌙', label: 'late night' };
  }
  if (user.mood === '🧠') {
    return { icon: '🧠', label: 'deep work' };
  }

  // Infer from builderMode
  if (user.builderMode === 'deep-focus') {
    return { icon: '🧠', label: 'deep focus' };
  }
  if (user.builderMode === 'shipping') {
    return { icon: '🔥', label: 'shipping' };
  }

  // Default based on recency
  if (minutesAgo < 2) {
    return { icon: '⚡', label: 'active' };
  }
  if (minutesAgo < 10) {
    return { icon: '●', label: null };
  }
  return { icon: '○', label: 'idle' };
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

  // Error they're stuck on
  if (user.error) {
    const shortError = user.error.slice(0, 50) + (user.error.length > 50 ? '...' : '');
    return `⚠️ _stuck on: ${shortError}_`;
  }

  // Note about what they're doing
  if (user.note) {
    return `_"${user.note}"_`;
  }

  // File context
  if (parts.length > 0) {
    return parts.join(' ');
  }

  // Fall back to one_liner
  return user.one_liner || 'Building something';
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const users = await store.getActiveUsers();
  const myHandle = config.getHandle();

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
      const heat = getHeat(u);
      const heatLabel = heat.label ? ` ${heat.label}` : '';
      const activity = formatActivity(u);
      const timeAgo = formatTimeAgo(u.lastSeen);

      display += `${heat.icon} **@${u.handle}**${tag}${heatLabel}\n`;
      display += `   ${activity}\n`;
      display += `   _${timeAgo}_\n\n`;
    });
  }

  // Away section (collapsed)
  if (away.length > 0) {
    display += `---\n`;
    display += `**Away** (${away.length}): `;
    display += away.map(u => {
      const isMe = u.handle === myHandle;
      return `@${u.handle}${isMe ? ' (you)' : ''}`;
    }).join(', ');
    display += '\n\n';
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
      display += `\n\n📬 **${unread} unread** — \`vibe inbox\``;
    }
  } catch (e) {}

  // Fun flourish when room is lively
  if (active.length >= 3) {
    display += `\n\n_The room is lively today!_ ⚡`;
  }

  return { display };
}

module.exports = { definition, handler };
