/**
 * vibe release — Release a file reservation
 *
 * Marks reservation as released and removes from active list.
 */

const config = require('../config');
const reservations = require('../store/reservations');
const { requireInit, success, error } = require('./_shared');

const definition = {
  name: 'vibe_release',
  description: 'Release a file reservation when you\'re done.',
  inputSchema: {
    type: 'object',
    properties: {
      reservation_id: {
        type: 'string',
        description: 'The reservation ID to release (e.g., "rsv-9f3a")'
      }
    },
    required: ['reservation_id']
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const handle = config.getHandle();
  const { reservation_id } = args;

  if (!reservation_id) {
    return {
      display: `## Release Reservation

Release files when you're done working on them.

**Usage:**
\`\`\`
vibe release rsv-9f3a
\`\`\`

**Find your reservation IDs:**
\`\`\`
vibe reservations
\`\`\`
`
    };
  }

  // Release the reservation
  const result = reservations.release(reservation_id, handle);

  if (!result.success) {
    if (result.error === 'not_found') {
      return {
        display: error(`Reservation \`${reservation_id}\` not found or already expired.\n\nUse \`vibe reservations\` to see your active reservations.`)
      };
    }
    if (result.error === 'not_owner') {
      return {
        display: error(`You can only release your own reservations.`)
      };
    }
    return {
      display: error(result.message || 'Failed to release reservation')
    };
  }

  const r = result.reservation;
  let display = success(`Released reservation \`${reservation_id}\``);
  display += `\n\n`;
  display += `**Files:** ${r.paths.map(p => `\`${p}\``).join(', ')}\n`;
  if (r.reason) {
    display += `**Was for:** ${r.reason}\n`;
  }
  display += `\n_Files are now available for others._`;

  return { display };
}

module.exports = { definition, handler };
