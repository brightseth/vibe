#!/usr/bin/env node

/**
 * Bootstrap Skills Exchange — Create sample skill posts to populate the marketplace
 */

const fs = require('fs');
const path = require('path');

const VIBE_DIR = path.join(process.env.HOME, '.vibecodings');
const SKILL_EXCHANGE_FILE = path.join(VIBE_DIR, 'skill-exchanges.jsonl');

// Sample skill posts to bootstrap the marketplace
const samplePosts = [
  // Alice's posts (AI/Frontend)
  {
    id: Date.now() + 1,
    handle: 'alice',
    type: 'offer',
    skill: 'React development',
    details: '5+ years experience, can help with components, state management, and performance optimization',
    category: 'technical',
    timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: 'active'
  },
  {
    id: Date.now() + 2,
    handle: 'alice',
    type: 'offer',
    skill: 'TypeScript mentoring',
    details: 'Help with type safety, advanced patterns, and migration strategies',
    category: 'technical',
    timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: 'active'
  },
  {
    id: Date.now() + 3,
    handle: 'alice',
    type: 'request',
    skill: 'Machine learning model deployment',
    details: 'Need help deploying ML models at scale, particularly with Docker and Kubernetes',
    category: 'technical',
    timestamp: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
    status: 'active'
  },

  // Bob's posts (Backend/Infrastructure)
  {
    id: Date.now() + 4,
    handle: 'bob',
    type: 'offer',
    skill: 'Python backend development',
    details: 'FastAPI, Django, microservices architecture, and API design',
    category: 'technical',
    timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: 'active'
  },
  {
    id: Date.now() + 5,
    handle: 'bob',
    type: 'offer',
    skill: 'Kubernetes deployment',
    details: 'Container orchestration, auto-scaling, and DevOps best practices',
    category: 'technical',
    timestamp: Date.now() - (18 * 60 * 60 * 1000), // 18 hours ago
    status: 'active'
  },
  {
    id: Date.now() + 6,
    handle: 'bob',
    type: 'request',
    skill: 'Frontend UI/UX feedback',
    details: 'Backend engineer looking for design sense and user experience guidance',
    category: 'design',
    timestamp: Date.now() - (6 * 60 * 60 * 1000), // 6 hours ago
    status: 'active'
  },

  // Carol's posts (Design/UX)
  {
    id: Date.now() + 7,
    handle: 'carol',
    type: 'offer',
    skill: 'Figma design systems',
    details: 'Creating scalable design systems, component libraries, and design tokens',
    category: 'design',
    timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: 'active'
  },
  {
    id: Date.now() + 8,
    handle: 'carol',
    type: 'offer',
    skill: 'UX research methodology',
    details: 'User interviews, usability testing, and research planning',
    category: 'design',
    timestamp: Date.now() - (20 * 60 * 60 * 1000), // 20 hours ago
    status: 'active'
  },
  {
    id: Date.now() + 9,
    handle: 'carol',
    type: 'request',
    skill: 'React component implementation',
    details: 'Need help turning designs into high-quality React components',
    category: 'technical',
    timestamp: Date.now() - (4 * 60 * 60 * 1000), // 4 hours ago
    status: 'active'
  },

  // Dave's posts (Mobile/Crypto)
  {
    id: Date.now() + 10,
    handle: 'dave',
    type: 'offer',
    skill: 'React Native development',
    details: 'Cross-platform mobile apps, navigation, and native module integration',
    category: 'technical',
    timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: 'active'
  },
  {
    id: Date.now() + 11,
    handle: 'dave',
    type: 'offer',
    skill: 'Blockchain integration',
    details: 'Smart contracts, Web3 APIs, and crypto trading algorithms',
    category: 'technical',
    timestamp: Date.now() - (14 * 60 * 60 * 1000), // 14 hours ago
    status: 'active'
  },
  {
    id: Date.now() + 12,
    handle: 'dave',
    type: 'request',
    skill: 'Product strategy',
    details: 'Looking for help with go-to-market strategy and user acquisition',
    category: 'business',
    timestamp: Date.now() - (8 * 60 * 60 * 1000), // 8 hours ago
    status: 'active'
  },

  // Eve's posts (AI/Content)
  {
    id: Date.now() + 13,
    handle: 'eve',
    type: 'offer',
    skill: 'Content strategy',
    details: 'Blog writing, social media content, and content marketing strategies',
    category: 'creative',
    timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: 'active'
  },
  {
    id: Date.now() + 14,
    handle: 'eve',
    type: 'offer',
    skill: 'GPT prompt engineering',
    details: 'Optimizing AI prompts for better outputs, fine-tuning strategies',
    category: 'technical',
    timestamp: Date.now() - (10 * 60 * 60 * 1000), // 10 hours ago
    status: 'active'
  },
  {
    id: Date.now() + 15,
    handle: 'eve',
    type: 'request',
    skill: 'Backend API development',
    details: 'Need help building robust APIs for AI content generation tools',
    category: 'technical',
    timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
    status: 'active'
  }
];

// Ensure the vibe directory exists
function ensureDir() {
  if (!fs.existsSync(VIBE_DIR)) {
    fs.mkdirSync(VIBE_DIR, { recursive: true });
  }
}

// Check if skills exchange file already has posts
function hasExistingPosts() {
  try {
    if (fs.existsSync(SKILL_EXCHANGE_FILE)) {
      const content = fs.readFileSync(SKILL_EXCHANGE_FILE, 'utf8').trim();
      return content.length > 0;
    }
  } catch (e) {}
  return false;
}

// Bootstrap the skills exchange with sample data
function bootstrapSkillsExchange() {
  ensureDir();
  
  if (hasExistingPosts()) {
    console.log('🔍 Skills exchange already has posts - skipping bootstrap');
    return;
  }
  
  console.log('🚀 Bootstrapping Skills Exchange marketplace...');
  
  // Write sample posts to the file
  const content = samplePosts.map(post => JSON.stringify(post)).join('\n') + '\n';
  fs.writeFileSync(SKILL_EXCHANGE_FILE, content);
  
  console.log(`✅ Created ${samplePosts.length} sample skill posts:`);
  
  // Summary of what was created
  const offers = samplePosts.filter(p => p.type === 'offer');
  const requests = samplePosts.filter(p => p.type === 'request');
  
  console.log(`   • ${offers.length} skill offerings`);
  console.log(`   • ${requests.length} skill requests`);
  console.log(`   • Categories: technical, design, business, creative`);
  console.log('');
  
  // Show some examples of what users can now do
  console.log('🎯 The Skills Exchange is now ready! Users can:');
  console.log('   • `skills-exchange browse` — See all postings');
  console.log('   • `skills-exchange match` — Find personalized matches');
  console.log('   • `skills-exchange post` — Add their own offerings/requests');
  console.log('   • `workshop-buddy find` — Find collaboration partners');
  console.log('');
  
  // Show perfect matches that now exist
  console.log('🤝 Perfect skill matches now available:');
  console.log('   • Alice (React) ↔ Carol (needs React components)');
  console.log('   • Bob (Python/K8s) ↔ Alice (needs ML deployment)');
  console.log('   • Carol (UX/Design) ↔ Bob (needs UI feedback)');
  console.log('   • Dave (Mobile) ↔ Eve (needs backend APIs)');
  console.log('');
  console.log('💬 Users can now connect via `dm @username` to start collaborating!');
}

// Run the bootstrap
if (require.main === module) {
  bootstrapSkillsExchange();
}

module.exports = { bootstrapSkillsExchange };