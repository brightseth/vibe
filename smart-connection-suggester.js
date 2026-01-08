/**
 * Smart Connection Suggester for Skills Exchange
 * 
 * Analyzes skills data and automatically suggests high-value connections
 * based on complementary skills, project alignment, and activity patterns.
 */

const fs = require('fs');
const path = require('path');

const VIBE_DIR = path.join(__dirname, 'data/vibe');
const PROFILES_FILE = path.join(VIBE_DIR, 'profiles.json');
const SKILLS_FILE = path.join(VIBE_DIR, 'skill-exchanges.jsonl');

// Load data
function loadProfiles() {
  try {
    return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
  } catch (error) {
    return {};
  }
}

function loadSkillExchanges() {
  try {
    const content = fs.readFileSync(SKILLS_FILE, 'utf8');
    return content.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
      .filter(post => post.status === 'active');
  } catch (error) {
    return [];
  }
}

// Calculate match score between two users
function calculateMatchScore(user1, user2, posts) {
  let score = 0;
  const reasons = [];

  const user1Posts = posts.filter(p => p.handle === user1.handle);
  const user2Posts = posts.filter(p => p.handle === user2.handle);

  // 1. Skills Exchange Matches (highest weight)
  const user1Offers = user1Posts.filter(p => p.type === 'offer');
  const user1Requests = user1Posts.filter(p => p.type === 'request');
  const user2Offers = user2Posts.filter(p => p.type === 'offer');
  const user2Requests = user2Posts.filter(p => p.type === 'request');

  // Check if user1's offers match user2's requests
  for (const offer of user1Offers) {
    for (const request of user2Requests) {
      if (skillsMatch(offer.skill, request.skill)) {
        score += 10;
        reasons.push(`${user1.handle} offers "${offer.skill}" which ${user2.handle} needs`);
      }
    }
  }

  // Check if user2's offers match user1's requests
  for (const offer of user2Offers) {
    for (const request of user1Requests) {
      if (skillsMatch(offer.skill, request.skill)) {
        score += 10;
        reasons.push(`${user2.handle} offers "${offer.skill}" which ${user1.handle} needs`);
      }
    }
  }

  // 2. Complementary Building Projects (medium weight)
  if (user1.building && user2.building) {
    const building1 = user1.building.toLowerCase();
    const building2 = user2.building.toLowerCase();
    
    // Check for complementary domains
    const complementaryPairs = [
      ['frontend', 'backend'], ['design', 'development'], ['ai', 'data'],
      ['marketing', 'product'], ['mobile', 'web'], ['devops', 'development']
    ];
    
    for (const [domain1, domain2] of complementaryPairs) {
      if ((building1.includes(domain1) && building2.includes(domain2)) ||
          (building1.includes(domain2) && building2.includes(domain1))) {
        score += 5;
        reasons.push(`Complementary projects: ${domain1} + ${domain2}`);
      }
    }
  }

  // 3. Shared Interests (low weight)
  const sharedInterests = user1.interests?.filter(interest => 
    user2.interests?.includes(interest)
  ) || [];
  score += sharedInterests.length * 2;
  if (sharedInterests.length > 0) {
    reasons.push(`Shared interests: ${sharedInterests.slice(0, 2).join(', ')}`);
  }

  // 4. Skill Tag Overlap (low weight)
  const sharedSkills = user1.tags?.filter(tag => 
    user2.tags?.includes(tag)
  ) || [];
  score += sharedSkills.length * 1;
  if (sharedSkills.length > 0) {
    reasons.push(`Similar skills: ${sharedSkills.slice(0, 2).join(', ')}`);
  }

  return { score, reasons: reasons.slice(0, 3) }; // Top 3 reasons
}

// Check if two skills match (fuzzy matching)
function skillsMatch(skill1, skill2) {
  const s1 = skill1.toLowerCase();
  const s2 = skill2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return true;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return true;
  
  // Common skill synonyms
  const synonyms = {
    'react': ['react.js', 'reactjs', 'react development'],
    'node': ['node.js', 'nodejs', 'node development'],
    'ui': ['user interface', 'interface design'],
    'ux': ['user experience', 'experience design'],
    'backend': ['backend development', 'server-side'],
    'frontend': ['frontend development', 'client-side'],
    'python': ['python development', 'python programming'],
    'marketing': ['digital marketing', 'growth marketing'],
    'design': ['visual design', 'graphic design']
  };
  
  for (const [base, variations] of Object.entries(synonyms)) {
    if ((s1.includes(base) || variations.some(v => s1.includes(v))) &&
        (s2.includes(base) || variations.some(v => s2.includes(v)))) {
      return true;
    }
  }
  
  return false;
}

// Generate smart connection suggestions
function generateSmartConnections() {
  const profiles = loadProfiles();
  const posts = loadSkillExchanges();
  const users = Object.values(profiles);
  
  const connections = [];
  
  // Calculate matches for all user pairs
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const user1 = users[i];
      const user2 = users[j];
      
      const match = calculateMatchScore(user1, user2, posts);
      
      if (match.score >= 5) { // Minimum threshold for suggestions
        connections.push({
          user1: user1.handle,
          user2: user2.handle,
          score: match.score,
          reasons: match.reasons,
          user1Building: user1.building,
          user2Building: user2.building,
          matchType: match.score >= 10 ? 'high' : match.score >= 7 ? 'medium' : 'low'
        });
      }
    }
  }
  
  // Sort by score (highest first)
  return connections.sort((a, b) => b.score - a.score);
}

// Generate analytics report
function generateAnalyticsReport() {
  const profiles = loadProfiles();
  const posts = loadSkillExchanges();
  const connections = generateSmartConnections();
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalUsers: Object.keys(profiles).length,
      totalSkillPosts: posts.length,
      offers: posts.filter(p => p.type === 'offer').length,
      requests: posts.filter(p => p.type === 'request').length,
      potentialConnections: connections.length,
      highValueConnections: connections.filter(c => c.score >= 10).length
    },
    topConnections: connections.slice(0, 5),
    skillGaps: findSkillGaps(profiles, posts),
    mostActiveUsers: findMostActiveUsers(profiles, posts),
    marketplaceHealth: calculateMarketplaceHealth(posts)
  };
  
  return report;
}

function findSkillGaps(profiles, posts) {
  const requestedSkills = posts
    .filter(p => p.type === 'request')
    .map(p => p.skill.toLowerCase());
  
  const offeredSkills = posts
    .filter(p => p.type === 'offer')
    .map(p => p.skill.toLowerCase());
  
  const gaps = requestedSkills.filter(skill => 
    !offeredSkills.some(offered => skillsMatch(skill, offered))
  );
  
  // Count frequency of gaps
  const gapCounts = {};
  gaps.forEach(gap => {
    gapCounts[gap] = (gapCounts[gap] || 0) + 1;
  });
  
  return Object.entries(gapCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([skill, count]) => ({ skill, requests: count }));
}

function findMostActiveUsers(profiles, posts) {
  const userActivity = {};
  
  posts.forEach(post => {
    userActivity[post.handle] = (userActivity[post.handle] || 0) + 1;
  });
  
  return Object.entries(userActivity)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([handle, count]) => ({
      handle,
      posts: count,
      building: profiles[handle]?.building || 'Unknown'
    }));
}

function calculateMarketplaceHealth(posts) {
  const offers = posts.filter(p => p.type === 'offer').length;
  const requests = posts.filter(p => p.type === 'request').length;
  
  const balance = offers / Math.max(1, requests);
  const totalActivity = posts.length;
  
  let health = 'Unknown';
  if (balance >= 0.8 && balance <= 1.2 && totalActivity >= 10) {
    health = 'Excellent';
  } else if (balance >= 0.6 && balance <= 1.4 && totalActivity >= 5) {
    health = 'Good';
  } else if (totalActivity >= 3) {
    health = 'Fair';
  } else {
    health = 'Needs Growth';
  }
  
  return {
    status: health,
    balance: balance.toFixed(2),
    totalActivity,
    offers,
    requests
  };
}

// Main execution
async function runAnalysis() {
  console.log('🔍 Generating Smart Connection Suggestions for Skills Exchange...\n');
  
  const report = generateAnalyticsReport();
  
  console.log('📊 MARKETPLACE SUMMARY');
  console.log('='.repeat(50));
  console.log(`Users: ${report.summary.totalUsers}`);
  console.log(`Skill Posts: ${report.summary.totalSkillPosts} (${report.summary.offers} offers, ${report.summary.requests} requests)`);
  console.log(`Potential Connections: ${report.summary.potentialConnections}`);
  console.log(`High-Value Matches: ${report.summary.highValueConnections}`);
  console.log(`Marketplace Health: ${report.marketplaceHealth.status}\n`);
  
  console.log('🎯 TOP CONNECTION SUGGESTIONS');
  console.log('='.repeat(50));
  report.topConnections.forEach((conn, i) => {
    console.log(`${i + 1}. @${conn.user1} ↔ @${conn.user2} (Score: ${conn.score})`);
    console.log(`   ${conn.user1Building}`);
    console.log(`   ${conn.user2Building}`);
    console.log(`   Match reasons: ${conn.reasons.join(', ')}\n`);
  });
  
  if (report.skillGaps.length > 0) {
    console.log('🕳️  SKILL GAPS TO FILL');
    console.log('='.repeat(50));
    report.skillGaps.forEach(gap => {
      console.log(`• ${gap.skill} (${gap.requests} requests, no offers)`);
    });
    console.log('');
  }
  
  console.log('🏆 MOST ACTIVE CONTRIBUTORS');
  console.log('='.repeat(50));
  report.mostActiveUsers.forEach(user => {
    console.log(`• @${user.handle}: ${user.posts} posts - ${user.building}`);
  });
  
  // Save report
  const reportFile = path.join(__dirname, 'skills-exchange-analysis.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📁 Full report saved to: ${reportFile}`);
  
  return report;
}

if (require.main === module) {
  runAnalysis().catch(console.error);
}

module.exports = {
  generateSmartConnections,
  generateAnalyticsReport,
  calculateMatchScore
};