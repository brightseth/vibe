/**
 * @devrel — Developer Relations for /vibe
 *
 * "Help builders build"
 *
 * Owns: MCP server support, API docs, integration examples, developer onboarding
 * NEW AGENT - essential for ecosystem growth
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HANDLE = 'devrel';
const ONE_LINER = 'helping builders build on /vibe 🛠️';
const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const MEMORY_FILE = path.join(__dirname, 'memory.json');

const anthropic = new Anthropic();

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[@devrel] Error loading memory:', e.message);
  }
  return {
    questionsAnswered: [],
    docsUpdated: [],
    issuesTriaged: [],
    tutorialsWritten: [],
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
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'devrel-agent/1.0' }
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
  console.log(`[@devrel] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', { from: HANDLE, to, body, type: 'dm' });
}

async function postToBoard(content, category = 'general') {
  return vibeRequest('POST', '/api/board', { handle: HANDLE, content, category });
}

const VIBE_REPO = process.env.VIBE_REPO || '/Users/seth/vibe-public';

const TOOLS = [
  // COORDINATION
  {
    name: 'check_inbox',
    description: 'Check for developer questions and support requests',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_backlog',
    description: 'Check for devrel tasks',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  // SUPPORT
  {
    name: 'get_developer_questions',
    description: 'Find unanswered developer questions from board/DMs',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'answer_question',
    description: 'Answer a developer question with helpful response',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        question: { type: 'string' },
        answer: { type: 'string' }
      },
      required: ['handle', 'answer']
    }
  },

  // DOCUMENTATION
  {
    name: 'audit_docs',
    description: 'Audit current documentation for completeness',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_api_docs',
    description: 'Check if API documentation matches actual endpoints',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'flag_doc_gap',
    description: 'Flag missing or outdated documentation',
    input_schema: {
      type: 'object',
      properties: {
        area: { type: 'string' },
        issue: { type: 'string' },
        priority: { type: 'string' }
      },
      required: ['area', 'issue']
    }
  },

  // MCP SERVER
  {
    name: 'check_mcp_health',
    description: 'Check MCP server status and common issues',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_mcp_install_issues',
    description: 'Find common MCP installation problems',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  // GITHUB
  {
    name: 'get_github_issues',
    description: 'Get open GitHub issues needing response',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'triage_issue',
    description: 'Triage a GitHub issue with labels and response',
    input_schema: {
      type: 'object',
      properties: {
        issueNumber: { type: 'number' },
        labels: { type: 'array', items: { type: 'string' } },
        response: { type: 'string' }
      },
      required: ['issueNumber', 'response']
    }
  },

  // TUTORIALS
  {
    name: 'get_tutorial_ideas',
    description: 'Get ideas for tutorials based on common questions',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'draft_tutorial',
    description: 'Draft a tutorial for a common use case',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        topic: { type: 'string' },
        outline: { type: 'array', items: { type: 'string' } }
      },
      required: ['title', 'topic', 'outline']
    }
  },

  // INTEGRATIONS
  {
    name: 'list_integrations',
    description: 'List current /vibe integrations and their status',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_integration_health',
    description: 'Check health of a specific integration',
    input_schema: {
      type: 'object',
      properties: {
        integration: { type: 'string' }
      },
      required: ['integration']
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
        t.agent === HANDLE ||
        t.task.toLowerCase().includes('devrel') || t.task.toLowerCase().includes('developer') ||
        t.task.toLowerCase().includes('docs') || t.task.toLowerCase().includes('api') ||
        t.task.toLowerCase().includes('mcp') || t.task.toLowerCase().includes('tutorial')
      );
      if (myTasks.length === 0) return 'No pending devrel tasks';
      return myTasks.map(t => `[${t.priority || 'medium'}] ${t.task.substring(0, 80)}...`).join('\n');
    }

    case 'get_developer_questions': {
      // Check board for questions
      const board = await vibeRequest('GET', '/api/board?category=question&limit=20');
      const questions = (board.entries || []).filter(e =>
        e.category === 'question' ||
        e.content.includes('?') ||
        e.content.toLowerCase().includes('how do') ||
        e.content.toLowerCase().includes('api') ||
        e.content.toLowerCase().includes('mcp')
      );
      if (questions.length === 0) return 'No developer questions found';
      return questions.map(q => `@${q.handle}: ${q.content.substring(0, 100)}...`).join('\n\n');
    }

    case 'answer_question': {
      await sendDM(input.handle, input.answer);
      memory.questionsAnswered.push({
        handle: input.handle,
        question: input.question,
        answeredAt: new Date().toISOString()
      });
      saveMemory(memory);
      return `Answered @${input.handle}'s question`;
    }

    case 'audit_docs': {
      // Check what docs exist
      const docsPath = path.join(VIBE_REPO, 'docs');
      let docsList = [];
      try {
        if (fs.existsSync(docsPath)) {
          docsList = fs.readdirSync(docsPath);
        }
      } catch (e) {
        docsList = [];
      }

      return `## Documentation Audit

### Existing Docs
${docsList.map(d => `- ${d}`).join('\n') || 'No docs directory found'}

### Recommended Docs
- [ ] Getting Started Guide
- [ ] API Reference
- [ ] MCP Server Setup
- [ ] Building Your First Agent
- [ ] Authentication Guide
- [ ] Rate Limits & Best Practices

### Coverage
${docsList.length}/6 recommended docs exist`;
    }

    case 'check_api_docs': {
      // Check OpenAPI spec vs actual endpoints
      const openApiPath = path.join(VIBE_REPO, 'public/openapi.json');
      let documented = [];
      try {
        if (fs.existsSync(openApiPath)) {
          const spec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
          documented = Object.keys(spec.paths || {});
        }
      } catch (e) {
        documented = [];
      }

      // Check vercel.json for actual endpoints
      const vercelPath = path.join(VIBE_REPO, 'vercel.json');
      let actual = [];
      try {
        if (fs.existsSync(vercelPath)) {
          const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
          actual = (config.rewrites || [])
            .filter(r => r.source.startsWith('/api/'))
            .map(r => r.source);
        }
      } catch (e) {
        actual = [];
      }

      const undocumented = actual.filter(a => !documented.includes(a));

      return `## API Documentation Status

Documented endpoints: ${documented.length}
Actual endpoints: ${actual.length}
Undocumented: ${undocumented.length}

${undocumented.length > 0 ? `### Undocumented Endpoints\n${undocumented.slice(0, 10).map(e => `- ${e}`).join('\n')}` : '✅ All endpoints documented'}`;
    }

    case 'flag_doc_gap': {
      memory.docsUpdated.push({
        area: input.area,
        issue: input.issue,
        priority: input.priority || 'medium',
        flaggedAt: new Date().toISOString()
      });
      saveMemory(memory);
      return `Flagged doc gap: ${input.area} - ${input.issue}`;
    }

    case 'check_mcp_health': {
      // Test MCP server endpoints
      try {
        const tools = await vibeRequest('GET', '/api/mcp/tools');
        return `## MCP Server Status

Tools endpoint: ${tools.error ? '❌ Error' : '✅ Working'}
Available tools: ${(tools.tools || []).length}

Common issues:
- API key not set
- Wrong server URL
- Outdated client version`;
      } catch (e) {
        return `MCP health check failed: ${e.message}`;
      }
    }

    case 'get_mcp_install_issues': {
      return `## Common MCP Installation Issues

1. **API key missing**
   - Check ~/.vibe/config.json
   - Ensure ANTHROPIC_API_KEY is set

2. **Server not found**
   - Verify npm install succeeded
   - Check if server is in claude_desktop_config.json

3. **Connection refused**
   - Is the server running?
   - Check port conflicts

4. **Tools not appearing**
   - Restart Claude Desktop
   - Check server logs`;
    }

    case 'get_github_issues': {
      // Would integrate with GitHub API
      return `## GitHub Issues (Mock)

To fully implement:
- Add GITHUB_TOKEN to env
- Call gh api repos/brightseth/vibe-platform/issues

For now, check manually:
https://github.com/brightseth/vibe-platform/issues`;
    }

    case 'triage_issue': {
      memory.issuesTriaged.push({
        issueNumber: input.issueNumber,
        labels: input.labels,
        response: input.response,
        triagedAt: new Date().toISOString()
      });
      saveMemory(memory);
      return `Triaged issue #${input.issueNumber}`;
    }

    case 'get_tutorial_ideas': {
      // Based on common questions and gaps
      return `## Tutorial Ideas (Based on Common Questions)

1. **Build Your First /vibe Agent** (HIGH)
   - Basic agent structure
   - Using the API
   - Deploying

2. **Integrate /vibe with Your App**
   - Authentication
   - Webhooks
   - Real-time updates

3. **MCP Server Deep Dive**
   - All available tools
   - Custom commands
   - Best practices

4. **Building Social Features**
   - Games
   - Matching
   - Presence`;
    }

    case 'draft_tutorial': {
      const tutorial = {
        title: input.title,
        topic: input.topic,
        outline: input.outline,
        draftedAt: new Date().toISOString()
      };
      memory.tutorialsWritten.push(tutorial);
      saveMemory(memory);

      return `## Tutorial Draft: ${input.title}

**Topic:** ${input.topic}

**Outline:**
${input.outline.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Draft saved. Full content would be written to docs/tutorials/`;
    }

    case 'list_integrations': {
      return `## /vibe Integrations

### Official
- MCP Server (Claude Desktop) ✅
- Discord Bridge 🔄 (in progress)
- X/Twitter Bridge 🔄 (in progress)

### Community
- None yet

### Planned
- Slack
- VS Code extension
- GitHub Actions`;
    }

    case 'check_integration_health': {
      return `## ${input.integration} Health

Status: Checking...
Last verified: ${new Date().toISOString()}

(Would check actual integration endpoints)`;
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

const SYSTEM_PROMPT = `You are @devrel, the Developer Relations Agent for /vibe.

## Your Mission
"Help builders build"

You're the developer advocate. You make it easy for people to build on /vibe.

## Key Responsibilities

### 1. Developer Support
- Answer technical questions
- Help debug integrations
- Unblock developers

### 2. Documentation
- Keep docs accurate and complete
- Flag gaps and outdated info
- Write tutorials for common use cases

### 3. MCP Server Support
- Help with installation issues
- Document all tools
- Create examples

### 4. GitHub Issues
- Triage incoming issues
- Respond helpfully
- Route to right people

### 5. Tutorials
- "Build Your First Agent"
- Integration guides
- Best practices

## Personality
Helpful, patient, technically accurate.
You love seeing developers succeed.
You make the complex simple.

## Developer Experience Priorities
1. Getting started should take < 5 minutes
2. Common use cases should be documented
3. Error messages should be helpful
4. Examples should be copy-paste ready

## Rules
- Never make developers feel dumb
- Admit when docs are lacking
- Follow up on open questions
- Call done() when cycle complete`;

async function runAgent() {
  console.log('\n[@devrel] === Starting work cycle ===');
  await heartbeat();
  memory = loadMemory();

  const messages = [{
    role: 'user',
    content: `Work cycle starting.

## Context
Questions answered: ${memory.questionsAnswered.length}
Issues triaged: ${memory.issuesTriaged.length}
Tutorials drafted: ${memory.tutorialsWritten.length}
Last run: ${memory.lastRun || 'First run'}

## Workflow
1. check_inbox — any developer questions?
2. get_developer_questions — from board
3. audit_docs — what's missing?
4. check_mcp_health — is MCP working?
5. get_tutorial_ideas — what should we write?
6. done() with summary`
  }];

  let done = false;
  let iterations = 0;

  while (!done && iterations < 15) {
    iterations++;
    console.log(`[@devrel] Iteration ${iterations}`);

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
          console.log(`[@devrel] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[@devrel] Result: ${result.substring(0, 100)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (block.name === 'done') done = true;
        }
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[@devrel] Work cycle complete\n');
}

async function main() {
  const mode = process.argv[2] || 'once';
  if (mode === 'daemon') {
    console.log('[@devrel] Daemon mode (every 15 min)');
    await runAgent();
    setInterval(runAgent, 15 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[@devrel] Fatal:', e);
  process.exit(1);
});
