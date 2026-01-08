#!/usr/bin/env node

/**
 * Bootstrap Skills Exchange Marketplace
 * 
 * Creates realistic skill exchange posts based on existing user profiles
 * to demonstrate the marketplace and enable connections.
 */

const fs = require('fs');
const path = require('path');

// Load existing profiles
function loadProfiles() {
  try {
    const data = fs.readFileSync('profiles.json', 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

// Create skill exchange posts
function createSkillPosts() {
  const profiles = loadProfiles();
  const posts = [];
  
  // Generate realistic offers based on user tags and interests
  const skillOffers = [
    // alice - AI/frontend expert
    {
      handle: 'alice',
      type: 'offer',
      skill: 'React Development',
      details: 'Frontend development with React, TypeScript, and modern tooling. 3+ years experience.',
      category: 'technical',
      timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: 'active'
    },
    {
      handle: 'alice', 
      type: 'offer',
      skill: 'Machine Learning Integration',
      details: 'Help integrate ML models into web apps. Experience with GPT APIs and model serving.',
      category: 'technical',
      timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
      status: 'active'
    },
    
    // bob - backend/infrastructure
    {
      handle: 'bob',
      type: 'offer', 
      skill: 'Python Backend Development',
      details: 'Django, FastAPI, database design, and API architecture. Scalability focused.',
      category: 'technical',
      timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
      status: 'active'
    },
    {
      handle: 'bob',
      type: 'offer',
      skill: 'Docker & Kubernetes',
      details: 'Containerization and orchestration for AI/ML workloads. Production experience.',
      category: 'technical', 
      timestamp: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
      status: 'active'
    },
    
    // carol - design expert
    {
      handle: 'carol',
      type: 'offer',
      skill: 'UI/UX Design',
      details: 'User interface design, user research, and design systems. Figma expertise.',
      category: 'design',
      timestamp: Date.now() - (6 * 60 * 60 * 1000), // 6 hours ago
      status: 'active'
    },
    {
      handle: 'carol',
      type: 'offer',
      skill: 'Design Systems',
      details: 'Building scalable component libraries and design tokens. React + Figma workflow.',
      category: 'design',
      timestamp: Date.now() - (18 * 60 * 60 * 1000), // 18 hours ago
      status: 'active'
    },
    
    // dave - mobile/crypto
    {
      handle: 'dave',
      type: 'offer',
      skill: 'React Native Development', 
      details: 'Cross-platform mobile apps with React Native. App Store deployment experience.',
      category: 'technical',
      timestamp: Date.now() - (4 * 60 * 60 * 1000), // 4 hours ago
      status: 'active'
    },
    
    // eve - content/marketing
    {
      handle: 'eve',
      type: 'offer',
      skill: 'Content Strategy',
      details: 'AI-assisted content creation, blog writing, and marketing copy. Growth focused.',
      category: 'creative',
      timestamp: Date.now() - (8 * 60 * 60 * 1000), // 8 hours ago
      status: 'active'
    }
  ];
  
  // Generate realistic requests (things people want to learn)
  const skillRequests = [
    // alice wants to learn business/marketing
    {
      handle: 'alice',
      type: 'request',
      skill: 'Product Strategy',
      details: 'Building my first SaaS product. Need help with roadmapping and user research.',
      category: 'business',
      timestamp: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
      status: 'active'
    },
    
    // bob wants design skills  
    {
      handle: 'bob',
      type: 'request',
      skill: 'UI Design Feedback',
      details: 'Backend dev looking for design review on dashboard interface. Quick feedback session.',
      category: 'design', 
      timestamp: Date.now() - (5 * 60 * 60 * 1000), // 5 hours ago
      status: 'active'
    },
    
    // carol wants technical skills
    {
      handle: 'carol',
      type: 'request',
      skill: 'API Integration',
      details: 'Designer learning to code. Need help connecting my React components to APIs.',
      category: 'technical',
      timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago  
      status: 'active'
    },
    
    // dave wants AI/ML knowledge
    {
      handle: 'dave',
      type: 'request', 
      skill: 'AI Model Integration',
      details: 'Adding AI features to mobile app. Looking for guidance on model selection and APIs.',
      category: 'technical',
      timestamp: Date.now() - (30 * 60 * 1000), // 30 minutes ago
      status: 'active'
    },
    
    // eve wants crypto knowledge
    {
      handle: 'eve',
      type: 'request',
      skill: 'Blockchain Basics',
      details: 'Content creator wanting to understand crypto/Web3 for better content. Beginner level.',
      category: 'technical',
      timestamp: Date.now() - (10 * 60 * 1000), // 10 minutes ago
      status: 'active'
    }
  ];
  
  // Add unique IDs 
  const allPosts = [...skillOffers, ...skillRequests].map((post, index) => ({
    ...post,
    id: Date.now() + index + Math.random()
  }));
  
  return allPosts;
}

// Write posts to JSONL file
function writeSkillPosts() {
  const posts = createSkillPosts();
  const content = posts.map(post => JSON.stringify(post)).join('\n') + '\n';
  
  // Write to skill-exchanges.jsonl 
  fs.writeFileSync('skill-exchanges.jsonl', content);
  
  console.log(`✅ Created ${posts.length} skill exchange posts:`);
  console.log(`   • ${posts.filter(p => p.type === 'offer').length} skill offers`);
  console.log(`   • ${posts.filter(p => p.type === 'request').length} skill requests`);
  console.log(`   • Skills marketplace ready for connections!`);
  
  return posts;
}

// Main execution
if (require.main === module) {
  writeSkillPosts();
}

module.exports = { createSkillPosts, writeSkillPosts };