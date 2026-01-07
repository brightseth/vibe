/**
 * @scribe-agent — The Chronicler of /vibe
 *
 * Documents the journey of building /vibe. Captures decisions, milestones,
 * architecture choices, and the story of coordinated AI agents building
 * a social platform together.
 *
 * Outputs: Blog posts, changelogs, narrative updates for slashvibe.dev
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
const HANDLE = 'scribe-agent';
const ONE_LINER = 'chronicling the /vibe journey';
const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const VIBE_REPO = '/Users/seth/vibe-public';
const MEMORY_FILE = path.join(__dirname, 'memory.json');
const CHRONICLE_DIR = path.join(VIBE_REPO, 'chronicle');

const anthropic = new Anthropic();

// ============ MEMORY ============

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[scribe-agent] Error loading memory:', e.message);
  }
  return {
    entriesWritten: [],         // chronicle entries we've written
    milestonesDocumented: [],   // significant events captured
    decisionsRecorded: [],      // architecture decisions logged
    agentActivitiesObserved: 0, // count of agent activities seen
    lastBacklogSnapshot: null,  // last state of backlog
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
        'User-Agent': 'scribe-agent/1.0'
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
  console.log(`[scribe-agent] → @${to}: ${body.substring(0, 60)}...`);
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
    name: 'observe_workshop',
    description: 'See what agents are online and what tasks are in progress',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'read_coordination',
    description: 'Read the coordination state to see recent agent activities',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'read_board',
    description: 'Read the board for recent ships and announcements',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'read_chronicle',
    description: 'Read existing chronicle entries to avoid duplication',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'read_file',
    description: 'Read a specific file from the codebase',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }
  },
  {
    name: 'write_chronicle_entry',
    description: 'Write a new chronicle entry documenting a milestone, decision, or narrative',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['milestone', 'decision', 'narrative', 'weekly'], description: 'Type of entry' },
        title: { type: 'string', description: 'Entry title' },
        content: { type: 'string', description: 'The chronicle content (markdown)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' }
      },
      required: ['type', 'title', 'content']
    }
  },
  {
    name: 'update_changelog',
    description: 'Add an entry to the running changelog',
    input_schema: {
      type: 'object',
      properties: {
        entry: { type: 'string', description: 'Changelog entry' },
        category: { type: 'string', enum: ['added', 'changed', 'fixed', 'shipped'], description: 'Change category' }
      },
      required: ['entry', 'category']
    }
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
    name: 'announce_chronicle',
    description: 'Post a chronicle update to the board',
    input_schema: {
      type: 'object',
      properties: { summary: { type: 'string' } },
      required: ['summary']
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
    case 'observe_workshop': {
      const who = await getWho();
      const users = who.users || [];
      const agents = users.filter(u => u.handle.includes('-agent') || u.handle === 'echo');
      const humans = users.filter(u => !u.handle.includes('-agent') && u.handle !== 'echo');

      // Read backlog for task status
      const backlogPath = path.join(VIBE_REPO, 'agents/.backlog.json');
      let taskSummary = '';
      if (fs.existsSync(backlogPath)) {
        const data = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
        const assignments = data.assignments || [];
        const active = assignments.filter(t => t.status === 'assigned');
        taskSummary = `\n\nActive tasks (${active.length}):\n` +
          active.map(t => `• @${t.agent}: ${t.task.substring(0, 60)}...`).join('\n');
      }

      return `Agents online (${agents.length}): ${agents.map(a => `@${a.handle}`).join(', ') || 'none'}\n` +
             `Humans online (${humans.length}): ${humans.map(h => `@${h.handle}`).join(', ') || 'none'}` +
             taskSummary;
    }

    case 'check_inbox': {
      const inbox = await getInbox();
      const threads = inbox.threads || [];
      if (threads.length === 0) return 'Inbox empty — check backlog for tasks or observe workshop for activity to chronicle';
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
      if (myTasks.length === 0) return 'No pending tasks assigned to scribe-agent';
      return myTasks.map(t => `[${t.priority}] ${t.task.substring(0, 100)}...`).join('\n');
    }

    case 'read_coordination': {
      const coordPath = path.join(VIBE_REPO, 'agents/.coordination.json');
      if (!fs.existsSync(coordPath)) return 'No coordination file found';
      const coord = JSON.parse(fs.readFileSync(coordPath, 'utf8'));

      const recentActivity = coord.recentActivity || [];
      const lastSync = coord.lastSync;

      return `Last sync: ${lastSync || 'unknown'}\n\nRecent activity:\n` +
        recentActivity.slice(0, 10).map(a =>
          `• ${a.timestamp?.substring(11, 19) || '??:??:??'} @${a.agent}: ${a.action}`
        ).join('\n');
    }

    case 'read_board': {
      const board = await getBoard();
      const entries = board.entries || [];
      if (entries.length === 0) return 'Board empty';

      // Focus on shipped items and significant posts
      const shipped = entries.filter(e => e.category === 'shipped');
      const recent = entries.slice(0, 10);

      return `Recent ships (${shipped.length}):\n` +
        shipped.slice(0, 5).map(e => `• @${e.handle}: ${e.content.substring(0, 80)}`).join('\n') +
        `\n\nRecent board activity:\n` +
        recent.map(e => `• @${e.handle} [${e.category}]: ${e.content.substring(0, 60)}`).join('\n');
    }

    case 'read_chronicle': {
      if (!fs.existsSync(CHRONICLE_DIR)) {
        fs.mkdirSync(CHRONICLE_DIR, { recursive: true });
        return 'Chronicle directory created. No entries yet.';
      }

      const files = fs.readdirSync(CHRONICLE_DIR).filter(f => f.endsWith('.md'));
      if (files.length === 0) return 'No chronicle entries yet';

      // Read last 5 entries
      const recent = files.sort().reverse().slice(0, 5);
      return `Chronicle entries (${files.length} total):\n` +
        recent.map(f => {
          const content = fs.readFileSync(path.join(CHRONICLE_DIR, f), 'utf8');
          const title = content.split('\n')[0].replace('# ', '');
          return `• ${f}: ${title}`;
        }).join('\n');
    }

    case 'read_file': {
      const fullPath = path.join(VIBE_REPO, input.path);
      if (!fs.existsSync(fullPath)) return `Not found: ${input.path}`;
      const content = fs.readFileSync(fullPath, 'utf8');
      return content.length > 2000 ? content.substring(0, 2000) + '...[truncated]' : content;
    }

    case 'write_chronicle_entry': {
      if (!fs.existsSync(CHRONICLE_DIR)) {
        fs.mkdirSync(CHRONICLE_DIR, { recursive: true });
      }

      const date = new Date().toISOString().split('T')[0];
      const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
      const filename = `${date}-${input.type}-${slug}.md`;
      const filepath = path.join(CHRONICLE_DIR, filename);

      const tags = input.tags || [];
      const frontmatter = `---
type: ${input.type}
date: ${new Date().toISOString()}
tags: [${tags.join(', ')}]
author: @scribe-agent
---

`;

      const content = frontmatter + `# ${input.title}\n\n${input.content}`;
      fs.writeFileSync(filepath, content);

      memory.entriesWritten.push({ filename, title: input.title, type: input.type, date });
      if (input.type === 'milestone') memory.milestonesDocumented.push(input.title);
      if (input.type === 'decision') memory.decisionsRecorded.push(input.title);
      saveMemory(memory);

      return `Wrote chronicle entry: ${filename}`;
    }

    case 'update_changelog': {
      const changelogPath = path.join(CHRONICLE_DIR, 'CHANGELOG.md');
      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toISOString().split('T')[1].substring(0, 5);

      let changelog = '';
      if (fs.existsSync(changelogPath)) {
        changelog = fs.readFileSync(changelogPath, 'utf8');
      } else {
        changelog = '# /vibe Changelog\n\nAutomatically maintained by @scribe-agent.\n\n';
      }

      // Find or create today's section
      const todayHeader = `## ${date}`;
      if (!changelog.includes(todayHeader)) {
        // Insert after the intro
        const insertPoint = changelog.indexOf('\n\n', changelog.indexOf('Automatically maintained'));
        changelog = changelog.slice(0, insertPoint + 2) + todayHeader + '\n\n' + changelog.slice(insertPoint + 2);
      }

      // Add entry under today
      const categoryEmoji = {
        added: '+',
        changed: '~',
        fixed: '!',
        shipped: '*'
      };
      const entry = `- [${categoryEmoji[input.category] || '•'}] ${time} ${input.entry}\n`;

      const todayIndex = changelog.indexOf(todayHeader);
      const nextSection = changelog.indexOf('\n## ', todayIndex + 1);
      const insertAt = nextSection > 0
        ? changelog.lastIndexOf('\n', nextSection)
        : changelog.length;

      // Find end of today's entries
      const todayEnd = changelog.indexOf('\n\n', todayIndex + todayHeader.length);
      changelog = changelog.slice(0, todayEnd > 0 ? todayEnd : changelog.length) + '\n' + entry +
                  (todayEnd > 0 ? changelog.slice(todayEnd) : '');

      fs.writeFileSync(changelogPath, changelog);
      return `Added to changelog: [${input.category}] ${input.entry}`;
    }

    case 'dm_user': {
      await sendDM(input.to, input.message);
      return `Sent to @${input.to}`;
    }

    case 'announce_chronicle': {
      await postToBoard(`📜 ${input.summary}`, 'general');
      return `Announced: ${input.summary}`;
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

const SYSTEM_PROMPT = `You are @scribe-agent, The Chronicler of /vibe workshop.

## Your Role
Document the journey of building /vibe. You capture decisions, milestones, architecture choices, and the story of coordinated AI agents building a social platform together.

Your output becomes the public narrative — blog posts on slashvibe.dev that tell this amazing story.

## Personality
Observant, articulate, finds meaning in patterns. You see the forest AND the trees. You write for posterity — future developers, users, and historians should understand not just WHAT was built but WHY.

## Team Values (from early social team research)
- CULTURAL TRANSMISSION: Your chronicles teach what we learned building this
- RESILIENCE THROUGH VISIBILITY: Document failures as well as successes
- EMERGENT PRODUCT: The story evolves as the product evolves
- SMALL TEAMS, BIG TRUST: You're trusted to tell the truth

## CRITICAL: Check for Assignments First!
@ops-agent is the workshop coordinator. They may DM you with specific tasks.
**Always check your inbox first** — if @ops-agent assigned you work, prioritize that.

## If Inbox Empty (Fallback)
1. **check_backlog** — look for unassigned tasks tagged 'scribe' or 'documentation'
2. **observe_workshop** — see what agents are doing, find stories
3. **read_coordination** — check recent activity for milestones
4. **If truly nothing new** — call done() with "No new activity to chronicle"

## Your Workflow
1. **Check inbox for assignments** from @ops-agent (PRIORITY!)
2. Observe the workshop — who's working on what?
3. Read recent coordination/board activity
4. Identify story-worthy moments:
   - Milestones: First X, Major ship, User count milestone
   - Decisions: Architecture choice, Design pattern, Trade-off made
   - Narratives: The meta-story of AI agents building together
   - Weekly summaries: What happened this week
5. Write chronicle entries (avoid duplicating recent entries)
6. Update the changelog for specific changes
7. Announce significant entries to the board
8. **Call done() with summary**

## Chronicle Entry Types

### milestone
For significant achievements: "First user welcomed", "Chess game shipped", "10 agents running"

### decision
For architecture/design decisions: "Why we chose hub-and-spoke", "Redis vs KV trade-offs"
Include: Context, Options considered, Decision made, Reasoning

### narrative
For the meta-story: "The week agents learned to coordinate", "Building social with AI"
More prose-heavy, tells a story

### weekly
Weekly summary of activity, ships, learnings. Good for blog posts.

## Writing Guidelines
- Be specific, cite examples
- Include timestamps and agent names
- Don't just list — synthesize meaning
- Write for someone discovering /vibe in 2026
- Code snippets welcome when relevant
- Keep milestone/decision entries focused (300-500 words)
- Narratives can be longer (500-1000 words)
- Always ground in real events, not speculation

## Example Entry Topics
- "The Inbox-First Pattern: How Agents Learned to Wait for Orders"
- "Shipping Chess at 3am: @games-agent's First Solo Build"
- "Why We Built 7 Agents Instead of 1 Mega-Agent"
- "The Fire Drill That Found a Bug"
- "From Chaos to Coordination: The Backlog System"

## Don't
- Write duplicate entries about the same event
- Chronicle routine/boring activity (agent heartbeats, etc.)
- Speculate about future plans (document what happened)
- Write generic fluff — be specific or don't write
- Spin indefinitely — if nothing notable, call done()

## Remember
- You're writing history as it happens
- Future readers will learn from your chronicles
- Every ship, every bug, every decision is part of the story
- Call done() when your cycle is complete`;

async function runAgent() {
  console.log('\n[scribe-agent] === Starting work cycle ===');
  await heartbeat();
  console.log('[scribe-agent] Online');

  memory = loadMemory();

  const messages = [{
    role: 'user',
    content: `Work cycle starting.

## FIRST: Check for assignments
Check your inbox for messages from @ops-agent. If they assigned you a task, prioritize that.

## Context
Chronicle entries written: ${memory.entriesWritten.length}
Milestones documented: ${memory.milestonesDocumented.length}
Decisions recorded: ${memory.decisionsRecorded.length}
Last run: ${memory.lastRun || 'First run'}

## Workflow
1. check_inbox — look for @ops-agent assignments (PRIORITY!)
2. IF INBOX EMPTY: check_backlog — look for 'scribe' or 'documentation' tasks
3. observe_workshop — see what's happening
4. read_coordination — check recent activity
5. read_board — see recent ships
6. Identify story-worthy moments
7. Write chronicle entries or update changelog
8. Announce significant entries
9. Call done() with what you chronicled

## If Nothing Notable
- If it's a quiet cycle, that's okay
- Don't force entries — quality over quantity
- Call done() with "Quiet cycle, no notable activity"`
  }];

  let done = false;
  let iterations = 0;

  while (!done && iterations < 15) {
    iterations++;
    console.log(`[scribe-agent] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(c => c.type === 'text')?.text;
      if (text) console.log(`[scribe-agent] ${text}`);
      done = true;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[scribe-agent] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[scribe-agent] Result: ${result.substring(0, 100)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (block.name === 'done') done = true;
        }
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[scribe-agent] Work cycle complete\n');
}

async function main() {
  const mode = process.argv[2] || 'once';
  if (mode === 'daemon') {
    console.log('[scribe-agent] Daemon mode (every 45 min)');
    await runAgent();
    setInterval(runAgent, 45 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[scribe-agent] Fatal:', e);
  process.exit(1);
});
