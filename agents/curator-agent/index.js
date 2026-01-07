/**
 * @curator-agent — Content Discovery for /vibe
 *
 * Surfaces interesting ships, creates digests, spotlights great work.
 * Creates FOMO, rewards shipping, builds culture.
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
const HANDLE = 'curator-agent';
const ONE_LINER = 'spotlighting great work & building culture ✨';
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
    console.error('[curator-agent] Error loading memory:', e.message);
  }
  return {
    featuredShips: [],        // ships we've highlighted
    digestsSent: [],          // daily/weekly digests
    spotlightedUsers: [],     // users we've celebrated
    seenBoardEntries: [],     // board entry IDs we've processed
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
        'User-Agent': 'curator-agent/1.0'
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
  console.log(`[curator-agent] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', {
    from: HANDLE,
    to,
    body,
    type: 'dm'
  });
}

async function postToBoard(content, category = 'general') {
  return vibeRequest('POST', '/api/board', {
    handle: HANDLE,
    content,
    category
  });
}

async function getInbox() {
  return vibeRequest('GET', `/api/messages/inbox?handle=${HANDLE}`);
}

async function getBoard() {
  return vibeRequest('GET', '/api/board?limit=50');
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
    description: 'See who is online',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'read_board',
    description: 'Read board to find interesting ships to highlight',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_featured',
    description: 'Get list of ships we have already featured',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'feature_ship',
    description: 'Highlight an interesting ship by DMing the creator and posting to board',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'Creator to celebrate' },
        ship: { type: 'string', description: 'What they shipped' },
        why: { type: 'string', description: 'Why this is noteworthy' }
      },
      required: ['handle', 'ship', 'why']
    }
  },
  {
    name: 'post_digest',
    description: 'Post a digest of recent activity to the board',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Digest title' },
        content: { type: 'string', description: 'Digest content highlighting recent ships' }
      },
      required: ['title', 'content']
    }
  },
  {
    name: 'spotlight_user',
    description: 'Send a congratulatory DM to recognize great work',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        message: { type: 'string', description: 'Recognition message' }
      },
      required: ['handle', 'message']
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
      const users = who.users || [];
      if (users.length === 0) return 'No one online';
      return users.map(u => `@${u.handle}: "${u.one_liner || 'no bio'}"`).join('\n');
    }

    case 'check_inbox': {
      const inbox = await getInbox();
      const threads = inbox.threads || [];
      if (threads.length === 0) return 'Inbox empty — check backlog for unassigned tasks or read board for ships to curate';
      return threads.map(t => `@${t.handle}: ${t.unread} unread`).join('\n');
    }

    case 'check_backlog': {
      const backlogPath = path.join(VIBE_REPO, 'agents/.backlog.json');
      if (!fs.existsSync(backlogPath)) return 'No backlog file found';
      const data = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
      const assignments = data.assignments || [];
      const myTasks = assignments.filter(t =>
        t.status === 'assigned' && t.agent === HANDLE
      );
      if (myTasks.length === 0) return 'No pending tasks assigned to curator-agent';
      return myTasks.map(t => `[${t.priority}] ${t.task.substring(0, 100)}...`).join('\n');
    }

    case 'read_board': {
      const board = await getBoard();
      const entries = board.entries || [];
      if (entries.length === 0) return 'Board empty - no ships to curate yet';

      // Mark entries as seen
      const newEntries = entries.filter(e => !memory.seenBoardEntries.includes(e.id));

      return entries.map(e => {
        const isNew = !memory.seenBoardEntries.includes(e.id);
        const isFeatured = memory.featuredShips.some(f => f.handle === e.handle && f.ship.includes(e.content.substring(0, 30)));
        return `${isNew ? '🆕 ' : ''}${isFeatured ? '⭐ FEATURED ' : ''}@${e.handle} [${e.category}]: ${e.content}`;
      }).join('\n');
    }

    case 'get_featured': {
      if (memory.featuredShips.length === 0) return 'No ships featured yet';
      return memory.featuredShips.map(f => `@${f.handle}: ${f.ship} - "${f.why}"`).join('\n');
    }

    case 'feature_ship': {
      // Check if already featured
      const alreadyFeatured = memory.featuredShips.some(
        f => f.handle === input.handle && f.ship === input.ship
      );
      if (alreadyFeatured) {
        return `Already featured this ship from @${input.handle}`;
      }

      // DM the creator
      await sendDM(input.handle, `✨ Your ship caught my eye! "${input.ship}" - ${input.why}. Keep building! 🚀`);

      // Post to board
      await postToBoard(`✨ Spotlight: @${input.handle} shipped "${input.ship}" — ${input.why}`, 'shipped');

      // Record in memory
      memory.featuredShips.push({
        handle: input.handle,
        ship: input.ship,
        why: input.why,
        timestamp: Date.now()
      });
      saveMemory(memory);

      return `Featured @${input.handle}'s ship!`;
    }

    case 'post_digest': {
      await postToBoard(`📋 ${input.title}\n\n${input.content}`, 'general');

      memory.digestsSent.push({
        title: input.title,
        timestamp: Date.now()
      });
      saveMemory(memory);

      return `Posted digest: ${input.title}`;
    }

    case 'spotlight_user': {
      await sendDM(input.handle, input.message);

      memory.spotlightedUsers.push({
        handle: input.handle,
        timestamp: Date.now()
      });
      saveMemory(memory);

      return `Spotlighted @${input.handle}`;
    }

    case 'reply_to_user': {
      await sendDM(input.handle, input.message);
      return `Replied to @${input.handle}`;
    }

    case 'done': {
      // Mark all current board entries as seen
      const board = await getBoard();
      const entries = board.entries || [];
      memory.seenBoardEntries = entries.map(e => e.id).slice(0, 100); // Keep last 100
      memory.lastRun = new Date().toISOString();
      saveMemory(memory);
      return `DONE: ${input.summary}`;
    }

    default:
      return `Unknown: ${name}`;
  }
}

// ============ AGENT LOOP ============

const SYSTEM_PROMPT = `You are @curator-agent, The Storyteller of /vibe workshop.

## Your Role
Surface great work, create FOMO, reward shipping, build culture. You find meaning in what others build and share it widely.

## Personality
Finds patterns and narratives. Celebrates others' work. Creates the cultural record of what's happening.

## Team Values (from early social team research)
- RESILIENCE THROUGH VISIBILITY: Celebrate ships publicly — this creates positive pressure
- CULTURAL TRANSMISSION: Your digests teach what "good" looks like here
- EMERGENT PRODUCT: The culture emerges from what gets celebrated
- BLAMELESS FAILURE: Spotlight effort, not just success

## CRITICAL: Check for Assignments First!
@ops-agent is the workshop coordinator. They may DM you with specific tasks.
**Always check your inbox first** — if @ops-agent assigned you work, prioritize that.

## If Inbox Empty (Fallback)
1. **check_backlog** — look for unassigned tasks tagged 'curator' or 'content'
2. **read_board** — look for ships to curate
3. **If truly nothing** — call done() with "No assignments, board quiet, backlog empty"

## Your Workflow
1. **Check inbox for assignments** from @ops-agent (PRIORITY!)
2. Read the board for interesting ships
3. Feature standout work (DM creator + post spotlight)
4. Create occasional digests of activity
5. Recognize consistent shippers
6. **Call done() with summary** — don't spin indefinitely

## Curation Guidelines
- Look for ships that are: creative, useful, ambitious, or just fun
- Prioritize FIRST ships from users (celebrate beginnings)
- Feature diverse work (not just the same person)
- Be genuine in your praise - specific beats generic
- Also celebrate EFFORT and LEARNING, not just polished ships

## Spotlight Format
"✨ Spotlight: @handle shipped 'X' — [specific reason it's cool]"

## Digest Format (weekly)
"📋 This Week on /vibe
- @alice shipped a chess game 🎮
- @bob built a Telegram bridge 🌉
- @carol hit a 7-day streak 🔥
Keep shipping!"

## Workshop Report (when assigned by @ops-agent)
If asked to write a "State of /vibe" report:
- Who's active and what they're building
- What shipped recently
- What's in progress
- What's coming next
- Keep it engaging and informative

## Recognition Tone
- Enthusiastic but not over-the-top
- Specific about what impressed you
- Encouraging for continued work

## Failure Protocol
If nothing to curate:
1. Look for any activity worth noting (even small wins)
2. Consider writing a "quiet day" post that sets expectations
3. If nothing, call done() — don't spin indefinitely

## Don't
- Feature the same person twice in a row
- Post too many digests (max 1 per day)
- Be sycophantic - genuine recognition only
- Spam the board with too many spotlights
- Spin for 20 iterations reading the same empty board`;

async function runAgent() {
  console.log('\n[curator-agent] === Starting work cycle ===');
  await heartbeat();
  console.log('[curator-agent] Online');

  memory = loadMemory();

  const lastDigest = memory.digestsSent[memory.digestsSent.length - 1];
  const hoursSinceDigest = lastDigest
    ? (Date.now() - lastDigest.timestamp) / (1000 * 60 * 60)
    : 999;

  const messages = [{
    role: 'user',
    content: `Work cycle starting.

## FIRST: Check for assignments
Check your inbox for messages from @ops-agent. If they assigned you a task, prioritize that.

## Context
Ships featured so far: ${memory.featuredShips.length}
Hours since last digest: ${Math.floor(hoursSinceDigest)}
Last run: ${memory.lastRun || 'First run'}

## Workflow
1. check_inbox — look for @ops-agent assignments (PRIORITY!)
2. IF INBOX EMPTY: check_backlog — look for unassigned 'curator' tasks
3. read_board — find interesting ships to curate
4. Feature standout work or write digest
5. Announce what you did
6. Call done() with what you accomplished

## If Nothing To Do
- Propose a curation idea for next cycle
- Call done() — don't spin for 15 iterations`
  }];

  let done = false;
  let iterations = 0;

  while (!done && iterations < 15) {
    iterations++;
    console.log(`[curator-agent] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(c => c.type === 'text')?.text;
      if (text) console.log(`[curator-agent] ${text}`);
      done = true;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[curator-agent] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[curator-agent] Result: ${result.substring(0, 100)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (block.name === 'done') done = true;
        }
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[curator-agent] Work cycle complete\n');
}

async function main() {
  const mode = process.argv[2] || 'once';
  if (mode === 'daemon') {
    console.log('[curator-agent] Daemon mode (every 30 min)');
    await runAgent();
    setInterval(runAgent, 30 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[curator-agent] Fatal:', e);
  process.exit(1);
});
