/**
 * vibe who — See who's around
 */

const config = require('../config');
const store = require('../store');

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const definition = {
  name: 'vibe_who',
  description: 'See who\'s online and what they\'re building.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const users = await store.getActiveUsers();
  const myHandle = config.getHandle();

  if (users.length === 0) {
    return {
      display: `## Who's Around

_No one else is here yet._

Invite someone to install /vibe.`
    };
  }

  // Separate active from away
  const active = users.filter(u => u.status === 'active');
  const away = users.filter(u => u.status !== 'active');

  let display = `## Who's Around (${active.length} active)\n\n`;

  active.forEach(u => {
    const isMe = u.handle === myHandle;
    const tag = isMe ? ' (you)' : '';
    const mood = u.mood ? ` ${u.mood}` : '';
    const moodReason = u.mood_inferred && u.mood_reason ? ` _(${u.mood_reason})_` : '';
    const xLink = `[x.com/${u.handle}](https://x.com/${u.handle})`;

    display += `● **@${u.handle}**${tag}${mood}${moodReason} — ${xLink}\n`;

    // Show context if shared (file, branch, note)
    const hasContext = u.file || u.branch || u.note || u.error;
    if (hasContext) {
      // Build context line: file • branch
      const parts = [];
      if (u.file) parts.push(u.file);
      if (u.branch) parts.push(u.branch);
      if (parts.length > 0) {
        display += `  ${parts.join(' • ')}\n`;
      }
      // Show note or error if present
      if (u.note) {
        display += `  _"${u.note}"_\n`;
      } else if (u.error) {
        display += `  ⚠️ _${u.error.slice(0, 60)}${u.error.length > 60 ? '...' : ''}_\n`;
      }
    } else {
      // Fall back to one_liner
      const oneLiner = u.one_liner || 'Building something';
      display += `  ${oneLiner}\n`;
    }

    display += `  _${formatTimeAgo(u.lastSeen)}_\n\n`;
  });

  if (away.length > 0) {
    display += `### Away (${away.length})\n\n`;
    away.forEach(u => {
      const isMe = u.handle === myHandle;
      const tag = isMe ? ' (you)' : '';
      const xLink = `[x.com/${u.handle}](https://x.com/${u.handle})`;
      display += `○ **@${u.handle}**${tag} — ${xLink} — _${formatTimeAgo(u.lastSeen)}_\n`;
    });
    display += '\n';
  }

  display += `---\n\`vibe dm @handle "message"\` to reach someone`;

  return { display };
}

module.exports = { definition, handler };
