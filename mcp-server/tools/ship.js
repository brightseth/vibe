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
    
    // Post to board
    const response = await fetch(`${apiUrl}/api/board`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: myHandle,
        content: args.what,
        category: 'shipped'
      })
    });

    const data = await response.json();

    if (!data.success) {
      return { display: `⚠️ Failed to announce ship: ${data.error}` };
    }

    let display = `## 🚀 Shipped!\n\n`;
    display += `**You:** "${args.what}"\n\n`;
    display += `✅ Added to community board\n`;
    display += `✅ Updated your profile\n\n`;
    
    // Suggest connections based on similar ships
    const suggestions = await findSimilarShippers(myHandle, args.what);
    if (suggestions.length > 0) {
      display += `**People who shipped similar things:**\n`;
      suggestions.slice(0, 3).forEach(suggestion => {
        display += `• @${suggestion.handle}: "${suggestion.ship}" _(${formatTimeAgo(suggestion.timestamp)})_\n`;
      });
      display += `\n💡 Try \`message @${suggestions[0].handle}\` to connect!\n\n`;
    }
    
    display += `---\n`;
    display += `**Keep building!** 🔥\n`;
    display += `• \`discover suggest\` to find similar builders\n`;
    display += `• \`profile building "next project"\` to update what you're working on`;

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