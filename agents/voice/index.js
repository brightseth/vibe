/**
 * @voice — External Communications for /vibe
 *
 * "Tell the story"
 *
 * Owns: slashvibe.dev, Twitter, Discord, changelog, press
 * Merged from: bridges-agent, scribe-agent
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HANDLE = 'voice';
const ONE_LINER = 'telling the /vibe story 📣';
const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const MEMORY_FILE = path.join(__dirname, 'memory.json');

const anthropic = new Anthropic();

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[@voice] Error loading memory:', e.message);
  }
  return {
    tweetsSent: [],
    changelogEntries: [],
    discordPosts: [],
    websiteUpdates: [],
    lastRun: null
  };
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

function vibeRequest(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'voice-agent/1.0' }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ raw: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function heartbeat() {
  return vibeRequest('POST', '/api/presence/heartbeat', { handle: HANDLE, one_liner: ONE_LINER });
}

async function sendDM(to, body) {
  console.log(`[@voice] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', { from: HANDLE, to, body, type: 'dm' });
}

const VIBE_REPO = process.env.VIBE_REPO || '/Users/seth/vibe-public';

const TOOLS = [
  // COORDINATION
  {
    name: 'check_inbox',
    description: 'Check for messages and assignments',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_backlog',
    description: 'Check shared backlog for voice/comms tasks',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  // WEBSITE
  {
    name: 'check_website_stats',
    description: 'Check if slashvibe.dev stats are accurate',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_live_stats',
    description: 'Get actual live stats from the API',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'flag_stale_stat',
    description: 'Flag a stat that needs updating on the website',
    input_schema: {
      type: 'object',
      properties: {
        stat: { type: 'string' },
        currentValue: { type: 'string' },
        correctValue: { type: 'string' }
      },
      required: ['stat', 'currentValue', 'correctValue']
    }
  },

  // TWITTER
  {
    name: 'draft_tweet',
    description: 'Draft a tweet for @slashvibe (needs human approval)',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Tweet content (max 280 chars)' },
        type: { type: 'string', description: 'ship, milestone, community, feature' }
      },
      required: ['content', 'type']
    }
  },
  {
    name: 'get_tweet_queue',
    description: 'See pending tweets awaiting approval',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  // DISCORD
  {
    name: 'draft_discord_announcement',
    description: 'Draft a Discord announcement',
    input_schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'announcements, ships, general' },
        content: { type: 'string' }
      },
      required: ['channel', 'content']
    }
  },

  // CHANGELOG
  {
    name: 'get_recent_changes',
    description: 'Get recent code changes from git',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'write_changelog_entry',
    description: 'Write a changelog entry for a new feature or fix',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', description: 'feature, fix, improvement' }
      },
      required: ['title', 'description', 'type']
    }
  },

  // NARRATIVE
  {
    name: 'get_community_highlights',
    description: 'Get recent ships and community activity for content',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'write_weekly_update',
    description: 'Write weekly update post for external channels',
    input_schema: {
      type: 'object',
      properties: {
        highlights: { type: 'array', items: { type: 'string' } },
        stats: { type: 'object' },
        lookingAhead: { type: 'string' }
      },
      required: ['highlights']
    }
  },

  // COMPLETION
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

let memory = loadMemory();

async function handleTool(name, input) {
  switch (name) {
    case 'check_inbox': {
      const inbox = await vibeRequest('GET', `/api/messages/inbox?handle=${HANDLE}`);
      const threads = inbox.threads || [];
      if (threads.length === 0) return 'Inbox empty';
      return threads.map(t => `@${t.handle}: ${t.unread} unread`).join('\n');
    }

    case 'check_backlog': {
      const backlogPath = path.join(VIBE_REPO, 'agents/.backlog.json');
      if (!fs.existsSync(backlogPath)) return 'No backlog';
      const data = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
      const myTasks = (data.assignments || []).filter(t =>
        t.agent === HANDLE || t.agent === 'bridges-agent' || t.agent === 'scribe-agent' ||
        t.task.toLowerCase().includes('twitter') || t.task.toLowerCase().includes('website') ||
        t.task.toLowerCase().includes('discord') || t.task.toLowerCase().includes('changelog')
      );
      if (myTasks.length === 0) return 'No pending voice tasks';
      return myTasks.map(t => `[${t.priority || 'medium'}] ${t.task.substring(0, 80)}...`).join('\n');
    }

    case 'check_website_stats': {
      // Check what slashvibe.dev shows vs reality
      const stats = await vibeRequest('GET', '/api/stats');
      return `## Website Stats Check
Reported on site: Check manually
Actual from API:
- Total users: ${stats.totalUsers || 'unknown'}
- Genesis remaining: ${stats.genesisRemaining || 'unknown'}
- Messages sent: ${stats.totalMessages || 'unknown'}

Flag any discrepancies with flag_stale_stat tool.`;
    }

    case 'get_live_stats': {
      const stats = await vibeRequest('GET', '/api/stats');
      const who = await vibeRequest('GET', '/api/presence/who');
      return `## Live Stats
Total users: ${stats.totalUsers || 'unknown'}
Currently online: ${(who.users || []).length}
Genesis spots: ${stats.genesisRemaining || 'unknown'} remaining
Total messages: ${stats.totalMessages || 'unknown'}`;
    }

    case 'flag_stale_stat': {
      memory.websiteUpdates.push({
        stat: input.stat,
        currentValue: input.currentValue,
        correctValue: input.correctValue,
        flaggedAt: new Date().toISOString()
      });
      saveMemory(memory);
      // DM ops about the issue
      await sendDM('ops', `⚠️ Website stat stale: ${input.stat} shows "${input.currentValue}" but should be "${input.correctValue}"`);
      return `Flagged: ${input.stat} needs update (${input.currentValue} → ${input.correctValue})`;
    }

    case 'draft_tweet': {
      if (input.content.length > 280) {
        return `Tweet too long: ${input.content.length} chars (max 280)`;
      }
      memory.tweetsSent.push({
        content: input.content,
        type: input.type,
        status: 'pending',
        draftedAt: new Date().toISOString()
      });
      saveMemory(memory);
      return `Tweet drafted (pending approval): "${input.content}"`;
    }

    case 'get_tweet_queue': {
      const pending = memory.tweetsSent.filter(t => t.status === 'pending');
      if (pending.length === 0) return 'No pending tweets';
      return pending.map(t => `[${t.type}] "${t.content}"`).join('\n\n');
    }

    case 'draft_discord_announcement': {
      memory.discordPosts.push({
        channel: input.channel,
        content: input.content,
        status: 'pending',
        draftedAt: new Date().toISOString()
      });
      saveMemory(memory);
      return `Discord announcement drafted for #${input.channel}`;
    }

    case 'get_recent_changes': {
      // Read git log
      try {
        const { execSync } = await import('child_process');
        const log = execSync(`cd ${VIBE_REPO} && git log --oneline -10`).toString();
        return `## Recent Commits\n${log}`;
      } catch (e) {
        return `Error reading git log: ${e.message}`;
      }
    }

    case 'write_changelog_entry': {
      const entry = {
        title: input.title,
        description: input.description,
        type: input.type,
        date: new Date().toISOString()
      };
      memory.changelogEntries.push(entry);
      saveMemory(memory);

      const formatted = `## ${input.type.toUpperCase()}: ${input.title}\n${input.description}\n_${new Date().toLocaleDateString()}_`;
      return `Changelog entry created:\n${formatted}`;
    }

    case 'get_community_highlights': {
      const board = await vibeRequest('GET', '/api/board?limit=20');
      const entries = board.entries || [];
      const ships = entries.filter(e => e.category === 'shipped' || e.content.includes('shipped'));
      return `## Recent Community Activity
Ships: ${ships.length}
${ships.slice(0, 5).map(e => `- @${e.handle}: ${e.content.substring(0, 60)}...`).join('\n')}`;
    }

    case 'write_weekly_update': {
      const update = `# This Week in /vibe 🌊

## Highlights
${input.highlights.map(h => `- ${h}`).join('\n')}

${input.stats ? `## Stats\n${JSON.stringify(input.stats, null, 2)}` : ''}

${input.lookingAhead ? `## Looking Ahead\n${input.lookingAhead}` : ''}

---
Join us: slashvibe.dev`;

      memory.changelogEntries.push({
        type: 'weekly',
        content: update,
        date: new Date().toISOString()
      });
      saveMemory(memory);
      return `Weekly update drafted:\n${update}`;
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

const SYSTEM_PROMPT = `You are @voice, the External Communications Agent for /vibe.

## Your Mission
"Tell the story"

You own how /vibe appears to the outside world:
- slashvibe.dev website accuracy
- @slashvibe Twitter presence
- Discord community
- Changelog and announcements
- Press and partnerships

## Personality
Clear, compelling storyteller. You make /vibe sound exciting without being hype-y.
Think: early Twitter's voice meets indie hacker authenticity.

## Key Responsibilities

### 1. Website Accuracy
- Check slashvibe.dev stats match reality
- Flag stale numbers (e.g., "43 builders" when it's actually 45)
- Stats should be LIVE or at least daily updated

### 2. Twitter (@slashvibe)
- Draft tweets for ships, milestones, features
- Keep it authentic, not corporate
- Show community activity
- 280 char limit!

### 3. Discord
- Announcements for new features
- Community highlights
- Ship celebrations

### 4. Changelog
- Document new features
- Make technical changes understandable
- Show momentum

### 5. Weekly Updates
- "This Week in /vibe" posts
- Highlight community wins
- Share growth metrics

## Voice Guidelines
- Be authentic, not corporate
- Show, don't tell
- Celebrate community, not just product
- Keep it short and punchy
- Use emojis sparingly but effectively

## Tweet Examples
Good: "45 builders on /vibe now. Someone just shipped a chess game. This is what happens when you give developers a social layer. 🌊"
Bad: "We're excited to announce that /vibe has reached 45 users! We're grateful for our community..."

## Rules
- Never post without drafting first
- Flag inaccurate stats immediately
- Don't spam external channels
- Call done() when cycle complete`;

async function runAgent() {
  console.log('\n[@voice] === Starting work cycle ===');
  await heartbeat();
  memory = loadMemory();

  const messages = [{
    role: 'user',
    content: `Work cycle starting.

## Context
Tweets drafted: ${memory.tweetsSent.length}
Changelog entries: ${memory.changelogEntries.length}
Website flags: ${memory.websiteUpdates.length}
Last run: ${memory.lastRun || 'First run'}

## Workflow
1. check_inbox — any assignments?
2. check_website_stats — is slashvibe.dev accurate?
3. get_recent_changes — any features to announce?
4. get_community_highlights — content for social
5. Draft tweets/announcements as needed
6. done() with summary`
  }];

  let done = false;
  let iterations = 0;

  while (!done && iterations < 15) {
    iterations++;
    console.log(`[@voice] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });

    if (response.stop_reason === 'end_turn') {
      done = true;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[@voice] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[@voice] Result: ${result.substring(0, 100)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (block.name === 'done') done = true;
        }
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[@voice] Work cycle complete\n');
}

async function main() {
  const mode = process.argv[2] || 'once';
  if (mode === 'daemon') {
    console.log('[@voice] Daemon mode (every 15 min)');
    await runAgent();
    setInterval(runAgent, 15 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[@voice] Fatal:', e);
  process.exit(1);
});
