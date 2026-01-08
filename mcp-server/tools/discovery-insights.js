/**
 * vibe discovery-insights — Discovery System Analytics
 *
 * Provides insights into connection patterns, popular skills,
 * and optimization recommendations for better matching.
 *
 * Commands:
 * - discovery-insights stats — Show discovery system statistics
 * - discovery-insights skills — Most popular/requested skills
 * - discovery-insights gaps — Identify skill gaps in community
 * - discovery-insights trends — Recent activity trends
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_insights',
  description: 'Analytics and insights for the discovery system to optimize matching.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['stats', 'skills', 'gaps', 'trends'],
        description: 'Discovery insights command to run'
      }
    }
  }
};

// Analyze community profiles
async function analyzeProfiles() {
  const allProfiles = await userProfiles.getAllProfiles();
  
  const stats = {
    totalUsers: allProfiles.length,
    withBuilding: 0,
    withTags: 0,
    withInterests: 0,
    avgSkillsPerUser: 0,
    avgInterestsPerUser: 0,
    completionRate: 0
  };
  
  let totalSkills = 0;
  let totalInterests = 0;
  
  for (const profile of allProfiles) {
    if (profile.building) stats.withBuilding++;
    if (profile.tags && profile.tags.length > 0) {
      stats.withTags++;
      totalSkills += profile.tags.length;
    }
    if (profile.interests && profile.interests.length > 0) {
      stats.withInterests++;
      totalInterests += profile.interests.length;
    }
  }
  
  stats.avgSkillsPerUser = Math.round((totalSkills / Math.max(stats.withTags, 1)) * 10) / 10;
  stats.avgInterestsPerUser = Math.round((totalInterests / Math.max(stats.withInterests, 1)) * 10) / 10;
  stats.completionRate = Math.round((stats.withBuilding + stats.withTags + stats.withInterests) / (stats.totalUsers * 3) * 100);
  
  return stats;
}

// Analyze skill distribution
async function analyzeSkills() {
  const allProfiles = await userProfiles.getAllProfiles();
  const skillExchanges = await store.getSkillExchanges() || [];
  
  const skillCounts = {};
  const requestedSkills = {};
  const offeredSkills = {};
  
  // Count skills from profiles
  for (const profile of allProfiles) {
    if (profile.tags) {
      for (const skill of profile.tags) {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      }
    }
  }
  
  // Count skills from exchanges
  for (const exchange of skillExchanges) {
    if (exchange.type === 'offer') {
      offeredSkills[exchange.skill] = (offeredSkills[exchange.skill] || 0) + 1;
    } else if (exchange.type === 'request') {
      requestedSkills[exchange.skill] = (requestedSkills[exchange.skill] || 0) + 1;
    }
  }
  
  // Sort by popularity
  const popularSkills = Object.entries(skillCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
    
  const topRequested = Object.entries(requestedSkills)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
    
  const topOffered = Object.entries(offeredSkills)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  return {
    popular: popularSkills,
    requested: topRequested,
    offered: topOffered,
    totalSkills: Object.keys(skillCounts).length
  };
}

// Identify skill gaps (high demand, low supply)
async function identifySkillGaps() {
  const skillExchanges = await store.getSkillExchanges() || [];
  const allProfiles = await userProfiles.getAllProfiles();
  
  const requests = {};
  const offers = {};
  const profileSkills = {};
  
  // Count requests and offers
  for (const exchange of skillExchanges) {
    if (exchange.type === 'request') {
      requests[exchange.skill] = (requests[exchange.skill] || 0) + 1;
    } else if (exchange.type === 'offer') {
      offers[exchange.skill] = (offers[exchange.skill] || 0) + 1;
    }
  }
  
  // Count skills in profiles
  for (const profile of allProfiles) {
    if (profile.tags) {
      for (const skill of profile.tags) {
        profileSkills[skill] = (profileSkills[skill] || 0) + 1;
      }
    }
  }
  
  // Find gaps (requested but not available)
  const gaps = [];
  for (const [skill, requestCount] of Object.entries(requests)) {
    const offerCount = offers[skill] || 0;
    const profileCount = profileSkills[skill] || 0;
    const totalSupply = offerCount + profileCount;
    
    if (requestCount > totalSupply) {
      gaps.push({
        skill,
        demand: requestCount,
        supply: totalSupply,
        gap: requestCount - totalSupply
      });
    }
  }
  
  return gaps.sort((a, b) => b.gap - a.gap);
}

// Analyze recent trends
async function analyzeTrends() {
  const skillExchanges = await store.getSkillExchanges() || [];
  const allProfiles = await userProfiles.getAllProfiles();
  
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const week = 7 * day;
  
  // Recent skill exchange activity
  const recentExchanges = skillExchanges.filter(e => (now - e.timestamp) < week);
  const todayExchanges = skillExchanges.filter(e => (now - e.timestamp) < day);
  
  // Active users (updated recently)
  const activeUsers = allProfiles.filter(p => p.lastSeen && (now - p.lastSeen) < day);
  
  // Trending skills (most mentioned recently)
  const recentSkills = {};
  for (const exchange of recentExchanges) {
    recentSkills[exchange.skill] = (recentSkills[exchange.skill] || 0) + 1;
  }
  
  const trending = Object.entries(recentSkills)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  return {
    recentExchanges: recentExchanges.length,
    todayExchanges: todayExchanges.length,
    activeUsers: activeUsers.length,
    trending,
    weeklyGrowth: Math.round((recentExchanges.length / Math.max(skillExchanges.length - recentExchanges.length, 1)) * 100)
  };
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const command = args.command || 'stats';

  let display = '';

  try {
    switch (command) {
      case 'stats': {
        const stats = await analyzeProfiles();
        
        display = `## Discovery System Statistics 📊\n\n`;
        
        display += `### Community Profile Health\n`;
        display += `**Total Users:** ${stats.totalUsers}\n`;
        display += `**Profile Completion:** ${stats.completionRate}%\n\n`;
        
        display += `**Profile Elements:**\n`;
        display += `• Building something: ${stats.withBuilding} users\n`;
        display += `• Have skill tags: ${stats.withTags} users\n`;
        display += `• Listed interests: ${stats.withInterests} users\n\n`;
        
        display += `**Depth Metrics:**\n`;
        display += `• Avg skills per user: ${stats.avgSkillsPerUser}\n`;
        display += `• Avg interests per user: ${stats.avgInterestsPerUser}\n\n`;
        
        // Recommendations
        display += `### Optimization Recommendations\n`;
        if (stats.completionRate < 60) {
          display += `🎯 **Focus:** Encourage profile completion (${100 - stats.completionRate}% missing data)\n`;
        }
        if (stats.withTags < stats.totalUsers * 0.5) {
          display += `🏷️ **Priority:** More users need skill tags for better matching\n`;
        }
        if (stats.withBuilding < stats.totalUsers * 0.7) {
          display += `🔨 **Opportunity:** Encourage users to share what they're building\n`;
        }
        
        display += `\n**Commands:**\n`;
        display += `• \`discovery-insights skills\` — Popular skills analysis\n`;
        display += `• \`discovery-insights gaps\` — Identify skill shortages\n`;
        display += `• \`discovery-insights trends\` — Recent activity patterns`;
        break;
      }

      case 'skills': {
        const analysis = await analyzeSkills();
        
        display = `## Skills Analysis 🛠️\n\n`;
        
        if (analysis.popular.length > 0) {
          display += `### Most Popular Skills in Community\n`;
          for (const [skill, count] of analysis.popular) {
            const bar = '▓'.repeat(Math.min(Math.round(count / analysis.popular[0][1] * 10), 10));
            display += `**${skill}** (${count}) ${bar}\n`;
          }
          display += `\n`;
        }
        
        if (analysis.requested.length > 0) {
          display += `### Most Requested Skills\n`;
          for (const [skill, count] of analysis.requested) {
            display += `• **${skill}** — ${count} requests\n`;
          }
          display += `\n`;
        }
        
        if (analysis.offered.length > 0) {
          display += `### Most Offered Skills\n`;
          for (const [skill, count] of analysis.offered) {
            display += `• **${skill}** — ${count} offers\n`;
          }
          display += `\n`;
        }
        
        display += `**Total unique skills:** ${analysis.totalSkills}\n\n`;
        
        display += `**Skills marketplace health:**\n`;
        if (analysis.requested.length === 0 && analysis.offered.length === 0) {
          display += `📋 Skills exchange is empty - encourage first posts!\n`;
        } else {
          display += `✅ Active skills marketplace with ${analysis.requested.length} requests, ${analysis.offered.length} offers\n`;
        }
        break;
      }

      case 'gaps': {
        const gaps = await identifySkillGaps();
        
        display = `## Skill Gap Analysis 📈\n\n`;
        
        if (gaps.length === 0) {
          display += `✅ **No skill gaps detected!**\n\n`;
          display += `The community has good skill coverage. All requested skills have available providers.\n\n`;
          display += `**Growth opportunities:**\n`;
          display += `• Encourage more skill exchanges\n`;
          display += `• Promote underutilized skills\n`;
          display += `• Expand into new skill domains`;
        } else {
          display += `_Skills with high demand but limited supply:_\n\n`;
          
          for (const gap of gaps.slice(0, 8)) {
            display += `**${gap.skill}**\n`;
            display += `Demand: ${gap.demand} requests | Supply: ${gap.supply} providers\n`;
            display += `Gap: **${gap.gap} unmet requests**\n\n`;
          }
          
          display += `### Recommendations\n`;
          display += `**Recruit for high-demand skills:**\n`;
          for (const gap of gaps.slice(0, 3)) {
            display += `• Find ${gap.skill} experts to join the community\n`;
          }
          
          display += `\n**Encourage existing users:**\n`;
          display += `• Share these gaps in community updates\n`;
          display += `• Ask if anyone has hidden expertise in these areas`;
        }
        break;
      }

      case 'trends': {
        const trends = await analyzeTrends();
        
        display = `## Discovery Activity Trends 📈\n\n`;
        
        display += `### Recent Activity (7 days)\n`;
        display += `**Skill exchanges:** ${trends.recentExchanges}\n`;
        display += `**Today:** ${trends.todayExchanges}\n`;
        display += `**Active users:** ${trends.activeUsers}\n`;
        display += `**Growth rate:** ${trends.weeklyGrowth}%\n\n`;
        
        if (trends.trending.length > 0) {
          display += `### Trending Skills\n`;
          for (const [skill, mentions] of trends.trending) {
            display += `🔥 **${skill}** (${mentions} mentions)\n`;
          }
          display += `\n`;
        }
        
        display += `### Community Health\n`;
        if (trends.recentExchanges === 0) {
          display += `📭 No recent skill exchange activity\n`;
          display += `**Suggestions:** Encourage first exchanges, share success stories\n`;
        } else if (trends.recentExchanges < 5) {
          display += `🌱 Growing activity - encourage more participation\n`;
        } else {
          display += `🚀 Active community with healthy skill exchange\n`;
        }
        
        if (trends.activeUsers < 3) {
          display += `\n👥 Small but focused community - prioritize engagement\n`;
        } else {
          display += `\n✅ Good user activity - ${trends.activeUsers} active recently\n`;
        }
        break;
      }

      default:
        display = `## Discovery Insights Commands

**\`discovery-insights stats\`** — Overall system statistics and health
**\`discovery-insights skills\`** — Popular and requested skills analysis  
**\`discovery-insights gaps\`** — Identify skill shortages in community
**\`discovery-insights trends\`** — Recent activity and growth patterns

**Perfect for:**
- Understanding community needs
- Identifying recruitment priorities  
- Optimizing matching algorithms
- Planning community growth strategies`;
    }
  } catch (error) {
    display = `## Discovery Insights Error

${error.message}

Try: \`discovery-insights\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };