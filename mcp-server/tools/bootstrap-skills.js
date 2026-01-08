/**
 * vibe bootstrap-skills — Bootstrap Skills Exchange with sample data
 *
 * Creates sample skill offerings and requests to populate the marketplace.
 * Only runs if no existing skill exchange data exists.
 */

const store = require('../store');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_bootstrap_skills',
  description: 'Bootstrap the skills exchange marketplace with sample data.',
  inputSchema: {
    type: 'object',
    properties: {
      force: {
        type: 'boolean',
        description: 'Force bootstrap even if data exists',
        default: false
      }
    }
  }
};

// Sample skill posts to bootstrap the marketplace
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
    type: 'offer', 
    skill: 'TypeScript mentoring',
    details: 'Help with type safety, advanced patterns, and migration strategies',
    category: 'technical'
  },
  {
    handle: 'alice',
    type: 'request',
    skill: 'Machine learning model deployment',
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
    type: 'offer',
    skill: 'Kubernetes deployment',
    details: 'Container orchestration, auto-scaling, and DevOps best practices',
    category: 'technical'
  },
  {
    handle: 'bob',
    type: 'request',
    skill: 'Frontend UI/UX feedback',
    details: 'Backend engineer looking for design sense and user experience guidance',
    category: 'design'
  },
  
  // Design Skills
  {
    handle: 'carol',
    type: 'offer',
    skill: 'Figma design systems',
    details: 'Creating scalable design systems, component libraries, and design tokens',
    category: 'design'
  },
  {
    handle: 'carol',
    type: 'offer',
    skill: 'UX research methodology',
    details: 'User interviews, usability testing, and research planning',
    category: 'design'
  },
  {
    handle: 'carol',
    type: 'request',
    skill: 'React component implementation',
    details: 'Need help turning designs into high-quality React components',
    category: 'technical'
  },
  
  // Mobile & Crypto
  {
    handle: 'dave',
    type: 'offer',
    skill: 'React Native development',
    details: 'Cross-platform mobile apps, navigation, and native module integration',
    category: 'technical'
  },
  {
    handle: 'dave',
    type: 'offer',
    skill: 'Blockchain integration',
    details: 'Smart contracts, Web3 APIs, and crypto trading algorithms',
    category: 'technical'
  },
  {
    handle: 'dave',
    type: 'request',
    skill: 'Product strategy',
    details: 'Looking for help with go-to-market strategy and user acquisition',
    category: 'business'
  },
  
  // Content & AI
  {
    handle: 'eve',
    type: 'offer',
    skill: 'Content strategy',
    details: 'Blog writing, social media content, and content marketing strategies',
    category: 'creative'
  },
  {
    handle: 'eve',
    type: 'offer',
    skill: 'GPT prompt engineering',
    details: 'Optimizing AI prompts for better outputs, fine-tuning strategies',
    category: 'technical'
  },
  {
    handle: 'eve',
    type: 'request',
    skill: 'Backend API development',
    details: 'Need help building robust APIs for AI content generation tools',
    category: 'technical'
  }
];

async function createSkillPost(postData) {
  const post = {
    id: Date.now() + Math.random(),
    ...postData,
    timestamp: Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000), // Random time in last 3 days
    status: 'active'
  };
  
  await store.appendSkillExchange(post);
  return post;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  let display = '';

  try {
    // Check if skills exchange already has posts
    const existingPosts = await store.getSkillExchanges() || [];
    
    if (existingPosts.length > 0 && !args.force) {
      display = `## Skills Exchange Already Active! 🎯\n\n`;
      display += `Found ${existingPosts.length} existing skill posts.\n\n`;
      display += `**Current Status:**\n`;
      
      const offers = existingPosts.filter(p => p.type === 'offer').length;
      const requests = existingPosts.filter(p => p.type === 'request').length;
      
      display += `• ${offers} skill offerings available\n`;
      display += `• ${requests} skill requests posted\n`;
      display += `• Ready for matching and connections\n\n`;
      
      display += `**Use the marketplace:**\n`;
      display += `• \`skills-exchange browse\` — See all postings\n`;
      display += `• \`skills-exchange match\` — Find your matches\n`;
      display += `• \`skills-exchange post\` — Add your skills\n\n`;
      
      display += `**Force refresh:** \`bootstrap-skills --force true\``;
      
      return { display };
    }
    
    display = `## Bootstrapping Skills Exchange Marketplace 🚀\n\n`;
    display += `Creating sample skill posts to populate the marketplace...\n\n`;
    
    // Create all sample posts
    let created = 0;
    for (const postData of samplePosts) {
      await createSkillPost(postData);
      created++;
    }
    
    display += `✅ **Successfully created ${created} skill posts!**\n\n`;
    
    // Summary
    const offers = samplePosts.filter(p => p.type === 'offer').length;
    const requests = samplePosts.filter(p => p.type === 'request').length;
    const categories = [...new Set(samplePosts.map(p => p.category))];
    const users = [...new Set(samplePosts.map(p => p.handle))];
    
    display += `**Marketplace Overview:**\n`;
    display += `• ${offers} skill offerings from experts\n`;
    display += `• ${requests} skill requests from learners\n`;
    display += `• ${categories.length} categories: ${categories.join(', ')}\n`;
    display += `• ${users.length} active users: ${users.map(u => '@' + u).join(', ')}\n\n`;
    
    display += `**Perfect Match Examples:**\n`;
    display += `• Alice (React expert) ↔ Carol (needs React components)\n`;
    display += `• Bob (Python/K8s) ↔ Alice (needs ML deployment)\n`;
    display += `• Carol (UX/Design) ↔ Bob (needs UI feedback)\n`;
    display += `• Dave (Mobile dev) ↔ Eve (needs backend APIs)\n\n`;
    
    display += `**Ready to Use:**\n`;
    display += `• \`skills-exchange browse\` — Explore all offerings\n`;
    display += `• \`skills-exchange match\` — Find personalized matches\n`;
    display += `• \`skills-exchange post --type offer --skill "your expertise"\`\n`;
    display += `• \`dm @username "I saw your skills post..."\` — Connect!\n\n`;
    
    display += `🎯 **The Skills Exchange marketplace is now live and ready for connections!**`;

  } catch (error) {
    display = `## Bootstrap Skills Error\n\n${error.message}\n\nTry: \`bootstrap-skills\` to retry`;
  }

  return { display };
}

module.exports = { definition, handler };