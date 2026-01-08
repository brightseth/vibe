/**
 * Bootstrap Skills — Populate the Skills Exchange with sample data
 * 
 * Creates realistic skill posts and user profiles to demonstrate
 * the marketplace functionality and help real users understand
 * how to use the system effectively.
 * 
 * Commands:
 * - bootstrap-skills sample — Create sample skill posts
 * - bootstrap-skills profiles — Create sample user profiles  
 * - bootstrap-skills clear — Clear all sample data
 * - bootstrap-skills status — Show current bootstrap status
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_bootstrap_skills',
  description: 'Bootstrap the skills marketplace with sample data.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['sample', 'profiles', 'clear', 'status'],
        description: 'Bootstrap command to run'
      }
    }
  }
};

// Sample skill posts to populate the marketplace
const sampleSkillPosts = [
  // Technical Offers
  {
    handle: 'alex-dev',
    type: 'offer', 
    skill: 'React Development',
    details: '5+ years building SPAs. Happy to help with hooks, state management, performance optimization',
    category: 'technical'
  },
  {
    handle: 'sam-backend',
    type: 'offer',
    skill: 'Python Backend', 
    details: 'Django/FastAPI expert. Can help with APIs, database design, deployment',
    category: 'technical'
  },
  {
    handle: 'morgan-ai',
    type: 'offer',
    skill: 'Machine Learning',
    details: 'PyTorch & TensorFlow. Happy to help with model training, MLOps, computer vision',
    category: 'technical'
  },
  
  // Design Offers
  {
    handle: 'jordan-design',
    type: 'offer',
    skill: 'UI/UX Design',
    details: 'Product designer at startups. Can help with user research, wireframes, prototyping',
    category: 'design'
  },
  {
    handle: 'taylor-brand',
    type: 'offer',
    skill: 'Brand Identity',
    details: 'Logo design, color palettes, brand guidelines. Love helping early-stage startups',
    category: 'design'
  },
  
  // Business Offers  
  {
    handle: 'casey-product',
    type: 'offer',
    skill: 'Product Strategy',
    details: 'PM at Series B startup. Can help with roadmaps, feature prioritization, user research',
    category: 'business'
  },
  {
    handle: 'riley-marketing',
    type: 'offer', 
    skill: 'Growth Marketing',
    details: 'Performance marketing specialist. SEO, content strategy, conversion optimization',
    category: 'business'
  },
  
  // Skill Requests
  {
    handle: 'alex-dev',
    type: 'request',
    skill: 'UI Design Feedback',
    details: 'Building a dev tools product. Need fresh eyes on the interface and user flow',
    category: 'design'
  },
  {
    handle: 'sam-backend',
    type: 'request',
    skill: 'Marketing Strategy',
    details: 'Launching a SaaS tool for developers. Need help with go-to-market strategy',
    category: 'business'
  },
  {
    handle: 'jordan-design', 
    type: 'request',
    skill: 'React Native',
    details: 'Designer learning to code. Need help understanding mobile development basics',
    category: 'technical'
  },
  {
    handle: 'startup-founder',
    type: 'request',
    skill: 'Fundraising Advice',
    details: 'Pre-seed startup looking for guidance on pitch decks and investor outreach',
    category: 'business'
  },
  {
    handle: 'indie-maker',
    type: 'request', 
    skill: 'DevOps Setup',
    details: 'Solo developer needs help setting up CI/CD and deployment pipeline',
    category: 'technical'
  }
];

// Sample user profiles
const sampleProfiles = [
  {
    handle: 'alex-dev',
    building: 'A developer productivity tool for code reviews',
    interests: ['developer-tools', 'productivity', 'open-source'],
    tags: ['react', 'typescript', 'node.js', 'graphql']
  },
  {
    handle: 'sam-backend', 
    building: 'API monitoring service for microservices',
    interests: ['distributed-systems', 'monitoring', 'saas'],
    tags: ['python', 'kubernetes', 'postgresql', 'redis']
  },
  {
    handle: 'morgan-ai',
    building: 'Computer vision model for medical imaging',
    interests: ['healthcare', 'ai-ethics', 'research'],
    tags: ['pytorch', 'python', 'computer-vision', 'healthcare']
  },
  {
    handle: 'jordan-design',
    building: 'Design system for fintech startups',
    interests: ['fintech', 'design-systems', 'accessibility'],
    tags: ['figma', 'design-systems', 'user-research', 'prototyping']
  },
  {
    handle: 'taylor-brand',
    building: 'Brand identity studio for B2B SaaS',
    interests: ['branding', 'b2b-marketing', 'startups'], 
    tags: ['brand-design', 'illustration', 'adobe-creative', 'copywriting']
  },
  {
    handle: 'casey-product',
    building: 'Project management tool for remote teams',
    interests: ['remote-work', 'productivity', 'team-collaboration'],
    tags: ['product-management', 'user-research', 'data-analysis', 'roadmapping']
  },
  {
    handle: 'riley-marketing',
    building: 'Marketing automation platform',
    interests: ['marketing-automation', 'growth-hacking', 'analytics'],
    tags: ['seo', 'content-marketing', 'performance-marketing', 'analytics']
  },
  {
    handle: 'startup-founder',
    building: 'Sustainable packaging marketplace',
    interests: ['sustainability', 'marketplace', 'climate-tech'],
    tags: ['business-development', 'fundraising', 'strategy', 'operations']
  },
  {
    handle: 'indie-maker',
    building: 'Personal finance app for freelancers',
    interests: ['fintech', 'indie-hacking', 'personal-finance'],
    tags: ['flutter', 'firebase', 'mobile-development', 'solo-development']
  }
];

// Create sample skill posts
async function createSamplePosts() {
  let created = 0;
  
  for (const post of sampleSkillPosts) {
    const skillPost = {
      id: Date.now() + Math.random(),
      handle: post.handle,
      type: post.type,
      skill: post.skill, 
      details: post.details,
      category: post.category,
      timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
      status: 'active',
      source: 'bootstrap' // Mark as sample data
    };
    
    await store.appendSkillExchange(skillPost);
    created++;
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return created;
}

// Create sample user profiles
async function createSampleProfiles() {
  let created = 0;
  
  for (const profile of sampleProfiles) {
    await userProfiles.updateProfile(profile.handle, {
      building: profile.building,
      interests: profile.interests,
      tags: profile.tags,
      lastSeen: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24h
      source: 'bootstrap' // Mark as sample data
    });
    created++;
  }
  
  return created;
}

// Clear sample data
async function clearSampleData() {
  // Note: This would require implementing deletion methods in the store
  // For now, this is a placeholder that shows the concept
  return {
    skillPosts: 'Sample skill posts would be removed',
    profiles: 'Sample profiles would be removed',
    note: 'Deletion functionality would need to be implemented in the store layer'
  };
}

// Get bootstrap status
async function getBootstrapStatus() {
  const skillPosts = await store.getSkillExchanges() || [];
  const allProfiles = await userProfiles.getAllProfiles();
  
  const bootstrapPosts = skillPosts.filter(p => p.source === 'bootstrap');
  const bootstrapProfiles = allProfiles.filter(p => p.source === 'bootstrap');
  
  return {
    totalPosts: skillPosts.length,
    bootstrapPosts: bootstrapPosts.length,
    totalProfiles: allProfiles.length,
    bootstrapProfiles: bootstrapProfiles.length,
    hasBootstrapData: bootstrapPosts.length > 0 || bootstrapProfiles.length > 0
  };
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const command = args.command || 'status';
  let display = '';

  try {
    switch (command) {
      case 'sample': {
        const created = await createSamplePosts();
        
        display = `## Sample Skills Created! 🎯\n\n`;
        display += `**Added ${created} skill posts** to the marketplace:\n\n`;
        display += `**Offers:** React Development, Python Backend, ML, UI/UX Design, Brand Identity, Product Strategy, Growth Marketing\n\n`;
        display += `**Requests:** UI Design Feedback, Marketing Strategy, React Native, Fundraising Advice, DevOps Setup\n\n`;
        display += `**Perfect for demonstrating:**\n`;
        display += `• How skill posts work: \`skills-exchange browse\`\n`;
        display += `• Finding matches: \`skills-exchange match\`\n`;
        display += `• Marketplace trends: \`skills-analytics trends\`\n`;
        display += `• Workshop buddy matching: \`workshop-buddy find\`\n\n`;
        display += `**Note:** All sample posts are marked with \`source: 'bootstrap'\` for easy identification.`;
        break;
      }

      case 'profiles': {
        const created = await createSampleProfiles();
        
        display = `## Sample Profiles Created! 👥\n\n`;
        display += `**Added ${created} user profiles** with diverse skills and projects:\n\n`;
        display += `**Builders:** Developer tools, API monitoring, Computer vision, Design systems, Brand studio, Project management, Marketing automation, Sustainable marketplace, Personal finance app\n\n`;
        display += `**Skills represented:** React, Python, ML, Design, Product, Marketing, DevOps, Mobile, Business Development\n\n`;
        display += `**Perfect for testing:**\n`;
        display += `• Skill matching algorithms\n`;
        display += `• Workshop buddy recommendations\n`;
        display += `• Discovery features\n`;
        display += `• User connection suggestions\n\n`;
        display += `**Try:** \`discover search react\` or \`workshop-buddy find\` to see the system in action!`;
        break;
      }

      case 'clear': {
        const result = await clearSampleData();
        
        display = `## Clear Sample Data 🧹\n\n`;
        display += `**Would remove:**\n`;
        display += `• ${result.skillPosts}\n`;
        display += `• ${result.profiles}\n\n`;
        display += `**Note:** ${result.note}\n\n`;
        display += `**To implement deletion:**\n`;
        display += `• Add \`deleteSkillExchange(id)\` to store\n`;
        display += `• Add \`deleteProfile(handle)\` to profiles\n`;
        display += `• Filter by \`source: 'bootstrap'\` field`;
        break;
      }

      case 'status': {
        const status = await getBootstrapStatus();
        
        display = `## Bootstrap Status 📊\n\n`;
        display += `**Skills Marketplace:**\n`;
        display += `• Total posts: ${status.totalPosts}\n`;
        display += `• Sample posts: ${status.bootstrapPosts}\n\n`;
        display += `**User Profiles:**\n`;
        display += `• Total profiles: ${status.totalProfiles}\n`;
        display += `• Sample profiles: ${status.bootstrapProfiles}\n\n`;
        
        if (!status.hasBootstrapData) {
          display += `**No sample data found** 📭\n\n`;
          display += `**Bootstrap the marketplace:**\n`;
          display += `\`bootstrap-skills sample\` — Add sample skill posts\n`;
          display += `\`bootstrap-skills profiles\` — Add sample user profiles\n\n`;
          display += `**Why bootstrap?**\n`;
          display += `• Demonstrates marketplace functionality\n`;
          display += `• Helps new users understand the system\n`;
          display += `• Provides data for testing algorithms\n`;
          display += `• Creates a welcoming, active-feeling community`;
        } else {
          display += `**Bootstrap data active** ✅\n\n`;
          display += `**Test the system:**\n`;
          display += `• \`skills-exchange browse\` — Browse sample posts\n`;
          display += `• \`workshop-buddy find\` — See profile matching\n`;
          display += `• \`skills-analytics trends\` — View marketplace analytics\n`;
          display += `• \`discover search react\` — Test search functionality\n\n`;
          display += `**For production:** Consider running \`bootstrap-skills clear\` once real users are active.`;
        }
        break;
      }

      default:
        display = `## Bootstrap Skills Commands

**\`bootstrap-skills sample\`** — Create realistic skill posts for the marketplace
**\`bootstrap-skills profiles\`** — Create diverse user profiles with skills/projects  
**\`bootstrap-skills status\`** — Show current bootstrap data status
**\`bootstrap-skills clear\`** — Remove all sample data (conceptual)

**Perfect for:**
- Demonstrating marketplace functionality to new users
- Testing skill matching and discovery algorithms  
- Creating an active-feeling community from day one
- Showing the full potential of the skills system

**Safe to use:**
- All sample data is marked with \`source: 'bootstrap'\`
- Easy to identify and remove later
- Doesn't interfere with real user data`;
    }
  } catch (error) {
    display = `## Bootstrap Error

${error.message}

Try: \`bootstrap-skills status\` to see current state`;
  }

  return { display };
}

module.exports = { definition, handler };