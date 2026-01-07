/**
 * Discovery Insights — Analytics and improvement suggestions for the discovery system
 *
 * Features:
 * - Connection success tracking
 * - Match quality analysis
 * - Community growth insights
 * - Recommendation algorithm tuning
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discover_insights',
  description: 'Analyze discovery patterns and suggest improvements to matchmaking.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['quality', 'growth', 'gaps', 'tune'],
        description: 'Type of insight analysis to run'
      }
    }
  }
};

// Analyze connection quality patterns
async function analyzeConnectionQuality() {
  const profiles = await userProfiles.getAllProfiles();
  const analysis = {
    totalConnections: 0,
    avgConnectionsPerUser: 0,
    connectionsByReason: {},
    mostSuccessfulTags: {},
    interestClusterSizes: {},
    timingPatterns: {}
  };

  let totalConnectionCount = 0;
  
  for (const profile of profiles) {
    if (profile.connections) {
      totalConnectionCount += profile.connections.length;
      
      // Analyze reasons for connections
      for (const conn of profile.connections) {
        const reason = conn.reason || 'unknown';
        analysis.connectionsByReason[reason] = (analysis.connectionsByReason[reason] || 0) + 1;
      }
    }
    
    // Track tag success (users with more connections)
    if (profile.tags && profile.connections) {
      for (const tag of profile.tags) {
        if (!analysis.mostSuccessfulTags[tag]) {
          analysis.mostSuccessfulTags[tag] = { connections: 0, users: 0 };
        }
        analysis.mostSuccessfulTags[tag].connections += profile.connections.length;
        analysis.mostSuccessfulTags[tag].users += 1;
      }
    }
  }
  
  analysis.totalConnections = totalConnectionCount / 2; // Each connection is counted twice
  analysis.avgConnectionsPerUser = profiles.length > 0 ? totalConnectionCount / profiles.length : 0;
  
  // Calculate tag success rates
  const tagSuccessRates = Object.entries(analysis.mostSuccessfulTags)
    .map(([tag, data]) => ({
      tag,
      avgConnectionsPerUser: data.connections / data.users,
      userCount: data.users
    }))
    .filter(item => item.userCount >= 2) // Only tags with multiple users
    .sort((a, b) => b.avgConnectionsPerUser - a.avgConnectionsPerUser)
    .slice(0, 10);

  return { analysis, tagSuccessRates };
}

// Analyze community growth patterns
async function analyzeCommunityGrowth() {
  const profiles = await userProfiles.getAllProfiles();
  
  if (profiles.length === 0) {
    return {
      growth: 'No user data available',
      trends: [],
      recommendations: ['Encourage users to set up profiles with vibe update commands']
    };
  }
  
  // Sort by first seen date
  const sortedProfiles = profiles
    .filter(p => p.firstSeen)
    .sort((a, b) => a.firstSeen - b.firstSeen);
  
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  const recentUsers = sortedProfiles.filter(p => p.firstSeen > oneWeekAgo).length;
  const monthlyUsers = sortedProfiles.filter(p => p.firstSeen > oneMonthAgo).length;
  
  // Interest evolution
  const interestTrends = await userProfiles.getTrendingInterests();
  const tagTrends = await userProfiles.getTrendingTags();
  
  // Activity patterns
  const activeUsers = profiles.filter(p => p.lastSeen && p.lastSeen > oneWeekAgo).length;
  const profileCompleteness = profiles.filter(p => 
    p.building && p.interests?.length > 0 && p.tags?.length > 0
  ).length;
  
  return {
    totalUsers: profiles.length,
    recentGrowth: recentUsers,
    monthlyGrowth: monthlyUsers,
    activeUsers,
    profileCompleteness: `${Math.round((profileCompleteness / profiles.length) * 100)}%`,
    topInterests: interestTrends.slice(0, 5),
    topTags: tagTrends.slice(0, 8),
    recommendations: generateGrowthRecommendations(profiles, recentUsers, profileCompleteness)
  };
}

// Identify gaps in the community
async function identifyGaps() {
  const profiles = await userProfiles.getAllProfiles();
  
  if (profiles.length < 5) {
    return {
      message: 'Community too small for gap analysis',
      recommendations: ['Focus on user acquisition and profile setup']
    };
  }
  
  const gaps = {
    underrepresentedSkills: [],
    missingComplementaryPairs: [],
    isolatedUsers: [],
    timezoneGaps: []
  };
  
  // Find isolated users (few connections)
  gaps.isolatedUsers = profiles
    .filter(p => !p.connections || p.connections.length < 2)
    .map(p => ({
      handle: p.handle,
      building: p.building,
      interests: p.interests || [],
      connectionCount: p.connections?.length || 0
    }))
    .slice(0, 8);
  
  // Skill gaps - common complementary pairs
  const skillPairs = [
    ['frontend', 'backend'],
    ['design', 'engineering'], 
    ['ai', 'data'],
    ['product', 'engineering'],
    ['marketing', 'engineering']
  ];
  
  for (const [skill1, skill2] of skillPairs) {
    const skill1Users = profiles.filter(p => p.tags?.some(t => t.toLowerCase().includes(skill1))).length;
    const skill2Users = profiles.filter(p => p.tags?.some(t => t.toLowerCase().includes(skill2))).length;
    
    if (Math.abs(skill1Users - skill2Users) > 3) {
      gaps.missingComplementaryPairs.push({
        overpopulated: skill1Users > skill2Users ? skill1 : skill2,
        underpopulated: skill1Users > skill2Users ? skill2 : skill1,
        ratio: `${Math.max(skill1Users, skill2Users)}:${Math.min(skill1Users, skill2Users)}`
      });
    }
  }
  
  return gaps;
}

// Suggest algorithm tuning
async function suggestTuning() {
  const { analysis } = await analyzeConnectionQuality();
  const suggestions = [];
  
  if (analysis.avgConnectionsPerUser < 2) {
    suggestions.push({
      metric: 'Low connection rate',
      issue: `Avg ${analysis.avgConnectionsPerUser.toFixed(1)} connections per user`,
      suggestion: 'Lower match score threshold or improve onboarding'
    });
  }
  
  // Analyze most successful connection reasons
  const topReasons = Object.entries(analysis.connectionsByReason)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
  
  if (topReasons.length > 0) {
    suggestions.push({
      metric: 'Top connection drivers',
      issue: `Most connections from: ${topReasons.map(([r]) => r).join(', ')}`,
      suggestion: 'Weight these factors higher in scoring algorithm'
    });
  }
  
  suggestions.push({
    metric: 'Algorithm recommendations',
    issue: 'Based on current patterns',
    suggestion: 'Consider time-based matching boost for users online simultaneously'
  });
  
  return suggestions;
}

// Generate growth recommendations
function generateGrowthRecommendations(profiles, recentUsers, completeProfiles) {
  const recommendations = [];
  
  if (recentUsers < 2) {
    recommendations.push('Focus on user acquisition - invite more builders');
  }
  
  if (completeProfiles < profiles.length * 0.5) {
    recommendations.push('Improve onboarding - guide users through profile setup');
  }
  
  if (profiles.length > 10 && recentUsers > 5) {
    recommendations.push('Community is growing! Consider specialized interest groups');
  }
  
  recommendations.push('Encourage users to ship and announce their work');
  recommendations.push('Host virtual coworking sessions for active builders');
  
  return recommendations;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const command = args.command || 'quality';
  let display = '';

  try {
    switch (command) {
      case 'quality': {
        const { analysis, tagSuccessRates } = await analyzeConnectionQuality();
        
        display = `## Connection Quality Analysis\n\n`;
        display += `**Overall Stats:**\n`;
        display += `• Total connections made: ${analysis.totalConnections}\n`;
        display += `• Avg connections per user: ${analysis.avgConnectionsPerUser.toFixed(1)}\n\n`;
        
        if (tagSuccessRates.length > 0) {
          display += `**Most Connected Skills:**\n`;
          for (const item of tagSuccessRates) {
            display += `• ${item.tag}: ${item.avgConnectionsPerUser.toFixed(1)} avg connections (${item.userCount} users)\n`;
          }
          display += `\n`;
        }
        
        if (Object.keys(analysis.connectionsByReason).length > 0) {
          display += `**Connection Reasons:**\n`;
          const sortedReasons = Object.entries(analysis.connectionsByReason)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
          
          for (const [reason, count] of sortedReasons) {
            display += `• ${reason}: ${count} connections\n`;
          }
        }
        
        break;
      }

      case 'growth': {
        const growth = await analyzeCommunityGrowth();
        
        display = `## Community Growth Analysis\n\n`;
        display += `**Community Size:**\n`;
        display += `• Total users: ${growth.totalUsers}\n`;
        display += `• New this week: ${growth.recentGrowth}\n`;
        display += `• New this month: ${growth.monthlyGrowth}\n`;
        display += `• Currently active: ${growth.activeUsers}\n`;
        display += `• Complete profiles: ${growth.profileCompleteness}\n\n`;
        
        if (growth.topInterests?.length > 0) {
          display += `**Trending Interests:**\n`;
          for (const item of growth.topInterests) {
            display += `• ${item.interest} (${item.count} users)\n`;
          }
          display += `\n`;
        }
        
        if (growth.topTags?.length > 0) {
          display += `**Popular Skills:**\n`;
          for (const item of growth.topTags) {
            display += `• ${item.tag} (${item.count})\n`;
          }
          display += `\n`;
        }
        
        display += `**Growth Recommendations:**\n`;
        for (const rec of growth.recommendations) {
          display += `• ${rec}\n`;
        }
        
        break;
      }

      case 'gaps': {
        const gaps = await identifyGaps();
        
        display = `## Community Gap Analysis\n\n`;
        
        if (gaps.isolatedUsers?.length > 0) {
          display += `**Users Needing Connections:**\n`;
          for (const user of gaps.isolatedUsers) {
            display += `• @${user.handle} (${user.connectionCount} connections)\n`;
            if (user.building) display += `  Building: ${user.building}\n`;
          }
          display += `\n`;
        }
        
        if (gaps.missingComplementaryPairs?.length > 0) {
          display += `**Skill Imbalances:**\n`;
          for (const gap of gaps.missingComplementaryPairs) {
            display += `• Need more ${gap.underpopulated} (${gap.ratio} ratio)\n`;
          }
          display += `\n`;
        }
        
        display += `**Suggestions:**\n`;
        display += `• Target recruitment for underrepresented skills\n`;
        display += `• Create interest groups for isolated users\n`;
        display += `• Host skill-exchange sessions\n`;
        
        break;
      }

      case 'tune': {
        const suggestions = await suggestTuning();
        
        display = `## Algorithm Tuning Suggestions\n\n`;
        
        for (const suggestion of suggestions) {
          display += `**${suggestion.metric}**\n`;
          display += `Issue: ${suggestion.issue}\n`;
          display += `Recommendation: ${suggestion.suggestion}\n\n`;
        }
        
        break;
      }

      default:
        display = `## Discovery Insights Commands

**\`insights quality\`** — Analyze connection success patterns
**\`insights growth\`** — Review community growth metrics  
**\`insights gaps\`** — Identify underserved users and skills
**\`insights tune\`** — Get algorithm improvement suggestions`;
    }
  } catch (error) {
    display = `## Insights Error

${error.message}

The discovery insights system needs user profile data to work.
Try: \`discover insights\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };