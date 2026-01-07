/**
 * vibe reservations — List active file reservations
 *
 * Shows who has reserved what files in the current scope.
 */

const config = require('../config');
const reservations = require('../store/reservations');
const { requireInit, formatTimeAgo, emptyState } = require('./_shared');

const definition = {
  name: 'vibe_reservations',
  description: 'List active file reservations in the current project.',
  inputSchema: {
    type: 'object',
    properties: {
      active_only: {
        type: 'boolean',
        description: 'Only show active reservations (default: true)'
      },
      path_filter: {
        type: 'string',
        description: 'Filter by path (e.g., "src/auth")'
      }
    }
  }
};

// Format remaining time
function formatRemaining(expires_ts) {
  const now = new Date();
  const expires = new Date(expires_ts);
  const ms = expires - now;

  if (ms <= 0) return 'expired';

  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m left`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m left`;

  return `${Math.floor(hours / 24)}d left`;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const handle = config.getHandle();
  const { active_only = true, path_filter } = args;

  // Cleanup expired first
  reservations.cleanup();

  // Get reservations
  const list = reservations.list({ active_only, path_filter });
  const scope = reservations.getScope();

  if (list.length === 0) {
    let display = `## Reservations\n\n`;
    display += `**Scope:** ${scope}\n\n`;
    display += emptyState(
      'No active reservations in this project.',
      '`vibe reserve --paths ["file.ts"]` to claim files'
    );
    return { display };
  }

  let display = `## Reservations\n\n`;
  display += `**Scope:** ${scope}\n\n`;

  // Group by owner
  const byOwner = {};
  for (const r of list) {
    if (!byOwner[r.owner]) {
      byOwner[r.owner] = [];
    }
    byOwner[r.owner].push(r);
  }

  // Show own reservations first
  const owners = Object.keys(byOwner).sort((a, b) => {
    if (a === handle) return -1;
    if (b === handle) return 1;
    return a.localeCompare(b);
  });

  for (const owner of owners) {
    const isMe = owner === handle;
    display += `### @${owner}${isMe ? ' (you)' : ''}\n\n`;

    for (const r of byOwner[owner]) {
      const remaining = formatRemaining(r.expires_ts);
      const exclusive = r.exclusive ? '🔒' : '📂';

      display += `${exclusive} **${r.paths.map(p => `\`${p}\``).join(', ')}**\n`;
      display += `   _${remaining}_`;
      if (r.reason) {
        display += ` — ${r.reason}`;
      }
      display += `\n`;
      if (isMe) {
        display += `   \`vibe release ${r.reservation_id}\` to release\n`;
      }
      display += `\n`;
    }
  }

  display += `---\n`;
  display += `${list.length} active reservation(s)`;

  return { display };
}

module.exports = { definition, handler };
