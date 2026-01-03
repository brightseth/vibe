/**
 * vibe invite — Generate a shareable invite
 *
 * Creates a personalized invite message for sharing with friends.
 */

const config = require('../config');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_invite',
  description: 'Generate a shareable invite link and message for /vibe.',
  inputSchema: {
    type: 'object',
    properties: {
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

  const { name, format } = args;
  const myHandle = config.getHandle();

  const url = 'slashvibe.dev';

  // Just the link
  if (format === 'link') {
    return {
      display: `**${url}**

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
> ${url}

_Copy the above and send it._`
    };
  }

  // Full personalized message (default)
  const greeting = name ? `Hey ${name}!` : 'Hey!';
  const fromLine = myHandle ? ` — @${myHandle}` : '';

  return {
    display: `## Invite to /vibe

---

${greeting}

I've been using this thing called /vibe in Claude Code — it's a social layer that lets you see who else is building and message people without leaving your terminal.

No app to install really, you just tell Claude:

  "go to slashvibe.dev and install /vibe"

Then say "let's vibe" to start.

${name ? `Hit me up once you're on — I'm @${myHandle}` : `I'm @${myHandle} if you want to ping me.`}${fromLine}

---

**Shareable link**: ${url}

_Copy and send to a friend who uses Claude Code._`
  };
}

module.exports = { definition, handler };
