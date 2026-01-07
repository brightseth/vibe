/**
 * vibe settings — Configure /vibe preferences
 *
 * Currently supports:
 * - notifications: all | mentions | off
 * - guided: on | off (dashboard mode)
 */

const config = require('../config');

const definition = {
  name: 'vibe_settings',
  description: 'Configure /vibe preferences. Set notification level or toggle guided mode.',
  inputSchema: {
    type: 'object',
    properties: {
      notifications: {
        type: 'string',
        enum: ['all', 'mentions', 'off'],
        description: 'Notification level: all (default), mentions only, or off'
      },
      guided: {
        type: 'boolean',
        description: 'Enable/disable guided dashboard mode'
      }
    }
  }
};

async function handler(args) {
  const changes = [];

  // Update notifications if provided
  if (args.notifications) {
    config.setNotifications(args.notifications);
    changes.push('notifications → **' + args.notifications + '**');
  }

  // Update guided mode if provided
  if (args.guided !== undefined) {
    config.setGuidedMode(args.guided);
    changes.push('guided mode → **' + (args.guided ? 'on' : 'off') + '**');
  }

  // If no args, show current settings
  if (changes.length === 0) {
    const notifications = config.getNotifications();
    const guided = config.getGuidedMode();

    const notifyDesc = {
      all: 'All notifications (messages, mentions, presence)',
      mentions: 'Only @mentions',
      off: 'No notifications'
    };

    return {
      display: '## /vibe Settings\n\n' +
        '**Notifications:** ' + notifications + '\n' +
        '_' + notifyDesc[notifications] + '_\n\n' +
        '**Guided Mode:** ' + (guided ? 'on' : 'off') + '\n' +
        '_' + (guided ? 'Shows dashboard menus' : 'Freeform mode') + '_\n\n' +
        '---\n\n' +
        '**Change settings:**\n' +
        '• "set notifications to mentions" — less noisy\n' +
        '• "set notifications off" — silent mode\n' +
        '• "turn off guided mode" — no menus'
    };
  }

  return {
    display: '## Settings Updated\n\n' +
      changes.map(function(c) { return '✓ ' + c; }).join('\n') +
      '\n\n_Changes take effect immediately._'
  };
}

module.exports = { definition, handler };
