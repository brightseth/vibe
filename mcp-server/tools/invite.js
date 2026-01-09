/**
 * vibe invite — Generate invite codes and shareable messages
 *
 * Actions:
 * - generate: Create a new invite code
 * - list: See your existing codes
 * - (default): Generate a shareable message with your code
 */

const config = require('../config');
const store = require('../store');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_invite',
  description: 'Generate a shareable invite link and message for /vibe.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action: "generate" to create code, "list" to see your codes, or omit for shareable message'
      },
      name: {
        type: 'string',
        description: 'Optional: Friend\'s name for personalized message'
      },
      format: {
        type: 'string',
        description: 'Format: "link" (just URL), "short" (one liner), "full" (with context)'
      }
    }
  }
};

const INVITE_MESSAGES = [
  "Join the /vibe — it's like Slack but in your Claude Code terminal",
  "Try /vibe in Claude Code — message people without leaving your flow",
  "Come hang out on /vibe — the social layer for Claude Code users",
  "There's a thing called /vibe for Claude Code — we can message while coding"
];

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action, name, format } = args;
  const myHandle = config.getHandle();

  // Generate a new invite code
  if (action === 'generate') {
    const result = await store.generateInviteCode(myHandle);

    if (!result.success) {
      return {
        display: `## Could not generate invite code

${result.error || result.message || 'Unknown error'}

${result.remaining === 0 ? 'Share your existing codes first, or wait for them to be used.' : ''}`
      };
    }

    return {
      display: `## New Invite Code Generated

**${result.code}**

Share link: ${result.share_url}

Expires: ${result.expires_at}
Remaining codes: ${result.remaining}

_When your friend redeems this code, you'll earn a bonus code._`
    };
  }

  // List existing codes
  if (action === 'list') {
    const result = await store.getMyInvites(myHandle);

    if (!result.success) {
      return {
        display: `## Could not fetch invites

${result.error || 'Unknown error'}`
      };
    }

    if (!result.codes || result.codes.length === 0) {
      return {
        display: `## Your Invite Codes

No codes yet. Run \`vibe invite --action generate\` to create one.

You can have up to ${result.max_codes} unused codes at a time.`
      };
    }

    const available = result.codes.filter(c => c.status === 'available');
    const used = result.codes.filter(c => c.status === 'used');

    let display = `## Your Invite Codes

**Available** (${available.length}/${result.max_codes})
`;

    if (available.length > 0) {
      for (const code of available) {
        display += `\n- **${code.code}** — ${code.share_url}`;
      }
    } else {
      display += '\n_No available codes. Generate one or wait for existing codes to be used._';
    }

    if (used.length > 0) {
      display += `\n\n**Used** (${used.length})`;
      for (const code of used) {
        display += `\n- ${code.code} → @${code.used_by} (${code.used_at?.split('T')[0] || 'unknown'})`;
      }
    }

    if (result.can_generate) {
      display += '\n\n_Run `vibe invite --action generate` to create a new code._';
    }

    return { display };
  }

  // Get an available code, or auto-generate one
  let shareCode = null;
  let justGenerated = false;

  const codesResult = await store.getMyInvites(myHandle);
  if (codesResult.success && codesResult.codes) {
    const available = codesResult.codes.find(c => c.status === 'available');
    if (available) {
      shareCode = available.code;
    }
  }

  // Auto-generate if no available code and user can generate
  if (!shareCode && codesResult.success && codesResult.can_generate) {
    const genResult = await store.generateInviteCode(myHandle);
    if (genResult.success) {
      shareCode = genResult.code;
      justGenerated = true;
    }
  }

  const shareUrl = shareCode
    ? `slashvibe.dev/invite/${shareCode}`
    : 'slashvibe.dev';

  // Just the link
  if (format === 'link') {
    return {
      display: `**${shareUrl}**

Copy and share this with anyone using Claude Code.`
    };
  }

  // Short one-liner
  if (format === 'short') {
    const randomMsg = INVITE_MESSAGES[Math.floor(Math.random() * INVITE_MESSAGES.length)];
    return {
      display: `## Quick Invite

> ${randomMsg}
>
> ${shareUrl}

_Copy the above and send it._`
    };
  }

  // Default: Quick copy-ready format
  // If name provided, make it personalized
  if (name) {
    return {
      display: `## Invite for ${name}

---

Hey ${name}!

I've been using /vibe in Claude Code — it's a social layer that lets you see who else is building and message people without leaving your terminal.

Just tell Claude: "go to slashvibe.dev and install /vibe"

Then say "let's vibe" to start. I'm @${myHandle} — ping me once you're on!

---

**${shareUrl}**

_Copy the link above and send it._`
    };
  }

  // No name: ultra-short copy-ready format
  const genNote = justGenerated ? ' (just generated)' : '';
  const randomMsg = INVITE_MESSAGES[Math.floor(Math.random() * INVITE_MESSAGES.length)];

  return {
    display: `## Quick Invite${genNote}

> ${randomMsg}
>
> **${shareUrl}**

_Copy and send. ${shareCode ? `Bonus code earned when they join.` : ''}_`
  };
}

module.exports = { definition, handler };
