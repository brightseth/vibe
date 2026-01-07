/**
 * Daily Discovery Report — Smart summary of community matchmaking opportunities
 * 
 * Provides the discovery agent with a comprehensive daily briefing:
 * - Community health snapshot
 * - High-priority connection opportunities  
 * - Trending interests and skills
 * - Recommended actions for the day
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const proactiveDiscovery = require('./_proactive-discovery');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_daily',
  description: 'Generate daily discovery report with community insights and connection opportunities.',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['full', 'summary', 'actions'],
        description: 'Report format - full report, summary, or just actions'
      }
    }
  }
};

async function generateDailyReport(format = 'full') {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  // Gather all data
  const profiles = await userProfiles.getAllProfiles();
  const shippingPatterns = await proactiveDiscovery.analyzeShippingPatterns();
  const precomputedMatches = await proactiveDiscovery.preComputeMatches();
  const emergingClusters = await proactiveDiscovery.identifyEmergingClusters();
  const timingAnalysis = await proactiveDiscovery.suggestOptimalTiming();
  
  // Calculate community metrics
  const metrics = calculateDailyMetrics(profiles);
  
  const report = {
    date: today,
    timestamp: now,
    format,
    metrics,
    shippingPatterns,
    precomputedMatches,
    emergingClusters,
    timingAnalysis,
    recommendations: generateDailyRecommendations(metrics, shippingPatterns, precomputedMatches),
    insights: generateInsights(metrics, shippingPatterns, emergingClusters)
  };
  
  return report;
}

function calculateDailyMetrics(profiles) {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  return {
    total: {
      users: profiles.length,
      connections: profiles.reduce((sum, p) => sum + (p.connections?.length || 0), 0) / 2,
      ships: profiles.reduce((sum, p) => sum + (p.ships?.length || 0), 0)
    },
    recent: {
      newUsers24h: profiles.filter(p => p.firstSeen && p.firstSeen > oneDayAgo).length,
      activeUsers24h: profiles.filter(p => p.lastSeen && p.lastSeen > oneDayAgo).length,
      newConnections24h: profiles.reduce((sum, p) => {
        if (!p.connections) return sum;
        return sum + p.connections.filter(c => c.timestamp > oneDayAgo).length;
      }, 0) / 2,
      ships24h: profiles.reduce((sum, p) => {
        if (!p.ships) return sum;
        return sum + p.ships.filter(s => s.timestamp > oneDayAgo).length;
      }, 0)
    },
    quality: {
      completeProfiles: profiles.filter(p => 
        p.building && p.interests?.length > 0 && p.tags?.length > 0
      ).length,
      wellConnectedUsers: profiles.filter(p => p.connections?.length >= 3).length,
      activeShippers: profiles.filter(p => 
        p.ships?.some(s => s.timestamp > oneMonthAgo)
      ).length
    },
    health: {
      profileCompletionRate: profiles.length > 0 ? 
        profiles.filter(p => p.building && p.interests?.length > 0).length / profiles.length : 0,
      averageConnections: profiles.length > 0 ? 
        profiles.reduce((sum, p) => sum + (p.connections?.length || 0), 0) / profiles.length : 0,
      weeklyRetention: profiles.filter(p => 
        p.firstSeen && p.firstSeen < oneWeekAgo && p.lastSeen && p.lastSeen > oneWeekAgo
      ).length
    }
  };
}

function generateDailyRecommendations(metrics, shippingPatterns, precomputedMatches) {
  const recommendations = [];
  
  // High-priority recommendations based on data
  if (precomputedMatches.length > 0) {
    recommendations.push({
      priority: 'high',
      type: 'dormant_user_outreach',
      count: precomputedMatches.length,
      action: `Reach out to ${precomputedMatches.length} dormant users with personalized connection suggestions`,
      impact: 'Re-engage inactive users with high-quality matches'
    });
  }
  
  if (metrics.recent.newUsers24h > 0) {
    recommendations.push({
      priority: 'high',
      type: 'new_user_onboarding',
      count: metrics.recent.newUsers24h,
      action: `Welcome ${metrics.recent.newUsers24h} new users and help them make their first connections`,
      impact: 'Improve new user retention and engagement'
    });
  }
  
  if (shippingPatterns.complementaryShips.length > 0) {
    recommendations.push({
      priority: 'medium',
      type: 'collaboration_matching',
      count: shippingPatterns.complementaryShips.length,
      action: `Suggest collaborations between complementary skill pairs`,
      impact: 'Enable cross-functional partnerships'
    });
  }
  
  if (Object.keys(shippingPatterns.emergingTrends).length > 0) {
    const trendingTopics = Object.entries(shippingPatterns.emergingTrends)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 3);
    
    recommendations.push({
      priority: 'medium',
      type: 'trend_based_matching',
      trends: trendingTopics.map(([topic, data]) => ({ topic, count: data.count })),
      action: `Connect users working on trending topics: ${trendingTopics.map(([topic]) => topic).join(', ')}`,
      impact: 'Foster communities around emerging interests'
    });
  }
  
  if (metrics.quality.completeProfiles < metrics.total.users * 0.6) {
    recommendations.push({
      priority: 'medium',
      type: 'profile_improvement',
      action: 'Guide users to complete their profiles (building, interests, tags)',
      impact: 'Improve match quality for all users'
    });
  }
  
  return recommendations.slice(0, 5); // Top 5 recommendations
}

function generateInsights(metrics, shippingPatterns, emergingClusters) {
  const insights = [];
  
  // Growth insights
  if (metrics.recent.newUsers24h > 0) {
    insights.push(`Community grew by ${metrics.recent.newUsers24h} users in the last 24h`);
  }
  
  // Engagement insights
  const engagementRate = metrics.total.users > 0 ? 
    metrics.recent.activeUsers24h / metrics.total.users : 0;
  
  if (engagementRate > 0.3) {
    insights.push(`High engagement: ${Math.round(engagementRate * 100)}% of users active today`);
  } else if (engagementRate < 0.1 && metrics.total.users > 5) {
    insights.push(`Low engagement: Only ${Math.round(engagementRate * 100)}% of users active today`);
  }
  
  // Shipping insights
  if (metrics.recent.ships24h > 0) {
    insights.push(`${metrics.recent.ships24h} things shipped in the last 24h - community is building!`);
  }
  
  // Connection insights
  if (metrics.recent.newConnections24h > 0) {
    insights.push(`${metrics.recent.newConnections24h} new connections made today`);
  }
  
  // Trending insights
  const trendCount = Object.keys(shippingPatterns.emergingTrends).length;
  if (trendCount > 0) {
    insights.push(`${trendCount} emerging project trends identified from recent ships`);
  }
  
  // Community health
  if (metrics.health.profileCompletionRate > 0.8) {
    insights.push(`Strong community health: ${Math.round(metrics.health.profileCompletionRate * 100)}% profile completion rate`);
  }
  
  return insights;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const format = args.format || 'full';
  let display = '';

  try {
    const report = await generateDailyReport(format);
    const { metrics, recommendations, insights } = report;
    
    switch (format) {
      case 'summary':
        display = `## Daily Discovery Summary - ${report.date}\n\n`;
        display += `**Community:** ${metrics.total.users} users, ${metrics.recent.activeUsers24h} active today\n`;
        display += `**Growth:** +${metrics.recent.newUsers24h} users, ${metrics.recent.ships24h} ships\n`;
        display += `**Connections:** ${metrics.total.connections} total, +${metrics.recent.newConnections24h} today\n\n`;
        
        if (recommendations.length > 0) {
          display += `**Top Priority:** ${recommendations[0].action}\n`;
        }
        break;
        
      case 'actions':
        display = `## Daily Action Items - ${report.date}\n\n`;
        
        if (recommendations.length === 0) {
          display += `No high-priority actions today.\n\n`;
          display += `**Consider:**\n`;
          display += `• Check for new users to welcome\n`;
          display += `• Review dormant user engagement\n`;
          display += `• Monitor shipping activity for collaboration opportunities\n`;
        } else {
          for (const [i, rec] of recommendations.entries()) {
            const priority = rec.priority === 'high' ? '🚨' : '⚠️';
            display += `${i + 1}. ${priority} **${rec.type.replace('_', ' ').toUpperCase()}**\n`;
            display += `   ${rec.action}\n`;
            display += `   _Impact: ${rec.impact}_\n\n`;
          }
        }
        break;
        
      default: // full
        display = `## Daily Discovery Report - ${report.date}\n\n`;
        
        // Community overview
        display += `### Community Overview\n`;
        display += `**Total Users:** ${metrics.total.users} (${metrics.recent.newUsers24h} new today)\n`;
        display += `**Active Today:** ${metrics.recent.activeUsers24h}/${metrics.total.users} (${Math.round((metrics.recent.activeUsers24h / Math.max(metrics.total.users, 1)) * 100)}%)\n`;
        display += `**Profile Quality:** ${metrics.quality.completeProfiles} complete profiles (${Math.round((metrics.quality.completeProfiles / Math.max(metrics.total.users, 1)) * 100)}%)\n`;
        display += `**Connections:** ${metrics.total.connections} total, ${metrics.recent.newConnections24h} made today\n`;
        display += `**Shipping Activity:** ${metrics.recent.ships24h} things shipped today\n\n`;
        
        // Key insights
        if (insights.length > 0) {
          display += `### Key Insights\n`;
          for (const insight of insights) {
            display += `• ${insight}\n`;
          }
          display += `\n`;
        }
        
        // High-priority opportunities
        if (recommendations.length > 0) {
          display += `### Priority Actions\n`;
          for (const rec of recommendations.slice(0, 3)) {
            const emoji = rec.priority === 'high' ? '🚨' : '⚠️';
            display += `${emoji} **${rec.type.replace('_', ' ').toUpperCase()}**\n`;
            display += `${rec.action}\n`;
            if (rec.count) display += `_${rec.count} opportunities_\n`;
            display += `\n`;
          }
        }
        
        // Trending topics
        if (Object.keys(report.shippingPatterns.emergingTrends).length > 0) {
          display += `### Trending Project Topics\n`;
          const trends = Object.entries(report.shippingPatterns.emergingTrends)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 5);
          
          for (const [topic, data] of trends) {
            display += `• **${topic}** (${data.count} recent ships)\n`;
          }
          display += `\n`;
        }
        
        // Timing recommendations
        if (report.timingAnalysis.peakActivityHours.length > 0) {
          display += `### Optimal Connection Times\n`;
          for (const time of report.timingAnalysis.peakActivityHours) {
            display += `• ${time.hour}:00 - ${time.userCount} users typically active\n`;
          }
          display += `\n`;
        }
        
        display += `---\n`;
        display += `_Report generated at ${new Date(report.timestamp).toLocaleTimeString()}_`;
    }
  } catch (error) {
    display = `## Daily Report Error\n\n${error.message}\n\nTry: \`daily summary\` for a quick overview`;
  }

  return { display };
}

module.exports = { definition, handler, generateDailyReport };"