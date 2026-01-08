/**
 * Seed Skills Exchange Marketplace
 * 
 * Bootstrap the Skills Exchange with realistic sample data
 * to demonstrate the feature and make it feel active for users.
 */

const fs = require('fs');
const path = require('path');

// Get vibe directory from config
const VIBE_DIR = process.env.VIBE_DIR || 'vibe-public';
const SKILL_EXCHANGE_FILE = path.join(VIBE_DIR, 'skill-exchanges.jsonl');

// Ensure directory exists
if (!fs.existsSync(VIBE_DIR)) {
  fs.mkdirSync(VIBE_DIR, { recursive: true });
}

// Seed skill exchanges that represent a healthy marketplace
const seedSkillExchanges = [
  // Tech Skills Offers
  {
    id: Date.now() + Math.random(),
    handle: 'alex-dev',
    type: 'offer',
    skill: 'React Development',
    details: 'Frontend focused, 3+ years experience. Happy to review code or pair program.',
    category: 'technical',
    timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: 'active'
  },
  {
    id: Date.now() + Math.random(),
    handle: 'sarah-ai',
    type: 'offer', 
    skill: 'Python & Machine Learning',
    details: 'ML engineer, can help with data analysis, model training, and deployment.',
    category: 'technical',
    timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: 'active'
  },
  {
    id: Date.now() + Math.random(),
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
    id: Date.now() + Math.random(),
    handle: 'emma-design',
    type: 'offer',
    skill: 'UI/UX Design',
    details: 'Product designer at YC startup. Can help with user research and prototyping.',
    category: 'design',
    timestamp: Date.now() - (4 * 60 * 60 * 1000), // 4 hours ago
    status: 'active'
  },
  {
    id: Date.now() + Math.random(),
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
    id: Date.now() + Math.random(),
    handle: 'lisa-product',
    type: 'offer',
    skill: 'Product Strategy',
    details: 'Ex-Google PM. Product roadmaps, user research, and go-to-market strategy.',
    category: 'business',
    timestamp: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
    status: 'active'
  },
  {
    id: Date.now() + Math.random(),
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
    id: Date.now() + Math.random(),
    handle: 'startup-founder',
    type: 'request',
    skill: 'Fundraising Advice',
    details: 'First-time founder building B2B SaaS. Need help with pitch deck and investor intros.',
    category: 'business',
    timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
    status: 'active'
  },
  {
    id: Date.now() + Math.random(),
    handle: 'new-developer',
    type: 'request', 
    skill: 'Code Review & Best Practices',
    details: 'Junior developer building my first production app. Need experienced eyes on my code.',
    category: 'technical',
    timestamp: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
    status: 'active'
  },
  {
    id: Date.now() + Math.random(),
    handle: 'creative-writer',
    type: 'request',
    skill: 'Web Development',
    details: 'Writer launching a newsletter platform. Need help setting up basic website and signup.',
    category: 'technical', 
    timestamp: Date.now() - (30 * 60 * 1000), // 30 minutes ago
    status: 'active'
  },
  {
    id: Date.now() + Math.random(),
    handle: 'small-business',
    type: 'request',
    skill: 'Logo Design',
    details: 'Local service business needs a professional logo. Budget-friendly options preferred.',
    category: 'design',
    timestamp: Date.now() - (45 * 60 * 1000), // 45 minutes ago
    status: 'active'
  },
  {
    id: Date.now() + Math.random(),
    handle: 'tech-lead',
    type: 'request',
    skill: 'Team Leadership & Culture',  
    details: 'New tech lead at 15-person startup. Need advice on building engineering culture.',
    category: 'soft-skills',
    timestamp: Date.now() - (90 * 60 * 1000), // 1.5 hours ago
    status: 'active'
  }
];

// Write seed data to file
const skillData = seedSkillExchanges.map(skill => JSON.stringify(skill)).join('\n') + '\n';
fs.writeFileSync(SKILL_EXCHANGE_FILE, skillData);

console.log(`✅ Seeded Skills Exchange with ${seedSkillExchanges.length} posts`);
console.log(`📊 ${seedSkillExchanges.filter(s => s.type === 'offer').length} offers, ${seedSkillExchanges.filter(s => s.type === 'request').length} requests`);
console.log(`🏪 Skills marketplace is now active!`);