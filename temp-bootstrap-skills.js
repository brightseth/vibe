const store = require('./mcp-server/store');

async function bootstrapSkills() {
  console.log('Bootstrapping Skills Exchange...');
  
  const samplePosts = [
    // Technical Skills
    {
      handle: 'alice',
      type: 'offer',
      skill: 'React development',
      details: '5+ years experience, can help with components, state management, and performance optimization',
      category: 'technical'
    },
    {
      handle: 'alice',
      type: 'request',
      skill: 'Machine learning deployment',
      details: 'Need help deploying ML models at scale, particularly with Docker and Kubernetes',
      category: 'technical'
    },
    {
      handle: 'bob',
      type: 'offer',
      skill: 'Python backend development', 
      details: 'FastAPI, Django, microservices architecture, and API design',
      category: 'technical'
    },
    {
      handle: 'bob',
      type: 'request',
      skill: 'Frontend UI/UX feedback',
      details: 'Backend engineer looking for design sense and user experience guidance',
      category: 'design'
    },
    {
      handle: 'carol',
      type: 'offer',
      skill: 'Figma design systems',
      details: 'Creating scalable design systems, component libraries, and design tokens',
      category: 'design'
    },
    {
      handle: 'carol',
      type: 'request',
      skill: 'React component implementation',
      details: 'Need help turning designs into high-quality React components',
      category: 'technical'
    },
    {
      handle: 'dave',
      type: 'offer',
      skill: 'React Native development',
      details: 'Cross-platform mobile apps, navigation, and native module integration',
      category: 'technical'
    },
    {
      handle: 'dave',
      type: 'request',
      skill: 'Product strategy',
      details: 'Looking for help with go-to-market strategy and user acquisition',
      category: 'business'
    },
    {
      handle: 'eve',
      type: 'offer',
      skill: 'Content strategy',
      details: 'Blog writing, social media content, and content marketing strategies',
      category: 'creative'
    },
    {
      handle: 'eve',
      type: 'request',
      skill: 'Backend API development',
      details: 'Need help building robust APIs for AI content generation tools',
      category: 'technical'
    }
  ];
  
  // Check if already exists
  try {
    const existing = await store.getSkillExchanges() || [];
    if (existing.length > 0) {
      console.log(`Skills Exchange already has ${existing.length} posts. Skipping bootstrap.`);
      return;
    }
  } catch (e) {
    // Continue with bootstrap
  }
  
  // Create posts
  for (const postData of samplePosts) {
    const post = {
      id: Date.now() + Math.random(),
      ...postData,
      timestamp: Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000),
      status: 'active'
    };
    
    await store.appendSkillExchange(post);
    console.log(`✅ Created ${post.type}: ${post.skill} by @${post.handle}`);
  }
  
  console.log(`🎉 Bootstrapped Skills Exchange with ${samplePosts.length} posts!`);
}

bootstrapSkills().catch(console.error);