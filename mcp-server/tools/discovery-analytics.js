/**
 * vibe discovery-analytics — Community Discovery Insights
 *
 * Provides analytics and insights about the /vibe community to help
 * understand connection patterns, popular interests, and opportunities
 * for better matching.
 *
 * Commands:
 * - discovery-analytics overview — Community overview and trends
 * - discovery-analytics gaps — Identify connection opportunities  
 * - discovery-analytics popular — Most popular interests and skills
 * - discovery-analytics lonely — People who might need connections
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_analytics',
  description: 'Analytics and insights about community discovery patterns.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['overview', 'gaps', 'popular', 'lonely'],
        description: 'Analytics command to run'
      }
    }
  }
};

// Calculate community health metrics
async function getCommunityHealth() {
  const profiles = await userProfiles.getAllProfiles();
  const totalUsers = profiles.length;
  
  // Profile completeness
  const withBuilding = profiles.filter(p => p.building).length;
  const withInterests = profiles.filter(p => p.interests && p.interests.length > 0).length;
  const withTags = profiles.filter(p => p.tags && p.tags.length > 0).length;
  const withConnections = profiles.filter(p => p.connections && p.connections.length > 0).length;
  
  // Activity levels
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const week = 7 * day;
  
  const activeToday = profiles.filter(p => p.lastSeen && (now - p.lastSeen) < day).length;
  const activeThisWeek = profiles.filter(p => p.lastSeen && (now - p.lastSeen) < week).length;
  
  return {
    totalUsers,
    profileCompleteness: {
      withBuilding: Math.round((withBuilding / totalUsers) * 100),
      withInterests: Math.round((withInterests / totalUsers) * 100),
      withTags: Math.round((withTags / totalUsers) * 100),
      withConnections: Math.round((withConnections / totalUsers) * 100)
    },
    activity: {
      activeToday,
      activeThisWeek,
      todayRate: Math.round((activeToday / totalUsers) * 100),
      weekRate: Math.round((activeThisWeek / totalUsers) * 100)
    }
  };
}

// Find potential connection gaps
async function findConnectionGaps() {
  const profiles = await userProfiles.getAllProfiles();
  const gaps = [];
  
  // Find isolated users (no connections)
  const isolated = profiles.filter(p => !p.connections || p.connections.length === 0);
  
  // Find skill gaps (people with complementary skills who haven't connected)
  const skillPairs = [
    ['frontend', 'backend'],
    ['design', 'engineering'],
    ['ai', 'data'],
    ['product', 'engineering'],
    ['research', 'implementation'],
    ['marketing', 'product']
  ];
  
  const missedConnections = [];
  for (const [skill1, skill2] of skillPairs) {
    const group1 = profiles.filter(p => p.tags?.includes(skill1));
    const group2 = profiles.filter(p => p.tags?.includes(skill2));
    
    for (const user1 of group1) {
      for (const user2 of group2) {
        if (user1.handle !== user2.handle) {
          const connected = await userProfiles.hasBeenConnected(user1.handle, user2.handle);
          if (!connected) {
            missedConnections.push({
              user1: user1.handle,
              user2: user2.handle,
              reason: `${skill1} + ${skill2} collaboration potential`,
              user1Building: user1.building,
              user2Building: user2.building
            });
          }
        }
      }
    }
  }
  
  return {
    isolated: isolated.slice(0, 5),
    missedConnections: missedConnections.slice(0, 8)
  };
}

// Find people who might need more connections
async function findLonelyUsers() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  
  const lonely = profiles.filter(p => {
    const recentlyActive = p.lastSeen && (now - p.lastSeen) < week;
    const hasProfile = p.building || (p.interests && p.interests.length > 0);
    const fewConnections = !p.connections || p.connections.length < 2;
    
    return recentlyActive && hasProfile && fewConnections;
  });
  
  return lonely.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0)).slice(0, 5);
}

// Analyze interest and skill trends
async function analyzePopularTrends() {
  const trendingInterests = await userProfiles.getTrendingInterests();
  const trendingTags = await userProfiles.getTrendingTags();
  
  // Calculate growth potential
  const profiles = await userProfiles.getAllProfiles();
  const interestCombos = {};
  
  for (const profile of profiles) {
    if (profile.interests && profile.interests.length > 1) {
      for (let i = 0; i < profile.interests.length; i++) {
        for (let j = i + 1; j < profile.interests.length; j++) {
          const combo = [profile.interests[i], profile.interests[j]].sort().join(' + ');
          interestCombos[combo] = (interestCombos[combo] || 0) + 1;
        }
      }
    }
  }
  
  const topCombos = Object.entries(interestCombos)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([combo, count]) => ({ combo, count }));
  
  return {
    interests: trendingInterests,
    skills: trendingTags,
    interestCombos: topCombos
  };
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const command = args.command || 'overview';
  let display = '';

  try {
    switch (command) {
      case 'overview': {
        const health = await getCommunityHealth();
        const trends = await analyzePopularTrends();
        
        display = `## /vibe Discovery Analytics 📊\n\n`;
        
        display += `### Community Health\n`;
        display += `**Total Users:** ${health.totalUsers}\n`;
        display += `**Active Today:** ${health.activity.activeToday} (${health.activity.todayRate}%)\n`;
        display += `**Active This Week:** ${health.activity.activeThisWeek} (${health.activity.weekRate}%)\n\n`;
        
        display += `### Profile Completeness\n`;
        display += `**Building Projects:** ${health.profileCompleteness.withBuilding}%\n`;
        display += `**Have Interests:** ${health.profileCompleteness.withInterests}%\n`;
        display += `**Have Skills:** ${health.profileCompleteness.withTags}%\n`;
        display += `**Made Connections:** ${health.profileCompleteness.withConnections}%\n\n`;
        
        display += `### Trending Now\n`;
        if (trends.interests.length > 0) {
          display += `**Top Interests:** ${trends.interests.slice(0, 3).map(i => `${i.interest} (${i.count})`).join(', ')}\n`;
        }
        if (trends.skills.length > 0) {
          display += `**Hot Skills:** ${trends.skills.slice(0, 3).map(s => `${s.tag} (${s.count})`).join(', ')}\n`;
        }
        
        if (trends.interestCombos.length > 0) {
          display += `**Interest Combos:** ${trends.interestCombos.slice(0, 2).map(c => c.combo).join(', ')}\n`;
        }
        
        display += `\n**Commands:**\n`;
        display += `• \`discovery-analytics gaps\` — Find connection opportunities\n`;
        display += `• \`discovery-analytics popular\` — See detailed trends\n`;
        display += `• \`discovery-analytics lonely\` — People who need connections`;
        break;
      }

      case 'gaps': {
        const gaps = await findConnectionGaps();
        
        display = `## Connection Opportunities 🔗\n\n`;
        
        if (gaps.isolated.length > 0) {
          display += `### New Users Need Connections\n`;
          for (const user of gaps.isolated) {
            display += `**@${user.handle}**\n`;
            display += `${user.building || 'Ready to connect'}\n`;
            if (user.interests && user.interests.length > 0) {
              display += `Interests: ${user.interests.join(', ')}\n`;
            }
            if (user.tags && user.tags.length > 0) {
              display += `Skills: ${user.tags.join(', ')}\n`;
            }
            display += `_Last seen: ${formatTimeAgo(user.lastSeen)}_\n\n`;
          }
        }
        
        if (gaps.missedConnections.length > 0) {
          display += `### Missed Collaboration Opportunities\n`;
          for (const missed of gaps.missedConnections.slice(0, 5)) {
            display += `**@${missed.user1}** + **@${missed.user2}**\n`;
            display += `${missed.reason}\n`;
            if (missed.user1Building) display += `• ${missed.user1}: ${missed.user1Building}\n`;
            if (missed.user2Building) display += `• ${missed.user2}: ${missed.user2Building}\n`;
            display += `\n`;
          }
          
          display += `**Suggest these connections:**\n`;
          display += `\`suggest-connection @${gaps.missedConnections[0].user1} @${gaps.missedConnections[0].user2} "${gaps.missedConnections[0].reason}"\``;
        }
        
        if (gaps.isolated.length === 0 && gaps.missedConnections.length === 0) {
          display = `## All Connected! 🎉\n\nNo obvious connection gaps found. The community is well-connected!\n\n**Keep growing:**\n• Encourage more profile completion\n• Watch for new joiners to welcome`;
        }
        break;
      }

      case 'popular': {
        const trends = await analyzePopularTrends();
        
        display = `## Community Trends 📈\n\n`;
        
        if (trends.interests.length > 0) {
          display += `### Popular Interests\n`;
          for (const trend of trends.interests) {
            display += `**${trend.interest}** — ${trend.count} people\n`;
          }
          display += `\n`;
        }
        
        if (trends.skills.length > 0) {
          display += `### Top Skills\n`;
          for (const skill of trends.skills) {
            display += `**${skill.tag}** — ${skill.count} people\n`;
          }
          display += `\n`;
        }
        
        if (trends.interestCombos.length > 0) {
          display += `### Interest Combinations\n`;
          for (const combo of trends.interestCombos) {
            display += `**${combo.combo}** — ${combo.count} people\n`;
          }
          display += `\n`;
        }
        
        display += `**Discovery Opportunities:**\n`;
        display += `• Create interest groups for popular topics\n`;
        display += `• Host skill-sharing sessions\n`;
        display += `• Encourage rare skill/interest combinations`;
        break;
      }

      case 'lonely': {
        const lonely = await findLonelyUsers();
        
        if (lonely.length === 0) {
          display = `## Everyone's Connected! 🤝\n\nNo lonely users found. The community is doing great at connecting!\n\n**Keep it up:**\n• Welcome new joiners quickly\n• Encourage profile completion\n• Celebrate successful connections`;
        } else {
          display = `## People Who Could Use More Connections\n\n`;
          
          for (const user of lonely) {
            display += `**@${user.handle}**\n`;
            display += `${user.building || 'Available to connect'}\n`;
            
            if (user.interests && user.interests.length > 0) {
              display += `Interests: ${user.interests.join(', ')}\n`;
            }
            
            if (user.tags && user.tags.length > 0) {
              display += `Skills: ${user.tags.join(', ')}\n`;
            }
            
            const connectionCount = (user.connections || []).length;
            display += `Connections: ${connectionCount}\n`;
            display += `_Last seen: ${formatTimeAgo(user.lastSeen)}_\n\n`;
          }
          
          display += `**Suggested Actions:**\n`;
          display += `• Proactively introduce them to similar builders\n`;
          display += `• Include them in group conversations\n`;
          display += `• Share their projects on the board`;
        }
        break;
      }

      default:
        display = `## Discovery Analytics Commands

**\`discovery-analytics overview\`** — Community health and trends
**\`discovery-analytics gaps\`** — Find connection opportunities  
**\`discovery-analytics popular\`** — Most popular interests and skills
**\`discovery-analytics lonely\`** — People who might need connections

**Use these insights to:**
- Identify people who need connections
- Find missed collaboration opportunities  
- Understand community trends
- Guide future discovery improvements`;
    }
  } catch (error) {
    display = `## Analytics Error

${error.message}

Try: \`discovery-analytics\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };