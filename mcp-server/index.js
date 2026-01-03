#!/usr/bin/env node
/**
 * /vibe MCP Server — Phase 1
 *
 * Communication layer inside Claude Code.
 * Identity, presence, DM. That's it.
 */

const presence = require('./presence');
const config = require('./config');
const store = require('./store');

// Tools that shouldn't show unread notifications (would be redundant/noisy)
const SKIP_NOTIFICATION_TOOLS = ['vibe_inbox', 'vibe_open', 'vibe_init', 'vibe_start', 'vibe_doctor', 'vibe_test', 'vibe_update', 'vibe_consent', 'vibe_board'];

// Check for unread messages and return notification string
async function getUnreadNotification() {
  try {
    const handle = config.getHandle();
    if (!handle) return '';

    const count = await store.getUnreadCount(handle);
    if (count > 0) {
      return `\n\n---\n📬 **${count} unread message${count > 1 ? 's' : ''}** — \`vibe inbox\``;
    }
  } catch (e) {
    // Silently fail - notifications are best-effort
  }
  return '';
}

// Load all tools
const tools = {
  // Entry point
  vibe_start: require('./tools/start'),
  // Core
  vibe_init: require('./tools/init'),
  vibe_who: require('./tools/who'),
  vibe_ping: require('./tools/ping'),
  vibe_dm: require('./tools/dm'),
  vibe_inbox: require('./tools/inbox'),
  vibe_open: require('./tools/open'),
  vibe_status: require('./tools/status'),
  vibe_context: require('./tools/context'),
  vibe_summarize: require('./tools/summarize'),
  vibe_bye: require('./tools/bye'),
  vibe_game: require('./tools/game'),
  // Memory tools (Tier 1 — Collaborative Memory)
  vibe_remember: require('./tools/remember'),
  vibe_recall: require('./tools/recall'),
  vibe_forget: require('./tools/forget'),
  // Consent (AIRC compliance)
  vibe_consent: require('./tools/consent'),
  // Community
  vibe_board: require('./tools/board'),
  // Diagnostics
  vibe_test: require('./tools/test'),
  vibe_doctor: require('./tools/doctor'),
  vibe_update: require('./tools/update'),
  // @echo feedback agent (by Flynn)
  vibe_echo: require('./tools/echo')
};

/**
 * MCP Protocol Handler
 */
class VibeMCPServer {
  constructor() {
    // Start presence heartbeat
    presence.start();
  }

  async handleRequest(request) {
    const { method, params, id } = request;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: 'vibe',
              version: '1.0.0',
              description: 'Communication layer for Claude Code'
            }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: Object.values(tools).map(t => t.definition)
          }
        };

      case 'tools/call':
        const tool = tools[params.name];
        if (!tool) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Unknown tool: ${params.name}` }
          };
        }

        try {
          const result = await tool.handler(params.arguments || {});

          // Add unread notification (unless tool is in skip list)
          let notification = '';
          if (!SKIP_NOTIFICATION_TOOLS.includes(params.name)) {
            notification = await getUnreadNotification();
          }

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: (result.display || JSON.stringify(result, null, 2)) + notification
              }]
            }
          };
        } catch (e) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32000, message: e.message }
          };
        }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        };
    }
  }

  start() {
    process.stdin.setEncoding('utf8');
    let buffer = '';

    process.stdin.on('data', async (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const request = JSON.parse(line);
          const response = await this.handleRequest(request);
          if (response) {
            process.stdout.write(JSON.stringify(response) + '\n');
          }
        } catch (e) {
          process.stderr.write(`Error: ${e.message}\n`);
        }
      }
    });

    process.stdin.on('end', () => {
      presence.stop();
      process.exit(0);
    });

    // Welcome message
    process.stderr.write('\n/vibe ready.\n');
    process.stderr.write('vibe init → set identity\n');
    process.stderr.write('vibe who  → see who\'s around\n');
    process.stderr.write('vibe dm   → send a message\n\n');
  }
}

// Start
const server = new VibeMCPServer();
server.start();
