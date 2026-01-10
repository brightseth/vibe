/**
 * vibe_presence_agent - Start/stop/status background presence monitor
 *
 * THE killer feature - transforms /vibe from pull-based to ambient.
 * Background agent monitors presence/inbox, only interrupts when relevant.
 */

const config = require('../config');

const definition = {
  name: 'vibe_presence_agent',
  description: 'Start/stop background presence monitor for ambient awareness',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['start', 'stop', 'status'],
        description: 'Action to take'
      }
    }
  }
};

async function handler(args) {
  const action = args.action || 'status';

  // STATUS - Check if monitor is running
  if (action === 'status') {
    const running = config.get('presenceAgentRunning');
    const mutedUntil = config.get('mutedUntil');
    const focusMode = config.get('focusMode');

    const isMuted = mutedUntil && Date.now() < mutedUntil;

    let status = running ? '🟢 Running' : '⚪ Stopped';
    if (running && isMuted) {
      status += ` (muted until ${new Date(mutedUntil).toLocaleTimeString()})`;
    }
    if (running && focusMode) {
      status += ' (focus mode - no alerts)';
    }

    return {
      display: `## Presence Monitor Status

${status}

**What it does:**
- Monitors who comes online (every 30s)
- Checks for new messages (every 60s)
- Only alerts for high-priority events
- Uses haiku-4 (fast, cheap, ~$0.01/hour)

${running ? '**Commands:**\n- `mute vibe for 1 hour` - Pause alerts\n- `stop presence monitor` - Turn off' : '**Start with:** `start presence monitor`'}`,
      running,
      muted: isMuted
    };
  }

  // START - Launch background agent
  if (action === 'start') {
    const handle = config.getHandle();

    if (!handle) {
      return {
        display: '⚠️ Run `vibe init` first to set your identity.',
        success: false
      };
    }

    // Check if already running
    if (config.get('presenceAgentRunning')) {
      return {
        display: '🟢 Presence monitor is already running.\n\nSay `presence status` to check details.',
        success: true
      };
    }

    // Mark as running
    config.set('presenceAgentRunning', true);
    config.set('presenceAgentStartedAt', Date.now());

    return {
      display: `## 🟢 Presence Monitor Started

Now watching your /vibe network in the background.

**What happens now:**
- I'll monitor who comes online
- I'll check for new messages
- I'll only interrupt for high-priority events:
  - Direct mentions
  - Messages from friends
  - Recent contacts coming online

**Resource usage:**
- Checks presence every 30s
- Checks inbox every 60s
- Uses haiku-4 (~$0.01/hour)
- <1% CPU, <50MB memory

**Commands:**
- \`mute vibe for 1 hour\` - Pause alerts
- \`stop presence monitor\` - Turn off
- \`presence status\` - Check status

You can keep working - I'll alert you when something important happens.`,
      success: true,
      hint: 'presence_monitor_started'
    };
  }

  // STOP - Terminate background agent
  if (action === 'stop') {
    const wasRunning = config.get('presenceAgentRunning');

    if (!wasRunning) {
      return {
        display: '⚪ Presence monitor is already stopped.',
        success: true
      };
    }

    // Calculate session duration
    const startedAt = config.get('presenceAgentStartedAt');
    let durationText = '';
    if (startedAt) {
      const durationMs = Date.now() - startedAt;
      const durationMin = Math.floor(durationMs / 60000);
      const durationHr = Math.floor(durationMin / 60);

      if (durationHr > 0) {
        durationText = `\n\nRan for ${durationHr}h ${durationMin % 60}m`;
      } else {
        durationText = `\n\nRan for ${durationMin}m`;
      }
    }

    // Mark as stopped
    config.set('presenceAgentRunning', false);
    config.set('presenceAgentStartedAt', null);

    return {
      display: `## ⚪ Presence Monitor Stopped${durationText}

You'll need to manually check /vibe now.

**Restart with:** \`start presence monitor\``,
      success: true
    };
  }

  return {
    display: 'Unknown action. Use: start, stop, or status',
    success: false
  };
}

module.exports = { definition, handler };
