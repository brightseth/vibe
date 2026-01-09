/**
 * vibe ship — Announce what you just shipped
 *
 * Share your wins with the community and update your profile.
 * Tracks your shipping history for better discovery matches.
 *
 * Usage:
 * - ship "Built a new feature for my AI chat app"
 * - ship "Deployed my portfolio website"
 * - ship "Published blog post about React patterns"
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const patterns = require('../intelligence/patterns');
const { requireInit, formatTimeAgo } = require('./_shared');

const definition = {
  name: 'vibe_ship',
  description: 'Announce something you just shipped to the community board and update your profile.',
  inputSchema: {
    type: 'object',
    properties: {
      what: {
        type: 'string',
        description: 'What you shipped (brief description)'
      },
      url: {
        type: 'string',
        description: 'URL to your ship (deployed site, repo, demo)'
      },
      inspired_by: {
        type: 'string',
        description: 'Handle of person who inspired this (@alice)'
      },
      for_request: {
        type: 'string',
        description: 'Request ID this fulfills (if building for someone)'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for discovery (e.g., ["ai", "mcp", "tools"])'
      }
    },
    required: ['what']
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  if (!args.what) {
    return { error: 'Please tell us what you shipped: ship "Built a new feature"' };
  }

  const myHandle = config.getHandle();
  const apiUrl = config.getApiUrl();

  try {
    // Record in profile
    await userProfiles.recordShip(myHandle, args.what);

    // Build rich content with metadata
    let content = args.what;
    const metaParts = [];

    if (args.url) {
      metaParts.push(`🔗 ${args.url}`);
    }
    if (args.inspired_by) {
      const inspiree = args.inspired_by.replace('@', '').toLowerCase();
      metaParts.push(`✨ inspired by @${inspiree}`);
    }
    if (args.for_request) {
      metaParts.push(`📋 fulfills ${args.for_request}`);
    }

    if (metaParts.length > 0) {
      content += '\n' + metaParts.join(' | ');
    }

    // Build tags with attribution
    const tags = args.tags || [];
    if (args.inspired_by) {
      tags.push(`inspired:${args.inspired_by.replace('@', '')}`);
    }
    if (args.for_request) {
      tags.push(`fulfills:${args.for_request}`);
    }

    // Post to board
    const response = await fetch(`${apiUrl}/api/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: myHandle,
        content,
        category: 'shipped',
        tags
      })
    });

    const data = await response.json();

    if (!data.success) {
      return { display: `⚠️ Failed to announce ship: ${data.error}` };
    }

    // Log creative patterns
    patterns.logShip(args.what, args.url, tags);
    if (args.inspired_by) {
      patterns.logInspiredBy(args.inspired_by);
    }

    let display = `🚀 shipped\n\n${args.what}`;

    if (args.url) {
      display += `\n${args.url}`;
    }
    if (args.inspired_by) {
      display += `\n_via @${args.inspired_by.replace('@', '')}_`;
    }

    display += '\n';
    
    // Quiet awareness of similar builders
    const suggestions = await findSimilarShippers(myHandle, args.what);
    if (suggestions.length > 0) {
      display += `\n_similar: @${suggestions.slice(0, 2).map(s => s.handle).join(', @')}_`;
    }

    return { display };

  } catch (error) {
    return { display: `## Ship Error\n\n${error.message}` };
  }
}

// Find people who shipped similar things
async function findSimilarShippers(myHandle, whatIShipped) {
  try {
    const allProfiles = await userProfiles.getAllProfiles();
    const myWords = whatIShipped.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const suggestions = [];

    for (const profile of allProfiles) {
      if (profile.handle === myHandle) continue;
      if (!profile.ships || profile.ships.length === 0) continue;

      for (const ship of profile.ships) {
        const shipWords = ship.what.toLowerCase().split(/\s+/);
        const overlap = myWords.filter(w => shipWords.includes(w));
        
        if (overlap.length > 0) {
          suggestions.push({
            handle: profile.handle,
            ship: ship.what,
            timestamp: ship.timestamp,
            overlap: overlap.length
          });
          break; // Only one ship per person
        }
      }
    }

    // Sort by overlap and recency
    return suggestions
      .sort((a, b) => {
        const overlapDiff = b.overlap - a.overlap;
        if (overlapDiff !== 0) return overlapDiff;
        return b.timestamp - a.timestamp;
      });

  } catch (error) {
    console.warn('Error finding similar shippers:', error);
    return [];
  }
}

module.exports = { definition, handler };