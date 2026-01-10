/**
 * vibe init — Set your identity
 *
 * AIRC v0.1 compliant: Generates Ed25519 keypair for message signing
 */

const config = require('../config');
const store = require('../store');
const crypto = require('../crypto');
const discord = require('../discord');

const definition = {
  name: 'vibe_init',
  description: 'Set your identity for /vibe. Required before messaging.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Your handle (lowercase, no @)'
      },
      one_liner: {
        type: 'string',
        description: 'What are you building? (one line)'
      }
    },
    required: ['handle', 'one_liner']
  }
};

async function handler(args) {
  const { handle, one_liner } = args;

  // Normalize handle
  const h = handle.toLowerCase().replace('@', '').replace(/[^a-z0-9_-]/g, '');

  if (!h || h.length < 2) {
    return {
      display: 'Handle must be at least 2 characters (letters, numbers, - or _)'
    };
  }

  // Hint about X handles for short/common names
  let xHandleHint = '';
  const commonShortNames = ['dave', 'dan', 'john', 'mike', 'chris', 'alex', 'sam', 'ben', 'tom', 'matt', 'nick', 'joe', 'max', 'ian', 'rob', 'bob', 'jim', 'tim', 'pat', 'ed'];
  if (h.length <= 5 && commonShortNames.includes(h)) {
    xHandleHint = `\n\n💡 _Tip: Use your X handle (e.g., @${h}smith) so people can find you._`;
  }

  // AIRC: Generate Ed25519 keypair if not already present
  let keypair = config.getKeypair();
  let keypairNote = '';
  if (!keypair) {
    keypair = crypto.generateKeypair();
    // Save keypair to shared config (persists across MCP invocations)
    config.saveKeypair(keypair);
    keypairNote = '\n🔐 _AIRC keypair generated for message signing_';
  }

  // Save identity to SESSION file (per-process isolation)
  config.setSessionIdentity(h, one_liner || '', keypair);

  // Also update shared config for backward compat
  const cfg = config.load();
  cfg.handle = h;
  cfg.one_liner = one_liner || '';
  cfg.visible = true;
  config.save(cfg);

  // Get session ID for this Claude Code process
  const sessionId = config.getSessionId();

  // Register session with API (maps sessionId → handle)
  // Also registers user in users DB for @vibe welcome tracking
  // AIRC: Include public key for identity verification
  const registration = await store.registerSession(sessionId, h, one_liner, keypair.publicKey);
  if (!registration.success) {
    return {
      display: `## Identity Set (Local Only)

**@${h}**
_${one_liner}_

⚠️ Session registration failed: ${registration.error}
Local config saved. Heartbeats will use username fallback.`
    };
  }

  // Send initial heartbeat
  await store.heartbeat(h, one_liner);

  // Post to Discord if configured
  discord.postJoin(h, one_liner);

  // Check for unread messages
  let unreadNotice = '';
  try {
    const unreadCount = await store.getUnreadCount(h);
    if (unreadCount > 0) {
      unreadNotice = `\n\n📬 **NEW MESSAGE — ${unreadCount} UNREAD** — say "check my messages"`;
    }
  } catch (e) {}

  return {
    display: `## Welcome to /vibe!

**@${h}** — [x.com/${h}](https://x.com/${h})
_${one_liner}_${unreadNotice}${xHandleHint}${keypairNote}

**What to do now:**
1. Say "who's around?" to see active builders
2. Say "message @sethgoldstein hello!" to connect
3. Say "I'm shipping" to set your status

**Reduce permission prompts** (recommended):
\`/permission allow mcp__vibe__*\`

This enables smart auto-approval for safe commands (inbox, pings to friends, etc.).
Sensitive operations (DMs to new contacts, social posts) still require approval.

_@vibe will DM you shortly with tips._`
  };
}

module.exports = { definition, handler };
