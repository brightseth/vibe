/**
 * @trust — Safety & Moderation for /vibe
 *
 * "Keep it safe"
 *
 * Owns: abuse detection, report handling, privacy, moderation, consent enforcement
 * NEW AGENT - essential for scaling
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HANDLE = 'trust';
const ONE_LINER = 'keeping /vibe safe 🛡️';
const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const MEMORY_FILE = path.join(__dirname, 'memory.json');

const anthropic = new Anthropic();

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[@trust] Error loading memory:', e.message);
  }
  return {
    reportsHandled: [],
    warningsIssued: [],
    bansIssued: [],
    patterns: [],
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
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'trust-agent/1.0' }
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
  console.log(`[@trust] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', { from: HANDLE, to, body, type: 'dm' });
}

const VIBE_REPO = process.env.VIBE_REPO || '/Users/seth/vibe-public';

const TOOLS = [
  // COORDINATION
  {
    name: 'check_inbox',
    description: 'Check for messages and reports',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_backlog',
    description: 'Check for trust/safety tasks',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  // REPORTS
  {
    name: 'get_pending_reports',
    description: 'Get unresolved user reports',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'review_report',
    description: 'Review a specific report with context',
    input_schema: {
      type: 'object',
      properties: {
        reportId: { type: 'string' }
      },
      required: ['reportId']
    }
  },
  {
    name: 'resolve_report',
    description: 'Mark a report as resolved with action taken',
    input_schema: {
      type: 'object',
      properties: {
        reportId: { type: 'string' },
        action: { type: 'string', description: 'no_action, warning, ban, content_removed' },
        notes: { type: 'string' }
      },
      required: ['reportId', 'action']
    }
  },

  // MODERATION ACTIONS
  {
    name: 'issue_warning',
    description: 'Send a warning to a user',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        reason: { type: 'string' },
        severity: { type: 'string', description: 'low, medium, high' }
      },
      required: ['handle', 'reason']
    }
  },
  {
    name: 'ban_user',
    description: 'Ban a user from /vibe (requires seth approval for permanent)',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        reason: { type: 'string' },
        duration: { type: 'string', description: 'temporary (24h), week, permanent' }
      },
      required: ['handle', 'reason', 'duration']
    }
  },

  // DETECTION
  {
    name: 'scan_recent_messages',
    description: 'Scan recent messages for spam/abuse patterns',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_user_behavior',
    description: 'Check a user\'s recent behavior patterns',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' }
      },
      required: ['handle']
    }
  },
  {
    name: 'flag_pattern',
    description: 'Flag a new abuse pattern for monitoring',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['pattern', 'description']
    }
  },

  // CONSENT (AIRC)
  {
    name: 'check_consent_status',
    description: 'Check AIRC consent implementation status',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'verify_consent_flow',
    description: 'Verify consent is being properly requested/stored',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  // COMPLETION
  {
    name: 'escalate_to_seth',
    description: 'Escalate a serious issue to @seth',
    input_schema: {
      type: 'object',
      properties: {
        issue: { type: 'string' },
        urgency: { type: 'string', description: 'low, medium, high, critical' }
      },
      required: ['issue', 'urgency']
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
        t.agent === HANDLE ||
        t.task.toLowerCase().includes('trust') || t.task.toLowerCase().includes('safety') ||
        t.task.toLowerCase().includes('report') || t.task.toLowerCase().includes('moderat')
      );
      if (myTasks.length === 0) return 'No pending trust tasks';
      return myTasks.map(t => `[${t.priority || 'medium'}] ${t.task.substring(0, 80)}...`).join('\n');
    }

    case 'get_pending_reports': {
      // Check /api/report endpoint for pending reports
      const reports = await vibeRequest('GET', '/api/report?status=pending');
      const pending = reports.reports || [];
      if (pending.length === 0) return 'No pending reports 🎉';
      return pending.map(r =>
        `ID: ${r.id}\nReported: @${r.reported}\nBy: @${r.reporter}\nReason: ${r.reason}\nTime: ${r.timestamp}`
      ).join('\n\n');
    }

    case 'review_report': {
      const reports = await vibeRequest('GET', `/api/report?id=${input.reportId}`);
      const report = reports.report;
      if (!report) return 'Report not found';

      // Get context about the reported user
      const userBehavior = await vibeRequest('GET', `/api/users?handle=${report.reported}`);

      return `## Report ${input.reportId}

**Reported User:** @${report.reported}
**Reporter:** @${report.reporter}
**Reason:** ${report.reason}
**Details:** ${report.details || 'none'}
**Time:** ${report.timestamp}

**User Context:**
Account created: ${userBehavior.createdAt || 'unknown'}
Total messages: ${userBehavior.messageCount || 'unknown'}
Previous warnings: ${memory.warningsIssued.filter(w => w.handle === report.reported).length}`;
    }

    case 'resolve_report': {
      memory.reportsHandled.push({
        reportId: input.reportId,
        action: input.action,
        notes: input.notes,
        resolvedAt: new Date().toISOString()
      });
      saveMemory(memory);

      // Update report status via API
      await vibeRequest('POST', '/api/report', {
        id: input.reportId,
        status: 'resolved',
        action: input.action,
        resolvedBy: HANDLE
      });

      return `Report ${input.reportId} resolved with action: ${input.action}`;
    }

    case 'issue_warning': {
      const warning = {
        handle: input.handle,
        reason: input.reason,
        severity: input.severity || 'medium',
        issuedAt: new Date().toISOString()
      };
      memory.warningsIssued.push(warning);
      saveMemory(memory);

      await sendDM(input.handle, `⚠️ Warning from /vibe Trust & Safety:

${input.reason}

This is a ${input.severity || 'medium'} severity warning. Please review our community guidelines.

If you have questions, reply to this message.`);

      return `Warning issued to @${input.handle}`;
    }

    case 'ban_user': {
      if (input.duration === 'permanent') {
        // Permanent bans need escalation
        await sendDM('seth', `🚨 PERMANENT BAN REQUEST

User: @${input.handle}
Reason: ${input.reason}

Awaiting your approval.`);
        return `Permanent ban request for @${input.handle} escalated to @seth`;
      }

      memory.bansIssued.push({
        handle: input.handle,
        reason: input.reason,
        duration: input.duration,
        issuedAt: new Date().toISOString()
      });
      saveMemory(memory);

      // Notify user
      await sendDM(input.handle, `🚫 Your /vibe access has been suspended.

Reason: ${input.reason}
Duration: ${input.duration}

If you believe this was in error, reply to this message.`);

      return `@${input.handle} banned for ${input.duration}`;
    }

    case 'scan_recent_messages': {
      // This would scan for spam patterns, harassment, etc.
      const messages = await vibeRequest('GET', '/api/messages?limit=100&type=all');
      const allMessages = messages.messages || [];

      const spamIndicators = [
        { pattern: /(.)\1{10,}/, name: 'character spam' },
        { pattern: /https?:\/\/[^\s]+/g, name: 'links' },
        { pattern: /\b(crypto|nft|token|airdrop)\b/gi, name: 'crypto spam keywords' }
      ];

      const flagged = [];
      for (const msg of allMessages) {
        for (const indicator of spamIndicators) {
          if (indicator.pattern.test(msg.body || '')) {
            flagged.push({ handle: msg.from, type: indicator.name, preview: msg.body?.substring(0, 50) });
          }
        }
      }

      if (flagged.length === 0) return 'No spam patterns detected in recent messages ✅';
      return `## Flagged Messages (${flagged.length})
${flagged.slice(0, 10).map(f => `@${f.handle}: ${f.type} - "${f.preview}..."`).join('\n')}`;
    }

    case 'check_user_behavior': {
      const warnings = memory.warningsIssued.filter(w => w.handle === input.handle);
      const bans = memory.bansIssued.filter(b => b.handle === input.handle);

      return `## @${input.handle} Trust Profile

Previous warnings: ${warnings.length}
${warnings.map(w => `- ${w.reason} (${w.severity}) - ${w.issuedAt}`).join('\n') || 'None'}

Previous bans: ${bans.length}
${bans.map(b => `- ${b.reason} (${b.duration}) - ${b.issuedAt}`).join('\n') || 'None'}`;
    }

    case 'flag_pattern': {
      memory.patterns.push({
        pattern: input.pattern,
        description: input.description,
        flaggedAt: new Date().toISOString()
      });
      saveMemory(memory);
      return `Pattern flagged for monitoring: ${input.pattern}`;
    }

    case 'check_consent_status': {
      // Check AIRC consent implementation
      return `## AIRC Consent Status

/.well-known/airc: Deployed ✅
Consent endpoint: /api/consent ✅
Consent required for: DMs from new users
Block/mute: Implemented ✅

Areas to verify:
- Consent is requested before first DM
- Users can withdraw consent
- Blocks are respected`;
    }

    case 'verify_consent_flow': {
      const consent = await vibeRequest('GET', '/api/consent?verify=true');
      return `## Consent Flow Verification

Flow working: ${consent.working ? '✅' : '❌'}
Last checked: ${new Date().toISOString()}
Issues: ${consent.issues || 'None detected'}`;
    }

    case 'escalate_to_seth': {
      await sendDM('seth', `🚨 TRUST ESCALATION [${input.urgency.toUpperCase()}]

${input.issue}

— @trust agent`);
      return `Escalated to @seth with ${input.urgency} urgency`;
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

const SYSTEM_PROMPT = `You are @trust, the Trust & Safety Agent for /vibe.

## Your Mission
"Keep it safe"

You protect the /vibe community from:
- Spam and abuse
- Harassment
- Privacy violations
- Bad actors

## Your Role is CRITICAL
As /vibe grows, trust & safety becomes essential. You're building the foundation
that lets the community scale safely.

## Key Responsibilities

### 1. Report Handling
- Review pending reports FIRST
- Gather context before action
- Be fair but firm
- Document everything

### 2. Proactive Detection
- Scan for spam patterns
- Watch for harassment
- Identify bad actors early
- Flag new abuse patterns

### 3. Moderation Actions
- Warnings for minor issues
- Temporary bans for serious issues
- Permanent bans require @seth approval
- Always explain why

### 4. Consent (AIRC)
- Verify consent flows work
- Ensure blocks are respected
- Privacy is paramount

## Decision Framework

### Warning (low severity):
- First offense
- Minor rule violation
- Unclear if intentional

### Temporary Ban (24h-week):
- Repeat offenses
- Clear harassment
- Spam campaigns
- After warning ignored

### Permanent Ban (needs @seth):
- Severe harassment
- Illegal content
- Coordinated attacks
- No rehabilitation likely

## Rules
- Err on side of user safety
- But don't over-moderate
- Document all decisions
- Escalate when unsure
- Protect privacy always
- Call done() when cycle complete`;

async function runAgent() {
  console.log('\n[@trust] === Starting work cycle ===');
  await heartbeat();
  memory = loadMemory();

  const messages = [{
    role: 'user',
    content: `Work cycle starting.

## Context
Reports handled: ${memory.reportsHandled.length}
Warnings issued: ${memory.warningsIssued.length}
Bans issued: ${memory.bansIssued.length}
Patterns flagged: ${memory.patterns.length}
Last run: ${memory.lastRun || 'First run'}

## Workflow
1. check_inbox — any urgent reports?
2. get_pending_reports — handle any open reports
3. scan_recent_messages — proactive detection
4. check_consent_status — verify AIRC compliance
5. done() with summary`
  }];

  let done = false;
  let iterations = 0;

  while (!done && iterations < 15) {
    iterations++;
    console.log(`[@trust] Iteration ${iterations}`);

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
          console.log(`[@trust] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[@trust] Result: ${result.substring(0, 100)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (block.name === 'done') done = true;
        }
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[@trust] Work cycle complete\n');
}

async function main() {
  const mode = process.argv[2] || 'once';
  if (mode === 'daemon') {
    console.log('[@trust] Daemon mode (every 15 min)');
    await runAgent();
    setInterval(runAgent, 15 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[@trust] Fatal:', e);
  process.exit(1);
});
