/**
 * Skills Bootstrap — Seed the Skills Exchange with sample data
 * 
 * Since the Skills Exchange marketplace is built but empty, this tool:
 * 1. Creates realistic seed skill offers/requests
 * 2. Demonstrates the full feature set  
 * 3. Makes the marketplace feel active for new users
 */

const store = require('../store');

const definition = {
  name: 'vibe_skills_bootstrap',
  description: 'Bootstrap the Skills Exchange marketplace with seed data',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['seed', 'status', 'clear'],
        description: 'Bootstrap action to perform'
      }
    }
  }
};

// Seed skill exchanges that represent a healthy marketplace
const seedSkillExchanges = [
  // Tech Skills Offers
  {
    handle: 'alex-dev',
    type: 'offer',
    skill: 'React Development',
    details: 'Frontend focused, 3+ years experience. Happy to review code or pair program.',
    category: 'technical',
    timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: 'active'
  },
  {
    handle: 'sarah-ai',
    type: 'offer', 
    skill: 'Python & Machine Learning',
    details: 'ML engineer, can help with data analysis, model training, and deployment.',
    category: 'technical',
    timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: 'active'
  },
  {
    handle: 'mike-backend',
    type: 'offer',
    skill: 'Node.js & API Design', 
    details: 'Building scalable backends for 5+ years. Database design and authentication.',
    category: 'technical',
    timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: 'active'
  },

  // Design Skills Offers
  {
    handle: 'emma-design',
    type: 'offer',
    skill: 'UI/UX Design',
    details: 'Product designer at YC startup. Can help with user research and prototyping.',
    category: 'design',
    timestamp: Date.now() - (4 * 60 * 60 * 1000), // 4 hours ago
    status: 'active'
  },
  {
    handle: 'david-brand',
    type: 'offer',
    skill: 'Brand Strategy & Visual Identity',
    details: 'Helped 10+ startups with branding. Logo design and brand guidelines.',
    category: 'design', 
    timestamp: Date.now() - (6 * 60 * 60 * 1000), // 6 hours ago
    status: 'active'
  },

  // Business Skills Offers
  {
    handle: 'lisa-product',
    type: 'offer',
    skill: 'Product Strategy',
    details: 'Ex-Google PM. Product roadmaps, user research, and go-to-market strategy.',
    category: 'business',
    timestamp: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
    status: 'active'
  },
  {
    handle: 'jason-growth',
    type: 'offer',
    skill: 'Growth Marketing',
    details: 'Scaled 3 startups to $1M ARR. SEO, content marketing, and paid acquisition.',
    category: 'business',
    timestamp: Date.now() - (8 * 60 * 60 * 1000), // 8 hours ago  
    status: 'active'
  },

  // Skill Requests - People seeking help
  {
    handle: 'startup-founder',
    type: 'request',
    skill: 'Fundraising Advice',
    details: 'First-time founder building B2B SaaS. Need help with pitch deck and investor intros.',
    category: 'business',
    timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
    status: 'active'
  },
  {
    handle: 'new-developer',
    type: 'request', 
    skill: 'Code Review & Best Practices',
    details: 'Junior developer building my first production app. Need experienced eyes on my code.',
    category: 'technical',
    timestamp: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
    status: 'active'
  },
  {
    handle: 'creative-writer',
    type: 'request',
    skill: 'Web Development',
    details: 'Writer launching a newsletter platform. Need help setting up basic website and signup.',
    category: 'technical', 
    timestamp: Date.now() - (30 * 60 * 1000), // 30 minutes ago
    status: 'active'
  },
  {
    handle: 'small-business',
    type: 'request',
    skill: 'Logo Design',
    details: 'Local service business needs a professional logo. Budget-friendly options preferred.',
    category: 'design',
    timestamp: Date.now() - (45 * 60 * 1000), // 45 minutes ago
    status: 'active'
  },
  {
    handle: 'tech-lead',
    type: 'request',
    skill: 'Team Leadership & Culture',  
    details: 'New tech lead at 15-person startup. Need advice on building engineering culture.',
    category: 'soft-skills',
    timestamp: Date.now() - (90 * 60 * 1000), // 1.5 hours ago
    status: 'active'
  }
];

async function seedSkillsMarketplace() {
  let seeded = 0;
  
  for (const skillPost of seedSkillExchanges) {
    const postWithId = {
      id: Date.now() + Math.random(),
      ...skillPost
    };
    
    await store.appendSkillExchange(postWithId);
    seeded++;
  }
  
  return seeded;
}

async function getSkillsStatus() {
  try {
    const allSkills = await store.getSkillExchanges() || [];
    const offers = allSkills.filter(s => s.type === 'offer');
    const requests = allSkills.filter(s => s.type === 'request');
    
    const categories = {};
    allSkills.forEach(skill => {
      if (!categories[skill.category]) {
        categories[skill.category] = { offers: 0, requests: 0 };
      }
      categories[skill.category][skill.type + 's']++;
    });
    
    return {
      total: allSkills.length,
      offers: offers.length,
      requests: requests.length,
      categories
    };
  } catch (error) {
    return { total: 0, offers: 0, requests: 0, categories: {} };
  }
}

async function clearSkillsMarketplace() {
  // This would require a store method to clear all skill exchanges
  // For now, just return info about what would be cleared
  const status = await getSkillsStatus();
  return status;
}

async function handler(args) {
  const action = args.action || 'status';
  let display = '';

  try {
    switch (action) {
      case 'seed': {
        const currentStatus = await getSkillsStatus();
        
        if (currentStatus.total > 0) {
          display = `## Skills Exchange Already Has Data 📊\n\n`;
          display += `**Current marketplace:**\n`;
          display += `• ${currentStatus.total} total posts\n`;
          display += `• ${currentStatus.offers} skill offers\n`;
          display += `• ${currentStatus.requests} skill requests\n\n`;
          
          if (Object.keys(currentStatus.categories).length > 0) {
            display += `**By category:**\n`;
            for (const [category, counts] of Object.entries(currentStatus.categories)) {
              display += `• ${category}: ${counts.offers} offers, ${counts.requests} requests\n`;
            }
          }
          
          display += `\n**Marketplace is active! 🎉**\n`;
          display += `Check it out: \`skills-exchange browse\``;
        } else {
          const seeded = await seedSkillsMarketplace();
          display = `## Skills Exchange Bootstrapped! 🚀\n\n`;
          display += `**Added ${seeded} seed skill posts:**\n`;
          display += `• ${seedSkillExchanges.filter(s => s.type === 'offer').length} skill offers\n`;
          display += `• ${seedSkillExchanges.filter(s => s.type === 'request').length} skill requests\n`;
          display += `• Spanning ${new Set(seedSkillExchanges.map(s => s.category)).size} categories\n\n`;
          
          display += `**Sample skills now available:**\n`;
          display += `• React Development • Python & ML • UI/UX Design\n`;
          display += `• Product Strategy • Growth Marketing • Brand Strategy\n\n`;
          
          display += `**Try the marketplace:**\n`;
          display += `\`skills-exchange browse\` — See all available skills\n`;
          display += `\`skills-exchange match\` — Find skills perfect for you\n`;
          display += `\`skills-exchange post --type offer --skill "your expertise"\` — Add your skills`;
        }
        break;
      }

      case 'status': {
        const status = await getSkillsStatus();
        display = `## Skills Exchange Status 📈\n\n`;
        
        if (status.total === 0) {
          display += `**Marketplace is empty** 📭\n\n`;
          display += `Bootstrap with seed data:\n`;
          display += `\`skills-bootstrap --action seed\`\n\n`;
          display += `Or add your own skills:\n`;
          display += `\`skills-exchange post --type offer --skill "your expertise"\``;
        } else {
          display += `**Active marketplace** 🏪\n`;
          display += `• **${status.total} total posts**\n`;
          display += `• ${status.offers} skill offers available\n`; 
          display += `• ${status.requests} people seeking help\n\n`;
          
          if (Object.keys(status.categories).length > 0) {
            display += `**Skills by category:**\n`;
            for (const [category, counts] of Object.entries(status.categories)) {
              display += `• **${category}:** ${counts.offers} offers, ${counts.requests} requests\n`;
            }
            display += `\n`;
          }
          
          display += `**Browse the marketplace:**\n`;
          display += `\`skills-exchange browse\` — See all skills\n`;
          display += `\`skills-exchange match\` — Find perfect matches for you`;
        }
        break;
      }

      case 'clear': {
        const status = await getSkillsStatus();
        display = `## Clear Skills Exchange 🧹\n\n`;
        display += `**Would clear:**\n`;
        display += `• ${status.total} skill posts\n`;
        display += `• ${status.offers} offers\n`;
        display += `• ${status.requests} requests\n\n`;
        display += `_Note: Clear functionality not implemented for safety._\n`;
        display += `_Skills naturally expire after inactivity._`;
        break;
      }

      default:
        display = `## Skills Bootstrap Commands\n\n`;
        display += `**\`skills-bootstrap --action seed\`** — Add sample skills to marketplace\n`;
        display += `**\`skills-bootstrap --action status\`** — Check marketplace health\n`;
        display += `**\`skills-bootstrap --action clear\`** — View clear options\n\n`;
        display += `**Perfect for:**\n`;
        display += `• Bootstrapping an empty marketplace\n`;
        display += `• Demonstrating skills exchange features\n`;  
        display += `• Making the community feel active\n\n`;
        display += `**Then try:**\n`;
        display += `\`skills-exchange browse\` — Explore the marketplace`;
    }
  } catch (error) {
    display = `## Bootstrap Error\n\n${error.message}\n\nTry: \`skills-bootstrap\` for help`;
  }

  return { display };
}

module.exports = { definition, handler };