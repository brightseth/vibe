const userProfiles = require('./mcp-server/store/profiles');
const store = require('./mcp-server/store');

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
  }
];

async function createProfiles() {
  console.log('Creating sample profiles...');
  
  for (const profile of sampleProfiles) {
    try {
      const now = Date.now();
      const lastSeen = now - Math.random() * 24 * 60 * 60 * 1000; // Within last 24h
      
      const result = await userProfiles.updateProfile(profile.handle, {
        building: profile.building,
        interests: profile.interests,
        tags: profile.tags,
        lastSeen: lastSeen,
        firstSeen: lastSeen - Math.random() * 7 * 24 * 60 * 60 * 1000,
        mock: true
      });
      
      console.log(`✅ Created profile for @${profile.handle}`);
    } catch (error) {
      console.error(`❌ Failed to create ${profile.handle}:`, error.message);
    }
  }
  
  // Create some skill exchange posts
  const exchanges = [
    {
      handle: 'alex_frontend',
      type: 'offer',
      skill: 'React development',
      details: '5+ years building complex frontend apps'
    },
    {
      handle: 'jordan_design',
      type: 'offer',
      skill: 'UI/UX design',
      details: 'Can help with user research and interface design'
    },
    {
      handle: 'casey_ai',
      type: 'request',
      skill: 'product strategy',
      details: 'Need help positioning AI tools for market'
    }
  ];
  
  for (const exchange of exchanges) {
    try {
      const post = {
        id: Date.now() + Math.random(),
        handle: exchange.handle,
        type: exchange.type,
        skill: exchange.skill,
        details: exchange.details,
        category: exchange.type === 'offer' ? 'technical' : 'business',
        timestamp: Date.now() - Math.random() * 12 * 60 * 60 * 1000,
        status: 'active',
        mock: true
      };
      
      await store.appendSkillExchange(post);
      console.log(`💼 Created skill exchange: ${exchange.skill} (${exchange.type})`);
    } catch (error) {
      console.error(`❌ Failed to create skill exchange:`, error.message);
    }
  }
  
  console.log('\n🚀 Sample profiles created! Discovery system is ready for testing.');
}

createProfiles().catch(console.error);