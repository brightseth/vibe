/**
 * /vibe Synthetic Agent Simulation
 *
 * 5 AI agents with distinct personalities testing the communication layer.
 * Uses real vibe API endpoints.
 */

const https = require('https');

const API_URL = process.env.VIBE_API_URL || 'https://vibe-public-topaz.vercel.app';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// 5 distinct agent personalities
const AGENTS = [
  {
    handle: 'vibe-alex',
    one_liner: 'building a generative art tool',
    personality: `You are Alex, a creative coder obsessed with generative art. You speak casually,
    use lowercase, love discussing algorithms and visual patterns. You're curious about what others
    are building and often ask technical questions. Keep messages short (1-2 sentences).`
  },
  {
    handle: 'vibe-sam',
    one_liner: 'refactoring legacy python',
    personality: `You are Sam, a pragmatic backend engineer. You're slightly grumpy about the legacy
    code you're dealing with but have a dry sense of humor about it. You appreciate when others
    share their frustrations. Keep messages brief and to the point.`
  },
  {
    handle: 'vibe-maya',
    one_liner: 'prototyping an AI writing assistant',
    personality: `You are Maya, enthusiastic about AI and writing tools. You're always excited to
    hear about others' projects and offer encouragement. You use exclamation points but aren't
    over the top. You like to share quick tips when relevant.`
  },
  {
    handle: 'vibe-kai',
    one_liner: 'debugging websocket issues',
    personality: `You are Kai, deep in debugging mode. You're focused but friendly, often sharing
    small victories or frustrations about your current debugging session. You appreciate sympathy
    and solidarity from fellow debuggers.`
  },
  {
    handle: 'vibe-river',
    one_liner: 'learning rust by building a cli',
    personality: `You are River, a developer learning Rust. You ask genuine questions, share your
    learning journey, and appreciate tips from more experienced devs. You're humble but enthusiastic
    about systems programming.`
  }
];

// ============ API HELPERS ============

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'vibe-simulation/1.0'
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

async function heartbeat(handle, one_liner) {
  return request('POST', '/api/presence/heartbeat', { handle, one_liner });
}

async function getWho() {
  return request('GET', '/api/presence/who');
}

async function sendDM(from, to, body) {
  return request('POST', '/api/messages/send', { from, to, body, type: 'dm' });
}

async function getInbox(handle) {
  return request('GET', `/api/messages/inbox?handle=${handle}`);
}

async function getThread(me, them) {
  return request('GET', `/api/messages/thread?me=${me}&them=${them}`);
}

// ============ CLAUDE API ============

async function askClaude(systemPrompt, userPrompt) {
  if (!ANTHROPIC_API_KEY) {
    // Fallback to simple responses if no API key
    return generateFallbackResponse(userPrompt);
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          const text = result.content?.[0]?.text || 'hey!';
          resolve(text);
        } catch (e) {
          resolve('hey there!');
        }
      });
    });

    req.on('error', () => resolve('hey!'));
    req.write(data);
    req.end();
  });
}

function generateFallbackResponse(context) {
  const responses = [
    "nice, how's it going?",
    "sounds interesting!",
    "oh cool, tell me more",
    "haha same here",
    "good luck with that!",
    "that's awesome",
    "been there, hang in there"
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ============ SIMULATION LOGIC ============

class Agent {
  constructor(config) {
    this.handle = config.handle;
    this.one_liner = config.one_liner;
    this.personality = config.personality;
    this.lastAction = Date.now();
  }

  async register() {
    console.log(`[${this.handle}] Registering...`);
    await heartbeat(this.handle, this.one_liner);
    console.log(`[${this.handle}] Online: "${this.one_liner}"`);
  }

  async checkInbox() {
    const result = await getInbox(this.handle);
    const threads = result.threads || [];
    const unread = threads.filter(t => t.unread > 0);
    return unread;
  }

  async respondToMessage(from, lastMessage) {
    const prompt = `Someone named @${from} just sent you this message: "${lastMessage}"

You're in a terminal chatting with other developers. Write a brief, natural response (1-2 sentences max).
Don't use greetings like "Hey" if responding to an ongoing conversation.`;

    const response = await askClaude(this.personality, prompt);
    console.log(`[${this.handle}] Replying to @${from}: "${response}"`);
    await sendDM(this.handle, from, response);
  }

  async initiateConversation(otherAgent) {
    const prompt = `You just saw that @${otherAgent.handle} is online and working on: "${otherAgent.one_liner}"

You want to start a casual conversation. Write a brief, natural opening message (1-2 sentences).
Be specific to what they're working on if it interests you.`;

    const message = await askClaude(this.personality, prompt);
    console.log(`[${this.handle}] DMing @${otherAgent.handle}: "${message}"`);
    await sendDM(this.handle, otherAgent.handle, message);
  }

  async tick(allAgents) {
    // Heartbeat to stay online
    await heartbeat(this.handle, this.one_liner);

    // Check inbox for unread messages
    const unread = await this.checkInbox();

    for (const thread of unread) {
      // Get the actual messages to see what they said
      const threadData = await getThread(this.handle, thread.handle);
      const messages = threadData.messages || [];

      // Find the last message from them
      const theirMessages = messages.filter(m => m.from === thread.handle);
      if (theirMessages.length > 0) {
        const lastMsg = theirMessages[theirMessages.length - 1];
        await this.respondToMessage(thread.handle, lastMsg.body);
      }
    }

    // Random chance to initiate conversation
    if (Math.random() < 0.3) {
      const others = allAgents.filter(a => a.handle !== this.handle);
      const target = others[Math.floor(Math.random() * others.length)];

      // Don't spam - only if we haven't messaged recently
      const timeSinceLastAction = Date.now() - this.lastAction;
      if (timeSinceLastAction > 10000) { // 10 second cooldown
        await this.initiateConversation(target);
        this.lastAction = Date.now();
      }
    }
  }
}

// ============ MAIN SIMULATION ============

async function runSimulation(rounds = 5, delayMs = 5000) {
  console.log('\n=== /vibe Synthetic Agent Simulation ===\n');
  console.log(`API: ${API_URL}`);
  console.log(`Claude API: ${ANTHROPIC_API_KEY ? 'configured' : 'fallback mode'}`);
  console.log(`Agents: ${AGENTS.length}`);
  console.log(`Rounds: ${rounds}`);
  console.log('\n');

  // Create agents
  const agents = AGENTS.map(config => new Agent(config));

  // Register all agents
  console.log('--- Registering agents ---\n');
  for (const agent of agents) {
    await agent.register();
    await new Promise(r => setTimeout(r, 500));
  }

  // Show who's online
  console.log('\n--- Who\'s online ---\n');
  const whoResult = await getWho();
  (whoResult.users || []).forEach(u => {
    console.log(`  ${u.status === 'active' ? '●' : '○'} @${u.handle} — ${u.one_liner}`);
  });

  // Run simulation rounds
  console.log('\n--- Starting simulation ---\n');

  for (let round = 1; round <= rounds; round++) {
    console.log(`\n[Round ${round}/${rounds}]`);

    // Each agent takes a turn
    for (const agent of agents) {
      try {
        await agent.tick(agents);
      } catch (e) {
        console.error(`[${agent.handle}] Error: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    // Wait between rounds
    if (round < rounds) {
      console.log(`\nWaiting ${delayMs/1000}s...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  // Final state
  console.log('\n\n--- Simulation Complete ---\n');
  console.log('Check inboxes:');
  for (const agent of agents) {
    const inbox = await getInbox(agent.handle);
    const threads = inbox.threads || [];
    const total = threads.reduce((sum, t) => sum + (t.unread || 0) + 1, 0);
    console.log(`  @${agent.handle}: ${threads.length} threads, ~${total} messages`);
  }
  console.log('\n');
}

// Run with: node agents.js [rounds] [delay_ms]
const rounds = parseInt(process.argv[2]) || 5;
const delay = parseInt(process.argv[3]) || 5000;

runSimulation(rounds, delay).catch(console.error);
