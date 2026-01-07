/**
 * Discovery Daily — Daily discovery routine and community health check
 *
 * Automated daily tasks:
 * - Welcome new users with connection suggestions
 * - Identify high-value connection opportunities
 * - Generate community insights
 * - Clean up old data
 * - Update trending interests/tags
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const discoveryMonitor = require('./discovery-monitor');
const { suggest_connection, dm_user } = require('./_actions');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_daily',
  description: 'Run daily discovery routines and community health checks.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['full', 'welcome', 'insights', 'cleanup'],
        description: 'Which daily routine to run'
      }
    }
  }
};

// Full daily routine
async function runFullDaily() {
  const results = {
    welcomesSent: 0,
    connectionsSuggested: 0,
    insights: {},
    cleanedProfiles: 0,
    errors: []
  };
  
  try {
    // 1. Welcome new users
    const welcomeResults = await welcomeNewUsers();
    results.welcomesSent = welcomeResults.welcomesSent;
    results.connectionsSuggested += welcomeResults.connectionsSuggested;
    
    // 2. Find high-value connections
    const opportunityResults = await findTodaysOpportunities();
    results.connectionsSuggested += opportunityResults.suggested;
    
    // 3. Generate insights
    results.insights = await generateDailyInsights();
    
    // 4. Cleanup old data
    results.cleanedProfiles = await userProfiles.cleanupOldProfiles(30);
    
    return results;
  } catch (error) {
    results.errors.push(error.message);
    return results;
  }
}

// Welcome new users with connection suggestions
async function welcomeNewUsers() {
  const newUsers = await discoveryMonitor.getRecentUsers(24);
  let welcomesSent = 0;
  let connectionsSuggested = 0;
  
  for (const user of newUsers) {
    try {
      // Get welcome connections for this user
      const welcomeConnections = await discoveryMonitor.getWelcomeConnections(user.handle);
      
      if (welcomeConnections.length > 0) {
        // Send welcome message with suggestions
        const welcomeMsg = createWelcomeMessage(user, welcomeConnections);
        await dm_user(user.handle, welcomeMsg);
        welcomesSent++;
        
        // Make connection suggestions (max 2 per new user)
        for (const connection of welcomeConnections.slice(0, 2)) {
          await suggest_connection(user.handle, connection.handle, connection.reason);
          connectionsSuggested++;
        }
      } else {
        // Send basic welcome if no specific connections found
        const basicWelcome = createBasicWelcome(user);
        await dm_user(user.handle, basicWelcome);
        welcomesSent++;
      }
    } catch (error) {
      console.warn(`Failed to welcome ${user.handle}:`, error.message);
    }
  }
  
  return { welcomesSent, connectionsSuggested };
}

// Create personalized welcome message
function createWelcomeMessage(user, connections) {
  let msg = `Welcome to /vibe, @${user.handle}! 🎉\n\n`;
  
  if (user.building) {
    msg += `I see you're building ${user.building} — that's exciting!\n\n`;
  }
  
  if (connections.length > 0) {
    msg += `I found some people you should definitely meet:\n\n`;
    
    for (const conn of connections.slice(0, 2)) {
      msg += `**@${conn.handle}** — ${conn.reason}\n`;
      if (conn.building) {
        msg += `Building: ${conn.building}\n`;
      }
      msg += `\n`;
    }
    
    msg += `Type \`message @handle\` to reach out, or \`discover suggest\` to see more recommendations.\n\n`;
  }
  
  msg += `**Getting started:**\n`;
  msg += `• Share what you're building: \`update building "your project"\`\n`;
  msg += `• Add interests: \`update interests "ai, startups, music"\`\n`;  
  msg += `• Tag your skills: \`update tags "frontend, react, python"\`\n\n`;
  msg += `The more you share, the better connections I can suggest!\n\n`;
  msg += `Happy building! 🚀`;
  
  return msg;
}

// Create basic welcome for users without specific connections
function createBasicWelcome(user) {
  let msg = `Welcome to /vibe, @${user.handle}! 🎉\n\n`;
  
  msg += `You're joining a community of builders and makers. Here's how to get connected:\n\n`;
  
  msg += `**Set up your profile:**\n`;
  msg += `• \`update building "what you're working on"\`\n`;
  msg += `• \`update interests "ai, startups, design"\`\n`;
  msg += `• \`update tags "frontend, python, entrepreneur"\`\n\n`;
  
  msg += `**Find your people:**\n`;
  msg += `• \`discover suggest\` — Get personalized recommendations\n`;
  msg += `• \`discover search "ai"\` — Find people by interest\n`;
  msg += `• \`who\` — See who's online now\n\n`;
  
  msg += `**Share your work:**\n`;
  msg += `• \`ship "what you completed"\` — Celebrate your progress\n`;
  msg += `• Join the daily builds in \`/vibe\` channel\n\n`;
  
  msg += `Looking forward to seeing what you build! 🚀`;
  
  return msg;
}

// Find high-value connection opportunities for today
async function findTodaysOpportunities() {
  const opportunities = await discoveryMonitor.monitorHighValueConnections();
  let suggested = 0;
  
  for (const opp of opportunities) {
    try {
      // Suggest the connection to both users
      await suggest_connection(opp.user1, opp.user2, opp.reason);
      suggested++;
      
      // Optional: Send a DM to highlight the opportunity
      if (opp.urgency === 'both-online') {
        const msg = `Perfect timing! @${opp.user2} is online now and ${opp.reason.toLowerCase()}. ` +
                   `Might be a great time to connect! 🎯`;
        await dm_user(opp.user1, msg);
      }
    } catch (error) {
      console.warn(`Failed to suggest ${opp.user1} -> ${opp.user2}:`, error.message);
    }
  }
  
  return { suggested };
}

// Generate daily community insights
async function generateDailyInsights() {
  const stats = await discoveryMonitor.getConnectionStats();
  const trendingInterests = await userProfiles.getTrendingInterests();
  const trendingTags = await userProfiles.getTrendingTags();
  
  const insights = {
    growth: {
      newUsers: stats.newUsersToday,
      activeUsers: stats.activeUsersToday,
      totalUsers: stats.totalUsers,
      connectionsMade: stats.connectionsMadeToday
    },
    engagement: {
      usersWithConnections: stats.usersWithConnections,
      avgConnectionsPerUser: stats.avgConnectionsPerUser.toFixed(1),
      connectionRate: ((stats.usersWithConnections / stats.totalUsers) * 100).toFixed(1)
    },
    trends: {
      topInterests: trendingInterests.slice(0, 5),
      topTags: trendingTags.slice(0, 8)
    },
    health: calculateCommunityHealth(stats)
  };
  
  return insights;
}

// Calculate community health score
function calculateCommunityHealth(stats) {
  let score = 0;
  const factors = [];
  
  // Growth factor (30 points max)
  if (stats.newUsersToday > 0) {
    score += Math.min(stats.newUsersToday * 5, 30);
    factors.push(`${stats.newUsersToday} new users today`);
  }
  
  // Activity factor (25 points max) 
  const activityRate = stats.totalUsers > 0 ? stats.activeUsersToday / stats.totalUsers : 0;
  score += activityRate * 25;
  if (activityRate > 0.3) factors.push('High daily activity');
  
  // Connection factor (25 points max)
  const connectionRate = stats.totalUsers > 0 ? stats.usersWithConnections / stats.totalUsers : 0;
  score += connectionRate * 25;
  if (connectionRate > 0.5) factors.push('Good connection rate');
  
  // Engagement factor (20 points max)
  if (stats.connectionsMadeToday > 0) {
    score += Math.min(stats.connectionsMadeToday * 4, 20);
    factors.push(`${stats.connectionsMadeToday} connections made today`);
  }
  
  let level = 'Needs attention';
  if (score >= 80) level = 'Thriving';
  else if (score >= 60) level = 'Healthy';
  else if (score >= 40) level = 'Growing';
  
  return {
    score: Math.round(score),
    level,
    factors
  };
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const action = args.action || 'full';
  let display = '';

  try {
    switch (action) {
      case 'full': {
        display = `## Running Daily Discovery Routine...\n\n`;
        const results = await runFullDaily();
        
        display += `**Community Activity:**\n`;
        display += `• New users welcomed: ${results.welcomesSent}\n`;
        display += `• Connections suggested: ${results.connectionsSuggested}\n`;
        if (results.cleanedProfiles > 0) {
          display += `• Inactive profiles cleaned: ${results.cleanedProfiles}\n`;
        }
        display += `\n`;
        
        if (results.insights.growth) {
          display += `**Growth Today:**\n`;
          display += `• New users: ${results.insights.growth.newUsers}\n`;
          display += `• Active users: ${results.insights.growth.activeUsers}/${results.insights.growth.totalUsers}\n`;
          display += `• New connections: ${results.insights.growth.connectionsMade}\n`;
          display += `\n`;
        }
        
        if (results.insights.health) {
          display += `**Community Health: ${results.insights.health.level}** (${results.insights.health.score}/100)\n`;
          if (results.insights.health.factors.length > 0) {
            display += `${results.insights.health.factors.join(' • ')}\n`;
          }
          display += `\n`;
        }
        
        if (results.insights.trends?.topInterests?.length > 0) {
          display += `**Trending Interests:**\n`;
          for (const item of results.insights.trends.topInterests) {
            display += `• ${item.interest} (${item.count})\n`;
          }
          display += `\n`;
        }
        
        if (results.errors.length > 0) {
          display += `**Errors:**\n`;
          for (const error of results.errors) {
            display += `• ${error}\n`;
          }
        }
        
        break;
      }

      case 'welcome': {
        const results = await welcomeNewUsers();
        display = `## Welcome Routine Complete\n\n`;
        display += `• Users welcomed: ${results.welcomesSent}\n`;
        display += `• Connection suggestions made: ${results.connectionsSuggested}\n`;
        break;
      }

      case 'insights': {
        const insights = await generateDailyInsights();
        display = `## Daily Community Insights\n\n`;
        
        display += `**Growth:**\n`;
        display += `• Total users: ${insights.growth.totalUsers}\n`;
        display += `• New today: ${insights.growth.newUsers}\n`;
        display += `• Active today: ${insights.growth.activeUsers}\n`;
        display += `• Connections made: ${insights.growth.connectionsMade}\n\n`;
        
        display += `**Health: ${insights.health.level}** (${insights.health.score}/100)\n`;
        if (insights.health.factors.length > 0) {
          display += `${insights.health.factors.join(' • ')}\n`;
        }
        display += `\n`;
        
        if (insights.trends.topInterests.length > 0) {
          display += `**Top Interests:**\n`;
          for (const item of insights.trends.topInterests) {
            display += `• ${item.interest} (${item.count})\n`;
          }
        }
        
        break;
      }

      case 'cleanup': {
        const cleaned = await userProfiles.cleanupOldProfiles(30);
        display = `## Cleanup Complete\n\n`;
        display += `Removed ${cleaned} inactive profiles (30+ days old)\n`;
        break;
      }

      default:
        display = `## Discovery Daily Commands

**\`daily full\`** — Run complete daily routine
**\`daily welcome\`** — Welcome new users only  
**\`daily insights\`** — Generate community insights
**\`daily cleanup\`** — Clean up old profiles

**Automated daily tasks:**
• Welcome new users with connection suggestions
• Find high-value connection opportunities
• Generate community health insights
• Clean up inactive profiles`;
    }
  } catch (error) {
    display = `## Daily Routine Error

${error.message}

Try running individual routines:
• \`daily welcome\` — Welcome new users
• \`daily insights\` — Community insights  
• \`daily cleanup\` — Profile cleanup`;
  }

  return { display };
}

module.exports = { definition, handler };