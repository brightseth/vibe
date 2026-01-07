/**
 * vibe discover — Find your people
 *
 * Smart matchmaking based on:
 * - What you're building (similar projects)
 * - What you've shipped (complementary skills)  
 * - When you're active (timezone overlap)
 * - Shared interests (tags)
 *
 * Commands:
 * - discover suggest — Get personalized recommendations
 * - discover search <query> — Find people building specific things
 * - discover interests — Browse people by interest tags
 * - discover active — Show who's building similar things right now
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discover',
  description: 'Find interesting people to connect with based on what they\'re building.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['suggest', 'search', 'interests', 'active'],
        description: 'Discovery command to run'
      },
      query: {
        type: 'string',
        description: 'Search query (for search command)'
      }
    }
  }
};

// Calculate match score between two users
function calculateMatchScore(user1, user2) {
  let score = 0;
  const reasons = [];

  // Project similarity (high weight)
  if (user1.building && user2.building) {
    const building1 = user1.building.toLowerCase();
    const building2 = user2.building.toLowerCase();
    
    // Exact match
    if (building1 === building2) {
      score += 50;
      reasons.push('Building the exact same thing');
    }
    // Keyword overlap
    else {
      const words1 = building1.split(/\s+/);
      const words2 = building2.split(/\s+/);
      const overlap = words1.filter(w => words2.includes(w) && w.length > 3);
      if (overlap.length > 0) {
        score += overlap.length * 10;
        reasons.push(`Both working on ${overlap.join(', ')}`);
      }
    }
  }

  // Interest overlap (medium weight)
  if (user1.interests && user2.interests) {
    const shared = user1.interests.filter(i => user2.interests.includes(i));
    if (shared.length > 0) {
      score += shared.length * 15;
      reasons.push(`Shared interests: ${shared.join(', ')}`);
    }
  }

  // Tag overlap (medium weight)
  if (user1.tags && user2.tags) {
    const sharedTags = user1.tags.filter(t => user2.tags.includes(t));
    if (sharedTags.length > 0) {
      score += sharedTags.length * 12;
      reasons.push(`Similar focus: ${sharedTags.join(', ')}`);
    }
  }

  // Activity overlap (low weight but important for timing)
  if (user1.lastSeen && user2.lastSeen) {
    const timeDiff = Math.abs(user1.lastSeen - user2.lastSeen);
    const hours = timeDiff / (1000 * 60 * 60);
    if (hours < 2) {
      score += 20;
      reasons.push('Both active recently');
    } else if (hours < 12) {
      score += 10;
      reasons.push('Similar activity times');
    }
  }

  // Complementary skills boost
  if (user1.tags && user2.tags) {
    const complementary = findComplementaryTags(user1.tags, user2.tags);
    if (complementary.length > 0) {
      score += complementary.length * 8;
      reasons.push(`Complementary skills: ${complementary.join(', ')}`);
    }
  }

  return { score, reasons: reasons.slice(0, 3) }; // Top 3 reasons
}

// Find complementary skill pairs
function findComplementaryTags(tags1, tags2) {
  const pairs = [
    ['frontend', 'backend'],
    ['design', 'engineering'],
    ['ai', 'data'],
    ['mobile', 'web'],
    ['devops', 'security'],
    ['product', 'engineering'],
    ['research', 'implementation']
  ];

  const complementary = [];
  for (const [a, b] of pairs) {
    if (tags1.includes(a) && tags2.includes(b)) {
      complementary.push(`${a}/${b}`);
    }
    if (tags1.includes(b) && tags2.includes(a)) {
      complementary.push(`${b}/${a}`);
    }
  }
  return complementary;
}

// Get personalized suggestions
async function getSuggestions(myHandle) {
  const myProfile = await userProfiles.getProfile(myHandle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  const candidates = allProfiles.filter(p => p.handle !== myHandle);
  const matches = [];

  for (const candidate of candidates) {
    const match = calculateMatchScore(myProfile, candidate);
    if (match.score > 10) { // Minimum threshold
      matches.push({
        handle: candidate.handle,
        score: match.score,
        reasons: match.reasons,
        building: candidate.building,
        interests: candidate.interests || [],
        tags: candidate.tags || [],
        lastSeen: candidate.lastSeen
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

// Search for people by query
async function searchPeople(query) {
  const allProfiles = await userProfiles.getAllProfiles();
  const searchTerm = query.toLowerCase();
  
  const results = allProfiles.filter(profile => {
    return (
      profile.building?.toLowerCase().includes(searchTerm) ||
      profile.interests?.some(i => i.toLowerCase().includes(searchTerm)) ||
      profile.tags?.some(t => t.toLowerCase().includes(searchTerm)) ||
      profile.handle.toLowerCase().includes(searchTerm)
    );
  });

  return results.slice(0, 8);
}

// Browse by interests
async function browseByInterests() {
  const allProfiles = await userProfiles.getAllProfiles();
  const interestMap = {};

  for (const profile of allProfiles) {
    if (profile.interests) {
      for (const interest of profile.interests) {
        if (!interestMap[interest]) {
          interestMap[interest] = [];
        }
        interestMap[interest].push(profile);
      }
    }
  }

  // Sort interests by popularity
  const sorted = Object.entries(interestMap)
    .sort(([,a], [,b]) => b.length - a.length)
    .slice(0, 10);

  return sorted;
}

// Show active similar builders
async function getActiveSimilar(myHandle) {
  const myProfile = await userProfiles.getProfile(myHandle);
  const activeUsers = await store.getActiveUsers();
  
  const similar = [];
  
  for (const user of activeUsers) {
    if (user.handle === myHandle) continue;
    
    const theirProfile = await userProfiles.getProfile(user.handle);
    const match = calculateMatchScore(myProfile, theirProfile);
    
    if (match.score > 5) {
      similar.push({
        ...user,
        score: match.score,
        reasons: match.reasons,
        building: theirProfile.building
      });
    }
  }

  return similar.sort((a, b) => b.score - a.score);
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'suggest';

  let display = '';

  try {
    switch (command) {
      case 'suggest': {
        const suggestions = await getSuggestions(myHandle);
        
        if (suggestions.length === 0) {
          display = `## No Matches Found

_Not enough people with profiles yet._

**Help us learn about you:**
- Set interests: \`vibe update interests "ai, startups, music"\`  
- Tag your skills: \`vibe update tags "frontend, react, typescript"\`
- Share what you're building: \`vibe update building "AI chat app"\`

The more people share, the better our matches become!`;
        } else {
          display = `## People You Should Meet\n\n`;
          
          for (const match of suggestions) {
            display += `**@${match.handle}** _(${match.score} match)_\n`;
            display += `${match.building || 'Building something interesting'}\n`;
            
            if (match.reasons.length > 0) {
              display += `🔗 ${match.reasons.join(' • ')}\n`;
            }
            
            if (match.interests.length > 0) {
              display += `💡 ${match.interests.slice(0, 3).join(', ')}\n`;
            }
            
            display += `_Last seen: ${formatTimeAgo(match.lastSeen)}_\n\n`;
          }
          
          display += `**Next steps:**\n`;
          display += `- \`message @handle\` to reach out\n`;
          display += `- \`discover active\` to see who's online now\n`;
          display += `- \`discover search <topic>\` to find specific interests`;
        }
        break;
      }

      case 'search': {
        if (!args.query) {
          return { error: 'Please provide a search query: discover search "ai"' };
        }
        
        const results = await searchPeople(args.query);
        
        if (results.length === 0) {
          display = `## No Results for "${args.query}"

Try searching for:
- Technologies: "react", "python", "ai" 
- Domains: "fintech", "healthcare", "gaming"
- Roles: "founder", "designer", "engineer"

Or browse by interest: \`discover interests\``;
        } else {
          display = `## People Building: "${args.query}"\n\n`;
          
          for (const person of results) {
            display += `**@${person.handle}**\n`;
            display += `${person.building || 'Building something'}\n`;
            
            if (person.tags && person.tags.length > 0) {
              display += `🏷️ ${person.tags.join(', ')}\n`;
            }
            
            display += `_Last active: ${formatTimeAgo(person.lastSeen)}_\n\n`;
          }
        }
        break;
      }

      case 'interests': {
        const interests = await browseByInterests();
        
        if (interests.length === 0) {
          display = `## No Interest Data Yet

People haven't shared their interests yet.

**Be the first:**
\`vibe update interests "ai, startups, music"\``;
        } else {
          display = `## Browse by Interest\n\n`;
          
          for (const [interest, people] of interests) {
            display += `**${interest}** (${people.length}): `;
            display += people.slice(0, 5).map(p => `@${p.handle}`).join(', ');
            if (people.length > 5) {
              display += ` +${people.length - 5} more`;
            }
            display += '\n\n';
          }
          
          display += `**Search for specific interest:**\n`;
          display += `\`discover search "machine learning"\``;
        }
        break;
      }

      case 'active': {
        const similar = await getActiveSimilar(myHandle);
        
        if (similar.length === 0) {
          display = `## No Similar Builders Online

No one with similar interests is active right now.

**Try:**
- \`who\` to see who's around
- \`discover suggest\` for general recommendations  
- \`discover search <topic>\` to find people by interest`;
        } else {
          display = `## Similar Builders Online Now\n\n`;
          
          for (const person of similar) {
            display += `**@${person.handle}** _(${person.status})_\n`;
            display += `${person.building || person.one_liner || 'Active now'}\n`;
            
            if (person.reasons.length > 0) {
              display += `🔗 ${person.reasons.join(' • ')}\n`;
            }
            
            display += `\n`;
          }
          
          display += `**Perfect time to connect!** 🎯`;
        }
        break;
      }

      default:
        display = `## Discovery Commands

**\`discover suggest\`** — Get personalized recommendations
**\`discover search <query>\`** — Find people building specific things  
**\`discover interests\`** — Browse people by interest tags
**\`discover active\`** — Show who's building similar things right now

**Set up your profile:**
- \`vibe update building "what you're working on"\`
- \`vibe update interests "ai, startups, music"\`  
- \`vibe update tags "frontend, react, typescript"\``;
    }
  } catch (error) {
    display = `## Discovery Error

${error.message}

Try: \`discover\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };