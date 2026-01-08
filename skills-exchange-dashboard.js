/**
 * Skills Exchange Dashboard
 * 
 * A comprehensive dashboard showing marketplace health, top connections,
 * trending skills, and opportunities for the discovery agent to act on.
 */

const fs = require('fs');
const path = require('path');

const PROFILES_FILE = path.join(__dirname, 'profiles.json');
const SKILLS_FILE = path.join(__dirname, 'skill-exchanges.jsonl');

// Load data helpers
function loadProfiles() {
  try {
    if (!fs.existsSync(PROFILES_FILE)) return {};
    return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
  } catch (error) {
    console.error('Error loading profiles:', error);
    return {};
  }
}

function loadSkillExchanges() {
  try {
    if (!fs.existsSync(SKILLS_FILE)) return [];
    const content = fs.readFileSync(SKILLS_FILE, 'utf8');
    return content.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
      .filter(post => post.status === 'active');
  } catch (error) {
    console.error('Error loading skill exchanges:', error);
    return [];
  }
}

// Generate marketplace metrics
function generateMarketplaceMetrics() {
  const profiles = loadProfiles();
  const posts = loadSkillExchanges();
  
  const offers = posts.filter(p => p.type === 'offer');
  const requests = posts.filter(p => p.type === 'request');
  
  // Skill category breakdown
  const categoryStats = {};
  posts.forEach(post => {
    const category = post.category || 'other';
    if (!categoryStats[category]) {
      categoryStats[category] = { offers: 0, requests: 0 };
    }
    categoryStats[category][post.type + 's']++;
  });
  
  // Most popular skills
  const skillStats = {};
  posts.forEach(post => {
    const skill = post.skill.toLowerCase();
    if (!skillStats[skill]) {
      skillStats[skill] = { offers: 0, requests: 0, demand: 0 };
    }
    skillStats[skill][post.type + 's']++;
    skillStats[skill].demand = skillStats[skill].requests - skillStats[skill].offers;
  });
  
  const topSkills = Object.entries(skillStats)
    .sort(([,a], [,b]) => (b.offers + b.requests) - (a.offers + a.requests))
    .slice(0, 10);
  
  const highDemandSkills = Object.entries(skillStats)
    .filter(([,stats]) => stats.demand > 0)
    .sort(([,a], [,b]) => b.demand - a.demand)
    .slice(0, 5);
  
  return {
    total: {
      users: new Set(posts.map(p => p.handle)).size, // Count unique posters
      posts: posts.length,
      offers: offers.length,
      requests: requests.length,
      categories: Object.keys(categoryStats).length
    },
    balance: offers.length / Math.max(1, requests.length),
    categoryBreakdown: categoryStats,
    topSkills: topSkills.map(([skill, stats]) => ({
      skill,
      ...stats,
      popularity: stats.offers + stats.requests
    })),
    highDemand: highDemandSkills.map(([skill, stats]) => ({
      skill,
      ...stats
    }))
  };
}

// Find best connection opportunities
function findConnectionOpportunities() {
  const profiles = loadProfiles();
  const posts = loadSkillExchanges();
  
  const opportunities = [];
  
  // For each request, find matching offers
  const requests = posts.filter(p => p.type === 'request');
  const offers = posts.filter(p => p.type === 'offer');
  
  requests.forEach(request => {
    const matchingOffers = offers.filter(offer => {
      if (offer.handle === request.handle) return false;
      
      // Simple skill matching
      const requestSkill = request.skill.toLowerCase();
      const offerSkill = offer.skill.toLowerCase();
      
      return requestSkill.includes(offerSkill) || 
             offerSkill.includes(requestSkill) ||
             requestSkill === offerSkill;
    });
    
    matchingOffers.forEach(offer => {
      const requesterProfile = profiles[request.handle] || {};
      const offerProfile = profiles[offer.handle] || {};
      
      opportunities.push({
        type: 'skill_match',
        requester: request.handle,
        provider: offer.handle,
        skill: request.skill,
        requestDetails: request.details,
        offerDetails: offer.details,
        requesterBuilding: requesterProfile.building,
        providerBuilding: offerProfile.building,
        confidence: calculateMatchConfidence(request, offer, requesterProfile, offerProfile)
      });
    });
  });
  
  return opportunities.sort((a, b) => b.confidence - a.confidence);
}

function calculateMatchConfidence(request, offer, requesterProfile, offerProfile) {
  let confidence = 50; // Base confidence
  
  const requestSkill = request.skill.toLowerCase();
  const offerSkill = offer.skill.toLowerCase();
  
  // Exact match
  if (requestSkill === offerSkill) confidence += 30;
  // Partial match  
  else if (requestSkill.includes(offerSkill) || offerSkill.includes(requestSkill)) confidence += 20;
  
  // Both have details (more serious)
  if (request.details && offer.details) confidence += 10;
  
  // Recent posts (more active)
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  if ((now - request.timestamp) < 3 * dayInMs) confidence += 5;
  if ((now - offer.timestamp) < 3 * dayInMs) confidence += 5;
  
  // Profile compatibility bonuses
  if (requesterProfile.building && offerProfile.building) {
    const reqBuilding = requesterProfile.building.toLowerCase();
    const offerBuilding = offerProfile.building.toLowerCase();
    
    // Complementary skills
    if (reqBuilding.includes('frontend') && offerBuilding.includes('backend')) confidence += 8;
    if (reqBuilding.includes('backend') && offerBuilding.includes('frontend')) confidence += 8;
    if (reqBuilding.includes('ai') && offerBuilding.includes('web')) confidence += 5;
  }
  
  // Interest overlap
  const reqInterests = requesterProfile.interests || [];
  const offerInterests = offerProfile.interests || [];
  const commonInterests = reqInterests.filter(i => offerInterests.includes(i));
  confidence += Math.min(10, commonInterests.length * 2);
  
  return Math.min(100, confidence);
}

// Generate actionable insights
function generateInsights() {
  const metrics = generateMarketplaceMetrics();
  const opportunities = findConnectionOpportunities();
  
  const insights = [];
  
  // Marketplace balance insight
  if (metrics.balance < 0.5) {
    insights.push({
      type: 'marketplace_imbalance',
      priority: 'high',
      title: 'More Skill Requests Than Offers',
      description: `${metrics.total.requests} requests vs ${metrics.total.offers} offers (${(metrics.balance * 100).toFixed(0)}% balance)`,
      action: 'Encourage experienced members to post skill offers',
      impact: 'Will improve matching success rate'
    });
  } else if (metrics.balance > 2) {
    insights.push({
      type: 'marketplace_oversupply',
      priority: 'medium',
      title: 'Many Offers, Few Requests',
      description: `${metrics.total.offers} offers vs ${metrics.total.requests} requests`,
      action: 'Encourage members to request skills they want to learn',
      impact: 'Will create more learning opportunities'
    });
  }
  
  // High-value connection opportunities
  const highConfidenceOpps = opportunities.filter(opp => opp.confidence >= 80);
  if (highConfidenceOpps.length > 0) {
    insights.push({
      type: 'high_value_matches',
      priority: 'high',
      title: 'Excellent Connection Opportunities',
      description: `${highConfidenceOpps.length} high-confidence skill matches available`,
      action: 'Proactively suggest these connections to users',
      opportunities: highConfidenceOpps.slice(0, 3)
    });
  }
  
  // Skill gap opportunities
  if (metrics.highDemand.length > 0) {
    insights.push({
      type: 'skill_gaps',
      priority: 'medium',
      title: 'High-Demand Skills',
      description: `Skills with unmet demand: ${metrics.highDemand.map(s => s.skill).join(', ')}`,
      action: 'Recruit members with these skills or encourage learning',
      skills: metrics.highDemand
    });
  }
  
  // Activity level insight
  if (metrics.total.posts < 5) {
    insights.push({
      type: 'low_activity',
      priority: 'high',
      title: 'Low Marketplace Activity',
      description: `Only ${metrics.total.posts} total skill posts`,
      action: 'Bootstrap with sample posts or encourage initial participation',
      impact: 'Need critical mass for network effects'
    });
  }
  
  return insights;
}

// Generate dashboard report
function generateDashboard() {
  const metrics = generateMarketplaceMetrics();
  const opportunities = findConnectionOpportunities();
  const insights = generateInsights();
  
  return {
    timestamp: new Date().toISOString(),
    summary: {
      health: metrics.balance >= 0.8 && metrics.balance <= 1.2 ? 'healthy' : 
              metrics.balance < 0.8 ? 'needs_offers' : 'needs_requests',
      ...metrics.total,
      balance: metrics.balance.toFixed(2)
    },
    metrics,
    opportunities: opportunities.slice(0, 10), // Top 10 opportunities
    insights: insights.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    }),
    recommendations: generateRecommendations(metrics, opportunities, insights)
  };
}

function generateRecommendations(metrics, opportunities, insights) {
  const recommendations = [];
  
  // For discovery agent actions
  if (opportunities.length > 0) {
    recommendations.push({
      target: 'discovery-agent',
      action: 'suggest_connections',
      description: 'DM users about their best skill matches',
      count: opportunities.filter(opp => opp.confidence >= 70).length
    });
  }
  
  if (metrics.highDemand.length > 0) {
    recommendations.push({
      target: 'discovery-agent', 
      action: 'highlight_gaps',
      description: 'Encourage posting in high-demand skill areas',
      skills: metrics.highDemand.slice(0, 3).map(s => s.skill)
    });
  }
  
  // For community growth
  if (metrics.total.users < 20) {
    recommendations.push({
      target: 'community',
      action: 'invite_experts',
      description: 'Invite people with gap skills to join',
      priority: 'high'
    });
  }
  
  return recommendations;
}

// Main dashboard function
async function displayDashboard() {
  const dashboard = generateDashboard();
  
  console.log('📊 SKILLS EXCHANGE MARKETPLACE DASHBOARD');
  console.log('='.repeat(60));
  console.log(`Generated: ${new Date(dashboard.timestamp).toLocaleString()}`);
  console.log(`Health: ${dashboard.summary.health.toUpperCase()}\n`);
  
  console.log('📈 MARKETPLACE METRICS');
  console.log('-'.repeat(30));
  console.log(`Users: ${dashboard.summary.users}`);
  console.log(`Total Posts: ${dashboard.summary.posts}`);
  console.log(`Offers: ${dashboard.summary.offers}`);
  console.log(`Requests: ${dashboard.summary.requests}`);
  console.log(`Balance Ratio: ${dashboard.summary.balance}:1 (offers:requests)`);
  console.log(`Categories: ${dashboard.summary.categories}\n`);
  
  if (dashboard.opportunities.length > 0) {
    console.log('🎯 TOP CONNECTION OPPORTUNITIES');
    console.log('-'.repeat(30));
    dashboard.opportunities.slice(0, 5).forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.skill} (${opp.confidence}% match)`);
      console.log(`   @${opp.requester} needs ← @${opp.provider} offers`);
      console.log(`   Requester: ${opp.requesterBuilding || 'Unknown project'}`);
      console.log(`   Provider: ${opp.providerBuilding || 'Unknown project'}\n`);
    });
  }
  
  if (dashboard.insights.length > 0) {
    console.log('💡 KEY INSIGHTS & ACTIONS');
    console.log('-'.repeat(30));
    dashboard.insights.forEach((insight, i) => {
      const priorityEmoji = insight.priority === 'high' ? '🔥' : 
                           insight.priority === 'medium' ? '⚡' : '💭';
      console.log(`${priorityEmoji} ${insight.title}`);
      console.log(`   ${insight.description}`);
      console.log(`   Action: ${insight.action}\n`);
    });
  }
  
  if (dashboard.recommendations.length > 0) {
    console.log('🚀 RECOMMENDATIONS FOR NEXT ACTIONS');
    console.log('-'.repeat(30));
    dashboard.recommendations.forEach(rec => {
      console.log(`• ${rec.target}: ${rec.description}`);
    });
    console.log('');
  }
  
  // Save full dashboard
  const dashboardFile = path.join(__dirname, 'skills-exchange-dashboard.json');
  fs.writeFileSync(dashboardFile, JSON.stringify(dashboard, null, 2));
  console.log(`📁 Full dashboard saved to: skills-exchange-dashboard.json\n`);
  
  return dashboard;
}

if (require.main === module) {
  displayDashboard().catch(console.error);
}

module.exports = {
  generateDashboard,
  generateMarketplaceMetrics,
  findConnectionOpportunities,
  generateInsights
};