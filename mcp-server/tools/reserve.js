/**
 * vibe reserve — Claim files you're working on
 *
 * Advisory lock to signal edit intent.
 * Warns on conflicts, doesn't block.
 */

const config = require('../config');
const reservations = require('../store/reservations');
const { requireInit, formatDuration, warning, success } = require('./_shared');

const definition = {
  name: 'vibe_reserve',
  description: 'Reserve files you\'re working on. Advisory lock — warns on conflicts, doesn\'t block.',
  inputSchema: {
    type: 'object',
    properties: {
      paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Files or directories to reserve (relative paths, e.g., ["src/auth.ts", "src/api/"])'
      },
      ttl_seconds: {
        type: 'number',
        description: 'How long to hold reservation (default: 3600 = 1 hour)'
      },
      exclusive: {
        type: 'boolean',
        description: 'Warn others if they try to reserve same files (default: true)'
      },
      reason: {
        type: 'string',
        description: 'What you\'re doing (e.g., "Fix auth race condition")'
      },
      thread_id: {
        type: 'string',
        description: 'Link to a thread/task ID (optional)'
      }
    },
    required: ['paths']
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const handle = config.getHandle();
  const { paths, ttl_seconds = 3600, exclusive = true, reason, thread_id } = args;

  if (!paths || paths.length === 0) {
    return {
      display: `## Reserve Files

Claim files you're working on to avoid conflicts.

**Usage:**
\`\`\`
vibe reserve --paths ["src/auth.ts"]
vibe reserve --paths ["src/api/"] --reason "Refactoring API layer"
vibe reserve --paths ["*.ts"] --ttl_seconds 7200
\`\`\`

**Options:**
- \`paths\` — Files or directories (required)
- \`reason\` — What you're doing
- \`ttl_seconds\` — Duration (default: 1 hour)
- \`exclusive\` — Warn on conflicts (default: true)
- \`thread_id\` — Link to task/thread`
    };
  }

  // Create reservation
  const result = reservations.create(handle, paths, {
    ttl_seconds,
    exclusive,
    reason,
    thread_id
  });

  const { reservation, conflicts } = result;
  const duration = formatDuration(ttl_seconds * 1000);

  let display = `## Reservation Created\n\n`;
  display += `**ID:** \`${reservation.reservation_id}\`\n`;
  display += `**Scope:** ${reservation.scope}\n`;
  display += `**Files:** ${paths.map(p => `\`${p}\``).join(', ')}\n`;
  display += `**Expires:** ${duration}\n`;
  if (reason) {
    display += `**Reason:** ${reason}\n`;
  }

  // Show conflicts as warnings
  if (conflicts && conflicts.length > 0) {
    display += `\n---\n\n`;
    display += warning(`${conflicts.length} conflict(s) detected:\n\n`);
    for (const c of conflicts) {
      display += `- \`${c.path}\` reserved by **@${c.owner}**`;
      if (c.reason) display += ` (${c.reason})`;
      display += `\n`;
    }
    display += `\n_These are advisory warnings — you can still proceed._`;
  }

  display += `\n\n---\n`;
  display += `\`vibe reservations\` to see all | \`vibe release ${reservation.reservation_id}\` when done`;

  return { display };
}

module.exports = { definition, handler };
