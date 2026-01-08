/**
 * vibe discovery-digest — Your personalized community digest
 *
 * A smart daily digest that helps returning users catch up and connect.
 * Perfect for users who haven't been active recently or want a quick
 * overview of connection opportunities.
 *
 * Commands:
 * - discovery-digest — Get your personalized digest
 * - discovery-digest fresh — Focus on very recent activity
 * - discovery-digest weekly — Extended weekly digest
 * - discovery-digest highlights — Community highlights only
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_digest',
  description: 'Get a personalized digest of discovery opportunities and community activity.',
  inputSchema: {
    type: 'object',
    properties: {
      timeframe: {
        type: 'string',
        enum: ['daily', 'fresh', 'weekly', 'highlights'],
        description: 'Digest timeframe and focus'
      }
    }
  }
};

// Calculate match score for digest purposes (simplified)
function calculateDigestScore(user1, user2) {
  let score = 0;
  const reasons = [];

  // Project similarity
  if (user1.building && user2.building) {
    const building1 = user1.building.toLowerCase();
    const building2 = user2.building.toLowerCase();
    
    const words1 = building1.split(/\s+/);
    const words2 = building2.split(/\s+/);
    const overlap = words1.filter(w => words2.includes(w) && w.length > 3);
    
    if (overlap.length > 0) {
      score += overlap.length * 15;
      reasons.push(`Both working on ${overlap.join(', ')}`);
    }
  }

  // Interest overlap
  if (user1.interests && user2.interests) {
    const shared = user1.interests.filter(i => user2.interests.includes(i));
    if (shared.length > 0) {
      score += shared.length * 12;
      reasons.push(`Shared: ${shared.slice(0, 2).join(', ')}`);
    }
  }

  // Skill complementarity
  if (user1.tags && user2.tags) {
    const complementaryPairs = [
      ['frontend', 'backend'], ['design', 'engineering'], ['ai', 'data'],
      ['product', 'engineering'], ['mobile', 'web'], ['devops', 'security']
    ];
    
    for (const [skill1, skill2] of complementaryPairs) {
      if ((user1.tags.includes(skill1) && user2.tags.includes(skill2)) ||
          (user1.tags.includes(skill2) && user2.tags.includes(skill1))) {
        score += 20;
        reasons.push(`Perfect combo: ${skill1} + ${skill2}`);
        break;
      }
    }
  }

  // Recent activity bonus
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  
  if (user2.lastSeen && (now - user2.lastSeen) < day) {
    score += 10;
    reasons.push('Active recently');
  }

  return { score, reasons: reasons.slice(0, 2) };
}

// Generate personalized digest
async function generatePersonalDigest(myHandle, timeframe = 'daily') {
  const myProfile = await userProfiles.getProfile(myHandle);
  const allProfiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  
  let cutoffHours = 24;
  if (timeframe === 'fresh') cutoffHours = 6;
  if (timeframe === 'weekly') cutoffHours = 168; // 7 days
  
  const cutoff = now - (cutoffHours * 60 * 60 * 1000);

  // Find people to meet
  const candidates = allProfiles.filter(p => 
    p.handle !== myHandle && 
    p.lastSeen && p.lastSeen > cutoff
  );

  const matches = [];
  for (const candidate of candidates) {
    const match = calculateDigestScore(myProfile, candidate);
    if (match.score > 8) {
      matches.push({
        handle: candidate.handle,
        score: match.score,
        reasons: match.reasons,
        building: candidate.building,
        interests: candidate.interests || [],
        tags: candidate.tags || [],
        lastSeen: candidate.lastSeen,
        ships: (candidate.ships || []).slice(0, 2)
      });
    }
  }

  // Sort by score and recency
  matches.sort((a, b) => {
    const scoreWeight = (b.score - a.score) * 1000;
    const timeWeight = (b.lastSeen - a.lastSeen) / (60 * 60 * 1000); // Hours
    return scoreWeight + timeWeight;
  });

  return matches.slice(0, 5);
}

// Get community highlights
async function getCommunityHighlights(timeframe = 'daily') {
  let cutoffHours = 24;
  if (timeframe === 'fresh') cutoffHours = 6;
  if (timeframe === 'weekly') cutoffHours = 168;
  
  const cutoff = Date.now() - (cutoffHours * 60 * 60 * 1000);
  const allProfiles = await userProfiles.getAllProfiles();

  // New joiners
  const newJoiners = allProfiles.filter(p => 
    p.firstSeen && p.firstSeen > cutoff
  ).slice(0, 3);

  // Most active builders
  const activeBuilders = allProfiles.filter(p => 
    p.lastSeen && p.lastSeen > cutoff && p.building
  ).sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 3);

  // Recent ships
  const recentShips = [];
  for (const profile of allProfiles) {
    if (profile.ships && profile.ships.length > 0) {
      for (const ship of profile.ships) {
        if (ship.timestamp > cutoff) {
          recentShips.push({
            handle: profile.handle,
            what: ship.what,
            timestamp: ship.timestamp
          });
        }
      }
    }
  }
  recentShips.sort((a, b) => b.timestamp - a.timestamp);

  // Trending interests (people who joined with these interests recently)
  const recentInterests = {};
  const recentProfiles = allProfiles.filter(p => p.lastSeen && p.lastSeen > cutoff);
  for (const profile of recentProfiles) {
    if (profile.interests) {
      for (const interest of profile.interests) {
        recentInterests[interest] = (recentInterests[interest] || 0) + 1;
      }
    }
  }
  
  const trendingInterests = Object.entries(recentInterests)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([interest, count]) => ({ interest, count }));

  return {
    newJoiners,
    activeBuilders, 
    recentShips: recentShips.slice(0, 5),
    trendingInterests,
    totalActive: recentProfiles.length
  };
}

// Create digest content
function formatDigest(matches, highlights, timeframe) {
  let display = '';
  
  const timeframeName = {
    'daily': 'Daily',
    'fresh': 'Fresh (6h)',
    'weekly': 'Weekly',
    'highlights': 'Community Highlights'
  };
  
  display += `## Your ${timeframeName[timeframe] || 'Daily'} Discovery Digest 📰\n\n`;
  
  // Connection opportunities
  if (matches && matches.length > 0) {
    display += `### People You Should Meet 🤝\n\n`;
    
    for (const match of matches) {
      display += `**@${match.handle}** _(${match.score} match)_\n`;
      display += `${match.building || 'Building something interesting'}\n`;
      
      if (match.reasons.length > 0) {
        display += `🔗 ${match.reasons.join(' • ')}\n`;
      }
      
      if (match.ships.length > 0) {
        display += `🚀 Recently shipped: ${match.ships[0].what}\n`;
      }
      
      display += `_Active: ${formatTimeAgo(match.lastSeen)}_\n\n`;
    }
    
    display += `**Quick actions:**\n`;
    display += `• \`dm @${matches[0].handle} "Hey! Saw you're working on..."\`\n`;
    display += `• \`discover suggest\` for more recommendations\n\n`;
  }
  
  // Community highlights  
  if (highlights) {
    display += `### Community Pulse 📊\n\n`;
    display += `**Active builders:** ${highlights.totalActive}\n`;
    
    if (highlights.newJoiners.length > 0) {
      display += `**New joiners:** ${highlights.newJoiners.map(u => `@${u.handle}`).join(', ')}\n`;
    }
    
    if (highlights.recentShips.length > 0) {
      display += `**Recent ships:**\n`;
      for (const ship of highlights.recentShips.slice(0, 3)) {
        display += `• @${ship.handle}: ${ship.what}\n`;
      }
    }
    
    if (highlights.trendingInterests.length > 0) {
      display += `**Trending:** ${highlights.trendingInterests.slice(0, 3).map(t => t.interest).join(', ')}\n`;
    }
    
    display += `\n`;
  }
  
  // Empty state
  if ((!matches || matches.length === 0) && (!highlights || highlights.totalActive === 0)) {
    display += `_Quiet period in the community._\n\n`;
    display += `**While you wait:**\n`;
    display += `• Update your profile: \`update building "what you're working on"\`\n`;
    display += `• Browse all members: \`discover interests\`\n`;
    display += `• Check the board: \`board\`\n`;
  }
  
  return display;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const timeframe = args.timeframe || 'daily';

  let display = '';

  try {
    if (timeframe === 'highlights') {
      // Community highlights only
      const highlights = await getCommunityHighlights('daily');
      display = formatDigest(null, highlights, timeframe);
    } else {
      // Full digest with personalized recommendations
      const [matches, highlights] = await Promise.all([
        generatePersonalDigest(myHandle, timeframe),
        getCommunityHighlights(timeframe)
      ]);
      
      display = formatDigest(matches, highlights, timeframe);
    }
    
    // Add footer with next steps
    display += `---\n\n`;
    display += `**More discovery options:**\n`;
    display += `• \`discovery-digest fresh\` — Last 6 hours only\n`;
    display += `• \`discovery-digest weekly\` — Extended weekly digest\n`;
    display += `• \`workshop-buddy find\` — Find collaboration partners\n`;
    display += `• \`skills-exchange browse\` — Skills marketplace\n`;
    
  } catch (error) {
    display = `## Discovery Digest Error\n\n${error.message}\n\n`;
    display += `**Try:**\n`;
    display += `• \`discovery-digest\` — Basic daily digest\n`;
    display += `• \`discover suggest\` — Simple recommendations\n`;
    display += `• \`who\` — See who's online now`;
  }

  return { display };
}

module.exports = { definition, handler };