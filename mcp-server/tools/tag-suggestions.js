/**
 * Smart Interest & Tag Suggestions — Help users discover what to tag themselves with
 *
 * Analyzes what someone is building and suggests:
 * - Interest tags (broad categories: ai, fintech, gaming)
 * - Skill tags (specific tech: react, python, figma) 
 * - Discovery hints (who else to connect with)
 */

const userProfiles = require('../store/profiles');

// Tech stack detection patterns
const TECH_PATTERNS = {
  // Frontend
  'react': ['react', 'jsx', 'create-react-app', 'react native'],
  'vue': ['vue', 'vuejs', 'vue.js'],
  'angular': ['angular', 'ng', '@angular'],
  'svelte': ['svelte', 'sveltekit'],
  'typescript': ['typescript', 'ts', '.ts', 'tsc'],
  'javascript': ['javascript', 'js', 'node', 'npm'],
  
  // Backend
  'python': ['python', 'django', 'flask', 'fastapi', 'py'],
  'node': ['node', 'nodejs', 'express', 'koa'],
  'go': ['golang', 'go', 'gin', 'fiber'],
  'rust': ['rust', 'cargo', 'actix', 'warp'],
  'java': ['java', 'spring', 'maven', 'gradle'],
  
  // Data & AI
  'ai': ['ai', 'llm', 'gpt', 'claude', 'openai', 'machine learning', 'ml'],
  'data': ['data', 'pandas', 'numpy', 'jupyter', 'sql', 'database'],
  'ml': ['tensorflow', 'pytorch', 'scikit', 'keras', 'neural'],
  
  // Mobile
  'ios': ['ios', 'swift', 'swiftui', 'xcode', 'iphone', 'ipad'],
  'android': ['android', 'kotlin', 'java android', 'play store'],
  'flutter': ['flutter', 'dart'],
  'react-native': ['react native', 'expo', 'react-native'],
  
  // Design
  'design': ['figma', 'sketch', 'adobe', 'ui', 'ux', 'design'],
  'frontend': ['css', 'html', 'sass', 'tailwind', 'bootstrap'],
  
  // Infrastructure  
  'devops': ['docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform'],
  'database': ['postgres', 'mysql', 'mongodb', 'redis', 'sqlite'],
  
  // Domains
  'crypto': ['crypto', 'blockchain', 'web3', 'ethereum', 'bitcoin', 'defi'],
  'gaming': ['game', 'unity', 'unreal', 'godot', 'gamedev'],
  'fintech': ['fintech', 'payments', 'banking', 'trading', 'finance'],
  'healthcare': ['health', 'medical', 'biotech', 'pharma'],
  'ecommerce': ['ecommerce', 'shopify', 'stripe', 'payment'],
  'saas': ['saas', 'b2b', 'enterprise', 'subscription'],
  'social': ['social', 'community', 'chat', 'messaging'],
  'productivity': ['productivity', 'workflow', 'automation', 'tool']
};

// Interest categories (broader themes)
const INTEREST_PATTERNS = {
  'startups': ['startup', 'founder', 'entrepreneurship', 'indie hacker', 'side project'],
  'open source': ['open source', 'oss', 'github', 'contribute', 'maintainer'],
  'developer tools': ['dev tool', 'cli', 'vscode', 'editor', 'developer experience'],
  'automation': ['automation', 'workflow', 'scripting', 'no-code', 'zapier'],
  'content creation': ['content', 'blog', 'writing', 'video', 'podcast', 'creator'],
  'education': ['education', 'learning', 'teaching', 'course', 'tutorial'],
  'remote work': ['remote', 'distributed', 'async', 'nomad', 'wfh'],
  'indie': ['indie', 'bootstrap', 'solo', 'maker', 'build in public']
};

// Analyze text and suggest tags
function suggestTags(buildingText) {
  if (!buildingText) return { tech: [], interests: [], confidence: 0 };
  
  const text = buildingText.toLowerCase();
  const suggestions = {
    tech: new Set(),
    interests: new Set(),
    matches: []
  };
  
  // Find tech matches
  for (const [tag, patterns] of Object.entries(TECH_PATTERNS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern.toLowerCase())) {
        suggestions.tech.add(tag);
        suggestions.matches.push({ tag, pattern, type: 'tech' });
        break; // Only count once per tag
      }
    }
  }
  
  // Find interest matches
  for (const [interest, patterns] of Object.entries(INTEREST_PATTERNS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern.toLowerCase())) {
        suggestions.interests.add(interest);
        suggestions.matches.push({ tag: interest, pattern, type: 'interest' });
        break;
      }
    }
  }
  
  // Calculate confidence based on number of matches
  const totalMatches = suggestions.matches.length;
  const confidence = Math.min(totalMatches * 20, 100); // Cap at 100%
  
  return {
    tech: Array.from(suggestions.tech).slice(0, 5), // Limit suggestions
    interests: Array.from(suggestions.interests).slice(0, 3),
    confidence,
    matches: suggestions.matches
  };
}

// Find similar builders based on tags
async function findSimilarBuilders(suggestedTags, limit = 3) {
  const allProfiles = await userProfiles.getAllProfiles();
  const matches = [];
  
  for (const profile of allProfiles) {
    if (!profile.tags && !profile.interests) continue;
    
    let overlap = 0;
    let overlappingTags = [];
    
    // Check tech tag overlap
    if (profile.tags) {
      for (const tag of suggestedTags.tech) {
        if (profile.tags.includes(tag)) {
          overlap += 2; // Tech overlap is worth more
          overlappingTags.push(tag);
        }
      }
    }
    
    // Check interest overlap  
    if (profile.interests) {
      for (const interest of suggestedTags.interests) {
        if (profile.interests.includes(interest)) {
          overlap += 1;
          overlappingTags.push(interest);
        }
      }
    }
    
    if (overlap > 0) {
      matches.push({
        handle: profile.handle,
        overlap,
        overlappingTags,
        building: profile.building,
        lastSeen: profile.lastSeen
      });
    }
  }
  
  return matches
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit);
}

// Generate tag suggestions for a user
async function generateSuggestions(handle) {
  const profile = await userProfiles.getProfile(handle);
  
  if (!profile.building) {
    return {
      error: 'No building info found. Set what you\'re building first:\n`vibe update building "your project description"`'
    };
  }
  
  const suggestions = suggestTags(profile.building);
  const similarBuilders = await findSimilarBuilders(suggestions);
  
  // Filter out already set tags
  const currentTags = new Set([...(profile.tags || []), ...(profile.interests || [])]);
  const newTechTags = suggestions.tech.filter(t => !currentTags.has(t));
  const newInterests = suggestions.interests.filter(i => !currentTags.has(i));
  
  return {
    building: profile.building,
    confidence: suggestions.confidence,
    currentTags: profile.tags || [],
    currentInterests: profile.interests || [],
    suggested: {
      tech: newTechTags,
      interests: newInterests
    },
    similarBuilders,
    matches: suggestions.matches
  };
}

// Get trending tags across all users
async function getTrendingTags() {
  const allTags = await userProfiles.getTrendingTags();
  const allInterests = await userProfiles.getTrendingInterests();
  
  return {
    popularTags: allTags.slice(0, 10),
    popularInterests: allInterests.slice(0, 8)
  };
}

// Smart tag completion - suggest similar tags based on partial input
function suggestSimilarTags(partial) {
  const allTags = Object.keys(TECH_PATTERNS);
  const allInterests = Object.keys(INTEREST_PATTERNS);
  
  const search = partial.toLowerCase();
  const matches = [];
  
  // Exact prefix matches first
  for (const tag of [...allTags, ...allInterests]) {
    if (tag.startsWith(search)) {
      matches.push({ tag, type: allTags.includes(tag) ? 'tech' : 'interest', score: 3 });
    }
  }
  
  // Substring matches second
  for (const tag of [...allTags, ...allInterests]) {
    if (tag.includes(search) && !tag.startsWith(search)) {
      matches.push({ tag, type: allTags.includes(tag) ? 'tech' : 'interest', score: 2 });
    }
  }
  
  // Pattern matches third (e.g., "react" matches "react native")
  for (const [tag, patterns] of [...Object.entries(TECH_PATTERNS), ...Object.entries(INTEREST_PATTERNS)]) {
    for (const pattern of patterns) {
      if (pattern.includes(search) && !tag.includes(search)) {
        matches.push({ 
          tag, 
          type: Object.keys(TECH_PATTERNS).includes(tag) ? 'tech' : 'interest', 
          score: 1, 
          matchedPattern: pattern 
        });
        break;
      }
    }
  }
  
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(m => m.tag);
}

module.exports = {
  suggestTags,
  generateSuggestions,
  findSimilarBuilders,
  getTrendingTags,
  suggestSimilarTags,
  TECH_PATTERNS,
  INTEREST_PATTERNS
};