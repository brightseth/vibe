#!/usr/bin/env node

/**
 * Discovery Dashboard LIVE — Real-time connection opportunities
 * 
 * Monitors user activity and skill exchanges to suggest connections
 * Built by @discovery-agent for the /vibe workshop
 */

const fs = require('fs');
const path = require('path');

const VIBE_DIR = path.join(process.env.HOME, '.vibecodings');
const SKILL_EXCHANGE_FILE = path.join(VIBE_DIR, 'skill-exchanges.jsonl');
const PROFILES_FILE = path.join(VIBE_DIR, 'profiles.json');

// Load data with fallbacks
function loadSkillExchanges() {
  try {
    if (!fs.existsSync(SKILL_EXCHANGE_FILE)) return [];
    const content = fs.readFileSync(SKILL_EXCHANGE_FILE, 'utf8').trim();
    if (!content) return [];
    return content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
  } catch (error) {
    console.error('Error loading skill exchanges:', error.message);
    return [];
  }
}

function loadProfiles() {
  try {
    if (!fs.existsSync(PROFILES_FILE)) return {};
    return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
  } catch (error) {
    return {};
  }
}

// Analyze connection opportunities
function analyzeConnections() {
  const posts = loadSkillExchanges();
  const profiles = loadProfiles();
  
  const analysis = {
    totalPosts: posts.length,
    activeUsers: new Set(),
    perfectMatches: [],
    skillGaps: {},
    networkHealth: {}
  };
  
  if (posts.length === 0) {
    analysis.status = 'NO_DATA';
    return analysis;
  }
  
  // Find perfect matches (offer + request for same skill)
  const skillMap = {};
  posts.forEach(post => {
    analysis.activeUsers.add(post.handle);
    
    if (!skillMap[post.skill]) {
      skillMap[post.skill] = { offers: [], requests: [] };
    }
    skillMap[post.skill][post.type + 's'].push(post);
  });
  
  // Identify perfect matches
  Object.entries(skillMap).forEach(([skill, data]) => {
    if (data.offers.length > 0 && data.requests.length > 0) {
      data.offers.forEach(offer => {
        data.requests.forEach(request => {
          if (offer.handle !== request.handle) {
            analysis.perfectMatches.push({
              skill,
              expert: offer.handle,
              learner: request.handle,
              offerDetails: offer.details,
              requestDetails: request.details,
              matchScore: 100
            });
          }
        });
      });
    }
  });
  
  // Sort by most promising matches
  analysis.perfectMatches.sort((a, b) => b.matchScore - a.matchScore);
  
  // Skill gap analysis
  const allSkills = Object.keys(skillMap);
  allSkills.forEach(skill => {
    const offers = skillMap[skill].offers.length;
    const requests = skillMap[skill].requests.length;
    
    if (requests > offers) {
      analysis.skillGaps[skill] = {
        gap: requests - offers,
        type: 'supply_shortage',
        requests: requests,
        offers: offers
      };
    }
  });
  
  // Network health
  analysis.networkHealth = {
    totalUsers: analysis.activeUsers.size,
    matchableSkills: Object.keys(skillMap).filter(skill => 
      skillMap[skill].offers.length > 0 && skillMap[skill].requests.length > 0
    ).length,
    connectionPotential: analysis.perfectMatches.length,
    coverageRatio: analysis.perfectMatches.length / Math.max(1, posts.length)
  };
  
  analysis.status = 'HEALTHY';
  return analysis;
}

// Generate actionable dashboard
function generateDashboard() {
  console.log('🕸️  Discovery Dashboard — Connection Intelligence\n');
  console.log('=' .repeat(55));
  
  const analysis = analyzeConnections();
  
  if (analysis.status === 'NO_DATA') {
    console.log('\n❌ NO SKILLS DATA FOUND');
    console.log('\n🚀 Action Required:');
    console.log('   • Run `bootstrap-skills` to create sample data');
    console.log('   • Users can post with `skills-exchange post`');
    console.log('   • Check back once skills are posted');
    return;
  }
  
  // Network Health Overview
  console.log('\n📊 NETWORK HEALTH');
  console.log(`Active Users: ${analysis.networkHealth.totalUsers}`);
  console.log(`Perfect Matches: ${analysis.networkHealth.connectionPotential}`);
  console.log(`Matchable Skills: ${analysis.networkHealth.matchableSkills}`);
  console.log(`Coverage: ${(analysis.networkHealth.coverageRatio * 100).toFixed(0)}%`);
  
  // High-Priority Connection Opportunities
  if (analysis.perfectMatches.length > 0) {
    console.log('\n🎯 HIGH-PRIORITY CONNECTIONS');
    console.log('   Ready to suggest — perfect skill matches found:');
    console.log('');
    
    analysis.perfectMatches.slice(0, 5).forEach((match, i) => {
      console.log(`${(i+1).toString().padStart(2)}. **${match.skill}**`);
      console.log(`    Expert: @${match.expert} (offers: "${match.offerDetails || 'available'}")`);
      console.log(`    Learner: @${match.learner} (needs: "${match.requestDetails || 'help wanted'}")`);
      console.log(`    Suggest: "You both are interested in ${match.skill}!"`);
      console.log('');
    });
    
    console.log('🤖 Auto-suggestions available via `suggest-connection` tool');
  } else {
    console.log('\n⏳ NO PERFECT MATCHES YET');
    console.log('   Skills posted but no complementary matches found');
  }
  
  // Skill Gaps (supply/demand imbalances)
  const topGaps = Object.entries(analysis.skillGaps)
    .sort(([,a], [,b]) => b.gap - a.gap)
    .slice(0, 5);
    
  if (topGaps.length > 0) {
    console.log('\n🔥 HIGH-DEMAND SKILLS');
    console.log('   Skills with more requests than offers:');
    console.log('');
    
    topGaps.forEach(([skill, data], i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${skill}`);
      console.log(`    Gap: ${data.requests} requests → ${data.offers} offers (need ${data.gap} more)`);
    });
    
    console.log('\n💡 Opportunity: Recruit experts in high-demand skills');
  }
  
  // Recent Activity Pulse
  const recentPosts = loadSkillExchanges()
    .filter(post => (Date.now() - post.timestamp) < 24 * 60 * 60 * 1000)
    .sort((a, b) => b.timestamp - a.timestamp);
    
  if (recentPosts.length > 0) {
    console.log('\n⚡ RECENT ACTIVITY (24h)');
    recentPosts.slice(0, 5).forEach(post => {
      const emoji = post.type === 'offer' ? '🎯' : '🙋';
      const timeAgo = formatTimeAgo(post.timestamp);
      console.log(`   ${emoji} @${post.handle} ${post.type}s "${post.skill}" (${timeAgo})`);
    });
  }
  
  // Action Items
  console.log('\n' + '=' .repeat(55));
  console.log('🎯 DISCOVERY AGENT ACTION ITEMS');
  
  if (analysis.perfectMatches.length > 0) {
    console.log('✅ Ready: Suggest connections for perfect matches');
  }
  
  if (analysis.networkHealth.totalUsers < 5) {
    console.log('📈 Growth: Network needs more active users');
  }
  
  if (Object.keys(analysis.skillGaps).length > 0) {
    console.log('🎭 Recruitment: Find experts for high-demand skills');
  }
  
  console.log('\n💬 Tools: Use `suggest-connection @user1 @user2 "reason"`');
  console.log('📊 Data: Skills posts tracked automatically');
  console.log('🔄 Refresh: Run this dashboard anytime for latest insights');
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'just now';
}

// CLI execution
if (require.main === module) {
  generateDashboard();
}

module.exports = { generateDashboard, analyzeConnections };