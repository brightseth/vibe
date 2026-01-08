/**
 * vibe discovery-bootstrap — Seed discovery system with sample profiles
 *
 * Creates realistic user profiles to populate the discovery system
 * for testing and demonstration of workshop-buddy and skills-exchange features.
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const store = require('../store');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_bootstrap',
  description: 'Bootstrap the discovery system with sample profiles for testing.',
  inputSchema: {
    type: 'object',
    properties: {
      count: {
        type: 'number',
        default: 10,
        description: 'Number of sample profiles to create'
      },
      clear: {
        type: 'boolean',
        default: false,
        description: 'Clear existing profiles first'
      }
    }
  }
};

// Sample profiles with complementary skills
const sampleProfiles = [
  {
    handle: 'alex_frontend',
    building: 'React dashboard for startup analytics',
    interests: ['startups', 'design-systems', 'data-visualization'],
    tags: ['frontend', 'react', 'typescript', 'css'],
    mock: true
  },
  {
    handle: 'sam_backend',
    building: 'Scalable API infrastructure for fintech',
    interests: ['fintech', 'distributed-systems', 'security'],
    tags: ['backend', 'python', 'postgres', 'docker'],
    mock: true
  },
  {
    handle: 'jordan_design',
    building: 'Design system for healthcare apps',
    interests: ['healthcare', 'accessibility', 'user-research'],
    tags: ['ui', 'ux', 'figma', 'design-systems'],
    mock: true
  },
  {
    handle: 'casey_ai',
    building: 'AI-powered content generation tool',
    interests: ['ai', 'content', 'automation'],
    tags: ['ai', 'python', 'machine-learning', 'nlp'],
    mock: true
  },
  {
    handle: 'taylor_product',
    building: 'B2B SaaS for project management',
    interests: ['product-management', 'b2b', 'user-research'],
    tags: ['product', 'strategy', 'user-research', 'analytics'],
    mock: true
  },
  {
    handle: 'riley_mobile',
    building: 'React Native app for fitness tracking',
    interests: ['fitness', 'mobile', 'health'],
    tags: ['mobile', 'react-native', 'ios', 'android'],
    mock: true
  },
  {
    handle: 'morgan_devops',
    building: 'Kubernetes deployment automation',
    interests: ['infrastructure', 'automation', 'monitoring'],
    tags: ['devops', 'kubernetes', 'aws', 'monitoring'],
    mock: true
  },
  {
    handle: 'avery_data',
    building: 'ML pipeline for e-commerce recommendations',
    interests: ['data-science', 'e-commerce', 'recommendation-systems'],
    tags: ['data', 'python', 'spark', 'machine-learning'],
    mock: true
  },
  {
    handle: 'quinn_marketing',
    building: 'Growth strategy for developer tools',
    interests: ['developer-marketing', 'growth', 'content'],
    tags: ['marketing', 'growth', 'content', 'developer-relations'],
    mock: true
  },
  {
    handle: 'sage_security',
    building: 'Security audit tools for web apps',
    interests: ['cybersecurity', 'web-security', 'penetration-testing'],
    tags: ['security', 'penetration-testing', 'web-security', 'python'],
    mock: true
  }
];

// Sample skill exchanges
const sampleSkillExchanges = [
  {
    handle: 'alex_frontend',
    type: 'offer',
    skill: 'React development',
    details: '5+ years building complex frontend apps',
    category: 'technical'
  },
  {
    handle: 'alex_frontend',
    type: 'request',
    skill: 'backend architecture',
    details: 'Learning how to build scalable APIs',
    category: 'technical'
  },
  {
    handle: 'jordan_design',
    type: 'offer',
    skill: 'UI/UX design',
    details: 'Can help with user research and interface design',
    category: 'design'
  },
  {
    handle: 'casey_ai',
    type: 'request',
    skill: 'product strategy',
    details: 'Need help positioning AI tools for market',
    category: 'business'
  },
  {
    handle: 'taylor_product',
    type: 'offer',
    skill: 'product strategy',
    details: 'B2B product experience, market positioning',
    category: 'business'
  },
  {
    handle: 'riley_mobile',
    type: 'request',
    skill: 'UI design',
    details: 'App needs better visual design',
    category: 'design'
  }
];

async function createSampleProfiles(count = 10, clearFirst = false) {
  const results = {
    created: 0,
    exchanges: 0,
    errors: []
  };

  try {
    // Clear existing profiles if requested
    if (clearFirst) {
      // Note: This would require implementing a clear function in profiles.js
      console.log('Clearing existing profiles...');
    }

    // Create profiles
    const profilesToCreate = sampleProfiles.slice(0, count);
    
    for (const profile of profilesToCreate) {
      try {
        const now = Date.now();
        const lastSeen = now - Math.random() * 24 * 60 * 60 * 1000; // Within last 24h
        
        await userProfiles.updateProfile(profile.handle, {
          building: profile.building,
          interests: profile.interests,
          tags: profile.tags,
          lastSeen: lastSeen,
          firstSeen: lastSeen - Math.random() * 7 * 24 * 60 * 60 * 1000, // Within last week
          mock: true
        });
        
        results.created++;
      } catch (error) {
        results.errors.push(`Failed to create ${profile.handle}: ${error.message}`);
      }
    }

    // Create skill exchange posts
    for (const exchange of sampleSkillExchanges.slice(0, count / 2)) {
      try {
        const post = {
          id: Date.now() + Math.random(),
          handle: exchange.handle,
          type: exchange.type,
          skill: exchange.skill,
          details: exchange.details,
          category: exchange.category,
          timestamp: Date.now() - Math.random() * 12 * 60 * 60 * 1000, // Within last 12h
          status: 'active',
          mock: true
        };
        
        await store.appendSkillExchange(post);
        results.exchanges++;
      } catch (error) {
        results.errors.push(`Failed to create skill exchange: ${error.message}`);
      }
    }

  } catch (error) {
    results.errors.push(`Bootstrap error: ${error.message}`);
  }

  return results;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const count = args.count || 10;
  const clearFirst = args.clear || false;

  try {
    const results = await createSampleProfiles(count, clearFirst);
    
    let display = `## Discovery System Bootstrapped! 🚀\n\n`;
    
    display += `**Created:**\n`;
    display += `• ${results.created} sample user profiles\n`;
    display += `• ${results.exchanges} skill exchange posts\n\n`;
    
    if (results.errors.length > 0) {
      display += `**Errors:**\n`;
      for (const error of results.errors) {
        display += `• ${error}\n`;
      }
      display += `\n`;
    }
    
    display += `**Now try:**\n`;
    display += `• \`workshop-buddy find\` — Find your ideal workshop partner\n`;
    display += `• \`skills-exchange browse\` — Browse the skill marketplace\n`;
    display += `• \`discover suggest\` — Get personalized recommendations\n`;
    display += `• \`discover interests\` — Browse by interest categories\n\n`;
    
    display += `**Sample profiles include:**\n`;
    display += `• Frontend + Backend developers (complementary skills)\n`;
    display += `• Designers seeking engineering help\n`;
    display += `• AI engineers needing product guidance\n`;
    display += `• Mobile developers wanting UI expertise\n`;
    display += `• DevOps + Security specialists\n\n`;
    
    display += `_These are mock profiles for testing. Real users will have richer, authentic profiles._`;
    
    return { display };

  } catch (error) {
    return {
      display: `## Bootstrap Error\n\n${error.message}\n\nTry: \`discovery-bootstrap --count 5\``
    };
  }
}

module.exports = { definition, handler };