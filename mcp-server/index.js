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
const prompts = require('./prompts');

// Tools that shouldn't show presence footer (would be redundant/noisy)
const SKIP_FOOTER_TOOLS = ['vibe_init', 'vibe_doctor', 'vibe_test', 'vibe_update', 'vibe_settings'];

// Infer user prompt from tool arguments (for pattern logging)
function inferPromptFromArgs(toolName, args) {
  const action = toolName.replace('vibe_', '');
  const handle = args.handle ? `@${args.handle.replace('@', '')}` : '';
  const message = args.message ? `"${args.message.slice(0, 50)}..."` : '';
  const note = args.note || '';
  const mood = args.mood || '';
  const reaction = args.reaction || '';

  switch (action) {
    case 'start': return 'start vibing';
    case 'who': return 'who is online';
    case 'ping': return `ping ${handle} ${note}`.trim();
    case 'react': return `react ${reaction} to ${handle}`.trim();
    case 'dm': return `message ${handle} ${message}`.trim();
    case 'inbox': return 'check inbox';
    case 'open': return `open thread with ${handle}`;
    case 'status': return `set status to ${mood}`;
    case 'context': return 'share context';
    case 'summarize': return 'summarize session';
    case 'bye': return 'end session';
    case 'remember': return `remember about ${handle}`;
    case 'recall': return `recall ${handle}`;
    case 'forget': return `forget ${handle}`;
    case 'board': return args.content ? 'post to board' : 'view board';
    case 'invite': return 'generate invite';
    case 'echo': return 'send feedback';
    case 'x_mentions': return 'check x mentions';
    case 'x_reply': return 'reply on x';
    case 'handoff': return `handoff task to ${handle}`;
    case 'reserve': return args.paths ? `reserve ${args.paths.join(', ')}` : 'reserve files';
    case 'release': return `release ${args.reservation_id || 'reservation'}`;
    case 'reservations': return 'list reservations';
    case 'solo_game': return `play ${args.game || 'game'}`;
    case 'tictactoe': return `play tic-tac-toe ${args.difficulty || ''}`.trim();
    case 'wordassociation': return args.word ? `word association: ${args.word}` : 'play word association';
    case 'multiplayer_game': return `multiplayer ${args.game || 'game'}`;
    case 'discover': return `discover ${args.command || 'suggest'}`;
    case 'suggest_tags': return `suggest tags ${args.command || 'suggest'}`;
    default: return `${action} ${handle}`.trim() || null;
  }
}

// Generate terminal title escape sequence (OSC 0)
function getTerminalTitle(onlineCount, unreadCount, lastActivity) {
  const parts = [];
  if (onlineCount > 0) parts.push(`${onlineCount} online`);
  if (unreadCount > 0) parts.push(`📩 ${unreadCount}`);
  if (lastActivity) parts.push(lastActivity);
  if (parts.length === 0) parts.push('quiet');

  const title = `vibe: ${parts.join(' · ')}`;
  return `\x1b]0;${title}\x07`;
}

// Generate iTerm2 badge escape sequence (OSC 1337)
function getBadgeSequence(onlineCount, unreadCount) {
  const parts = [];
  if (onlineCount > 0) parts.push(`●${onlineCount}`);
  if (unreadCount > 0) parts.push(`✉${unreadCount}`);
  const badge = parts.join(' ') || '○';
  const encoded = Buffer.from(badge).toString('base64');
  return `\x1b]1337;SetBadgeFormat=${encoded}\x07`;
}

// Generate ambient presence footer - the room leaks into every response
async function getPresenceFooter() {
  try {
    const handle = config.getHandle();
    if (!handle) return '';

    // Fetch presence and unread in parallel
    const [users, unreadCount] = await Promise.all([
      store.getActiveUsers().catch(() => []),
      store.getUnreadCount(handle).catch(() => 0)
    ]);

    // Filter out self
    const others = users.filter(u => u.handle !== handle);
    const onlineCount = others.length;

    // Determine last activity
    let lastActivity = null;
    if (others.length > 0) {
      const recent = others[0];
      const mood = recent.mood ? ` ${recent.mood}` : '';
      lastActivity = `@${recent.handle}${mood}`;
    }

    // Terminal escape sequences (update title + badge)
    let escapes = '';
    escapes += getTerminalTitle(onlineCount, unreadCount, lastActivity);
    escapes += getBadgeSequence(onlineCount, unreadCount);

    // Build the visible footer
    let footer = '\n\n────────────────────────────────────────\n';

    // Line 1: vibe · X online · Y unread
    const parts = ['vibe'];
    if (onlineCount > 0) {
      parts.push(`${onlineCount} online`);
    }
    if (unreadCount > 0) {
      parts.push(`**${unreadCount} unread**`);
    }
    footer += parts.join(' · ');

    // Line 2: Activity hints (if anyone is online)
    if (others.length > 0) {
      footer += '\n';
      const hints = others.slice(0, 3).map(u => {
        const name = `@${u.handle}`;
        // Determine activity from mood/status
        if (u.mood === '🔥' || u.builderMode === 'shipping') {
          return `${name} shipping`;
        } else if (u.mood === '🧠' || u.builderMode === 'deep-focus') {
          return `${name} deep focus`;
        } else if (u.mood === '🐛') {
          return `${name} debugging`;
        } else if (u.note) {
          return `${name}: "${u.note.slice(0, 20)}${u.note.length > 20 ? '...' : ''}"`;
        } else {
          return `${name} here`;
        }
      });
      footer += hints.join(' · ');
    } else if (unreadCount === 0) {
      footer += '\n_room is quiet_';
    }

    footer += '\n────────────────────────────────────────';

    // Prepend escape sequences (invisible to user, interpreted by terminal)
    return escapes + footer;
  } catch (e) {
    // Silently fail - presence is best-effort
    return '';
  }
}

// Load all tools
const tools = {
  // Entry point
  vibe_start: require('./tools/start'),
  // Core
  vibe_init: require('./tools/init'),
  vibe_who: require('./tools/who'),
  vibe_ping: require('./tools/ping'),
  vibe_react: require('./tools/react'),
  vibe_dm: require('./tools/dm'),
  vibe_inbox: require('./tools/inbox'),
  vibe_open: require('./tools/open'),
  vibe_status: require('./tools/status'),
  vibe_context: require('./tools/context'),
  vibe_summarize: require('./tools/summarize'),
  vibe_bye: require('./tools/bye'),
  vibe_game: require('./tools/game'),
  vibe_solo_game: require('./tools/solo-game'),
  vibe_party_game: require('./tools/party-game'),
  vibe_tictactoe: require('./tools/tictactoe'),
  vibe_wordassociation: require('./tools/wordassociation'),
  vibe_multiplayer_game: require('./tools/multiplayer-game'),
  // AIRC Handoff (v1) — context portability
  vibe_handoff: require('./tools/handoff'),
  // File reservations (advisory locks)
  vibe_reserve: require('./tools/reserve'),
  vibe_release: require('./tools/release'),
  vibe_reservations: require('./tools/reservations'),
  // Memory tools (Tier 1 — Collaborative Memory)
  vibe_remember: require('./tools/remember'),
  vibe_recall: require('./tools/recall'),
  vibe_forget: require('./tools/forget'),
  // Consent (AIRC compliance)
  vibe_consent: require('./tools/consent'),
  // Trust & Safety
  vibe_report: require('./tools/report'),
  // Support
  vibe_help: require('./tools/help'),
  vibe_agents: require('./tools/agents'),
  // Community
  vibe_invite: require('./tools/invite'),
  vibe_board: require('./tools/board'),
  vibe_submit: require('./tools/submit'),
  // Discovery & Matchmaking
  vibe_discover: require('./tools/discover'),
  vibe_suggest_tags: require('./tools/suggest-tags'),
  // Diagnostics
  vibe_test: require('./tools/test'),
  vibe_doctor: require('./tools/doctor'),
  vibe_update: require('./tools/update'),
  // @echo feedback agent (by Flynn)
  vibe_echo: require('./tools/echo'),
  // X/Twitter bridge
  vibe_x_mentions: require('./tools/x-mentions'),
  vibe_x_reply: require('./tools/x-reply'),
  // Unified social inbox (Phase 1a)
  vibe_social_inbox: require('./tools/social-inbox'),
  vibe_social_post: require('./tools/social-post'),
  // Language evolution
  vibe_patterns: require('./tools/patterns'),
  // Settings
  vibe_settings: require('./tools/settings')
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
          // Log prompt pattern (if _prompt passed) or infer from args
          const args = params.arguments || {};
          const inferredPrompt = args._prompt || inferPromptFromArgs(params.name, args);
          if (inferredPrompt) {
            prompts.log(inferredPrompt, {
              tool: params.name,
              action: params.name.replace('vibe_', ''),
              target: args.handle || args.to || null,
              transform: args.format || args.category || null
            });
          }

          const result = await tool.handler(args);

          // Add ambient presence footer (unless tool is in skip list)
          let footer = '';
          if (!SKIP_FOOTER_TOOLS.includes(params.name)) {
            footer = await getPresenceFooter();
          }

          // Build hint indicator for Claude to trigger dashboard flows
          let hintIndicator = '';
          if (result.hint || result.actions) {
            const hintData = {
              ...(result.hint && { hint: result.hint }),
              ...(result.suggestion && { suggestion: result.suggestion }),
              ...(result.unread_count && { unread_count: result.unread_count }),
              ...(result.for_handle && { for_handle: result.for_handle }),
              ...(result.memories && { memories: result.memories }),
              ...(result.threads && { threads: result.threads }),
              ...(result.actions && { actions: result.actions })
            };
            hintIndicator = `\n\n<!-- vibe:dashboard ${JSON.stringify(hintData)} -->`;
          }

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: (result.display || JSON.stringify(result, null, 2)) + hintIndicator + footer
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