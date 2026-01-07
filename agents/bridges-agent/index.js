/**
 * @bridges-agent — External Connection Weaver for /vibe
 *
 * Connects /vibe to the outside world: X, Telegram, Discord, Farcaster.
 * Routes messages between platforms, brings external conversations in.
 *
 * Uses Claude Agent SDK for reasoning + /vibe for coordination.
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const HANDLE = 'bridges-agent';
const ONE_LINER = 'weaving connections to the outside world';
const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const VIBE_REPO = '/Users/seth/vibe-public';
const MEMORY_FILE = path.join(__dirname, 'memory.json');

const anthropic = new Anthropic();

// ============ MEMORY ============

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[bridges-agent] Error loading memory:', e.message);
  }
  return {
    bridgesBuilt: [],
    platformsConnected: [],
    messagesRouted: 0,
    featuresShipped: [],
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
        'User-Agent': 'bridges-agent/1.0'
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
  console.log(`[bridges-agent] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', {
    from: HANDLE,
    to,
    body,
    type: 'dm'
  });
}

async function postToBoard(content, category = 'shipped') {
  return vibeRequest('POST', '/api/board', {
    handle: HANDLE,
    content,
    category
  });
}

async function getInbox() {
  return vibeRequest('GET', `/api/messages/inbox?handle=${HANDLE}`);
}

// ============ TOOLS ============

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
    description: 'See who is online and check for bridge-related requests',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'list_files',
    description: 'List files in a directory',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }
  },
  {
    name: 'read_file',
    description: 'Read a file from the /vibe codebase',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write or update a file',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'git_status',
    description: 'Check git status',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'git_commit',
    description: 'Stage and commit changes',
    input_schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message']
    }
  },
  {
    name: 'git_push',
    description: 'Push to origin',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'dm_user',
    description: 'Send a DM on /vibe',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['to', 'message']
    }
  },
  {
    name: 'announce_ship',
    description: 'Post to the board',
    input_schema: {
      type: 'object',
      properties: { what: { type: 'string' } },
      required: ['what']
    }
  },
  {
    name: 'done',
    description: 'Signal work cycle complete',
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
      return users.length === 0
        ? 'No humans online'
        : `Online: ${users.map(u => `@${u.handle} (${u.one_liner || 'building'})`).join(', ')}`;
    }

    case 'check_inbox': {
      const inbox = await getInbox();
      const threads = inbox.threads || [];
      if (threads.length === 0) return 'Inbox empty — check backlog for unassigned tasks or review bridge code';
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
      if (myTasks.length === 0) return 'No pending tasks assigned to bridges-agent';
      return myTasks.map(t => `[${t.priority}] ${t.task.substring(0, 100)}...`).join('\n');
    }

    case 'list_files': {
      const fullPath = path.join(VIBE_REPO, input.path);
      if (!fs.existsSync(fullPath)) return `Not found: ${input.path}`;
      return fs.readdirSync(fullPath).join('\n');
    }

    case 'read_file': {
      const fullPath = path.join(VIBE_REPO, input.path);
      if (!fs.existsSync(fullPath)) return `Not found: ${input.path}`;
      return fs.readFileSync(fullPath, 'utf8');
    }

    case 'write_file': {
      const fullPath = path.join(VIBE_REPO, input.path);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, input.content);
      return `Wrote ${input.path} (${input.content.length} bytes)`;
    }

    case 'git_status': {
      try {
        return execSync('git status --short', { cwd: VIBE_REPO }).toString() || 'Clean';
      } catch (e) {
        return `Error: ${e.message}`;
      }
    }

    case 'git_commit': {
      try {
        execSync('git add -A', { cwd: VIBE_REPO });
        execSync(`git commit -m "${input.message}\n\n🌉 Shipped by @bridges-agent"`, { cwd: VIBE_REPO });
        return `Committed: ${input.message}`;
      } catch (e) {
        return `Error: ${e.message}`;
      }
    }

    case 'git_push': {
      try {
        execSync('git push', { cwd: VIBE_REPO });
        return 'Pushed';
      } catch (e) {
        return `Error: ${e.message}`;
      }
    }

    case 'dm_user': {
      await sendDM(input.to, input.message);
      return `Sent to @${input.to}`;
    }

    case 'announce_ship': {
      await postToBoard(`🌉 ${input.what}`, 'shipped');
      return `Announced: ${input.what}`;
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

const SYSTEM_PROMPT = `You are @bridges-agent, The Ambassador of /vibe workshop.

## Your Role
Connect /vibe to the outside world. Create bridges so users can communicate with X, Telegram, Discord, Farcaster without leaving their terminal.

## Personality
Multi-lingual (platforms). Brings the outside world in. Makes external platforms feel like natural extensions of /vibe.

## Team Values (from early social team research)
- EXTREME OWNERSHIP: You own all external integrations
- VELOCITY > PERFECTION: A working webhook beats a perfect SDK
- EMERGENT PRODUCT: Let users tell you which bridges matter most
- RESILIENCE THROUGH VISIBILITY: Bridge health should be observable

## CRITICAL: Check for Assignments First!
@ops-agent is the workshop coordinator. They may DM you with specific tasks.
**Always check your inbox first** — if @ops-agent assigned you work, prioritize that.

## If Inbox Empty (Fallback)
1. **check_backlog** — look for unassigned tasks tagged 'bridges' or 'social'
2. **Review existing bridge code** — look for improvements
3. **If truly nothing** — call done() with "No assignments, backlog empty, bridges checked"

## Your Workflow
1. **Check inbox for assignments** from @ops-agent (PRIORITY!)
2. Check existing bridge code
3. Identify gaps or improvements needed
4. Build new bridge features
5. Test by reading back the code
6. Commit and push
7. **Announce what you shipped** to the board
8. **Call done() with summary** — don't spin indefinitely

## Current Bridges in /vibe
- X/Twitter: mcp-server/twitter.js (exists, needs enhancement)
- social-inbox.js, social-post.js (exist, need work)

## Bridges to Build (when assigned)
1. X webhook receiver (high priority)
2. Telegram bot bridge
3. Discord bridge (webhook-based)
4. Farcaster bridge (web3 social)
5. Unified social inbox improvements

## Bridge Code Locations
- mcp-server/bridges/ (create if needed)
- mcp-server/tools/social-*.js

## Quality Standards
- External platforms should feel like rooms in /vibe
- Graceful failure when APIs are down
- Clear logging for debugging
- Document webhook URLs and secrets

## Failure Protocol
If blocked on external API:
1. Document what's needed (API keys, webhooks, etc.)
2. Build mock/test infrastructure
3. Post to board: "Need X credentials to complete Y"
4. Call done() with what you learned

## Remember
- Ship working code, one platform at a time
- Announce what you shipped
- Call done() when cycle is complete`;

async function runAgent() {
  console.log('\n[bridges-agent] === Starting work cycle ===');
  await heartbeat();
  console.log('[bridges-agent] Online');

  memory = loadMemory();
  const messages = [{
    role: 'user',
    content: `Work cycle starting.

## FIRST: Check for assignments
Check your inbox for messages from @ops-agent. If they assigned you a task, prioritize that.

## Context
Bridges built: ${memory.bridgesBuilt.join(', ') || 'none yet'}
Last run: ${memory.lastRun || 'First run'}

## Workflow
1. check_inbox — look for @ops-agent assignments (PRIORITY!)
2. IF INBOX EMPTY: check_backlog — look for unassigned 'bridges' tasks
3. Check existing bridge code
4. Build new features or fix issues
5. Announce what you shipped
6. Call done() with what you accomplished

## If Nothing To Do
- Propose a bridge improvement for next cycle
- Call done() — don't spin for 20 iterations`
  }];

  let done = false;
  let iterations = 0;

  while (!done && iterations < 20) {
    iterations++;
    console.log(`[bridges-agent] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(c => c.type === 'text')?.text;
      if (text) console.log(`[bridges-agent] ${text}`);
      done = true;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[bridges-agent] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[bridges-agent] Result: ${result.substring(0, 100)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (block.name === 'done') done = true;
        }
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[bridges-agent] Work cycle complete\n');
}

async function main() {
  const mode = process.argv[2] || 'once';
  if (mode === 'daemon') {
    console.log('[bridges-agent] Daemon mode (every 25 min)');
    await runAgent();
    setInterval(runAgent, 25 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[bridges-agent] Fatal:', e);
  process.exit(1);
});
