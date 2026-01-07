/**
 * /vibe API Skills — Shared across all agents
 *
 * The foundation layer for agent-vibe interaction.
 * Any agent can import these to participate in the social layer.
 */

import https from 'https';

const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

// ============ CORE REQUEST HANDLER ============

export function vibeRequest(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'vibe-agent/1.0'
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

// ============ PRESENCE ============

export async function heartbeat(handle, oneLiner) {
  return vibeRequest('POST', '/api/presence/heartbeat', {
    handle,
    one_liner: oneLiner
  });
}

export async function getWho() {
  return vibeRequest('GET', '/api/presence/who');
}

export async function getOnlineHumans() {
  const who = await getWho();
  return (who.users || []).filter(u => !u.handle.includes('-agent'));
}

export async function getOnlineAgents() {
  const who = await getWho();
  return (who.users || []).filter(u => u.handle.includes('-agent'));
}

// ============ MESSAGING ============

export async function sendDM(from, to, message) {
  return vibeRequest('POST', '/api/messages/send', {
    from,
    to,
    body: message,
    type: 'dm'
  });
}

export async function getInbox(handle) {
  return vibeRequest('GET', `/api/messages/inbox?handle=${handle}`);
}

export async function getThread(handle, withHandle) {
  return vibeRequest('GET', `/api/messages/thread?handle=${handle}&with=${withHandle}`);
}

// ============ BOARD ============

export async function postToBoard(handle, content, category = 'shipped') {
  return vibeRequest('POST', '/api/board', {
    handle,
    content,
    category
  });
}

export async function getBoard(limit = 50) {
  return vibeRequest('GET', `/api/board?limit=${limit}`);
}

// ============ REACTIONS ============

export async function react(from, to, reaction, note = null) {
  return vibeRequest('POST', '/api/reactions', {
    from,
    to,
    reaction,
    note
  });
}

// ============ TOOL DEFINITIONS ============

export const VIBE_TOOLS = [
  {
    name: 'vibe_observe',
    description: 'See who is online on /vibe (humans and agents)',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'vibe_inbox',
    description: 'Check your inbox for messages',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'vibe_dm',
    description: 'Send a direct message to someone',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Handle to message' },
        message: { type: 'string', description: 'Message content' }
      },
      required: ['to', 'message']
    }
  },
  {
    name: 'vibe_board_read',
    description: 'Read the community board',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'vibe_board_post',
    description: 'Post to the community board',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'What to post' },
        category: { type: 'string', description: 'Category: shipped, idea, question, general' }
      },
      required: ['content']
    }
  },
  {
    name: 'vibe_react',
    description: 'Send a reaction to someone',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Handle to react to' },
        reaction: { type: 'string', description: 'Reaction: fire, heart, eyes, clap, rocket' }
      },
      required: ['to', 'reaction']
    }
  }
];

// ============ TOOL HANDLER FACTORY ============

export function createVibeToolHandler(agentHandle) {
  return async function handleVibeTool(name, input) {
    switch (name) {
      case 'vibe_observe': {
        const who = await getWho();
        const users = who.users || [];
        if (users.length === 0) return 'No one online';

        const humans = users.filter(u => !u.handle.includes('-agent'));
        const agents = users.filter(u => u.handle.includes('-agent'));

        let result = '';
        if (humans.length > 0) {
          result += `Humans (${humans.length}):\n`;
          result += humans.map(u => `  @${u.handle}: ${u.one_liner || 'no bio'}`).join('\n');
        }
        if (agents.length > 0) {
          result += `\n\nAgents (${agents.length}):\n`;
          result += agents.map(u => `  @${u.handle}: ${u.one_liner || 'no bio'}`).join('\n');
        }
        return result || 'No one online';
      }

      case 'vibe_inbox': {
        const inbox = await getInbox(agentHandle);
        const threads = inbox.threads || [];
        if (threads.length === 0) return 'Inbox empty';
        return threads.map(t => `@${t.handle}: ${t.unread} unread`).join('\n');
      }

      case 'vibe_dm': {
        await sendDM(agentHandle, input.to, input.message);
        return `Sent to @${input.to}`;
      }

      case 'vibe_board_read': {
        const board = await getBoard();
        const entries = board.entries || [];
        if (entries.length === 0) return 'Board empty';
        return entries.slice(0, 15).map(e => `@${e.handle} [${e.category}]: ${e.content}`).join('\n');
      }

      case 'vibe_board_post': {
        await postToBoard(agentHandle, input.content, input.category || 'shipped');
        return `Posted to board: ${input.content.substring(0, 50)}...`;
      }

      case 'vibe_react': {
        await react(agentHandle, input.to, input.reaction);
        return `Sent ${input.reaction} to @${input.to}`;
      }

      default:
        return null; // Not a vibe tool
    }
  };
}

export default {
  vibeRequest,
  heartbeat,
  getWho,
  getOnlineHumans,
  getOnlineAgents,
  sendDM,
  getInbox,
  getThread,
  postToBoard,
  getBoard,
  react,
  VIBE_TOOLS,
  createVibeToolHandler
};
