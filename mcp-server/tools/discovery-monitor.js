/**
 * Discovery Monitor — Track matchmaking performance and suggest improvements
 * 
 * This tool helps the discovery agent monitor system health and identify
 * when manual intervention or system improvements are needed.
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_monitor',
  description: 'Monitor discovery system health and suggest improvements.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string', 
        enum: ['health', 'opportunities', 'trends', 'intervention'],
        description: 'Type of monitoring to perform'
      }
    }
  }
};

// Check overall system health
async function checkSystemHealth() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  const health = {
    totalUsers: profiles.length,
    activeUsers: profiles.filter(p => p.lastSeen && p.lastSeen > oneWeekAgo).length,
    completeProfiles: profiles.filter(p => 
      p.building && p.interests?.length > 0 && p.tags?.length > 0
    ).length,
    totalConnections: profiles.reduce((sum, p) => sum + (p.connections?.length || 0), 0) / 2,
    recentShips: profiles.filter(p => 
      p.ships?.some(s => s.timestamp > oneWeekAgo)
    ).length
  };
  
  // Calculate health score (0-100)
  let score = 0;
  if (health.totalUsers > 0) {
    score += Math.min(health.totalUsers * 5, 30); // Up to 30 points for user count
    score += Math.min((health.activeUsers / health.totalUsers) * 25, 25); // 25 for activity rate
    score += Math.min((health.completeProfiles / health.totalUsers) * 20, 20); // 20 for profile completeness
    score += Math.min(health.totalConnections * 2, 15); // Up to 15 for connections
    score += Math.min(health.recentShips * 2, 10); // Up to 10 for shipping activity
  }
  
  const status = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'needs attention';
  
  return { ...health, score: Math.round(score), status };
}

// Identify connection opportunities  
async function identifyOpportunities() {
  const profiles = await userProfiles.getAllProfiles();
  const opportunities = [];
  
  if (profiles.length < 2) {
    return [{
      type: 'growth',
      priority: 'high',
      description: 'Need more users to enable meaningful connections'
    }];
  }
  
  // Find users with few connections who could be matched
  const lonely = profiles.filter(p => !p.connections || p.connections.length < 2);
  const wellConnected = profiles.filter(p => p.connections && p.connections.length >= 3);
  
  if (lonely.length > 3 && wellConnected.length > 0) {
    opportunities.push({
      type: 'isolated_users',
      priority: 'high', 
      count: lonely.length,
      description: `${lonely.length} users have fewer than 2 connections`,
      action: 'Run targeted matchmaking for isolated users'
    });
  }
  
  // Look for complementary skill gaps
  const frontendUsers = profiles.filter(p => p.tags?.some(t => t.toLowerCase().includes('frontend'))).length;
  const backendUsers = profiles.filter(p => p.tags?.some(t => t.toLowerCase().includes('backend'))).length;
  
  if (frontendUsers > 0 && backendUsers > 0 && Math.abs(frontendUsers - backendUsers) <= 2) {
    opportunities.push({
      type: 'skill_pairing',
      priority: 'medium',
      description: `Good balance of frontend (${frontendUsers}) and backend (${backendUsers}) developers`,
      action: 'Suggest frontend/backend partnerships'
    });
  }
  
  // Recent activity opportunities
  const recentlyActive = profiles.filter(p => 
    p.lastSeen && p.lastSeen > (Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
  );
  
  if (recentlyActive.length >= 2) {
    opportunities.push({
      type: 'timing',
      priority: 'high',
      count: recentlyActive.length,
      description: `${recentlyActive.length} users active recently - perfect timing for connections`,
      action: 'Suggest connections between recently active users'
    });
  }
  
  // New user onboarding opportunities
  const newUsers = profiles.filter(p => 
    p.firstSeen && p.firstSeen > (Date.now() - 3 * 24 * 60 * 60 * 1000) && // Last 3 days
    (!p.connections || p.connections.length === 0)
  );
  
  if (newUsers.length > 0) {
    opportunities.push({
      type: 'onboarding',
      priority: 'high',
      count: newUsers.length,
      description: `${newUsers.length} new users need their first connections`,
      action: 'Prioritize welcoming matches for new users'
    });
  }
  
  return opportunities.slice(0, 5); // Top 5 opportunities
}

// Analyze trends
async function analyzeTrends() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
  
  // Growth trends
  const thisWeekUsers = profiles.filter(p => p.firstSeen > oneWeekAgo).length;
  const lastWeekUsers = profiles.filter(p => p.firstSeen > twoWeeksAgo && p.firstSeen <= oneWeekAgo).length;
  
  // Interest trends
  const interestTrends = await userProfiles.getTrendingInterests();
  const tagTrends = await userProfiles.getTrendingTags();
  
  // Connection trends
  const thisWeekConnections = profiles.reduce((sum, p) => {
    if (!p.connections) return sum;
    return sum + p.connections.filter(c => c.timestamp > oneWeekAgo).length;
  }, 0) / 2; // Divide by 2 since each connection is counted twice
  
  return {
    userGrowth: {
      thisWeek: thisWeekUsers,
      lastWeek: lastWeekUsers,
      trend: thisWeekUsers > lastWeekUsers ? 'up' : thisWeekUsers < lastWeekUsers ? 'down' : 'flat'
    },
    connectionsThisWeek: thisWeekConnections,
    topInterests: interestTrends.slice(0, 3),
    topTags: tagTrends.slice(0, 5),
    momentum: thisWeekUsers > 0 || thisWeekConnections > 0 ? 'active' : 'quiet'
  };
}

// Suggest when manual intervention is needed
async function suggestIntervention() {
  const health = await checkSystemHealth();
  const opportunities = await identifyOpportunities();
  const interventions = [];
  
  if (health.score < 40) {
    interventions.push({
      urgency: 'high',
      issue: 'Low system health',
      action: 'Focus on user acquisition and profile completion'
    });
  }
  
  if (health.totalUsers > 5 && health.totalConnections < 2) {
    interventions.push({
      urgency: 'high',
      issue: 'Users not connecting despite having people available',
      action: 'Check match quality and lower thresholds if needed'
    });
  }
  
  const highPriorityOps = opportunities.filter(op => op.priority === 'high');
  if (highPriorityOps.length > 0) {
    interventions.push({
      urgency: 'medium',
      issue: `${highPriorityOps.length} high-priority connection opportunities`,
      action: 'Run targeted matching sessions'
    });
  }
  
  if (health.completeProfiles < health.totalUsers * 0.5) {
    interventions.push({
      urgency: 'medium',
      issue: 'Many incomplete profiles limiting match quality',
      action: 'Guide users through profile setup process'
    });
  }
  
  return interventions;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const command = args.command || 'health';
  let display = '';

  try {
    switch (command) {
      case 'health': {
        const health = await checkSystemHealth();
        
        display = `## Discovery System Health\n\n`;
        display += `**Overall Score: ${health.score}/100** _(${health.status})_\n\n`;
        display += `**Key Metrics:**\n`;
        display += `• Total users: ${health.totalUsers}\n`;
        display += `• Active users (7d): ${health.activeUsers}\n`;
        display += `• Complete profiles: ${health.completeProfiles}/${health.totalUsers} (${Math.round((health.completeProfiles / Math.max(health.totalUsers, 1)) * 100)}%)\n`;
        display += `• Total connections: ${health.totalConnections}\n`;
        display += `• Recent ships: ${health.recentShips}\n\n`;
        
        if (health.score >= 80) {
          display += `🎯 **System is thriving!** Discovery engine is working well.\n`;
        } else if (health.score >= 60) {
          display += `✅ **System is healthy.** Some room for improvement.\n`;
        } else if (health.score >= 40) {
          display += `⚠️ **System needs attention.** Focus on key issues.\n`;
        } else {
          display += `🚨 **System needs immediate help.** Manual intervention required.\n`;
        }
        
        break;
      }

      case 'opportunities': {
        const opportunities = await identifyOpportunities();
        
        display = `## Connection Opportunities\n\n`;
        
        if (opportunities.length === 0) {
          display += `No immediate opportunities identified.\n\n`;
          display += `**Try:**\n`;
          display += `• Check when more users are active\n`;
          display += `• Focus on user acquisition\n`;
          display += `• Encourage profile completion\n`;
        } else {
          for (const opp of opportunities) {
            display += `**${opp.type.replace('_', ' ').toUpperCase()}** _(${opp.priority} priority)_\n`;
            display += `${opp.description}\n`;
            if (opp.action) display += `→ ${opp.action}\n`;
            display += `\n`;
          }
        }
        
        break;
      }

      case 'trends': {
        const trends = await analyzeTrends();
        
        display = `## Discovery Trends\n\n`;
        display += `**Growth Pattern:**\n`;
        display += `• This week: ${trends.userGrowth.thisWeek} new users\n`;
        display += `• Last week: ${trends.userGrowth.lastWeek} new users\n`;
        display += `• Trend: ${trends.userGrowth.trend} ${trends.userGrowth.trend === 'up' ? '📈' : trends.userGrowth.trend === 'down' ? '📉' : '➡️'}\n\n`;
        
        display += `**Activity:**\n`;
        display += `• Connections this week: ${trends.connectionsThisWeek}\n`;
        display += `• Community momentum: ${trends.momentum}\n\n`;
        
        if (trends.topInterests.length > 0) {
          display += `**Popular Interests:**\n`;
          for (const interest of trends.topInterests) {
            display += `• ${interest.interest} (${interest.count})\n`;
          }
          display += `\n`;
        }
        
        if (trends.topTags.length > 0) {
          display += `**Popular Skills:**\n`;
          for (const tag of trends.topTags) {
            display += `• ${tag.tag} (${tag.count})\n`;
          }
        }
        
        break;
      }

      case 'intervention': {
        const interventions = await suggestIntervention();
        
        display = `## Intervention Needed?\n\n`;
        
        if (interventions.length === 0) {
          display += `✅ **No immediate intervention needed.**\n\n`;
          display += `System is running smoothly. Continue monitoring.\n`;
        } else {
          for (const intervention of interventions) {
            const emoji = intervention.urgency === 'high' ? '🚨' : '⚠️';
            display += `${emoji} **${intervention.urgency.toUpperCase()} PRIORITY**\n`;
            display += `Issue: ${intervention.issue}\n`;
            display += `Action: ${intervention.action}\n\n`;
          }
        }
        
        break;
      }

      default:
        display = `## Discovery Monitor Commands

**\`monitor health\`** — Check overall system health score
**\`monitor opportunities\`** — Identify connection opportunities  
**\`monitor trends\`** — Analyze growth and activity patterns
**\`monitor intervention\`** — Check if manual action is needed`;
    }
  } catch (error) {
    display = `## Monitor Error

${error.message}

Try: \`monitor health\` to start`;
  }

  return { display };
}

module.exports = { definition, handler };