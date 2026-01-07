/**
 * Discovery Engine — Core matching algorithms and utilities
 *
 * Provides advanced matching logic used across discovery tools:
 * - Semantic similarity matching
 * - Interest clustering
 * - Smart tag suggestions
 * - Match score calculations
 */

// Pre-defined interest clusters for better matching
const INTEREST_CLUSTERS = {
  'ai-ml': ['ai', 'machine learning', 'deep learning', 'neural networks', 'llm', 'gpt', 'artificial intelligence'],
  'web-dev': ['frontend', 'backend', 'fullstack', 'web development', 'javascript', 'react', 'vue', 'angular'],
  'mobile': ['ios', 'android', 'react native', 'flutter', 'mobile development', 'swift', 'kotlin'],
  'startups': ['entrepreneur', 'startup', 'founder', 'business', 'venture capital', 'product market fit'],
  'design': ['ui design', 'ux design', 'product design', 'graphic design', 'figma', 'sketch'],
  'blockchain': ['blockchain', 'crypto', 'web3', 'defi', 'nft', 'ethereum', 'bitcoin'],
  'data': ['data science', 'analytics', 'big data', 'data engineering', 'sql', 'python'],
  'gaming': ['game development', 'unity', 'unreal', 'indie games', 'gaming'],
  'devops': ['devops', 'kubernetes', 'docker', 'aws', 'cloud', 'infrastructure'],
  'content': ['writing', 'blogging', 'content creation', 'marketing', 'social media']
};

// Technology skill clusters for complementary matching
const SKILL_CLUSTERS = {
  'frontend': ['react', 'vue', 'angular', 'typescript', 'javascript', 'css', 'html'],
  'backend': ['node.js', 'python', 'java', 'go', 'rust', 'express', 'django'],
  'mobile': ['swift', 'kotlin', 'react-native', 'flutter', 'ionic'],
  'data': ['python', 'r', 'sql', 'pandas', 'tensorflow', 'pytorch'],
  'devops': ['docker', 'kubernetes', 'aws', 'azure', 'terraform', 'jenkins'],
  'design': ['figma', 'sketch', 'photoshop', 'illustrator', 'principle']
};

// Calculate semantic similarity between interests
function calculateInterestSimilarity(interests1, interests2) {
  if (!interests1?.length || !interests2?.length) return 0;
  
  let score = 0;
  const matches = [];
  
  // Direct matches (highest weight)
  for (const interest1 of interests1) {
    for (const interest2 of interests2) {
      if (interest1.toLowerCase() === interest2.toLowerCase()) {
        score += 20;
        matches.push(interest1);
      }
    }
  }
  
  // Cluster-based similarity (medium weight)
  for (const [clusterName, keywords] of Object.entries(INTEREST_CLUSTERS)) {
    const user1InCluster = interests1.some(i => 
      keywords.some(k => i.toLowerCase().includes(k.toLowerCase()))
    );
    const user2InCluster = interests2.some(i => 
      keywords.some(k => i.toLowerCase().includes(k.toLowerCase()))
    );
    
    if (user1InCluster && user2InCluster) {
      score += 12;
      matches.push(clusterName);
    }
  }
  
  // Keyword similarity (lower weight)
  for (const interest1 of interests1) {
    for (const interest2 of interests2) {
      const words1 = interest1.toLowerCase().split(/\s+/);
      const words2 = interest2.toLowerCase().split(/\s+/);
      const commonWords = words1.filter(w => words2.includes(w) && w.length > 3);
      
      if (commonWords.length > 0) {
        score += commonWords.length * 3;
      }
    }
  }
  
  return { score, matches: [...new Set(matches)].slice(0, 3) };
}

// Calculate tag/skill complementarity
function calculateSkillComplementarity(tags1, tags2) {
  if (!tags1?.length || !tags2?.length) return { score: 0, pairs: [] };
  
  let score = 0;
  const pairs = [];
  
  // Find complementary pairs
  const complementaryPairs = [
    ['frontend', 'backend'],
    ['design', 'engineering'],
    ['product', 'engineering'],
    ['ai', 'data'],
    ['mobile', 'backend'],
    ['devops', 'backend'],
    ['marketing', 'product']
  ];
  
  for (const [skill1, skill2] of complementaryPairs) {
    const user1HasSkill1 = tags1.some(t => t.toLowerCase().includes(skill1.toLowerCase()));
    const user1HasSkill2 = tags1.some(t => t.toLowerCase().includes(skill2.toLowerCase()));
    const user2HasSkill1 = tags2.some(t => t.toLowerCase().includes(skill1.toLowerCase()));
    const user2HasSkill2 = tags2.some(t => t.toLowerCase().includes(skill2.toLowerCase()));
    
    if ((user1HasSkill1 && user2HasSkill2) || (user1HasSkill2 && user2HasSkill1)) {
      score += 15;
      pairs.push(`${skill1}/${skill2}`);
    }
  }
  
  return { score, pairs: pairs.slice(0, 2) };
}

// Suggest interests based on what user is building
function suggestInterestsFromBuilding(buildingDescription) {
  if (!buildingDescription) return [];
  
  const building = buildingDescription.toLowerCase();
  const suggestions = [];
  
  // AI/ML projects
  if (building.includes('ai') || building.includes('machine learning') || building.includes('llm')) {
    suggestions.push('ai', 'machine learning', 'deep learning');
  }
  
  // Web projects
  if (building.includes('web') || building.includes('website') || building.includes('app')) {
    suggestions.push('web development', 'frontend', 'fullstack');
  }
  
  // Mobile projects  
  if (building.includes('mobile') || building.includes('ios') || building.includes('android')) {
    suggestions.push('mobile development', 'app development');
  }
  
  // Startup/business projects
  if (building.includes('startup') || building.includes('business') || building.includes('saas')) {
    suggestions.push('startups', 'entrepreneur', 'product management');
  }
  
  // Data projects
  if (building.includes('data') || building.includes('analytics') || building.includes('dashboard')) {
    suggestions.push('data science', 'analytics', 'visualization');
  }
  
  // Content/media projects
  if (building.includes('content') || building.includes('blog') || building.includes('media')) {
    suggestions.push('content creation', 'writing', 'marketing');
  }
  
  // Gaming projects
  if (building.includes('game') || building.includes('unity') || building.includes('gaming')) {
    suggestions.push('game development', 'gaming', 'interactive media');
  }
  
  return [...new Set(suggestions)].slice(0, 4);
}

// Suggest tags/skills based on interests and building
function suggestTagsFromProfile(interests, building) {
  const suggestions = [];
  
  // From interests
  if (interests) {
    for (const interest of interests) {
      const interestLower = interest.toLowerCase();
      
      if (interestLower.includes('ai') || interestLower.includes('machine learning')) {
        suggestions.push('python', 'tensorflow', 'pytorch', 'data-science');
      }
      
      if (interestLower.includes('web') || interestLower.includes('frontend')) {
        suggestions.push('react', 'javascript', 'typescript', 'css');
      }
      
      if (interestLower.includes('mobile')) {
        suggestions.push('swift', 'kotlin', 'react-native', 'flutter');
      }
      
      if (interestLower.includes('data')) {
        suggestions.push('python', 'sql', 'pandas', 'analytics');
      }
      
      if (interestLower.includes('design')) {
        suggestions.push('figma', 'ui-design', 'ux-design', 'prototyping');
      }
      
      if (interestLower.includes('startup') || interestLower.includes('business')) {
        suggestions.push('product-management', 'strategy', 'growth', 'founder');
      }
    }
  }
  
  // From building description
  if (building) {
    const buildingLower = building.toLowerCase();
    
    if (buildingLower.includes('react')) suggestions.push('react', 'frontend', 'javascript');
    if (buildingLower.includes('python')) suggestions.push('python', 'backend', 'data-science');
    if (buildingLower.includes('node')) suggestions.push('nodejs', 'backend', 'javascript');
    if (buildingLower.includes('ai') || buildingLower.includes('gpt')) {
      suggestions.push('ai', 'machine-learning', 'python');
    }
  }
  
  return [...new Set(suggestions)].slice(0, 6);
}

// Advanced match scoring that combines all factors
function calculateAdvancedMatchScore(user1, user2) {
  let totalScore = 0;
  const reasons = [];
  
  // Interest similarity (high weight)
  const interestSim = calculateInterestSimilarity(user1.interests, user2.interests);
  totalScore += interestSim.score;
  if (interestSim.matches.length > 0) {
    reasons.push(`Shared interests: ${interestSim.matches.join(', ')}`);
  }
  
  // Tag overlap (medium-high weight)
  if (user1.tags && user2.tags) {
    const sharedTags = user1.tags.filter(t => 
      user2.tags.some(t2 => t2.toLowerCase() === t.toLowerCase())
    );
    if (sharedTags.length > 0) {
      totalScore += sharedTags.length * 12;
      reasons.push(`Common skills: ${sharedTags.join(', ')}`);
    }
  }
  
  // Skill complementarity (medium weight)
  const skillComp = calculateSkillComplementarity(user1.tags, user2.tags);
  totalScore += skillComp.score;
  if (skillComp.pairs.length > 0) {
    reasons.push(`Complementary skills: ${skillComp.pairs.join(', ')}`);
  }
  
  // Building similarity (medium weight)
  if (user1.building && user2.building) {
    const building1Words = user1.building.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const building2Words = user2.building.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const commonBuildingWords = building1Words.filter(w => building2Words.includes(w));
    
    if (commonBuildingWords.length > 0) {
      totalScore += commonBuildingWords.length * 8;
      reasons.push(`Both building ${commonBuildingWords.join(', ')} projects`);
    }
  }
  
  // Activity timing (low weight but important for connection success)
  if (user1.lastSeen && user2.lastSeen) {
    const timeDiff = Math.abs(user1.lastSeen - user2.lastSeen);
    const hours = timeDiff / (1000 * 60 * 60);
    
    if (hours < 2) {
      totalScore += 15;
      reasons.push('Both active recently');
    } else if (hours < 12) {
      totalScore += 8;
      reasons.push('Similar activity patterns');
    }
  }
  
  // Connection history penalty (avoid repeat suggestions)
  if (user1.connections && user2.connections) {
    const alreadyConnected = user1.connections.some(c => 
      c.handle === user2.handle.toLowerCase()
    );
    if (alreadyConnected) {
      totalScore -= 50; // Heavy penalty
    }
  }
  
  return {
    score: Math.max(0, totalScore),
    reasons: reasons.slice(0, 3) // Top 3 reasons
  };
}

// Find the best matches for a user from a pool of candidates
function findBestMatches(targetUser, candidates, limit = 5) {
  const matches = [];
  
  for (const candidate of candidates) {
    if (candidate.handle === targetUser.handle) continue;
    
    const match = calculateAdvancedMatchScore(targetUser, candidate);
    
    if (match.score > 10) { // Minimum threshold
      matches.push({
        ...candidate,
        matchScore: match.score,
        matchReasons: match.reasons
      });
    }
  }
  
  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// Group users by interest clusters
function groupUsersByInterestClusters(users) {
  const clusters = {};
  
  for (const user of users) {
    if (!user.interests?.length) continue;
    
    for (const [clusterName, keywords] of Object.entries(INTEREST_CLUSTERS)) {
      const matchesCluster = user.interests.some(interest =>
        keywords.some(keyword => 
          interest.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      if (matchesCluster) {
        if (!clusters[clusterName]) clusters[clusterName] = [];
        clusters[clusterName].push(user);
      }
    }
  }
  
  // Sort clusters by size
  return Object.entries(clusters)
    .sort(([,a], [,b]) => b.length - a.length)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

module.exports = {
  calculateInterestSimilarity,
  calculateSkillComplementarity,
  calculateAdvancedMatchScore,
  suggestInterestsFromBuilding,
  suggestTagsFromProfile,
  findBestMatches,
  groupUsersByInterestClusters,
  INTEREST_CLUSTERS,
  SKILL_CLUSTERS
};