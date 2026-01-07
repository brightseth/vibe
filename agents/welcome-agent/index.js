/**
 * @welcome-agent — First Impressions for /vibe
 *
 * Greets new users, guides first steps, makes people feel at home.
 * The difference between "tried it once" and "came back".
 *
 * Uses Claude Agent SDK for reasoning + /vibe for coordination.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const HANDLE = 'welcome-agent';
const ONE_LINER = 'making newcomers feel at home 👋';
const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const MEMORY_FILE = path.join(__dirname, 'memory.json');

const anthropic = new Anthropic();

// ============ MEMORY ============

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[welcome-agent] Error loading memory:', e.message);
  }
  return {
    welcomedUsers: [],      // handles we've already welcomed
    userFirstSeen: {},      // handle -> timestamp
    onboardingTips: [],     // tips we've shared
    lastRun: null
  };
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// ============ VIBE API ============

function vibeRequest(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'welcome-agent/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function heartbeat() {
  return vibeRequest('POST', '/api/presence/heartbeat', {
    handle: HANDLE,
    one_liner: ONE_LINER
  });
}

async function getWho() {
  return vibeRequest('GET', '/api/presence/who');
}

async function sendDM(to, body) {
  console.log(`[welcome-agent] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', {
    from: HANDLE,
    to,
    body,
    type: 'dm'
  });
}

async function getInbox() {
  return vibeRequest('GET', `/api/messages/inbox?handle=${HANDLE}`);
}

async function getBoard() {
  return vibeRequest('GET', '/api/board?limit=20');
}

// ============ TOOLS ============

const VIBE_REPO = '/Users/seth/vibe-public';

const TOOLS = [
  {
    name: 'check_inbox',
    description: 'Check for messages and assignments from @ops-agent (CHECK FIRST!)',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_backlog',
    description: 'Check shared backlog for unassigned tasks in your domain',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'observe_vibe',
    description: 'See who is online - look for new users to welcome',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'read_board',
    description: 'Read board to understand community activity',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_welcomed_users',
    description: 'Get list of users we have already welcomed',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'welcome_user',
    description: 'Send a personalized welcome message to a new user',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'User to welcome' },
        message: { type: 'string', description: 'Personalized welcome message' }
      },
      required: ['handle', 'message']
    }
  },
  {
    name: 'send_tip',
    description: 'Send a helpful tip to a user',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'User to help' },
        tip: { type: 'string', description: 'Helpful tip or suggestion' }
      },
      required: ['handle', 'tip']
    }
  },
  {
    name: 'reply_to_user',
    description: 'Reply to a user message',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['handle', 'message']
    }
  },
  {
    name: 'done',
    description: 'Signal work complete',
    input_schema: {
      type: 'object',
      properties: { summary: { type: 'string' } },
      required: ['summary']
    }
  }
];

// ============ TOOL HANDLERS ============

let memory = loadMemory();

async function handleTool(name, input) {
  switch (name) {
    case 'observe_vibe': {
      const who = await getWho();
      const users = (who.users || []).filter(u => !u.handle.includes('-agent'));

      // Track first seen timestamps
      const now = Date.now();
      for (const user of users) {
        if (!memory.userFirstSeen[user.handle]) {
          memory.userFirstSeen[user.handle] = now;
        }
      }
      saveMemory(memory);

      if (users.length === 0) return 'No humans online';

      return users.map(u => {
        const firstSeen = memory.userFirstSeen[u.handle];
        const isNew = firstSeen && (now - firstSeen) < 7 * 24 * 60 * 60 * 1000; // < 7 days
        const welcomed = memory.welcomedUsers.includes(u.handle);
        return `@${u.handle}: "${u.one_liner || 'no bio'}" ${isNew ? '🆕 NEW' : ''} ${welcomed ? '✓ welcomed' : '⚠️ NOT WELCOMED'}`;
      }).join('\n');
    }

    case 'check_inbox': {
      const inbox = await getInbox();
      const threads = inbox.threads || [];
      if (threads.length === 0) return 'Inbox empty — check backlog for unassigned tasks or look for newcomers';
      return threads.map(t => `@${t.handle}: ${t.unread} unread - "${t.lastMessage?.substring(0, 50) || 'no preview'}"`).join('\n');
    }

    case 'check_backlog': {
      const backlogPath = path.join(VIBE_REPO, 'agents/.backlog.json');
      if (!fs.existsSync(backlogPath)) return 'No backlog file found';
      const backlog = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
      const myTasks = backlog.filter(t =>
        t.status === 'pending' &&
        (t.assignee === HANDLE || t.assignee === 'unassigned' || !t.assignee) &&
        (t.domain === 'welcome' || t.domain === 'onboarding' || t.tags?.includes('welcome'))
      );
      if (myTasks.length === 0) return 'No pending tasks in backlog for welcome domain';
      return myTasks.map(t => `[${t.id}] ${t.title} (${t.priority || 'normal'})`).join('\n');
    }

    case 'read_board': {
      const board = await getBoard();
      const entries = board.entries || [];
      if (entries.length === 0) return 'Board empty';
      return entries.slice(0, 10).map(e => `@${e.handle}: ${e.content}`).join('\n');
    }

    case 'get_welcomed_users': {
      if (memory.welcomedUsers.length === 0) return 'No users welcomed yet';
      return `Welcomed ${memory.welcomedUsers.length} users: ${memory.welcomedUsers.join(', ')}`;
    }

    case 'welcome_user': {
      if (memory.welcomedUsers.includes(input.handle)) {
        return `Already welcomed @${input.handle}`;
      }

      await sendDM(input.handle, input.message);
      memory.welcomedUsers.push(input.handle);
      saveMemory(memory);
      return `Welcomed @${input.handle}!`;
    }

    case 'send_tip': {
      await sendDM(input.handle, input.tip);
      memory.onboardingTips.push({ handle: input.handle, tip: input.tip, timestamp: Date.now() });
      saveMemory(memory);
      return `Sent tip to @${input.handle}`;
    }

    case 'reply_to_user': {
      await sendDM(input.handle, input.message);
      return `Replied to @${input.handle}`;
    }

    case 'done': {
      memory.lastRun = new Date().toISOString();
      saveMemory(memory);
      return `DONE: ${input.summary}`;
    }

    default:
      return `Unknown: ${name}`;
  }
}

// ============ AGENT LOOP ============

const SYSTEM_PROMPT = `You are @welcome-agent, The Host of /vibe workshop.

## Your Role
Make every newcomer feel at home. First impressions determine whether someone becomes a regular or never returns.

## Personality
Warm, makes people feel seen. High empathy (like Slack's "tilting your umbrella" culture). You notice the small things that matter.

## Team Values (from early social team research)
- EMPATHY AS FOUNDATION: See the world through newcomers' eyes
- RESILIENCE THROUGH VISIBILITY: Greetings happen in the open, building culture
- CULTURAL TRANSMISSION: You teach the vibe by embodying it
- SMALL TEAMS, BIG TRUST: You own the first impression

## CRITICAL: Check for Assignments First!
@ops-agent is the workshop coordinator. They may DM you with specific tasks.
**Always check your inbox first** — if @ops-agent assigned you work, prioritize that.

## If Inbox Empty (Fallback)
1. **check_backlog** — look for unassigned tasks tagged 'welcome' or 'onboarding'
2. **observe_vibe** — look for new users to welcome
3. **If truly nothing** — call done() with "No assignments, no newcomers, backlog empty"

## Your Workflow
1. **Check inbox for assignments** from @ops-agent (PRIORITY!)
2. Observe who's online
3. Identify NEW users (not yet welcomed)
4. Send personalized, warm welcome messages
5. Answer questions from newcomers
6. Share helpful tips about /vibe
7. **Call done() with summary** — don't spin indefinitely

## Welcome Message Guidelines
- Be warm but not overwhelming
- Reference their bio/what they're building if available
- Suggest ONE thing to try (e.g., "try 'vibe who' to see who's around")
- Keep it short (2-3 sentences max)
- Don't be corporate or robotic

## Example Welcome Messages
- "Hey @alice! Welcome to /vibe 👋 Saw you're building something with AI - you'll find good company here. Try 'vibe who' to see who's around!"
- "Welcome @bob! Great to have you. If you ship something cool, post it to the board with 'vibe board' - we love celebrating wins here 🎉"

## Tips to Share
- "vibe who" - see who's online
- "vibe board" - see what people are shipping
- "vibe dm @handle" - message someone directly
- "vibe status shipping" - show you're in flow
- "vibe game @handle" - play tic-tac-toe

## Failure Protocol
If no new users to welcome:
1. Check if there are any unanswered questions in inbox
2. Look for opportunities to help existing users
3. If nothing to do, call done() — don't spin indefinitely
It's okay to have quiet cycles. That's not failure.

## Remember
- Only welcome each user ONCE (check get_welcomed_users)
- Don't spam - if someone doesn't reply, that's okay
- Be genuine, not salesy
- You're a friendly neighbor, not a customer support bot
- Call done() when your cycle is complete`;

async function runAgent() {
  console.log('\n[welcome-agent] === Starting work cycle ===');
  await heartbeat();
  console.log('[welcome-agent] Online');

  memory = loadMemory();

  const messages = [{
    role: 'user',
    content: `Work cycle starting.

## FIRST: Check for assignments
Check your inbox for messages from @ops-agent. If they assigned you a task, prioritize that.

## Context
Users welcomed so far: ${memory.welcomedUsers.length}
Last run: ${memory.lastRun || 'First run'}

## Workflow
1. check_inbox — look for @ops-agent assignments (PRIORITY!)
2. IF INBOX EMPTY: check_backlog — look for unassigned 'welcome' tasks
3. observe_vibe — who's online? look for new users
4. Welcome any newcomers (personalized messages)
5. Respond to any inbox messages
6. Call done() with what you accomplished

## If Nothing To Do
- Propose a welcome improvement for next cycle
- Call done() — don't spin for 15 iterations`
  }];

  let done = false;
  let iterations = 0;

  while (!done && iterations < 15) {
    iterations++;
    console.log(`[welcome-agent] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(c => c.type === 'text')?.text;
      if (text) console.log(`[welcome-agent] ${text}`);
      done = true;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[welcome-agent] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[welcome-agent] Result: ${result.substring(0, 100)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (block.name === 'done') done = true;
        }
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[welcome-agent] Work cycle complete\n');
}

async function main() {
  const mode = process.argv[2] || 'once';
  if (mode === 'daemon') {
    console.log('[welcome-agent] Daemon mode (every 10 min)');
    await runAgent();
    setInterval(runAgent, 10 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[welcome-agent] Fatal:', e);
  process.exit(1);
});
