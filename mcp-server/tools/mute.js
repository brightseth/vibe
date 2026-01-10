/**
 * vibe_mute - Mute presence alerts temporarily
 *
 * Allows users to pause background agent alerts during focus time
 * without stopping the monitoring entirely.
 */

const config = require('../config');

const definition = {
  name: 'vibe_mute',
  description: 'Mute presence alerts temporarily (1h, 2h, 4h, or forever)',
  inputSchema: {
    type: 'object',
    properties: {
      duration: {
        type: 'string',
        description: 'Duration: "1h", "2h", "4h", "forever", or "off" to unmute'
      }
    }
  }
};

async function handler(args) {
  const duration = args.duration || '1h';

  // UNMUTE
  if (duration === 'off' || duration === 'unmute') {
    config.set('mutedUntil', null);
    config.set('focusMode', false);

    return {
      display: `## 🔔 Presence Alerts Unmuted

You'll receive alerts again when high-priority events happen.`,
      success: true
    };
  }

  // MUTE FOREVER
  if (duration === 'forever' || duration === 'disable') {
    config.set('presenceAgentEnabled', false);
    config.set('mutedUntil', null);

    return {
      display: `## 🔇 Presence Alerts Disabled

Background monitor will stop sending alerts.

**Re-enable with:** \`unmute vibe\` or \`vibe_mute off\`

**Or stop monitoring entirely:** \`stop presence monitor\``,
      success: true
    };
  }

  // PARSE DURATION
  let ms = 0;
  const match = duration.match(/^(\d+)(h|m|min|hour|hours|minutes)$/);

  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2];

    if (unit === 'h' || unit === 'hour' || unit === 'hours') {
      ms = amount * 60 * 60 * 1000;
    } else if (unit === 'm' || unit === 'min' || unit === 'minutes') {
      ms = amount * 60 * 1000;
    }
  } else {
    // Default to 1 hour if can't parse
    ms = 60 * 60 * 1000;
  }

  // Set mute expiration
  const mutedUntil = Date.now() + ms;
  config.set('mutedUntil', mutedUntil);

  const until = new Date(mutedUntil).toLocaleTimeString();
  const durationText = ms >= 3600000
    ? `${Math.floor(ms / 3600000)} hour${Math.floor(ms / 3600000) > 1 ? 's' : ''}`
    : `${Math.floor(ms / 60000)} minutes`;

  return {
    display: `## 🔇 Presence Alerts Muted

No alerts until **${until}** (${durationText} from now).

Background monitor will keep tracking, but won't interrupt you.

**Unmute with:** \`unmute vibe\` or \`vibe_mute off\``,
    success: true,
    mutedUntil
  };
}

module.exports = { definition, handler };
