/**
 * Discovery Ecosystem Analysis
 * 
 * Analyzes the current state of the /vibe discovery system
 * to provide insights about connections, skills, and opportunities.
 */

const profiles = require('./profiles.json');
const fs = require('fs');
const path = require('path');

// Load skill exchanges
function loadSkillExchanges() {
  try {
    const content = fs.readFileSync('skill-exchanges.jsonl', 'utf8');
    return content.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line));
  } catch (e) {
    return [];
  }
}

// Analyze skill complementarity
function analyzeSkillComplementarity() {
  const skillExchanges = loadSkillExchanges();
  const offers = skillExchanges.filter(s => s.type === 'offer');
  const requests = skillExchanges.filter(s => s.type === 'request');
  
  const matches = [];
  
  for (const request of requests) {
    for (const offer of offers) {
      if (request.handle !== offer.handle) {
        // Simple matching logic
        const requestSkill = request.skill.toLowerCase();
        const offerSkill = offer.skill.toLowerCase();
        
        const skillMatch = requestSkill.includes(offerSkill.split(' ')[0]) || 
                          offerSkill.includes(requestSkill.split(' ')[0]);
        
        if (skillMatch) {
          matches.push({
            requester: request.handle,
            requestSkill: request.skill,
            provider: offer.handle,
            offerSkill: offer.skill,
            matchScore: 85
          });
        }
      }
    }
  }
  
  return matches;
}

// Analyze user building projects for collaboration potential
function analyzeCollaborationPotential() {
  const collaborations = [];
  const users = Object.values(profiles);
  
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const user1 = users[i];
      const user2 = users[j];
      
      // Check for complementary skills
      const user1Skills = user1.tags || [];
      const user2Skills = user2.tags || [];
      
      const complementarity = calculateComplementarity(user1Skills, user2Skills);
      
      if (complementarity.score > 30) {
        collaborations.push({
          user1: user1.handle,
          user1Building: user1.building,
          user2: user2.handle,
          user2Building: user2.building,
          complementarity,
          potentialProject: suggestCollaborationProject(user1, user2)
        });
      }
    }
  }
  
  return collaborations.sort((a, b) => b.complementarity.score - a.complementarity.score);
}

function calculateComplementarity(skills1, skills2) {
  const complementaryPairs = {
    'frontend': ['backend', 'design'],
    'backend': ['frontend', 'mobile'],
    'design': ['frontend', 'react'],
    'react': ['backend', 'design'],
    'ai': ['frontend', 'backend'],
    'machine-learning': ['frontend', 'backend'],
    'mobile': ['backend', 'design'],
    'blockchain': ['frontend', 'backend']
  };
  
  let score = 0;
  const matches = [];
  
  for (const skill1 of skills1) {
    const complements = complementaryPairs[skill1] || [];
    for (const skill2 of skills2) {
      if (complements.includes(skill2)) {
        score += 25;
        matches.push(`${skill1} + ${skill2}`);
      }
    }
  }
  
  return { score, matches: matches.slice(0, 3) };
}

function suggestCollaborationProject(user1, user2) {
  const user1Domain = extractDomain(user1.building);
  const user2Domain = extractDomain(user2.building);
  
  if (user1Domain && user2Domain) {
    return `Cross-platform ${user1Domain}-${user2Domain} integration`;
  }
  
  return 'Full-stack collaboration project';
}

function extractDomain(building) {
  if (!building) return null;
  
  const domains = {
    'ai': 'AI',
    'crypto': 'Web3',
    'design': 'Design',
    'mobile': 'Mobile',
    'trading': 'FinTech',
    'code': 'DevTools'
  };
  
  const buildingLower = building.toLowerCase();
  
  for (const [key, domain] of Object.entries(domains)) {
    if (buildingLower.includes(key)) {
      return domain;
    }
  }
  
  return null;
}

// Generate ecosystem health report
function generateEcosystemReport() {
  const skillExchanges = loadSkillExchanges();
  const users = Object.values(profiles);
  
  const skillMatches = analyzeSkillComplementarity();
  const collaborations = analyzeCollaborationPotential();
  
  const report = {
    timestamp: new Date().toISOString(),
    overview: {
      totalUsers: users.length,
      totalSkillPosts: skillExchanges.length,
      skillOffers: skillExchanges.filter(s => s.type === 'offer').length,
      skillRequests: skillExchanges.filter(s => s.type === 'request').length,
      potentialMatches: skillMatches.length,
      collaborationOpportunities: collaborations.length
    },
    skillGaps: identifySkillGaps(),
    topCollaborations: collaborations.slice(0, 3),
    skillMatches: skillMatches,
    recommendations: generateRecommendations(users, skillExchanges, collaborations)
  };
  
  return report;
}

function identifySkillGaps() {
  const skillExchanges = loadSkillExchanges();
  const requests = skillExchanges.filter(s => s.type === 'request');
  const offers = skillExchanges.filter(s => s.type === 'offer');
  
  const requestedSkills = requests.map(r => r.skill.toLowerCase());
  const offeredSkills = offers.map(o => o.skill.toLowerCase());
  
  const gaps = requestedSkills.filter(skill => 
    !offeredSkills.some(offered => 
      offered.includes(skill.split(' ')[0]) || skill.includes(offered.split(' ')[0])
    )
  );
  
  return [...new Set(gaps)];
}

function generateRecommendations(users, skillExchanges, collaborations) {
  const recommendations = [];
  
  // High-value collaboration recommendation
  if (collaborations.length > 0) {
    const topCollab = collaborations[0];
    recommendations.push({
      type: 'collaboration',
      priority: 'high',
      message: `${topCollab.user1} and ${topCollab.user2} have excellent skill complementarity (${topCollab.complementarity.matches.join(', ')}) and could build amazing ${topCollab.potentialProject}`
    });
  }
  
  // Skill request fulfillment
  const requests = skillExchanges.filter(s => s.type === 'request');
  for (const request of requests.slice(0, 2)) {
    recommendations.push({
      type: 'skill_match',
      priority: 'medium',
      message: `${request.handle} is looking for ${request.skill} - check if anyone in the community can help`
    });
  }
  
  // Community growth
  recommendations.push({
    type: 'growth',
    priority: 'low',
    message: `Community has strong ${getTopSkillAreas(skillExchanges).join(', ')} expertise - could attract more users in complementary areas`
  });
  
  return recommendations;
}

function getTopSkillAreas(skillExchanges) {
  const categories = {};
  skillExchanges.forEach(s => {
    categories[s.category] = (categories[s.category] || 0) + 1;
  });
  
  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);
}

// Run analysis
const report = generateEcosystemReport();

console.log('🔍 Discovery Ecosystem Analysis');
console.log('================================');
console.log();

console.log('📊 OVERVIEW');
console.log(`• ${report.overview.totalUsers} active users`);
console.log(`• ${report.overview.totalSkillPosts} skill posts (${report.overview.skillOffers} offers, ${report.overview.skillRequests} requests)`);
console.log(`• ${report.overview.potentialMatches} direct skill matches identified`);
console.log(`• ${report.overview.collaborationOpportunities} collaboration opportunities`);
console.log();

if (report.topCollaborations.length > 0) {
  console.log('🤝 TOP COLLABORATION OPPORTUNITIES');
  report.topCollaborations.forEach((collab, i) => {
    console.log(`${i + 1}. ${collab.user1} × ${collab.user2}`);
    console.log(`   Skill synergy: ${collab.complementarity.matches.join(', ')}`);
    console.log(`   Potential: ${collab.potentialProject}`);
    console.log();
  });
}

if (report.skillMatches.length > 0) {
  console.log('🎯 DIRECT SKILL MATCHES');
  report.skillMatches.forEach(match => {
    console.log(`• ${match.requester} needs "${match.requestSkill}"`);
    console.log(`  → ${match.provider} offers "${match.offerSkill}"`);
    console.log();
  });
}

if (report.skillGaps.length > 0) {
  console.log('⚠️ SKILL GAPS');
  report.skillGaps.forEach(gap => {
    console.log(`• ${gap} (requested but not offered)`);
  });
  console.log();
}

console.log('💡 RECOMMENDATIONS');
report.recommendations.forEach((rec, i) => {
  const priority = rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '⭐' : '💭';
  console.log(`${priority} ${rec.message}`);
});
console.log();

console.log('✨ Discovery system is healthy and active!');

// Save report for dashboard
fs.writeFileSync('discovery-ecosystem-report.json', JSON.stringify(report, null, 2));