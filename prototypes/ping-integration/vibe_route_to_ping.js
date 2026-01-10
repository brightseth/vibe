/**
 * vibe_route_to_ping — Bridge between /vibe and ping.money
 *
 * Takes a vibe expert match and creates a ping question for them
 */

const config = require('../../mcp-server/config');
const store = require('../../mcp-server/store');

const definition = {
  name: 'vibe_route_to_ping',
  description: 'Route a question to ping.money after vibe found the expert. Handles escrow, notification, and payment.',
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The question'
      },
      expert_handle: {
        type: 'string',
        description: 'Expert @handle from vibe matching'
      },
      amount: {
        type: 'number',
        description: 'Payment amount in USDC'
      }
    },
    required: ['question', 'expert_handle', 'amount']
  }
};

async function handler(args) {
  const { question, expert_handle, amount } = args;
  const myHandle = config.getHandle();

  // Step 1: Create escrow (would call ping API)
  const escrowResult = await createPingEscrow({
    question,
    expert: expert_handle,
    amount,
    asker: myHandle
  });

  // Step 2: Notify expert via both ping AND vibe
  await notifyExpert({
    expert: expert_handle,
    question,
    amount,
    escrowId: escrowResult.escrowId
  });

  // Step 3: Track routing in vibe analytics
  await trackRouting({
    from: myHandle,
    to: expert_handle,
    service: 'ping.money',
    amount,
    timestamp: Date.now()
  });

  return {
    display: `## Question Sent to @${expert_handle}

**Status:** ✅ Escrow created, expert notified

**What happens next:**

1. **Expert notification:**
   - Ping alert in their terminal
   - /vibe DM with context about you
   - They have 24 hours to respond

2. **Payment locked:**
   - $${amount} USDC in escrow
   - Auto-releases when they answer
   - Full refund if no answer in 24h

3. **You'll get notified:**
   - Answer appears in ping.money
   - /vibe DM with the response
   - Can rate answer (affects their reputation)

**Track status:** Say "check my ping questions"

---

**Why vibe routing?**
- We found @${expert_handle} because they shipped relevant projects
- They're ${escrowResult.expertOnline ? 'online now' : 'usually responds within 2 hours'}
- ${escrowResult.vibeReputation} on /vibe

**Revenue share:** ping.money and /vibe split the platform fee 50/50
`,
    escrowId: escrowResult.escrowId,
    expert: expert_handle,
    status: 'pending_answer'
  };
}

/**
 * Create escrow via ping.money API
 */
async function createPingEscrow(data) {
  // PROTOTYPE: Would call actual ping API
  // POST https://api.ping-money.com/v1/questions
  // Headers: Authorization: Bearer <vibe-service-token>
  // Body: { question, expert, amount, source: 'vibe', asker }

  console.log('[PROTOTYPE] Creating ping escrow:', data);

  // Mock response
  return {
    escrowId: 'ping_' + Math.random().toString(36).substr(2, 9),
    expertOnline: Math.random() > 0.5,
    vibeReputation: '4.8/5 stars, helped 12 people',
    created: new Date().toISOString()
  };
}

/**
 * Notify expert via both channels
 */
async function notifyExpert(data) {
  const { expert, question, amount, escrowId } = data;

  // 1. Ping notification (handled by ping.money)
  console.log('[PROTOTYPE] Ping would notify:', expert);

  // 2. /vibe DM with rich context
  await store.sendMessage(
    'system',
    expert,
    `💰 New Question via /vibe → ping.money

**From:** @${data.asker}
**Pays:** $${amount} USDC

**Question:**
${question}

**Why you?**
/vibe matched you because of your expertise signals:
- Projects you've shipped
- Similar questions you've answered
- Current work context

**Respond in ping:**
1. Open your terminal
2. Say "answer ping questions"
3. Or answer directly: "ping answer ${escrowId} <your answer>"

**Also via /vibe:**
You can DM @${data.asker} directly if you want to clarify before answering.

Payment auto-releases when you submit answer.
`,
    'dm'
  );

  console.log('[PROTOTYPE] Sent /vibe DM to', expert);
}

/**
 * Track routing for analytics
 */
async function trackRouting(data) {
  // Would store in vibe analytics DB
  console.log('[PROTOTYPE] Tracking routing:', data);

  // This data helps us measure:
  // - Which topics get routed most
  // - Which experts are most requested
  // - Revenue per routing (50% of ping's platform fee)
  // - Success rate (did they get an answer?)
}

module.exports = { definition, handler };
