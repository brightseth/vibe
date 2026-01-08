/**
 * vibe auto-suggest-connections — Smart connection recommendations
 *
 * Analyzes skills exchanges and user profiles to automatically suggest 
 * connections between people with complementary skills or interests.
 */

const store = require('../store');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_auto_suggest_connections',
  description: 'Find and suggest connections based on complementary skills and interests.',
  inputSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['skills', 'building', 'interests', 'all'],
        description: 'Type of connection analysis to run',
        default: 'skills'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of suggestions to generate',
        default: 5
      },
      execute: {
        type: 'boolean',
        description: 'Actually send suggestions to users (vs just preview)',
        default: false
      }
    }
  }
};

// Find skill-based connection opportunities
async function findSkillConnections() {
  const posts = await store.getSkillExchanges() || [];
  const connections = [];
  
  // Build skill map
  const skillMap = {};
  posts.forEach(post => {
    if (!skillMap[post.skill]) {
      skillMap[post.skill] = { offers: [], requests: [] };
    }
    skillMap[post.skill][post.type + 's'].push(post);
  });
  
  // Find perfect matches
  Object.entries(skillMap).forEach(([skill, data]) => {
    data.offers.forEach(offer => {
      data.requests.forEach(request => {
        if (offer.handle !== request.handle) {
          connections.push({
            type: 'skill_exchange',
            skill,
            expert: offer.handle,
            learner: request.handle,
            reason: `@${offer.handle} offers "${skill}" expertise and @${request.handle} is looking to learn it`,
            confidence: 95,
            details: {
              offerDetails: offer.details,
              requestDetails: request.details,
              category: offer.category
            }
          });
        }
      });
    });
  });
  
  return connections;
}

// Find building/project-based connections  
async function findBuildingConnections() {
  const profiles = await userProfiles.getAllProfiles();
  const connections = [];
  
  const users = Object.values(profiles).filter(p => p.building);
  
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const user1 = users[i];
      const user2 = users[j];
      
      const building1 = user1.building.toLowerCase();
      const building2 = user2.building.toLowerCase();
      
      // Check for similar projects or complementary skills
      const commonWords = building1.split(' ').filter(word => 
        word.length > 3 && building2.includes(word)
      );
      
      if (commonWords.length > 0) {
        connections.push({
          type: 'similar_building',
          person1: user1.handle,
          person2: user2.handle,
          reason: `Both building similar projects: "${user1.building}" and "${user2.building}"`,
          confidence: 75,
          details: {
            commonWords,
            project1: user1.building,
            project2: user2.building
          }
        });
      }
    }
  }
  
  return connections;
}

// Find interest-based connections
async function findInterestConnections() {
  const profiles = await userProfiles.getAllProfiles();
  const connections = [];
  
  const users = Object.values(profiles).filter(p => p.interests && p.interests.length > 0);
  
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const user1 = users[i];
      const user2 = users[j];
      
      const commonInterests = user1.interests.filter(interest =>
        user2.interests.some(i2 => 
          i2.toLowerCase() === interest.toLowerCase() ||
          i2.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(i2.toLowerCase())
        )
      );
      
      if (commonInterests.length > 0) {
        connections.push({
          type: 'shared_interests',
          person1: user1.handle,
          person2: user2.handle,
          reason: `Share interests in: ${commonInterests.join(', ')}`,
          confidence: 60 + (commonInterests.length * 10),
          details: {
            commonInterests,
            user1Interests: user1.interests,
            user2Interests: user2.interests
          }
        });
      }
    }
  }
  
  return connections;
}

// Format connection suggestion
function formatSuggestion(connection) {
  switch (connection.type) {
    case 'skill_exchange':
      return {
        from: connection.learner,
        to: connection.expert,
        reason: `You both are interested in "${connection.skill}"! @${connection.expert} offers expertise and you're looking to learn. Great opportunity to connect!`,
        altReason: `@${connection.learner} is looking to learn "${connection.skill}" which you offer expertise in. Consider reaching out to help!`
      };
      
    case 'similar_building':
      return {
        from: connection.person1,
        to: connection.person2,
        reason: `You might want to connect with @${connection.person2} — you're both building similar projects! "${connection.details.project1}" and "${connection.details.project2}"`
      };
      
    case 'shared_interests':
      return {
        from: connection.person1,
        to: connection.person2,
        reason: `You share interests with @${connection.person2} in: ${connection.details.commonInterests.join(', ')}. Could be a great collaboration!`
      };
      
    default:
      return {
        from: connection.person1 || connection.expert,
        to: connection.person2 || connection.learner,
        reason: connection.reason
      };
  }
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const mode = args.mode || 'skills';
  const limit = Math.min(args.limit || 5, 10);
  const execute = args.execute === true;
  
  let display = '';

  try {
    display = `## Auto-Suggest Connections 🤖\n\n`;
    
    let allConnections = [];
    
    // Gather connections based on mode
    if (mode === 'skills' || mode === 'all') {
      const skillConnections = await findSkillConnections();
      allConnections = allConnections.concat(skillConnections);
    }
    
    if (mode === 'building' || mode === 'all') {
      const buildingConnections = await findBuildingConnections();
      allConnections = allConnections.concat(buildingConnections);
    }
    
    if (mode === 'interests' || mode === 'all') {
      const interestConnections = await findInterestConnections();
      allConnections = allConnections.concat(interestConnections);
    }
    
    // Sort by confidence and limit
    allConnections.sort((a, b) => b.confidence - a.confidence);
    const topConnections = allConnections.slice(0, limit);
    
    if (topConnections.length === 0) {
      display += `**No connection opportunities found** in "${mode}" mode.\n\n`;
      display += `**Try:**\n`;
      display += `• \`auto-suggest-connections --mode all\` — Check all types\n`;
      display += `• \`bootstrap-skills\` — Create sample skill exchanges\n`;
      display += `• Users can \`skills-exchange post\` to create opportunities\n`;
      return { display };
    }
    
    display += `**Found ${topConnections.length} connection opportunities** (mode: ${mode})\n\n`;
    
    let suggestions = [];
    
    for (const connection of topConnections) {
      const formatted = formatSuggestion(connection);
      suggestions.push(formatted);
      
      display += `### ${connection.type.replace('_', ' ').toUpperCase()} (${connection.confidence}% match)\n`;
      display += `**Connection:** @${formatted.from} ↔ @${formatted.to}\n`;
      display += `**Reason:** ${formatted.reason}\n`;
      
      if (connection.details) {
        display += `**Context:** `;
        if (connection.type === 'skill_exchange') {
          display += `Expert: "${connection.details.offerDetails || 'available'}" / Learner: "${connection.details.requestDetails || 'seeking help'}"`;
        } else if (connection.type === 'similar_building') {
          display += `"${connection.details.project1}" + "${connection.details.project2}"`;
        } else if (connection.type === 'shared_interests') {
          display += `${connection.details.commonInterests.join(', ')}`;
        }
        display += `\n`;
      }
      
      if (execute) {
        display += `**✅ SUGGESTED** — DM sent to @${formatted.from}\n`;
      } else {
        display += `**Preview** — Would suggest to @${formatted.from}\n`;
      }
      
      display += `\n`;
    }
    
    if (execute) {
      // Actually send the suggestions
      let sent = 0;
      for (const suggestion of suggestions) {
        try {
          await store.sendMessage(
            'discovery-agent',
            suggestion.from,
            `🤝 Connection Suggestion: ${suggestion.reason}`,
            'suggestion'
          );
          sent++;
        } catch (error) {
          console.error(`Failed to send suggestion to @${suggestion.from}:`, error);
        }
      }
      
      display += `**✅ Results: ${sent}/${suggestions.length} suggestions sent successfully**\n\n`;
    } else {
      display += `**💡 To actually send these suggestions:**\n`;
      display += `\`auto-suggest-connections --mode ${mode} --execute true\`\n\n`;
    }
    
    display += `**Connection Dashboard:**\n`;
    display += `• Skills exchanges: Use \`skills-exchange browse\`\n`;
    display += `• User profiles: Use \`who\` to see who's building what\n`;
    display += `• Direct connections: \`dm @username\` to connect directly\n`;

  } catch (error) {
    display = `## Auto-Suggest Error\n\n${error.message}\n\nTry: \`auto-suggest-connections\` for basic suggestions`;
  }

  return { display };
}

module.exports = { definition, handler };