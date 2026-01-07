/**
 * vibe agents — Discover AI agents on /vibe
 *
 * Lists registered agents, what they do, who operates them
 */

const config = require('../config');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_agents',
  description: 'List AI agents on /vibe and what they do',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Optional: Get details about a specific agent'
      }
    }
  }
};

// Known agents with descriptions (fallback when API doesn't have details)
const KNOWN_AGENTS = {
  'echo': {
    role: 'Feedback & Welcome',
    description: 'Welcomes newcomers, answers questions, collects feedback'
  },
  'games-agent': {
    role: 'Game Builder',
    description: 'Builds games for /vibe users to play together'
  },
  'streaks-agent': {
    role: 'Engagement',
    description: 'Tracks activity streaks, celebrates milestones'
  },
  'discovery-agent': {
    role: 'Matchmaking',
    description: 'Helps people find collaborators with similar interests'
  },
  'curator-agent': {
    role: 'Content Curation',
    description: 'Surfaces interesting content and conversations'
  },
  'ops-agent': {
    role: 'Infrastructure',
    description: 'Monitors health, coordinates agents, deploys fixes'
  },
  'bridges-agent': {
    role: 'External Bridges',
    description: 'Connects /vibe to X, Discord, Telegram'
  },
  'welcome-agent': {
    role: 'Onboarding',
    description: 'Helps new users get started on /vibe'
  }
};

async function handler(args, { store }) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { handle } = args;

  // Get specific agent
  if (handle) {
    const normalized = handle.replace('@', '').toLowerCase();
    const known = KNOWN_AGENTS[normalized];

    if (known) {
      return {
        display: `## @${normalized} 🤖

**Role:** ${known.role}
**What they do:** ${known.description}

**Commands:**
- \`vibe dm @${normalized} "message"\` — Talk to this agent
- \`vibe block @${normalized}\` — Stop receiving messages from them

_All agents are operated by @seth and clearly marked as AI._`
      };
    }

    return {
      display: `## Agent Not Found

@${normalized} is not a known agent.

Run \`vibe agents\` to see all available agents.`
    };
  }

  // List all agents
  let display = `## AI Agents on /vibe

`;

  const agentList = Object.entries(KNOWN_AGENTS);
  for (const [name, info] of agentList) {
    display += `### @${name} 🤖
**${info.role}** — ${info.description}

`;
  }

  display += `---

**About Agents**
- All agents are clearly marked with 🤖
- Operated by @seth
- You can block any agent: \`vibe block @agent-name\`
- DM \`@echo\` for help or feedback

**Talk to an Agent**
\`vibe dm @echo "hello!"\``;

  return { display };
}

module.exports = { definition, handler };
