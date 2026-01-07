/**
 * Enhanced Discovery Features - Advanced matchmaking capabilities
 * 
 * Features for @discovery-agent:
 * - Smart profile completion suggestions
 * - Cross-domain interest matching
 * - Activity pattern analysis
 * - Connection success tracking
 * - Discovery insights and analytics
 */

const userProfiles = require('../store/profiles');
const store = require('../store');

// Advanced interest mapping - find connections across domains
const CROSS_DOMAIN_INTERESTS = {
  'ai': {
    related: ['machine learning', 'data science', 'automation', 'nlp'],
    complementary: ['ui/ux', 'product', 'ethics', 'data visualization'],
    applications: ['healthcare', 'fintech', 'education', 'gaming']
  },
  'frontend': {
    related: ['ui/ux', 'design systems', 'react', 'vue', 'angular'],
    complementary: ['backend', 'api design', 'devops', 'mobile'],
    applications: ['web apps', 'dashboards', 'marketing sites', 'e-commerce']
  },
  'blockchain': {
    related: ['crypto', 'web3', 'defi', 'nfts', 'smart contracts'],
    complementary: ['security', 'economics', 'legal', 'community'],
    applications: ['fintech', 'gaming', 'supply chain', 'identity']
  },
  'healthcare': {
    related: ['medical devices', 'telemedicine', 'health data', 'wellness'],
    complementary: ['ai', 'security', 'compliance', 'ux'],
    applications: ['patient care', 'research', 'mental health', 'fitness']
  },
  'gaming': {
    related: ['game design', 'unity', 'unreal', 'mobile games'],
    complementary: ['ai', 'networking', 'audio', 'community'],
    applications: ['education', 'simulation', 'social', 'vr/ar']
  }
};

// Suggest profile improvements to increase match quality
async function suggestProfileEnhancements(handle) {
  const profile = await userProfiles.getProfile(handle);
  const suggestions = [];
  
  // Missing building project
  if (!profile.building) {
    suggestions.push({
      type: 'building',
      priority: 'high',
      suggestion: 'Add what you\'re currently building to find similar builders',
      example: 'vibe update building "AI-powered code review tool"'
    });
  }
  
  // Few interests
  if (!profile.interests || profile.interests.length < 2) {
    suggestions.push({
      type: 'interests',
      priority: 'high', 
      suggestion: 'Add 3-5 interests to find people with shared passions',
      example: 'vibe update interests "ai, startups, productivity, music"'
    });
  }
  
  // No technical tags
  if (!profile.tags || profile.tags.length < 2) {
    suggestions.push({
      type: 'tags',
      priority: 'medium',
      suggestion: 'Tag your skills/technologies for better technical matching',
      example: 'vibe update tags "python, react, backend, api-design"'
    });
  }
  
  // Suggest cross-domain connections
  if (profile.interests && profile.interests.length > 0) {
    for (const interest of profile.interests) {
      const crossDomain = CROSS_DOMAIN_INTERESTS[interest.toLowerCase()];
      if (crossDomain) {
        suggestions.push({
          type: 'expansion',
          priority: 'low',
          suggestion: `Since you're interested in ${interest}, consider adding related interests`,
          options: crossDomain.related.slice(0, 3),
          complementary: crossDomain.complementary.slice(0, 2)
        });
        break; // Only show one expansion suggestion
      }
    }
  }
  
  return suggestions;
}

// Find cross-domain collaboration opportunities
async function findCrossDomainMatches(handle) {
  const myProfile = await userProfiles.getProfile(handle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  const crossMatches = [];
  
  for (const interest of (myProfile.interests || [])) {
    const crossDomain = CROSS_DOMAIN_INTERESTS[interest.toLowerCase()];
    if (!crossDomain) continue;
    
    // Find people in complementary domains
    for (const complementary of crossDomain.complementary) {
      const matches = allProfiles.filter(p => 
        p.handle !== myProfile.handle &&
        (p.interests?.some(i => i.toLowerCase().includes(complementary.toLowerCase())) ||
         p.tags?.some(t => t.toLowerCase().includes(complementary.toLowerCase())))
      );
      
      for (const match of matches) {
        crossMatches.push({
          handle: match.handle,
          yourDomain: interest,
          theirDomain: complementary,
          building: match.building,
          reason: `${interest} + ${complementary} collaboration opportunity`,
          potential: 'Cross-domain expertise exchange'
        });
      }
    }
  }
  
  return crossMatches.slice(0, 5);
}

// Analyze activity patterns for better matching
async function analyzeActivityPatterns() {
  const allProfiles = await userProfiles.getAllProfiles();
  const patterns = {
    timezones: {},
    activityPeaks: {},
    recentlyActive: [],
    dormant: []
  };
  
  const now = Date.now();
  const hour = 1000 * 60 * 60;
  const day = hour * 24;
  
  for (const profile of allProfiles) {
    if (!profile.lastSeen) continue;
    
    const timeAgo = now - profile.lastSeen;
    
    // Recently active (last 2 hours)
    if (timeAgo < 2 * hour) {
      patterns.recentlyActive.push({
        handle: profile.handle,
        building: profile.building,
        minutesAgo: Math.floor(timeAgo / (1000 * 60))
      });
    }
    
    // Dormant users (more than 7 days)
    if (timeAgo > 7 * day) {
      patterns.dormant.push({
        handle: profile.handle,
        daysAgo: Math.floor(timeAgo / day)
      });
    }
    
    // Estimate timezone (very rough)
    const lastSeenHour = new Date(profile.lastSeen).getHours();
    const timezone = `UTC${lastSeenHour < 12 ? '-' : '+'}${Math.abs(lastSeenHour - 12)}`;
    patterns.timezones[timezone] = (patterns.timezones[timezone] || 0) + 1;
  }
  
  return patterns;
}

// Track connection success metrics
async function getConnectionInsights() {
  const allProfiles = await userProfiles.getAllProfiles();
  const insights = {
    totalConnections: 0,
    avgConnectionsPerUser: 0,
    topConnectors: [],
    recentConnections: [],
    connectionReasons: {}
  };
  
  let totalUsers = 0;
  
  for (const profile of allProfiles) {
    if (profile.connections && profile.connections.length > 0) {
      totalUsers++;
      insights.totalConnections += profile.connections.length;
      
      // Recent connections (last 24 hours)
      const recent = profile.connections.filter(c => 
        (Date.now() - c.timestamp) < (1000 * 60 * 60 * 24)
      );
      
      for (const conn of recent) {
        insights.recentConnections.push({
          from: profile.handle,
          to: conn.handle,
          reason: conn.reason,
          hoursAgo: Math.floor((Date.now() - conn.timestamp) / (1000 * 60 * 60))
        });
      }
      
      // Track connection reasons
      for (const conn of profile.connections) {
        if (conn.reason) {
          insights.connectionReasons[conn.reason] = 
            (insights.connectionReasons[conn.reason] || 0) + 1;
        }
      }
      
      // Top connectors
      insights.topConnectors.push({
        handle: profile.handle,
        connections: profile.connections.length
      });
    }
  }
  
  insights.avgConnectionsPerUser = totalUsers > 0 ? 
    Math.round(insights.totalConnections / totalUsers * 10) / 10 : 0;
    
  insights.topConnectors.sort((a, b) => b.connections - a.connections);
  insights.topConnectors = insights.topConnectors.slice(0, 5);
  
  return insights;
}

// Generate discovery recommendations for the workshop
async function generateDiscoveryRecommendations() {
  const allProfiles = await userProfiles.getAllProfiles();
  const insights = await getConnectionInsights();
  const patterns = await analyzeActivityPatterns();
  
  const recommendations = [];
  
  // Recommend profile improvements
  if (allProfiles.length > 0) {
    const incompleteProfiles = allProfiles.filter(p => 
      !p.building || !p.interests || p.interests.length < 2
    ).length;
    
    if (incompleteProfiles > 0) {
      recommendations.push({
        type: 'profile-completion',
        priority: 'high',
        message: `${incompleteProfiles} users could improve their profiles`,
        action: 'Encourage users to add interests, skills, and current projects'
      });
    }
  }
  
  // Recommend connection opportunities
  if (patterns.recentlyActive.length > 1) {
    recommendations.push({
      type: 'timing',
      priority: 'medium',
      message: `${patterns.recentlyActive.length} users active recently`,
      action: 'Perfect time for real-time connection suggestions'
    });
  }
  
  // Recommend re-engagement
  if (patterns.dormant.length > 0) {
    recommendations.push({
      type: 'reengagement',
      priority: 'low', 
      message: `${patterns.dormant.length} dormant users could be re-engaged`,
      action: 'Send personalized connection suggestions to bring them back'
    });
  }
  
  return recommendations;
}

module.exports = {
  suggestProfileEnhancements,
  findCrossDomainMatches,
  analyzeActivityPatterns,
  getConnectionInsights,
  generateDiscoveryRecommendations,
  CROSS_DOMAIN_INTERESTS
};