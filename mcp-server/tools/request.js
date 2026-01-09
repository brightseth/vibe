/**
 * vibe request — Post build requests / wishes
 *
 * "I wish X existed" → others can claim and build
 *
 * Post: vibe request "I wish there was a tool for..."
 * Claim: vibe request claim [id]
 * Browse: vibe requests
 */

const config = require('../config');
const { requireInit, header, emptyState, formatTimeAgo, divider } = require('./_shared');

const definition = {
  name: 'vibe_request',
  description: 'Post a build request — something you wish existed. Others can claim and build it.',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'What you wish existed (leave empty to browse requests)'
      },
      claim: {
        type: 'string',
        description: 'ID of request to claim (e.g., "req_abc123")'
      },
      bounty: {
        type: 'string',
        description: 'What you\'re offering (e.g., "feedback", "shoutout", "collab")'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for the request'
      },
      show: {
        type: 'string',
        enum: ['open', 'claimed', 'all'],
        description: 'Filter by status (default: open)'
      },
      limit: {
        type: 'number',
        description: 'Number to show (default: 10)'
      }
    }
  }
};

const STATUS_EMOJI = {
  'open': '🔓',
  'claimed': '🔨',
  'shipped': '✅'
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const apiUrl = config.getApiUrl();
  const myHandle = config.getHandle();

  // Claim a request
  if (args.claim) {
    // Post a claim as a special entry
    try {
      const response = await fetch(`${apiUrl}/api/board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: myHandle,
          category: 'claim',
          content: `🔨 Claimed request: ${args.claim}`,
          tags: [`claim:${args.claim}`]
        })
      });

      const data = await response.json();

      if (!data.success) {
        return { display: `⚠️ Failed to claim: ${data.error}` };
      }

      return {
        display: `🔨 claimed \`${args.claim}\``
      };

    } catch (error) {
      return { display: `⚠️ Failed to claim: ${error.message}` };
    }
  }

  // Post a request
  if (args.content) {
    const content = args.content.trim();

    if (content.length > 500) {
      return { display: '⚠️ Keep requests concise (max 500 chars)' };
    }

    // Build request entry
    const bountyText = args.bounty ? ` [bounty: ${args.bounty}]` : '';
    const fullContent = `${content}${bountyText}`;

    try {
      const response = await fetch(`${apiUrl}/api/board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: myHandle,
          category: 'request',
          content: fullContent,
          tags: args.tags || []
        })
      });

      const data = await response.json();

      if (!data.success) {
        return { display: `⚠️ Failed to post request: ${data.error}` };
      }

      let display = `🔓 posted\n\n"${content}"`;

      if (args.bounty) {
        display += `\n_${args.bounty}_`;
      }

      return { display };

    } catch (error) {
      return { display: `⚠️ Failed to post: ${error.message}` };
    }
  }

  // Browse requests
  try {
    const limit = Math.min(args.limit || 10, 30);
    let url = `${apiUrl}/api/board?limit=${limit * 2}&category=request`;

    // Also get claims to show status
    const claimsUrl = `${apiUrl}/api/board?limit=50&category=claim`;

    const [requestsRes, claimsRes] = await Promise.all([
      fetch(url),
      fetch(claimsUrl)
    ]);

    const requests = (await requestsRes.json()).entries || [];
    const claims = (await claimsRes.json()).entries || [];

    // Build claimed set
    const claimedIds = new Set();
    const claimers = new Map();
    claims.forEach(c => {
      const match = c.content.match(/Claimed request: (\S+)/);
      if (match) {
        claimedIds.add(match[1]);
        claimers.set(match[1], c.author);
      }
    });

    // Filter by status
    let filtered = requests;
    if (args.show === 'open') {
      filtered = requests.filter(r => !claimedIds.has(r.id));
    } else if (args.show === 'claimed') {
      filtered = requests.filter(r => claimedIds.has(r.id));
    }

    if (filtered.length === 0) {
      return {
        display: `${header('Build Requests')}\n\n${emptyState('No requests yet...', 'Post one: "I wish [X] existed"')}`
      };
    }

    let display = header('Build Requests');
    if (args.show && args.show !== 'all') display += ` (${args.show})`;
    display += '\n\n';

    filtered.slice(0, limit).forEach(entry => {
      const isClaimed = claimedIds.has(entry.id);
      const status = isClaimed ? 'claimed' : 'open';
      const emoji = STATUS_EMOJI[status];
      const timeAgo = formatTimeAgo(entry.timestamp);
      const shortId = entry.id.slice(-8);

      // Parse bounty from content
      const bountyMatch = entry.content.match(/\[bounty: ([^\]]+)\]/);
      const bounty = bountyMatch ? bountyMatch[1] : null;
      const cleanContent = entry.content.replace(/\[bounty: [^\]]+\]/, '').trim();

      display += `${emoji} **@${entry.author}** _${timeAgo}_\n`;
      display += `   "${cleanContent}"\n`;

      if (bounty) {
        display += `   💎 _Bounty: ${bounty}_\n`;
      }

      if (isClaimed) {
        const claimer = claimers.get(entry.id);
        display += `   _Claimed by @${claimer}_\n`;
      } else {
        display += `   \`claim ${shortId}\`\n`;
      }

      display += '\n';
    });

    return { display };

  } catch (error) {
    return { display: `⚠️ Failed to load requests: ${error.message}` };
  }
}

module.exports = { definition, handler };
