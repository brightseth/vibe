/**
 * Skills Exchange API
 * Returns active skill offers and requests from the community
 */

const fs = require('fs');
const path = require('path');

// Read skill exchanges from storage
function readSkillExchanges() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'skill-exchanges.jsonl');
    
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error('Error reading skill exchanges:', error);
    return [];
  }
}

// Get skill categories
function getSkillCategories() {
  return {
    'technical': ['frontend', 'backend', 'mobile', 'ai', 'data', 'devops', 'security'],
    'design': ['ui', 'ux', 'graphic-design', 'illustration', 'branding', 'figma'],
    'business': ['product', 'marketing', 'strategy', 'sales', 'fundraising', 'leadership'],
    'creative': ['writing', 'content', 'video', 'photography', 'music', 'storytelling'],
    'research': ['user-research', 'market-research', 'data-analysis', 'academic'],
    'soft-skills': ['communication', 'mentoring', 'project-management', 'team-building']
  };
}

// Determine skill category
function getSkillCategory(skill) {
  const skillLower = skill.toLowerCase().replace(/\s+/g, '-');
  const categories = getSkillCategories();
  
  for (const [category, skills] of Object.entries(categories)) {
    if (skills.includes(skillLower)) {
      return category;
    }
  }
  return 'other';
}

// Generate sample data if empty (for demo purposes)
function generateSampleData() {
  const sampleOffers = [
    {
      id: Date.now() + 1,
      handle: 'alice',
      type: 'offer',
      skill: 'React Development',
      details: '5+ years building React apps, happy to help with hooks, state management, and performance optimization',
      category: 'technical',
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      status: 'active'
    },
    {
      id: Date.now() + 2,
      handle: 'bob',
      type: 'offer',
      skill: 'UI Design',
      details: 'Figma expert, can help with design systems, wireframes, and user interfaces',
      category: 'design',
      timestamp: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
      status: 'active'
    },
    {
      id: Date.now() + 3,
      handle: 'charlie',
      type: 'request',
      skill: 'Python Backend',
      details: 'Need help setting up a FastAPI server with database integration',
      category: 'technical',
      timestamp: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
      status: 'active'
    },
    {
      id: Date.now() + 4,
      handle: 'diana',
      type: 'request',
      skill: 'Marketing Strategy',
      details: 'Early stage startup looking for advice on go-to-market strategy',
      category: 'business',
      timestamp: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
      status: 'active'
    }
  ];
  
  return sampleOffers;
}

// Main handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    let skills = readSkillExchanges();
    
    // If no skills found, generate sample data for demo
    if (skills.length === 0) {
      skills = generateSampleData();
    }
    
    // Filter active skills only
    const activeSkills = skills.filter(skill => 
      skill && skill.status === 'active'
    );
    
    // Sort by timestamp (newest first)
    activeSkills.sort((a, b) => b.timestamp - a.timestamp);
    
    // Calculate stats
    const stats = {
      total: activeSkills.length,
      offers: activeSkills.filter(s => s.type === 'offer').length,
      requests: activeSkills.filter(s => s.type === 'request').length,
      categories: {}
    };
    
    // Count by category
    activeSkills.forEach(skill => {
      stats.categories[skill.category] = (stats.categories[skill.category] || 0) + 1;
    });
    
    res.status(200).json({
      success: true,
      skills: activeSkills,
      stats,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Skills API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      skills: [],
      stats: { total: 0, offers: 0, requests: 0, categories: {} }
    });
  }
};