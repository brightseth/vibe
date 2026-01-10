/**
 * vibe_ask_expert — Prototype integration with ping.money
 *
 * Shows how /vibe's social graph makes expert matching better:
 * 1. Smart matching (who SHIPPED relevant projects)
 * 2. Live routing (who's ONLINE now)
 * 3. Real reputation (peer interactions + ships)
 * 4. Handoff to ping for payment/answer
 */

const config = require('../../mcp-server/config');
const store = require('../../mcp-server/store');
const userProfiles = require('../../mcp-server/store/profiles');

const definition = {
  name: 'vibe_ask_expert',
  description: 'Ask a question and get routed to an expert via ping.money. /vibe finds the best match, ping handles payment.',
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'Your question (e.g., "How do I handle WebSocket reconnection in production?")'
      },
      topic: {
        type: 'string',
        description: 'Topic tag (e.g., "websockets", "rust", "oauth")'
      },
      budget: {
        type: 'number',
        description: 'Max budget in USDC (default: 50)'
      }
    },
    required: ['question']
  }
};

async function handler(args) {
  const { question, topic, budget = 50 } = args;
  const myHandle = config.getHandle();

  // Step 1: Extract topic from question if not provided
  const inferredTopic = topic || inferTopicFromQuestion(question);

  // Step 2: Query /vibe graph for experts
  const experts = await findExperts(inferredTopic);

  if (experts.length === 0) {
    return {
      display: `## No Experts Found

Couldn't find anyone on /vibe who's shipped projects related to "${inferredTopic}".

**Options:**
1. Broaden your search (try different keywords)
2. Post to ping.money directly without vibe routing
3. Ask the community for free: \`vibe dm #general "${question}"\``
    };
  }

  // Step 3: Rank experts by availability + reputation
  const rankedExperts = rankExperts(experts);
  const topExpert = rankedExperts[0];

  // Step 4: Show routing result
  const display = `## Expert Match Found

**Question:** ${question}

**Routing to:** @${topExpert.handle}

### Why this person?
${topExpert.reasoning}

### Their Stats:
- **Shipped:** ${topExpert.shipCount} ${inferredTopic}-related projects
- **Availability:** ${topExpert.online ? '🟢 Online now' : '⚫ Offline (will notify when online)'}
- **Response time:** Avg ${topExpert.avgResponseTime}
- **Rating:** ${topExpert.rating}/5 (${topExpert.helpCount} people helped)

### Payment:
- **Their rate:** $${topExpert.rate}/15min
- **Your budget:** $${budget}
- **Match:** ${budget >= topExpert.rate ? '✅ Within budget' : '⚠️ Over budget'}

---

**Next Steps:**

1. **Route via ping.money:**
   Say: "Send this question to ping.money for @${topExpert.handle}"

   This will:
   - Create escrow ($${topExpert.rate} USDC locked)
   - Notify @${topExpert.handle} via ping + /vibe DM
   - They answer, payment auto-releases
   - You get answer back here

2. **DM them directly (free):**
   Say: "vibe dm @${topExpert.handle} \\"${question}\\""

   No payment, but no guarantee of answer.

3. **See other options:**
   ${rankedExperts.length > 1 ? `${rankedExperts.length - 1} other experts available` : 'This is the only match'}
`;

  return {
    display,
    // Structured data for next step
    expert: topExpert,
    question,
    budget,
    routing_method: 'vibe_to_ping'
  };
}

/**
 * Find experts based on topic using /vibe graph
 */
async function findExperts(topic) {
  // Get all users
  const presence = await store.getPresence();
  const allUsers = presence.active.concat(presence.offline);

  const experts = [];

  for (const user of allUsers) {
    const profile = await userProfiles.getProfile(user.handle);

    // Calculate expertise score
    const shipCount = countRelevantShips(profile.ships, topic);
    const helpCount = countRelevantHelp(profile.interactions, topic);
    const contextMatch = checkContextMatch(profile.recentContext, topic);

    if (shipCount > 0 || helpCount > 0 || contextMatch) {
      experts.push({
        handle: user.handle,
        online: user.status === 'active',
        lastSeen: user.lastSeen,

        // Expertise signals
        shipCount,
        helpCount,
        contextMatch,

        // Reputation
        rating: calculateRating(profile),

        // Rates (would come from profile eventually)
        rate: profile.expertRate || 50,

        // Response patterns
        avgResponseTime: profile.avgResponseTime || '2 hours',

        // Profile info
        workingOn: user.workingOn || profile.oneLiner
      });
    }
  }

  return experts;
}

/**
 * Rank experts by: online > ships > help history > rating
 */
function rankExperts(experts) {
  return experts
    .sort((a, b) => {
      // Online first
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;

      // Then by ships
      if (a.shipCount !== b.shipCount) return b.shipCount - a.shipCount;

      // Then by help history
      if (a.helpCount !== b.helpCount) return b.helpCount - a.helpCount;

      // Then by rating
      return b.rating - a.rating;
    })
    .map((expert, index) => ({
      ...expert,
      rank: index + 1,
      reasoning: generateReasoning(expert, index)
    }));
}

/**
 * Generate human-readable reasoning for why this expert was chosen
 */
function generateReasoning(expert, rank) {
  const reasons = [];

  if (expert.online) {
    reasons.push('**Online right now** (instant answer possible)');
  }

  if (expert.shipCount > 0) {
    reasons.push(`Shipped ${expert.shipCount} related projects (proof of expertise)`);
  }

  if (expert.helpCount > 0) {
    reasons.push(`Helped ${expert.helpCount} people with similar questions`);
  }

  if (expert.contextMatch) {
    reasons.push('Currently working on related code');
  }

  if (expert.rating >= 4.5) {
    reasons.push(`Highly rated (${expert.rating}/5 stars)`);
  }

  if (rank === 0 && reasons.length === 0) {
    reasons.push('Best available match based on profile');
  }

  return reasons.join('\n- ');
}

/**
 * Count ships related to topic
 */
function countRelevantShips(ships, topic) {
  if (!ships) return 0;
  const topicLower = topic.toLowerCase();
  return ships.filter(ship =>
    ship.what?.toLowerCase().includes(topicLower) ||
    ship.tags?.some(tag => tag.toLowerCase().includes(topicLower))
  ).length;
}

/**
 * Count times user helped with similar questions
 */
function countRelevantHelp(interactions, topic) {
  if (!interactions) return 0;
  const topicLower = topic.toLowerCase();
  return interactions.filter(i =>
    i.type === 'help' &&
    i.topic?.toLowerCase().includes(topicLower)
  ).length;
}

/**
 * Check if user's current context matches topic
 */
function checkContextMatch(recentContext, topic) {
  if (!recentContext) return false;
  const topicLower = topic.toLowerCase();
  return recentContext.some(ctx =>
    ctx.file?.toLowerCase().includes(topicLower) ||
    ctx.note?.toLowerCase().includes(topicLower)
  );
}

/**
 * Calculate reputation rating (1-5 stars)
 */
function calculateRating(profile) {
  // Simplified - would use real interaction data
  const shipCount = profile.ships?.length || 0;
  const helpCount = profile.interactions?.filter(i => i.type === 'help').length || 0;

  const score = Math.min(5, 3 + (shipCount * 0.1) + (helpCount * 0.2));
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

/**
 * Infer topic from natural language question
 */
function inferTopicFromQuestion(question) {
  const questionLower = question.toLowerCase();

  // Common tech topics
  const topics = {
    'websocket': ['websocket', 'ws', 'socket.io'],
    'rust': ['rust', 'cargo'],
    'oauth': ['oauth', 'authentication', 'auth'],
    'react': ['react', 'jsx', 'hooks'],
    'typescript': ['typescript', 'ts', 'types'],
    'database': ['database', 'sql', 'postgres', 'mysql'],
    'api': ['api', 'rest', 'graphql', 'endpoint'],
    'deployment': ['deploy', 'deployment', 'ci/cd', 'docker'],
    'testing': ['test', 'testing', 'jest', 'vitest']
  };

  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some(kw => questionLower.includes(kw))) {
      return topic;
    }
  }

  // Extract first noun as fallback
  const words = questionLower.split(' ');
  return words.find(w => w.length > 4) || 'general';
}

module.exports = { definition, handler };
