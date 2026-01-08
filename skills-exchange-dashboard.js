#!/usr/bin/env node

/**
 * Skills Exchange Dashboard - Analytics and insights for the marketplace
 */

const fs = require('fs');
const path = require('path');

const VIBE_DIR = path.join(process.env.HOME, '.vibecodings');
const SKILL_EXCHANGE_FILE = path.join(VIBE_DIR, 'skill-exchanges.jsonl');

// Load skill exchange data
function loadSkillExchanges() {
  try {
    if (!fs.existsSync(SKILL_EXCHANGE_FILE)) {
      return [];
    }
    
    const content = fs.readFileSync(SKILL_EXCHANGE_FILE, 'utf8').trim();
    if (!content) return [];
    
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .filter(post => post.status === 'active');
  } catch (error) {
    console.error('Error loading skill exchanges:', error.message);
    return [];
  }
}

// Analyze skill exchange patterns
function analyzeSkillsMarketplace(posts) {
  const analysis = {
    totalPosts: posts.length,
    offers: posts.filter(p => p.type === 'offer').length,
    requests: posts.filter(p => p.type === 'request').length,
    categories: {},
    skills: {},
    users: new Set(),
    potentialMatches: []
  };

  // Category breakdown
  posts.forEach(post => {
    analysis.users.add(post.handle);
    
    if (!analysis.categories[post.category]) {
      analysis.categories[post.category] = { offers: 0, requests: 0 };
    }
    analysis.categories[post.category][post.type + 's']++;
    
    if (!analysis.skills[post.skill]) {
      analysis.skills[post.skill] = { offers: 0, requests: 0 };
    }
    analysis.skills[post.skill][post.type + 's']++;
  });

  // Find potential matches (offers + requests for same skill)
  Object.entries(analysis.skills).forEach(([skill, counts]) => {
    if (counts.offers > 0 && counts.requests > 0) {
      analysis.potentialMatches.push({
        skill,
        offers: counts.offers,
        requests: counts.requests,
        matchPotential: Math.min(counts.offers, counts.requests)
      });
    }
  });

  analysis.potentialMatches.sort((a, b) => b.matchPotential - a.matchPotential);
  analysis.uniqueUsers = analysis.users.size;

  return analysis;
}

// Generate dashboard
function generateDashboard() {
  console.log('📊 Skills Exchange Dashboard\n');
  console.log('=' .repeat(50));
  
  const posts = loadSkillExchanges();
  
  if (posts.length === 0) {
    console.log('💭 No skills exchange posts yet');
    console.log('\n🚀 Run `node run_bootstrap.js` to populate with sample data');
    return;
  }

  const analysis = analyzeSkillsMarketplace(posts);
  
  // Overview
  console.log('\n🎯 MARKETPLACE OVERVIEW');
  console.log(`Total Posts: ${analysis.totalPosts}`);
  console.log(`Active Users: ${analysis.uniqueUsers}`);
  console.log(`Skill Offers: ${analysis.offers}`);
  console.log(`Skill Requests: ${analysis.requests}`);
  console.log(`Match Potential: ${analysis.potentialMatches.length} skills with both offers & requests`);

  // Category breakdown
  console.log('\n📚 BY CATEGORY');
  Object.entries(analysis.categories)
    .sort(([,a], [,b]) => (b.offers + b.requests) - (a.offers + a.requests))
    .forEach(([category, counts]) => {
      const total = counts.offers + counts.requests;
      console.log(`${category.padEnd(12)} ${total.toString().padStart(2)} posts (${counts.offers} offers, ${counts.requests} requests)`);
    });

  // Top matching opportunities
  if (analysis.potentialMatches.length > 0) {
    console.log('\n🤝 TOP MATCHING OPPORTUNITIES');
    analysis.potentialMatches.slice(0, 5).forEach((match, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${match.skill.padEnd(25)} ${match.offers} offers → ${match.requests} requests`);
    });
  }

  // Most popular skills
  console.log('\n🔥 MOST POPULAR SKILLS');
  Object.entries(analysis.skills)
    .sort(([,a], [,b]) => (b.offers + b.requests) - (a.offers + a.requests))
    .slice(0, 8)
    .forEach(([skill, counts], i) => {
      const total = counts.offers + counts.requests;
      const type = counts.offers > counts.requests ? '(mostly offered)' : 
                   counts.requests > counts.offers ? '(mostly requested)' : '(balanced)';
      console.log(`${(i+1).toString().padStart(2)}. ${skill.padEnd(20)} ${total.toString().padStart(2)} posts ${type}`);
    });

  // Recent activity
  const recentPosts = posts
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
    
  if (recentPosts.length > 0) {
    console.log('\n⏰ RECENT ACTIVITY');
    recentPosts.forEach(post => {
      const timeAgo = formatTimeAgo(post.timestamp);
      const emoji = post.type === 'offer' ? '🎯' : '🙋';
      console.log(`${emoji} @${post.handle} ${post.type}s "${post.skill}" (${timeAgo})`);
    });
  }

  console.log('\n' + '=' .repeat(50));
  console.log('💡 Users can browse with: `skills-exchange browse`');
  console.log('🎯 Find matches with: `skills-exchange match`');
  console.log('📝 Post skills with: `skills-exchange post --type offer --skill "your expertise"`');
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'just now';
}

// Run dashboard
if (require.main === module) {
  generateDashboard();
}

module.exports = { generateDashboard, analyzeSkillsMarketplace, loadSkillExchanges };