/**
 * vibe discovery-dashboard — Your Personal Discovery Hub
 *
 * A unified interface for all discovery features in /vibe.
 * Shows personalized recommendations, community activity, and
 * quick access to all discovery tools.
 *
 * Commands:
 * - discovery-dashboard — Your personalized discovery homepage
 * - discovery-dashboard quick — Quick discovery actions
 * - discovery-dashboard stats — Your discovery stats and impact
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_dashboard',
  description: 'Unified discovery hub showing personalized recommendations and community activity.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['', 'quick', 'stats'],
        description: 'Dashboard view to display'
      }
    }
  }
};

// Get personalized discovery summary
async function getDiscoverySummary(handle) {
  const myProfile = await userProfiles.getProfile(handle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  // Quick match scoring
  const quickMatches = [];
  for (const profile of allProfiles) {
    if (profile.handle !== handle) {
      let score = 0;
      let reasons = [];
      
      // Building similarity
      if (myProfile.building && profile.building) {
        const myWords = myProfile.building.toLowerCase().split(/\s+/);
        const theirWords = profile.building.toLowerCase().split(/\s+/);
        const overlap = myWords.filter(w => theirWords.includes(w) && w.length > 3);
        if (overlap.length > 0) {
          score += 30;
          reasons.push(`Both working on ${overlap[0]}`);
        }
      }
      
      // Interest overlap
      if (myProfile.interests && profile.interests) {
        const shared = myProfile.interests.filter(i => profile.interests.includes(i));
        if (shared.length > 0) {
          score += 20;
          reasons.push(`Shared interest: ${shared[0]}`);
        }
      }
      
      // Recent activity
      if (profile.lastSeen && (Date.now() - profile.lastSeen) < 24 * 60 * 60 * 1000) {
        score += 15;
        reasons.push('Active today');
      }
      
      if (score > 20) {
        quickMatches.push({
          handle: profile.handle,
          score,
          reason: reasons[0],
          building: profile.building,
          lastSeen: profile.lastSeen
        });
      }
    }
  }
  
  return {
    quickMatches: quickMatches.sort((a, b) => b.score - a.score).slice(0, 3),
    profileCompleteness: calculateProfileCompleteness(myProfile),
    communitySize: allProfiles.length,
    recentConnections: myProfile.connections?.slice(-3) || []
  };
}

// Calculate how complete someone's profile is
function calculateProfileCompleteness(profile) {
  let score = 0;
  let missing = [];
  
  if (profile.building) {
    score += 30;
  } else {
    missing.push('building project');
  }
  
  if (profile.interests && profile.interests.length > 0) {
    score += 25;
  } else {
    missing.push('interests');
  }
  
  if (profile.tags && profile.tags.length > 0) {
    score += 25;
  } else {
    missing.push('skills/tags');
  }
  
  if (profile.connections && profile.connections.length > 0) {
    score += 20;
  } else {
    missing.push('connections');
  }
  
  return { score, missing };
}

// Get quick discovery actions based on profile state
function getQuickActions(profile, completeness) {
  const actions = [];
  
  if (completeness.score < 80) {
    if (completeness.missing.includes('building project')) {
      actions.push({
        action: 'update building "What you\'re working on"',
        reason: 'Help others find you based on what you\'re building',
        priority: 'high'
      });
    }
    
    if (completeness.missing.includes('interests')) {
      actions.push({
        action: 'update interests "ai, startups, design"',
        reason: 'Share your interests to find like-minded people',
        priority: 'high'
      });
    }
    
    if (completeness.missing.includes('skills/tags')) {
      actions.push({
        action: 'update tags "frontend, python, design"',
        reason: 'Tag your skills for better collaboration matching',
        priority: 'medium'
      });
    }
  }
  
  if (completeness.missing.includes('connections')) {
    actions.push({
      action: 'discover suggest',
      reason: 'Find your first connections in the community',
      priority: 'high'
    });
  } else {
    actions.push({
      action: 'workshop-buddy find',
      reason: 'Find someone to collaborate with on projects',
      priority: 'medium'
    });
  }
  
  // Always suggest exploring
  actions.push({
    action: 'discover active',
    reason: 'See who\'s building similar things right now',
    priority: 'low'
  });
  
  return actions.sort((a, b) => {
    const priority = { high: 3, medium: 2, low: 1 };
    return priority[b.priority] - priority[a.priority];
  }).slice(0, 4);
}

// Get user's discovery stats
async function getDiscoveryStats(handle) {
  const profile = await userProfiles.getProfile(handle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  const connections = profile.connections?.length || 0;
  const daysSince = profile.firstSeen ? Math.floor((Date.now() - profile.firstSeen) / (24 * 60 * 60 * 1000)) : 0;
  const connectionsPerDay = daysSince > 0 ? (connections / daysSince).toFixed(2) : 0;
  
  // Calculate influence (how many people have similar interests/tags)
  let influence = 0;
  if (profile.interests) {
    for (const interest of profile.interests) {
      const similar = allProfiles.filter(p => p.interests?.includes(interest)).length;
      influence += similar;
    }
  }
  
  if (profile.tags) {
    for (const tag of profile.tags) {
      const similar = allProfiles.filter(p => p.tags?.includes(tag)).length;
      influence += similar;
    }
  }
  
  const uniqueInfluence = Math.min(influence, allProfiles.length - 1); // Exclude self
  
  return {
    connections,
    daysSince,
    connectionsPerDay,
    influence: uniqueInfluence,
    ships: profile.ships?.length || 0,
    profileAge: daysSince
  };
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || '';

  let display = '';

  try {
    switch (command) {
      case 'quick': {
        const profile = await userProfiles.getProfile(myHandle);
        const completeness = calculateProfileCompleteness(profile);
        const actions = getQuickActions(profile, completeness);
        
        display = `## Quick Discovery Actions ⚡\n\n`;
        display += `**Profile Completeness:** ${completeness.score}%\n\n`;
        
        if (completeness.score < 100) {
          display += `**Complete your profile:**\n`;
          for (const missing of completeness.missing) {
            display += `• Add ${missing}\n`;
          }
          display += `\n`;
        }
        
        display += `**Recommended Actions:**\n`;
        for (const action of actions) {
          const emoji = action.priority === 'high' ? '🔥' : action.priority === 'medium' ? '⭐' : '💡';
          display += `${emoji} \`${action.action}\`\n`;
          display += `   _${action.reason}_\n\n`;
        }
        
        display += `**Discovery Tools:**\n`;
        display += `• \`discover suggest\` — Personalized recommendations\n`;
        display += `• \`workshop-buddy find\` — Find collaboration partners\n`;
        display += `• \`skills-exchange browse\` — Marketplace for skill sharing`;
        break;
      }

      case 'stats': {
        const stats = await getDiscoveryStats(myHandle);
        const profile = await userProfiles.getProfile(myHandle);
        
        display = `## Your Discovery Stats 📊\n\n`;
        display += `**Community Impact:**\n`;
        display += `• **${stats.connections}** connections made\n`;
        display += `• **${stats.ships}** things shipped\n`;
        display += `• **${stats.influence}** people share your interests/skills\n`;
        display += `• **${stats.profileAge}** days in the community\n\n`;
        
        if (stats.connections > 0) {
          display += `**Connection Rate:** ${stats.connectionsPerDay} connections per day\n\n`;
          
          display += `**Recent Connections:**\n`;
          const recentConnections = profile.connections?.slice(-3) || [];
          for (const conn of recentConnections) {
            display += `• @${conn.handle} — ${conn.reason} _(${formatTimeAgo(conn.timestamp)})_\n`;
          }
        } else {
          display += `**No connections yet!** Try:\n`;
          display += `• \`discover suggest\` to find your first matches\n`;
          display += `• \`workshop-buddy find\` for collaboration partners\n`;
        }
        
        display += `\n**Achievements:**\n`;
        if (stats.connections >= 5) display += `🌟 Well Connected (5+ connections)\n`;
        if (stats.ships >= 3) display += `🚢 Active Shipper (3+ ships)\n`;
        if (stats.influence >= 10) display += `📢 Community Influencer (10+ similar interests)\n`;
        if (stats.profileAge >= 7) display += `🎂 Community Veteran (1+ week)\n`;
        
        if (stats.connections < 5 && stats.ships < 3 && stats.influence < 10 && stats.profileAge < 7) {
          display += `_Keep connecting and building to unlock achievements!_\n`;
        }
        
        break;
      }

      default: {
        // Main dashboard view
        const summary = await getDiscoverySummary(myHandle);
        const profile = await userProfiles.getProfile(myHandle);
        
        display = `## Your Discovery Dashboard 🎯\n\n`;
        
        // Profile status
        display += `### Your Profile (${summary.profileCompleteness.score}% complete)\n`;
        if (profile.building) {
          display += `**Building:** ${profile.building}\n`;
        }
        if (profile.interests && profile.interests.length > 0) {
          display += `**Interests:** ${profile.interests.join(', ')}\n`;
        }
        if (profile.tags && profile.tags.length > 0) {
          display += `**Skills:** ${profile.tags.join(', ')}\n`;
        }
        display += `\n`;
        
        // Quick matches
        if (summary.quickMatches.length > 0) {
          display += `### People You Should Meet 👋\n`;
          for (const match of summary.quickMatches) {
            display += `**@${match.handle}** — ${match.reason}\n`;
            if (match.building) display += `_${match.building}_\n`;
            display += `_Active: ${formatTimeAgo(match.lastSeen)}_\n\n`;
          }
        } else {
          display += `### No Matches Yet 🔍\n`;
          display += `Complete your profile to find great matches!\n\n`;
        }
        
        // Community overview
        display += `### Community Overview\n`;
        display += `**Total Members:** ${summary.communitySize}\n`;
        display += `**Your Connections:** ${summary.recentConnections.length}\n\n`;
        
        // Quick actions
        if (summary.profileCompleteness.score < 80) {
          display += `### Complete Your Profile\n`;
          for (const missing of summary.profileCompleteness.missing) {
            display += `• Add ${missing}\n`;
          }
          display += `\n`;
        }
        
        // Discovery tools menu
        display += `### Discovery Tools 🛠️\n`;
        display += `**\`discover suggest\`** — Find your people based on interests\n`;
        display += `**\`workshop-buddy find\`** — Find collaboration partners\n`;
        display += `**\`skills-exchange browse\`** — Skill sharing marketplace\n`;
        display += `**\`discovery-analytics overview\`** — Community insights\n\n`;
        
        display += `**Quick Commands:**\n`;
        display += `• \`discovery-dashboard quick\` — Quick actions for you\n`;
        display += `• \`discovery-dashboard stats\` — Your community stats\n`;
        display += `• \`discover active\` — See who's online now`;
      }
    }
  } catch (error) {
    display = `## Discovery Dashboard Error\n\n${error.message}\n\nTry: \`discovery-dashboard\` for your personalized hub`;
  }

  return { display };
}

module.exports = { definition, handler };