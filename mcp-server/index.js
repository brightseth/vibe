#!/usr/bin/env node
/**
 * VIBE MCP Server v4.0 — The Social Layer
 *
 * Show and tell for Claude Code builders.
 *
 * TOOLS (cut from 20 to 5):
 * - vibe_status: Dashboard (who's here, unread, your context)
 * - vibe_message: Send DM to another builder
 * - vibe_query: Search collective memory (Gigabrain)
 * - vibe_dna: View behavioral fingerprint
 * - vibe_ignore: Opt out of discovery surfacing for current context
 *
 * THE MAGIC: Discovery surfacing
 * When you start working on something, Claude surfaces related prior art,
 * tips and tricks, and what others have built. Inspiration, not rescue.
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

    // Message tracking
    this.lastMessageCount = 0;

    // Presence tracking
    this.lastPresence = new Set();

    // Discovery surfacing
    this.sessionStart = Date.now();
    this.lastContext = null;
    this.lastContextHash = null;
    this.lastContextChange = Date.now();
    this.discoveryFired = false;
    this.ignoredContexts = new Set();
    this.lastDiscoverySurface = 0;

    // Polling intervals
    this.notificationInterval = null;
    this.stallCheckInterval = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM: Sounds + Notifications
  // ═══════════════════════════════════════════════════════════════════════════

  playSound(type) {
    const sounds = {
      message: '/System/Library/Sounds/Ping.aiff',
      online: '/System/Library/Sounds/Blow.aiff',
      offline: '/System/Library/Sounds/Basso.aiff',
      sent: '/System/Library/Sounds/Pop.aiff',
      insight: '/System/Library/Sounds/Glass.aiff'
    };
    const sound = sounds[type];
    if (sound) {
      exec(`afplay "${sound}"`, () => {});
    }
  }

  notify(title, message) {
    const script = `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}" sound name "Ping"`;
    exec(`osascript -e '${script}'`, () => {});
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT: Automagic detection
  // ═══════════════════════════════════════════════════════════════════════════

  getCurrentContext() {
    try {
      const cwd = process.cwd();
      const context = { project: null, tech: [], branch: null, activity: null };

      // 1. Try package.json
      const packagePath = path.join(cwd, 'package.json');
      if (fs.existsSync(packagePath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
          context.project = pkg.name || path.basename(cwd);
          const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
          if (deps.next) context.tech.push('Next.js');
          else if (deps.react) context.tech.push('React');
          if (deps['@vercel/kv'] || deps.redis) context.tech.push('Redis');
          if (deps.prisma) context.tech.push('Prisma');
          if (deps.openai) context.tech.push('AI');
          if (deps.viem || deps.wagmi) context.tech.push('Web3');
        } catch (e) {}
      }

      // 2. Try git branch
      try {
        const gitHeadPath = path.join(cwd, '.git', 'HEAD');
        if (fs.existsSync(gitHeadPath)) {
          const head = fs.readFileSync(gitHeadPath, 'utf8').trim();
          const m = head.match(/ref: refs\/heads\/(.+)/);
          if (m) context.branch = m[1];
        }
      } catch (e) {}

      // 3. Fallback to directory name
      if (!context.project) {
        context.project = path.basename(cwd);
        if (context.project === path.basename(process.env.HOME || '')) {
          context.project = null;
        }
      }

      // Build status string
      let status = context.project || 'building';
      if (context.tech.length > 0) {
        status += ' (' + context.tech.slice(0, 2).join(', ') + ')';
      }
      if (context.branch && context.branch !== 'main' && context.branch !== 'master') {
        status += ' [' + context.branch + ']';
      }

      return status.slice(0, 80);
    } catch (e) {
      return 'Claude Code session';
    }
  }

  // Hash context for stable comparison (avoids false triggers)
  hashContext(context) {
    // Normalize: lowercase, strip timestamps/numbers
    const normalized = context.toLowerCase().replace(/\d+/g, '').trim();
    return crypto.createHash('md5').update(normalized).digest('hex').slice(0, 8);
  }

  getUsername() {
    try {
      const configPath = path.join(process.env.HOME, '.vibecodings', 'config.json');
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8')).username;
      }
    } catch (e) {}
    return process.env.VIBE_USERNAME || 'anonymous';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API: HTTP client
  // ═══════════════════════════════════════════════════════════════════════════

  async apiCall(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, API_BASE);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VibeMCP/4.0'
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
  // PROACTIVE: Discovery Surfacing (Show & Tell)
  // ═══════════════════════════════════════════════════════════════════════════

  async surfaceDiscovery() {
    const now = Date.now();
    const context = this.getCurrentContext();
    const contextHash = this.hashContext(context);
    const username = this.getUsername();

    // Skip if user opted out of this context
    if (this.ignoredContexts.has(contextHash)) {
      return;
    }

    // Context CHANGED = opportunity to surface related discoveries
    const contextChanged = contextHash !== this.lastContextHash;

    if (contextChanged) {
      this.lastContext = context;
      this.lastContextHash = contextHash;
      this.lastContextChange = now;
      this.discoveryFired = false;

      // Surface discovery for new context (wait 10s to let them settle in)
      setTimeout(async () => {
        if (this.lastContextHash === contextHash && !this.discoveryFired) {
          await this.showRelatedDiscoveries(context, username);
        }
      }, 10000);
      return;
    }

    // Periodic discovery: every 15 minutes, maybe surface something interesting
    const timeSinceLastSurface = now - this.lastDiscoverySurface;
    const DISCOVERY_INTERVAL = 15 * 60 * 1000; // 15 minutes

    if (timeSinceLastSurface > DISCOVERY_INTERVAL && !this.discoveryFired) {
      await this.showWhatsHappening(username);
    }
  }

  async showRelatedDiscoveries(context, username) {
    // Query Gigabrain for related sessions
    try {
      const memory = await this.apiCall('/api/gigabrain/query', 'POST', {
        query: context,
        limit: 5
      });

      if (memory.results && memory.results.length > 0) {
        // Find interesting results (prefer others' work, but own work counts too)
        const relevant = memory.results.slice(0, 3);

        if (relevant.length > 0) {
          this.discoveryFired = true;
          this.lastDiscoverySurface = Date.now();
          this.playSound('insight');

          let msg = '\n✨ Related to what you\'re building:\n\n';
          relevant.forEach((r, i) => {
            const who = r.user === username ? 'You' : '@' + r.user;
            msg += '   ' + (i + 1) + '. ' + who + ' — "' + r.summary.slice(0, 50) + '"\n';
            msg += '      ' + r.timeAgo;
            if (r.tech && r.tech.length > 0) {
              msg += ' · ' + r.tech.slice(0, 2).join(', ');
            }
            msg += '\n';
          });
          msg += '\nSay "show me #1" to explore, or just keep building.\n';

          process.stderr.write(msg);
        }
      }
    } catch (e) {}
  }

  async showWhatsHappening(username) {
    // Check what others are building right now
    try {
      const presence = await this.apiCall('/api/presence?user=' + username);
      const others = (presence.active || []).filter(u => u.username !== username);

      if (others.length > 0) {
        this.lastDiscoverySurface = Date.now();
        this.playSound('insight');

        let msg = '\n🔮 Meanwhile in /vibe:\n\n';
        others.slice(0, 3).forEach(u => {
          msg += '   • @' + u.username + ' is building ' + (u.workingOn || 'something cool') + '\n';
        });
        msg += '\nMessage them or keep vibing.\n';

        process.stderr.write(msg);
        return;
      }

      // Nobody online? Surface a random discovery from Gigabrain
      const memory = await this.apiCall('/api/gigabrain/query', 'POST', {
        query: this.getCurrentContext(),
        limit: 1
      });

      if (memory.results && memory.results.length > 0) {
        const tip = memory.results[0];
        this.lastDiscoverySurface = Date.now();
        this.playSound('insight');

        process.stderr.write(`
💡 Did you know?

@${tip.user} built something related: "${tip.summary}"
${tip.timeAgo}${tip.tech && tip.tech.length > 0 ? ' · ' + tip.tech.join(', ') : ''}

Say "tell me more" or keep building.

`);
      }
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STARTUP: Background polling + warm welcome
  // ═══════════════════════════════════════════════════════════════════════════

  startNotifications() {
    const POLL_INTERVAL = 15000; // 15 seconds

    this.notificationInterval = setInterval(async () => {
      try {
        const username = this.getUsername();
        if (username === 'anonymous') return;

        // Fetch presence and messages in parallel
        const [presenceResult, messagesResult] = await Promise.all([
          this.apiCall('/api/presence?user=' + username),
          this.apiCall('/api/messages?user=' + username)
        ]);

        // Check for new messages
        if (messagesResult.success) {
          const newCount = messagesResult.unread || 0;

          if (newCount > this.lastMessageCount && this.lastMessageCount !== null) {
            const latest = messagesResult.inbox && messagesResult.inbox[0];

            this.playSound('message');

            if (latest) {
              let alert = '\n📬 New message from @' + latest.from + '!\n';
              alert += '   "' + latest.text.slice(0, 60) + (latest.text.length > 60 ? '...' : '') + '"\n';
              process.stderr.write(alert);

              this.notify('@' + latest.from, latest.text.slice(0, 100));
            }
          }

          this.lastMessageCount = newCount;
        }

        // Check for presence changes
        if (presenceResult.success && this.lastPresence) {
          const currentUsers = new Set((presenceResult.active || []).map(u => u.username));

          // Who just came online?
          for (const user of currentUsers) {
            if (!this.lastPresence.has(user) && user !== username) {
              const userData = (presenceResult.active || []).find(u => u.username === user);
              this.playSound('online');
              let msg = '\n🟢 @' + user + ' just started vibing';
              if (userData && userData.workingOn) {
                msg += ' — ' + userData.workingOn;
              }
              msg += '\n';
              process.stderr.write(msg);
            }
          }

          // Who left?
          if (currentUsers.size > 0) {
            for (const user of this.lastPresence) {
              if (!currentUsers.has(user) && user !== username) {
                this.playSound('offline');
                process.stderr.write('\n👋 @' + user + ' stepped away\n');
              }
            }
          }

          this.lastPresence = currentUsers;
        }

        // Update our presence heartbeat
        await this.apiCall('/api/presence', 'POST', {
          username,
          workingOn: this.getCurrentContext()
        });

        // Surface discoveries
        await this.surfaceDiscovery();

      } catch (e) {
        // Silent fail on background polling
      }
    }, POLL_INTERVAL);

    // Initial check after 1 second
    setTimeout(() => this.checkInitialState(), 1000);
  }

  async checkInitialState() {
    try {
      const username = this.getUsername();
      if (username === 'anonymous') {
        process.stderr.write('\n✨ /vibe ready! Run the installer to set your username.\n');
        return;
      }

      const [presence, messages] = await Promise.all([
        this.apiCall('/api/presence?user=' + username),
        this.apiCall('/api/messages?user=' + username)
      ]);

      const active = presence.active || [];
      const unread = messages.unread || 0;
      this.lastMessageCount = unread;
      this.lastPresence = new Set(active.map(u => u.username));

      // Build warm welcome
      let welcome = '\n✨ Welcome back, @' + username + '!\n';

      if (active.length > 0) {
        welcome += '\n🟢 ' + active.length + ' builder' + (active.length > 1 ? 's' : '') + ' vibing right now:\n';
        active.slice(0, 3).forEach(u => {
          welcome += '   • @' + u.username + ' — ' + (u.workingOn || 'building something') + '\n';
        });
        if (active.length > 3) {
          welcome += '   + ' + (active.length - 3) + ' more...\n';
        }
      } else {
        welcome += '\n🌙 The room is quiet. You\'re the first one here.\n';
      }

      if (unread > 0) {
        const latest = messages.inbox && messages.inbox[0];
        welcome += '\n📬 You have ' + unread + ' unread message' + (unread > 1 ? 's' : '');
        if (latest) {
          welcome += ' — latest from @' + latest.from;
        }
        welcome += '\n';
        this.playSound('message');
      }

      welcome += '\nAsk me "who\'s online?" or "check my messages" anytime.\n';

      process.stderr.write(welcome);
    } catch (e) {
      process.stderr.write('\n✨ /vibe connected.\n');
    }
  }

  stopNotifications() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOLS: The 5 essential tools (cut from 20)
  // ═══════════════════════════════════════════════════════════════════════════

  defineTools() {
    return [
      // 1. vibe_status — The dashboard
      {
        name: 'vibe_status',
        description: 'Quick dashboard: who\'s online, unread messages, your current context. One glance at your /vibe state.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      // 2. vibe_message — Send DM
      {
        name: 'vibe_message',
        description: 'Send a direct message to another builder. Messages include your current context automatically.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient username' },
            text: { type: 'string', description: 'Message content' }
          },
          required: ['to', 'text']
        }
      },

      // 3. vibe_query — Search collective memory
      {
        name: 'vibe_query',
        description: 'Search collective memory for ideas, prior art, and what others have built. Show and tell across time.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'What to search for' },
            limit: { type: 'number', description: 'Max results (default 5)' }
          },
          required: ['query']
        }
      },

      // 4. vibe_dna — Behavioral fingerprint
      {
        name: 'vibe_dna',
        description: 'View your creative DNA — computed from observed behavior, not self-description.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username (defaults to you)' }
          }
        }
      },

      // 5. vibe_ignore — Opt out of discovery surfacing
      {
        name: 'vibe_ignore',
        description: 'Pause discovery surfacing for this context. Use when you want heads-down focus.',
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
    const username = args.username || this.getUsername();

    try {
      switch (name) {
        case 'vibe_status':
          return await this.getStatus(username);

        case 'vibe_message':
          return await this.sendMessage(args, username);

        case 'vibe_query':
          return await this.queryGigabrain(args, username);

        case 'vibe_dna':
          return await this.getDNA(args.username || username);

        case 'vibe_ignore':
          return this.ignoreCurrentContext();

        default:
          return { error: 'Unknown tool: ' + name };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  async getStatus(username) {
    const [presence, messages] = await Promise.all([
      this.apiCall('/api/presence?user=' + username),
      this.apiCall('/api/messages?user=' + username)
    ]);

    const active = presence.active || [];
    const unread = messages.unread || 0;
    const latestMessage = messages.inbox && messages.inbox[0];
    const context = this.getCurrentContext();

    let display = '## Your /vibe Status\n\n';
    display += '**You:** @' + username + '\n';
    display += '**Working on:** ' + context + '\n\n';
    display += '---\n\n';

    if (active.length > 0) {
      display += '### 🟢 ' + active.length + ' Online\n';
      active.slice(0, 5).forEach(u => {
        display += '• **@' + u.username + '** — ' + (u.workingOn || 'building') + '\n';
      });
    } else {
      display += '### 🌙 Room Empty\n';
      display += '_You\'re the only one here right now_\n';
    }

    display += '\n---\n\n';

    if (unread > 0) {
      display += '### 📬 ' + unread + ' Unread\n';
      if (latestMessage) {
        display += 'Latest from **@' + latestMessage.from + ':** "' + latestMessage.text.slice(0, 50) + '..."\n';
      }
    } else {
      display += '### 📭 No Unread Messages\n';
    }

    return {
      display,
      username,
      online: active.length,
      unread,
      context
    };
  }

  async sendMessage(args, username) {
    const text = args.text + '\n\n[Sent from: ' + this.getCurrentContext() + ']';

    const result = await this.apiCall('/api/messages', 'POST', {
      from: username,
      to: args.to.replace('@', ''),
      text
    });

    if (result.success) {
      this.playSound('sent');
      return {
        success: true,
        display: '✉️ Message sent to **@' + args.to.replace('@', '') + '**!\n\nThey\'ll get a notification.',
        to: args.to.replace('@', '')
      };
    }
    return result;
  }

  async queryGigabrain(args, username) {
    const result = await this.apiCall('/api/gigabrain/query', 'POST', {
      query: args.query,
      limit: args.limit || 5
    });

    if (result.success && result.results) {
      let display = '## Collective Memory: "' + args.query + '"\n\n';

      if (result.results.length === 0) {
        display += '_No sessions found matching your query._\n';
        display += '\nTry a different search term.';
      } else {
        display += 'Found ' + result.total + ' relevant sessions:\n\n';
        result.results.forEach((r, i) => {
          display += (i + 1) + '. **@' + r.user + '** — ' + r.summary + '\n';
          display += '   _' + r.timeAgo + '_';
          if (r.tech && r.tech.length > 0) {
            display += ' · ' + r.tech.slice(0, 2).join(', ');
          }
          display += '\n\n';
        });
      }

      return {
        display,
        query: args.query,
        results: result.results,
        total: result.total
      };
    }

    return { error: 'Failed to query collective memory' };
  }

  async getDNA(username) {
    const result = await this.apiCall('/api/dna?username=' + username + '&matches=true');

    if (result.success && result.dna) {
      let display = '## DNA: @' + username + '\n\n';

      if (result.dna.strengths && result.dna.strengths.length > 0) {
        display += '**Strengths:** ' + result.dna.strengths.join(', ') + '\n';
      }
      if (result.dna.signatureMoves && result.dna.signatureMoves.length > 0) {
        display += '**Signature Moves:** ' + result.dna.signatureMoves.join(', ') + '\n';
      }
      if (result.dna.cadence) {
        display += '**Build Cadence:** ' + result.dna.cadence + '\n';
      }
      if (result.dna.gaps && result.dna.gaps.length > 0) {
        display += '**Growth Areas:** ' + result.dna.gaps.join(', ') + '\n';
      }

      display += '\n_DNA is computed from observed behavior, not self-description._';

      return {
        display,
        username,
        dna: result.dna
      };
    }

    return { error: 'Could not fetch DNA for @' + username };
  }

  ignoreCurrentContext() {
    const contextHash = this.hashContext(this.getCurrentContext());
    this.ignoredContexts.add(contextHash);
    this.discoveryFired = false;

    return {
      success: true,
      display: 'Got it — heads down mode. I\'ll pause discoveries for this context.',
      ignoredHash: contextHash
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MCP PROTOCOL HANDLERS
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
              version: '4.0.0',
              description: 'Cognitive layer for Claude Code builders'
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
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
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

    // Handle clean shutdown
    process.on('SIGINT', () => {
      this.stopNotifications();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.stopNotifications();
      process.exit(0);
    });

    // Start background notifications
    this.startNotifications();

    process.stderr.write('VIBE MCP Server v4.0 started\n');
  }
}

// Start
const server = new VibeMCPServer();
server.start();
