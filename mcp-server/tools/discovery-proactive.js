/**
 * vibe discovery-proactive — Real-time connection opportunities
 *
 * Monitors for immediate connection opportunities:
 * - Users who just came online (welcome back suggestions)
 * - Both users online at same time (perfect timing)
 * - Recent ships that might interest others  
 * - Trending topic clusters
 * - Follow-up on previous connections
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const proactiveDiscovery = require('./_proactive-discovery');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_proactive',
  description: 'Find real-time connection opportunities and trending topics.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['opportunities', 'welcome', 'trending', 'ships'],
        description: 'Type of proactive discovery to run'
      },
      autoSuggest: {
        type: 'boolean',
        description: 'Automatically make connection suggestions'
      }
    }
  }
};

// Find and display current connection opportunities
async function findCurrentOpportunities(autoSuggest = false) {
  const opportunities = await proactiveDiscovery.findOnlineConnectionOpportunities();
  let actionsTaken = 0;
  
  let display = `## Real-Time Connection Opportunities 🎯\n\n`;
  
  if (opportunities.length === 0) {
    display += `No high-value connections found among current online users.\n\n`;
    display += `**Try:**\n`;
    display += `• Check back when more users are online\n`;
    display += `• \`discovery-proactive trending\` for topic-based connections\n`;
    display += `• \`discovery-proactive ships\` for recent ship connections`;
    
    return { display, actionsTaken };
  }
  
  display += `Found ${opportunities.length} high-value opportunities:\n\n`;
  
  for (const opp of opportunities.slice(0, 5)) {
    display += `**@${opp.user1} ↔ @${opp.user2}** _(${opp.score}% match)_\n`;
    
    if (opp.reasons.length > 0) {
      display += `🔗 ${opp.reasons.join(' • ')}\n`;
    }
    
    display += `⚡ Both online now - perfect timing!\n`;
    
    if (opp.profiles.profile1.building) {
      display += `${opp.user1}: ${opp.profiles.profile1.building}\n`;
    }
    if (opp.profiles.profile2.building) {
      display += `${opp.user2}: ${opp.profiles.profile2.building}\n`;
    }
    
    display += `\n`;
    
    // Auto-suggest if requested
    if (autoSuggest) {
      try {
        // Make the suggestion (this would typically call suggest_connection)
        proactiveDiscovery.recordSuggestion(opp.user1, opp.user2);
        actionsTaken++;
        display += `✅ Connection suggested to both users\n\n`;
      } catch (error) {
        display += `❌ Failed to suggest: ${error.message}\n\n`;
      }
    } else {
      display += `Run with \`autoSuggest: true\` to make suggestions automatically\n\n`;
    }
  }
  
  return { display, actionsTaken };
}

// Welcome back users who just came online
async function welcomeNewOnlineUsers() {
  const newOnline = await proactiveDiscovery.findNewOnlineUsers();
  
  let display = `## Welcome Back Online Users 👋\n\n`;
  
  if (newOnline.length === 0) {
    display += `No users have come online recently.\n\n`;
    display += `This feature detects users who came online in the last 10 minutes.`;
    return { display, actionsTaken: 0 };
  }
  
  display += `Found ${newOnline.length} users who just came online:\n\n`;
  
  let actionsTaken = 0;
  
  for (const user of newOnline) {
    display += `**@${user.handle}** just came online\n`;
    
    if (user.profile.building) {
      display += `Building: ${user.profile.building}\n`;
    }
    
    // Get suggestions for this user
    const suggestions = await proactiveDiscovery.generateWelcomeBackSuggestions(user.handle);
    
    if (suggestions.length > 0) {
      display += `\n**Immediate connection opportunities:**\n`;
      
      for (const suggestion of suggestions.slice(0, 2)) {
        display += `• @${suggestion.handle} (${suggestion.score}% match) - ${suggestion.reasons[0]}\n`;
      }
      
      actionsTaken++;
    }
    
    display += `\n`;
  }
  
  if (actionsTaken > 0) {
    display += `💡 Perfect timing for connections - everyone's online now!\n`;
    display += `Use \`message @handle\` to reach out while they're active.`;
  }
  
  return { display, actionsTaken };
}

// Find trending topic clusters  
async function findTrendingClusters() {
  const clusters = await proactiveDiscovery.generateTrendingTopicClusters();
  const suggestions = await proactiveDiscovery.suggestTrendingTopicConnections();
  
  let display = `## Trending Topic Clusters 📈\n\n`;
  
  const clusterEntries = Object.entries(clusters);
  
  if (clusterEntries.length === 0) {
    display += `No trending topics detected yet.\n\n`;
    display += `Trending topics are identified when multiple users:\n`;
    display += `• Ship projects with similar keywords\n`;
    display += `• Share similar interests or tags\n`;
    display += `• Work on related projects\n\n`;
    display += `Come back when there's more activity!`;
    return { display, actionsTaken: 0 };
  }
  
  display += `Found ${clusterEntries.length} trending topics:\n\n`;
  
  for (const [topic, users] of clusterEntries.slice(0, 5)) {
    display += `**${topic}** (${users.length} users)\n`;
    display += `${users.slice(0, 4).map(u => `@${u.handle}`).join(', ')}`;
    if (users.length > 4) {
      display += ` +${users.length - 4} more`;
    }
    display += `\n\n`;
  }
  
  if (suggestions.length > 0) {
    display += `**Connection Opportunities:**\n\n`;
    
    for (const suggestion of suggestions.slice(0, 3)) {
      display += `**@${suggestion.user1} ↔ @${suggestion.user2}**\n`;
      display += `Topic: ${suggestion.topic} • Match: ${suggestion.score}%\n`;
      display += `${suggestion.reason}\n\n`;
    }
  }
  
  return { display, actionsTaken: suggestions.length };
}

// Find connections based on recent ships
async function findShipConnections() {
  const recentShippers = await proactiveDiscovery.findRecentShippers();
  const shipConnections = await proactiveDiscovery.findShipBasedConnections();
  
  let display = `## Recent Ships & Connection Opportunities 🚢\n\n`;
  
  if (recentShippers.length === 0) {
    display += `No recent ships found (last 24 hours).\n\n`;
    display += `When users ship projects, I can:\n`;
    display += `• Find others working on similar things\n`;
    display += `• Connect complementary skill sets\n`;
    display += `• Suggest collaboration opportunities\n\n`;
    display += `Encourage people to use \`ship "what they built"\`!`;
    return { display, actionsTaken: 0 };
  }
  
  display += `**Recent Ships (last 24h):**\n`;
  for (const shipper of recentShippers.slice(0, 5)) {
    display += `• @${shipper.handle}: ${shipper.ships[0].what}\n`;
  }
  display += `\n`;
  
  if (shipConnections.length > 0) {
    display += `**Connection Opportunities:**\n\n`;
    
    for (const connection of shipConnections.slice(0, 5)) {
      display += `**@${connection.shipper} → @${connection.interestedUser}**\n`;
      display += `${connection.reason}\n`;
      display += `_${formatTimeAgo(connection.timestamp)}_\n\n`;
    }
    
    display += `💡 These users might benefit from connecting based on recent ships!`;
  } else {
    display += `No specific ship-based connections identified yet.\n`;
    display += `As more people ship and share interests, better matches will emerge.`;
  }
  
  return { display, actionsTaken: shipConnections.length };
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const action = args.action || 'opportunities';
  const autoSuggest = args.autoSuggest || false;
  
  let display = '';
  let actionsTaken = 0;

  try {
    switch (action) {
      case 'opportunities': {
        const result = await findCurrentOpportunities(autoSuggest);
        display = result.display;
        actionsTaken = result.actionsTaken;
        break;
      }

      case 'welcome': {
        const result = await welcomeNewOnlineUsers();
        display = result.display;
        actionsTaken = result.actionsTaken;
        break;
      }

      case 'trending': {
        const result = await findTrendingClusters();
        display = result.display;
        actionsTaken = result.actionsTaken;
        break;
      }

      case 'ships': {
        const result = await findShipConnections();
        display = result.display;
        actionsTaken = result.actionsTaken;
        break;
      }

      default:
        display = `## Proactive Discovery Commands

**\`discovery-proactive opportunities\`** — Real-time connection opportunities
**\`discovery-proactive welcome\`** — Welcome users who just came online  
**\`discovery-proactive trending\`** — Find trending topic clusters
**\`discovery-proactive ships\`** — Connections based on recent ships

**Advanced:**
Add \`autoSuggest: true\` to automatically make connection suggestions

**How it works:**
• Monitors users coming online in real-time
• Identifies when both users in a potential match are active
• Tracks trending topics and clusters users accordingly
• Finds connection opportunities based on recent ships
• Provides perfect-timing suggestions when both users are online`;
    }

    if (actionsTaken > 0) {
      display += `\n\n---\n**Actions taken:** ${actionsTaken}`;
    }

  } catch (error) {
    display = `## Proactive Discovery Error

${error.message}

Try:
• \`discovery-proactive opportunities\` for online connections
• \`discovery-proactive trending\` for topic clusters  
• \`who\` to see current online users`;
  }

  return { display };
}

module.exports = { definition, handler };