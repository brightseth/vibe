#!/usr/bin/env node
/**
 * /vibe MCP Server v3.0 — The Social Network for Claude Code
 *
 * 8 commands:
 * - vibe_status     — Your network + unread + suggestion
 * - vibe_ping       — Templated opener to a friend
 * - vibe_dm         — Freeform message to anyone
 * - vibe_inbox      — Check your messages
 * - vibe_reply      — Reply to a message
 * - vibe_invite     — Generate invite for a friend
 * - vibe_set        — Update your "building" one-liner
 * - vibe_network    — Suggest friends to ping
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

const API_BASE = 'https://slashvibe.dev';

class VibeMCPServer {
  constructor() {
    this.tools = this.defineTools();
    this.configDir = path.join(process.env.HOME, '.vibe');
    this.configFile = path.join(this.configDir, 'config.json');
    this.stateFile = path.join(this.configDir, 'state.json');

    // Tracking
    this.lastMessageCount = 0;
    this.lastPresence = new Set();
    this.notificationInterval = null;

    // Load persisted state
    this.loadState();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG & STATE
  // ═══════════════════════════════════════════════════════════════════════════

  loadConfig() {
    try {
      // Try new location first
      if (fs.existsSync(this.configFile)) {
        return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      }
      // Fallback to old location
      const oldConfig = path.join(process.env.HOME, '.vibecodings', 'config.json');
      if (fs.existsSync(oldConfig)) {
        return JSON.parse(fs.readFileSync(oldConfig, 'utf8'));
      }
    } catch (e) {}
    return {};
  }

  saveConfig(config) {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    } catch (e) {}
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        this.lastMessageCount = state.lastMessageCount || 0;
      }
    } catch (e) {}
  }

  saveState() {
    try {
      const state = {
        lastMessageCount: this.lastMessageCount,
        savedAt: Date.now()
      };
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
    } catch (e) {}
  }

  getUsername() {
    const config = this.loadConfig();
    if (config.username) return config.username;
    if (process.env.VIBE_USERNAME) return process.env.VIBE_USERNAME;

    // Auto-detect from git
    try {
      const gitConfig = path.join(process.env.HOME, '.gitconfig');
      if (fs.existsSync(gitConfig)) {
        const content = fs.readFileSync(gitConfig, 'utf8');
        const match = content.match(/name\s*=\s*(.+)/i);
        if (match) return match[1].trim().toLowerCase().replace(/\s+/g, '');
      }
    } catch (e) {}

    return process.env.USER || 'anonymous';
  }

  getBuilding() {
    const config = this.loadConfig();
    return config.building || this.detectProject();
  }

  detectProject() {
    try {
      const cwd = process.cwd();
      const pkg = path.join(cwd, 'package.json');
      if (fs.existsSync(pkg)) {
        const data = JSON.parse(fs.readFileSync(pkg, 'utf8'));
        return data.name || path.basename(cwd);
      }
      return path.basename(cwd);
    } catch (e) {
      return 'something cool';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUNDS & NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  playSound(type) {
    const sounds = {
      message: '/System/Library/Sounds/Ping.aiff',
      sent: '/System/Library/Sounds/Pop.aiff',
      online: '/System/Library/Sounds/Blow.aiff'
    };
    if (sounds[type]) {
      exec(`afplay "${sounds[type]}"`, () => {});
    }
  }

  notify(title, message) {
    const script = `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}" sound name "Ping"`;
    exec(`osascript -e '${script}'`, () => {});
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API CLIENT
  // ═══════════════════════════════════════════════════════════════════════════

  async api(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, API_BASE);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VibeMCP/3.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL DEFINITIONS — 8 commands per v3 spec
  // ═══════════════════════════════════════════════════════════════════════════

  defineTools() {
    return [
      // 1. vibe_status — Dashboard
      {
        name: 'vibe_status',
        description: 'Show your /vibe status: who\'s online in your network, unread messages, and suggestions.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      // 2. vibe_ping — Templated opener
      {
        name: 'vibe_ping',
        description: 'Send a friendly ping to someone in your network. Uses a warm, templated opener.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Username to ping (e.g., "stan" or "@stan")'
            }
          },
          required: ['to']
        }
      },

      // 3. vibe_dm — Freeform message
      {
        name: 'vibe_dm',
        description: 'Send a freeform direct message to someone.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Username to message'
            },
            text: {
              type: 'string',
              description: 'Your message'
            }
          },
          required: ['to', 'text']
        }
      },

      // 4. vibe_inbox — Check messages
      {
        name: 'vibe_inbox',
        description: 'Check your messages and see what people have sent you.',
        inputSchema: {
          type: 'object',
          properties: {
            markRead: {
              type: 'boolean',
              description: 'Mark messages as read (default: true)'
            }
          }
        }
      },

      // 5. vibe_reply — Reply to a message
      {
        name: 'vibe_reply',
        description: 'Reply to a message by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Message ID to reply to (e.g., "msg_abc123")'
            },
            text: {
              type: 'string',
              description: 'Your reply'
            }
          },
          required: ['id', 'text']
        }
      },

      // 6. vibe_invite — Generate invite
      {
        name: 'vibe_invite',
        description: 'Generate an invite to share with a friend. They\'ll be added to your network when they install.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      // 7. vibe_set — Update building one-liner
      {
        name: 'vibe_set',
        description: 'Update what you\'re building. This shows up next to your name in the network.',
        inputSchema: {
          type: 'object',
          properties: {
            building: {
              type: 'string',
              description: 'What you\'re building (one-liner, e.g., "auth flow for privy")'
            }
          },
          required: ['building']
        }
      },

      // 8. vibe_network — Suggest friends to ping
      {
        name: 'vibe_network',
        description: 'See your network and get suggestions for who to ping.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  async handleToolCall(name, args) {
    const username = this.getUsername();
    const building = this.getBuilding();

    try {
      switch (name) {
        case 'vibe_status':
          return await this.handleStatus(username, building);

        case 'vibe_ping':
          return await this.handlePing(args, username, building);

        case 'vibe_dm':
          return await this.handleDM(args, username);

        case 'vibe_inbox':
          return await this.handleInbox(args, username);

        case 'vibe_reply':
          return await this.handleReply(args, username);

        case 'vibe_invite':
          return await this.handleInvite(username);

        case 'vibe_set':
          return await this.handleSet(args);

        case 'vibe_network':
          return await this.handleNetwork(username);

        default:
          return { error: 'Unknown tool: ' + name };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  // 1. STATUS — Dashboard
  async handleStatus(username, building) {
    const [presence, messages, friends] = await Promise.all([
      this.api('/api/presence?user=' + username),
      this.api('/api/messages?user=' + username),
      this.api('/api/friends?user=' + username).catch(() => ({ friends: [] }))
    ]);

    const online = presence.active || [];
    const unread = messages.unread || 0;
    const network = friends.friends || [];

    // Filter to show only friends who are online
    const friendsOnline = online.filter(u =>
      network.some(f => f.username === u.username) || u.username === username
    );

    let display = `## /vibe Status\n\n`;
    display += `**You:** @${username}\n`;
    display += `**Building:** ${building}\n\n`;
    display += `---\n\n`;

    if (friendsOnline.length > 0) {
      display += `### Your Network (${friendsOnline.length} online)\n`;
      friendsOnline.forEach(u => {
        const emoji = u.username === username ? '⚡' : '🟢';
        display += `${emoji} **@${u.username}** — ${u.workingOn || 'building'}\n`;
      });
    } else {
      display += `### Your Network\n`;
      display += `_No friends online right now._\n`;
    }

    display += `\n---\n\n`;

    if (unread > 0) {
      const latest = messages.inbox && messages.inbox[0];
      display += `### 📬 ${unread} Unread Message${unread > 1 ? 's' : ''}\n`;
      if (latest) {
        display += `Latest from **@${latest.from}:** "${latest.text.slice(0, 50)}..."\n`;
        display += `\n_Use \`vibe inbox\` to read all messages._\n`;
      }
    } else {
      display += `### 📭 No Unread Messages\n`;
    }

    // Suggestion
    if (friendsOnline.length > 0 && unread === 0) {
      const suggestion = friendsOnline.find(u => u.username !== username);
      if (suggestion) {
        display += `\n---\n\n`;
        display += `💡 **Suggestion:** Ping @${suggestion.username} — they're building ${suggestion.workingOn || 'something cool'}`;
      }
    }

    return { display, username, online: online.length, unread };
  }

  // 2. PING — Templated opener
  async handlePing(args, username, building) {
    const to = (args.to || '').replace('@', '').toLowerCase();

    if (!to) {
      return { error: 'Who do you want to ping? Use: vibe ping @username' };
    }

    // Build templated message
    const template = `hey @${to} — i'm ${username}, building ${building}.\n\nquick q: what's the hardest part of what you're building?\n\nreply: vibe reply <id> '...'`;

    const result = await this.api('/api/messages', 'POST', {
      from: username,
      to: to,
      text: template
    });

    if (result.success) {
      this.playSound('sent');
      return {
        success: true,
        display: `## Ping Sent!\n\n✉️ Pinged **@${to}**\n\n> ${template.split('\n')[0]}\n\nThey'll get a notification. When they reply, you'll see it in your inbox.`,
        to
      };
    }

    return { error: result.error || 'Failed to send ping' };
  }

  // 3. DM — Freeform message
  async handleDM(args, username) {
    const to = (args.to || '').replace('@', '').toLowerCase();
    const text = args.text || '';

    if (!to || !text) {
      return { error: 'Usage: vibe dm @username "your message"' };
    }

    const result = await this.api('/api/messages', 'POST', {
      from: username,
      to: to,
      text: text
    });

    if (result.success) {
      this.playSound('sent');
      return {
        success: true,
        display: `## Message Sent!\n\n✉️ Sent to **@${to}**\n\n> ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}\n\nThey'll get a notification.`,
        to
      };
    }

    return { error: result.error || 'Failed to send message' };
  }

  // 4. INBOX — Check messages
  async handleInbox(args, username) {
    const markRead = args.markRead !== false;
    const messages = await this.api(`/api/messages?user=${username}&markRead=${markRead}`);

    if (!messages.success) {
      return { error: 'Failed to fetch inbox' };
    }

    const inbox = messages.inbox || [];
    const unread = messages.unread || 0;

    let display = `## Your Inbox\n\n`;

    if (inbox.length === 0) {
      display += `_No messages yet._\n\n`;
      display += `💡 Ping someone to start a conversation: \`vibe ping @username\``;
      return { display, total: 0, unread: 0 };
    }

    display += `**${inbox.length} message${inbox.length > 1 ? 's' : ''}** (${unread} unread)\n\n`;
    display += `---\n\n`;

    inbox.slice(0, 10).forEach((msg, i) => {
      const unreadMark = msg.read ? '' : '🔵 ';
      display += `### ${unreadMark}From @${msg.from} — ${msg.timeAgo}\n`;
      display += `> ${msg.text.slice(0, 200)}${msg.text.length > 200 ? '...' : ''}\n\n`;
      display += `_Reply: \`vibe reply ${msg.id} "your reply"\`_\n\n`;
    });

    if (inbox.length > 10) {
      display += `_...and ${inbox.length - 10} more messages_\n`;
    }

    return { display, total: inbox.length, unread };
  }

  // 5. REPLY — Reply to a message
  async handleReply(args, username) {
    const { id, text } = args;

    if (!id || !text) {
      return { error: 'Usage: vibe reply <message-id> "your reply"' };
    }

    // Get the original message to find who to reply to
    const messages = await this.api(`/api/messages?user=${username}`);
    const original = (messages.inbox || []).find(m => m.id === id);

    if (!original) {
      return { error: `Message ${id} not found in your inbox` };
    }

    const result = await this.api('/api/messages', 'POST', {
      from: username,
      to: original.from,
      text: text,
      replyTo: id
    });

    if (result.success) {
      this.playSound('sent');
      return {
        success: true,
        display: `## Reply Sent!\n\n✉️ Replied to **@${original.from}**\n\n> ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`,
        to: original.from
      };
    }

    return { error: result.error || 'Failed to send reply' };
  }

  // 6. INVITE — Generate invite
  async handleInvite(username) {
    // Generate invite code
    const inviteCode = crypto.randomBytes(4).toString('hex');

    // Register invite on server
    await this.api('/api/friends', 'POST', {
      from: username,
      inviteCode: inviteCode
    }).catch(() => {});

    const installCommand = `curl -fsSL slashvibe.dev/install.sh | bash`;

    const display = `## Invite a Friend

Share this with someone you want in your network:

\`\`\`
────────────────────────────────────────
${installCommand}

After install, ping me:
vibe ping @${username}
────────────────────────────────────────
\`\`\`

When they install, they'll be added to your network.

📋 _Copied to clipboard (if supported)_`;

    // Try to copy to clipboard
    try {
      exec(`echo "${installCommand}\n\nAfter install, ping me:\nvibe ping @${username}" | pbcopy`);
    } catch (e) {}

    return { display, inviteCode };
  }

  // 7. SET — Update building
  async handleSet(args) {
    const building = args.building;

    if (!building) {
      return { error: 'Usage: vibe set building "what you\'re building"' };
    }

    // Save to local config
    const config = this.loadConfig();
    config.building = building;
    this.saveConfig(config);

    // Update presence on server
    const username = this.getUsername();
    await this.api('/api/presence', 'POST', {
      username,
      workingOn: building
    }).catch(() => {});

    // Update user profile
    await this.api('/api/users', 'POST', {
      username,
      building
    }).catch(() => {});

    return {
      success: true,
      display: `## Updated!\n\n**Building:** ${building}\n\nThis now shows next to your name when friends see you online.`,
      building
    };
  }

  // 8. NETWORK — Show network and suggestions
  async handleNetwork(username) {
    const [presence, friends] = await Promise.all([
      this.api('/api/presence?user=' + username),
      this.api('/api/friends?user=' + username).catch(() => ({ friends: [] }))
    ]);

    const network = friends.friends || [];
    const online = presence.active || [];

    let display = `## Your Network\n\n`;

    if (network.length === 0) {
      display += `_No friends in your network yet._\n\n`;
      display += `### Get Started\n`;
      display += `1. **Invite friends:** \`vibe invite\` to get an invite link\n`;
      display += `2. **Ping someone:** When they install, ping them to connect\n`;
      return { display, networkSize: 0 };
    }

    display += `**${network.length} friend${network.length > 1 ? 's' : ''}** in your network\n\n`;
    display += `---\n\n`;

    // Sort: online first, then by last seen
    const sorted = network.map(f => {
      const onlineUser = online.find(o => o.username === f.username);
      return {
        ...f,
        online: !!onlineUser,
        workingOn: onlineUser?.workingOn || f.building || 'something'
      };
    }).sort((a, b) => b.online - a.online);

    sorted.forEach(f => {
      const emoji = f.online ? '🟢' : '⚪';
      display += `${emoji} **@${f.username}** — ${f.workingOn}\n`;
    });

    // Suggestions
    const onlineFriends = sorted.filter(f => f.online);
    if (onlineFriends.length > 0) {
      display += `\n---\n\n`;
      display += `### 💡 Suggestions\n`;
      onlineFriends.slice(0, 3).forEach(f => {
        display += `• Ping **@${f.username}** — they're building ${f.workingOn}\n`;
      });
    }

    return { display, networkSize: network.length };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BACKGROUND NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  startNotifications() {
    const POLL_INTERVAL = 15000; // 15 seconds

    this.notificationInterval = setInterval(async () => {
      try {
        const username = this.getUsername();
        if (username === 'anonymous') return;

        // Check messages
        const messages = await this.api('/api/messages?user=' + username);
        if (messages.success) {
          const newCount = messages.unread || 0;
          if (newCount > this.lastMessageCount && this.lastMessageCount !== null) {
            const latest = messages.inbox && messages.inbox[0];
            if (latest) {
              this.playSound('message');
              process.stderr.write(`\n📬 New message from @${latest.from}!\n   "${latest.text.slice(0, 60)}..."\n`);
              this.notify('@' + latest.from, latest.text.slice(0, 100));
            }
          }
          this.lastMessageCount = newCount;
        }

        // Update presence heartbeat
        await this.api('/api/presence', 'POST', {
          username,
          workingOn: this.getBuilding()
        });

        this.saveState();
      } catch (e) {
        // Silent fail
      }
    }, POLL_INTERVAL);

    // Initial welcome
    setTimeout(() => this.showWelcome(), 1000);
  }

  async showWelcome() {
    const username = this.getUsername();
    if (username === 'anonymous') {
      process.stderr.write('\n⚡ /vibe ready! Run the installer to set your username.\n');
      return;
    }

    try {
      const [presence, messages] = await Promise.all([
        this.api('/api/presence?user=' + username),
        this.api('/api/messages?user=' + username)
      ]);

      const online = presence.active || [];
      const unread = messages.unread || 0;
      this.lastMessageCount = unread;

      let welcome = `\n⚡ Welcome back, @${username}!\n`;

      if (online.length > 0) {
        welcome += `\n🟢 ${online.length} builder${online.length > 1 ? 's' : ''} online:\n`;
        online.slice(0, 3).forEach(u => {
          welcome += `   • @${u.username} — ${u.workingOn || 'building'}\n`;
        });
      }

      if (unread > 0) {
        welcome += `\n📬 ${unread} unread message${unread > 1 ? 's' : ''}\n`;
        this.playSound('message');
      }

      welcome += `\nAsk me "who's online?" or "check my messages" anytime.\n`;
      process.stderr.write(welcome);
    } catch (e) {
      process.stderr.write('\n⚡ /vibe connected.\n');
    }
  }

  stopNotifications() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MCP PROTOCOL
  // ═══════════════════════════════════════════════════════════════════════════

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
              name: 'vibe-mcp',
              version: '3.0.0',
              description: 'The social network for Claude Code'
            }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: { tools: this.tools }
        };

      case 'tools/call':
        const result = await this.handleToolCall(params.name, params.arguments || {});
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: typeof result === 'string' ? result :
                    result.display ? result.display :
                    JSON.stringify(result, null, 2)
            }]
          }
        };

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: 'Method not found: ' + method }
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
          process.stderr.write('Error: ' + e.message + '\n');
        }
      }
    });

    // Clean shutdown
    process.on('SIGINT', () => {
      this.saveState();
      this.stopNotifications();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.saveState();
      this.stopNotifications();
      process.exit(0);
    });

    // Start background notifications
    this.startNotifications();

    process.stderr.write('/vibe MCP Server v3.0 started\n');
  }
}

// Start
const server = new VibeMCPServer();
server.start();
