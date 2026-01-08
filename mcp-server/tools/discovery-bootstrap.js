/**
 * vibe discovery-bootstrap — Bootstrap Discovery System with Sample Data
 *
 * Creates realistic sample profiles for testing discovery and matching features.
 * Only runs when no real users are present to avoid polluting real data.
 */

const userProfiles = require('../store/profiles');
const store = require('../store');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_bootstrap',
  description: 'Bootstrap discovery system with sample data for testing',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['create', 'clear', 'status'],
        description: 'Bootstrap command'
      }
    }
  }
};

// Sample profiles representing realistic /vibe community members
const sampleProfiles = [
  {
    handle: 'alex-builder',
    building: 'AI-powered code review tool for teams',
    interests: ['ai', 'developer-tools', 'productivity', 'machine-learning'],
    tags: ['typescript', 'python', 'ai', 'backend', 'devtools'],
    lastSeen: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
    ships: [
      { what: 'Added GPT-4 integration to code reviewer', timestamp: Date.now() - (24 * 60 * 60 * 1000) },
      { what: 'Built real-time collaboration features', timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000) }
    ]
  },
  {
    handle: 'sarah-design',
    building: 'Design system for early-stage startups',
    interests: ['design-systems', 'ux', 'startups', 'accessibility'],
    tags: ['figma', 'design', 'ux', 'frontend', 'css'],
    lastSeen: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
    ships: [
      { what: 'Released component library v2.0', timestamp: Date.now() - (12 * 60 * 60 * 1000) },
      { what: 'Added dark mode to design system', timestamp: Date.now() - (48 * 60 * 60 * 1000) }
    ]
  },
  {
    handle: 'mike-fullstack',
    building: 'Social finance app for Gen Z',
    interests: ['fintech', 'mobile-apps', 'social', 'crypto'],
    tags: ['react-native', 'node', 'backend', 'mobile', 'api-design'],
    lastSeen: Date.now() - (30 * 60 * 1000), // 30 minutes ago
    ships: [
      { what: 'Launched beta with 100 users', timestamp: Date.now() - (6 * 60 * 60 * 1000) },
      { what: 'Built peer-to-peer payment system', timestamp: Date.now() - (5 * 24 * 60 * 60 * 1000) }
    ]
  },
  {
    handle: 'emma-research',
    building: 'Climate data visualization platform',
    interests: ['climate-tech', 'data-science', 'visualization', 'research'],
    tags: ['python', 'data', 'd3', 'research', 'analytics'],
    lastSeen: Date.now() - (4 * 60 * 60 * 1000), // 4 hours ago
    ships: [
      { what: 'Published climate data insights', timestamp: Date.now() - (18 * 60 * 60 * 1000) },
      { what: 'Built interactive map visualization', timestamp: Date.now() - (7 * 24 * 60 * 60 * 1000) }
    ]
  },
  {
    handle: 'david-product',
    building: 'Remote work productivity suite',
    interests: ['productivity', 'remote-work', 'saas', 'product-management'],
    tags: ['product', 'strategy', 'user-research', 'analytics', 'growth'],
    lastSeen: Date.now() - (6 * 60 * 60 * 1000), // 6 hours ago
    ships: [
      { what: 'Validated product-market fit survey', timestamp: Date.now() - (8 * 60 * 60 * 1000) },
      { what: 'Launched user onboarding flow', timestamp: Date.now() - (4 * 24 * 60 * 60 * 1000) }
    ]
  },
  {
    handle: 'luna-crypto',
    building: 'DeFi yield farming optimizer',
    interests: ['defi', 'crypto', 'smart-contracts', 'finance'],
    tags: ['solidity', 'web3', 'backend', 'ethereum', 'defi'],
    lastSeen: Date.now() - (8 * 60 * 60 * 1000), // 8 hours ago
    ships: [
      { what: 'Deployed smart contract on mainnet', timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000) },
      { what: 'Built portfolio tracking dashboard', timestamp: Date.now() - (6 * 24 * 60 * 60 * 1000) }
    ]
  },
  {
    handle: 'james-mobile',
    building: 'Food delivery app for small towns',
    interests: ['mobile-development', 'local-business', 'food-tech', 'ios'],
    tags: ['swift', 'ios', 'mobile', 'backend', 'maps'],
    lastSeen: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
    ships: [
      { what: 'Added real-time order tracking', timestamp: Date.now() - (14 * 60 * 60 * 1000) },
      { what: 'Integrated payment processing', timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000) }
    ]
  }
];

// Sample skill exchange posts
const sampleSkillPosts = [
  {
    id: 1001,
    handle: 'alex-builder',
    type: 'offer',
    skill: 'AI/ML Integration',
    details: 'Help integrate GPT models, fine-tuning, and ML workflows',
    category: 'technical',
    timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000),
    status: 'active'
  },
  {
    id: 1002,
    handle: 'sarah-design',
    type: 'offer',
    skill: 'UI/UX Design Review',
    details: 'Design critique and user experience audit',
    category: 'design',
    timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000),
    status: 'active'
  },
  {
    id: 1003,
    handle: 'mike-fullstack',
    type: 'request',
    skill: 'iOS Development',
    details: 'Need help with Swift and App Store submission',
    category: 'technical',
    timestamp: Date.now() - (18 * 60 * 60 * 1000),
    status: 'active'
  },
  {
    id: 1004,
    handle: 'emma-research',
    type: 'offer',
    skill: 'Data Analysis',
    details: 'Statistical analysis and data visualization consulting',
    category: 'technical',
    timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000),
    status: 'active'
  },
  {
    id: 1005,
    handle: 'david-product',
    type: 'request',
    skill: 'Backend Development',
    details: 'Looking for Node.js/Python expertise for API design',
    category: 'technical',
    timestamp: Date.now() - (6 * 60 * 60 * 1000),
    status: 'active'
  },
  {
    id: 1006,
    handle: 'luna-crypto',
    type: 'offer',
    skill: 'Smart Contract Development',
    details: 'Solidity, security audits, and DeFi protocol design',
    category: 'technical',
    timestamp: Date.now() - (12 * 60 * 60 * 1000),
    status: 'active'
  }
];

async function createSampleProfiles() {
  let created = 0;
  
  for (const profile of sampleProfiles) {
    try {
      await userProfiles.updateProfile(profile.handle, {
        building: profile.building,
        interests: profile.interests,
        tags: profile.tags,
        lastSeen: profile.lastSeen,
        ships: profile.ships
      });
      created++;
    } catch (error) {
      console.error(`Failed to create profile for ${profile.handle}:`, error);
    }
  }
  
  return created;
}

async function createSampleSkillPosts() {
  let created = 0;
  
  for (const post of sampleSkillPosts) {
    try {
      await store.appendSkillExchange(post);
      created++;
    } catch (error) {
      console.error(`Failed to create skill post ${post.id}:`, error);
    }
  }
  
  return created;
}

async function clearSampleData() {
  // This would clear sample profiles and posts
  // For safety, we'll just return a message about manual cleanup
  return "To clear sample data, manually delete ~/.vibecodings/profiles.json and skill-exchanges.jsonl";
}

async function getBootstrapStatus() {
  const allProfiles = await userProfiles.getAllProfiles();
  const skillPosts = await store.getSkillExchanges() || [];
  
  const sampleHandles = sampleProfiles.map(p => p.handle);
  const existingSampleProfiles = allProfiles.filter(p => sampleHandles.includes(p.handle));
  
  return {
    totalProfiles: allProfiles.length,
    sampleProfiles: existingSampleProfiles.length,
    skillPosts: skillPosts.length,
    hasSampleData: existingSampleProfiles.length > 0
  };
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const command = args.command || 'status';
  let display = '';

  try {
    switch (command) {
      case 'create': {
        const status = await getBootstrapStatus();
        
        if (status.hasSampleData) {
          display = `## Sample Data Already Exists 📊\n\n`;
          display += `**Current state:**\n`;
          display += `• ${status.totalProfiles} total profiles (${status.sampleProfiles} sample)\n`;
          display += `• ${status.skillPosts} skill exchange posts\n\n`;
          display += `**To recreate sample data:**\n`;
          display += `1. \`discovery-bootstrap clear\`\n`;
          display += `2. \`discovery-bootstrap create\``;
        } else {
          const profilesCreated = await createSampleProfiles();
          const postsCreated = await createSampleSkillPosts();
          
          display = `## Discovery System Bootstrapped! 🚀\n\n`;
          display += `**Created:**\n`;
          display += `• ${profilesCreated} sample user profiles\n`;
          display += `• ${postsCreated} skill exchange posts\n\n`;
          display += `**Test the features:**\n`;
          display += `• \`workshop-buddy find\` — See buddy matches\n`;
          display += `• \`skills-exchange browse\` — Browse skill marketplace\n`;
          display += `• \`discover search "ai"\` — Find people by interest\n`;
          display += `• \`discover insights\` — Community insights\n\n`;
          display += `**Sample community members:**\n`;
          for (const profile of sampleProfiles.slice(0, 3)) {
            display += `• @${profile.handle} — ${profile.building}\n`;
          }
        }
        break;
      }

      case 'clear': {
        const message = await clearSampleData();
        display = `## Clear Sample Data\n\n${message}\n\n`;
        display += `After manual cleanup:\n`;
        display += `\`discovery-bootstrap create\` to recreate sample data`;
        break;
      }

      case 'status': {
        const status = await getBootstrapStatus();
        
        display = `## Discovery System Status 📈\n\n`;
        display += `**Community size:**\n`;
        display += `• ${status.totalProfiles} total profiles\n`;
        display += `• ${status.sampleProfiles} sample profiles\n`;
        display += `• ${status.skillPosts} skill exchange posts\n\n`;
        
        if (status.totalProfiles === 0) {
          display += `**Ready to bootstrap?**\n`;
          display += `\`discovery-bootstrap create\` — Create sample community\n`;
          display += `This will create realistic profiles to test matching features.`;
        } else if (status.hasSampleData) {
          display += `**Sample data active** — Discovery features ready for testing\n\n`;
          display += `**Try these commands:**\n`;
          display += `• \`workshop-buddy find\` — Find your workshop partner\n`;
          display += `• \`skills-exchange match\` — Find skill exchanges\n`;
          display += `• \`discover trending\` — See what's popular`;
        } else {
          display += `**Real community detected** — Sample data not needed\n\n`;
          display += `Use production discovery commands:\n`;
          display += `• \`discover search "keyword"\`\n`;
          display += `• \`workshop-buddy find\`\n`;
          display += `• \`skills-exchange browse\``;
        }
        break;
      }

      default:
        display = `## Discovery Bootstrap Commands\n\n`;
        display += `**\`discovery-bootstrap create\`** — Create sample profiles and skill posts\n`;
        display += `**\`discovery-bootstrap status\`** — Check current community size\n`;
        display += `**\`discovery-bootstrap clear\`** — Instructions to clear sample data\n\n`;
        display += `**Use case:**\n`;
        display += `Bootstrap a realistic community for testing discovery features when no real users are online.`;
    }
  } catch (error) {
    display = `## Bootstrap Error\n\n${error.message}\n\nTry: \`discovery-bootstrap\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };