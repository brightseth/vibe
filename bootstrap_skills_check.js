// Quick script to check and bootstrap skills exchange
const store = require('./mcp-server/store');

async function checkAndBootstrap() {
  try {
    console.log('Checking existing skill exchanges...');
    const exchanges = await store.getSkillExchanges() || [];
    console.log(`Found ${exchanges.length} existing skill exchanges`);
    
    if (exchanges.length === 0) {
      console.log('Bootstrapping skills exchange...');
      
      const samplePosts = [
        {
          id: Date.now() + 1,
          handle: 'alice-dev',
          type: 'offer',
          skill: 'React Development',
          details: '5+ years experience, can help with components and state management',
          category: 'technical',
          timestamp: Date.now() - 86400000,
          status: 'active'
        },
        {
          id: Date.now() + 2,
          handle: 'bob-designer', 
          type: 'offer',
          skill: 'UI/UX Design',
          details: 'Product designer, can help with user research and prototyping',
          category: 'design',
          timestamp: Date.now() - 43200000,
          status: 'active'
        },
        {
          id: Date.now() + 3,
          handle: 'new-founder',
          type: 'request',
          skill: 'Fundraising Advice',
          details: 'First-time founder, need help with pitch deck and investor intros',
          category: 'business',
          timestamp: Date.now() - 21600000,
          status: 'active'
        }
      ];
      
      for (const post of samplePosts) {
        await store.appendSkillExchange(post);
        console.log(`Added ${post.type}: ${post.skill} by ${post.handle}`);
      }
      
      console.log('Skills exchange bootstrapped successfully!');
    } else {
      console.log('Skills exchange already has data');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAndBootstrap();