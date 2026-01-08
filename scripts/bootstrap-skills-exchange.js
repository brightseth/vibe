#!/usr/bin/env node
/**
 * Bootstrap Skills Exchange Marketplace
 * 
 * This script checks if the Skills Exchange marketplace has data,
 * and if not, bootstraps it with sample skill offerings and requests.
 */

const path = require('path');
const fs = require('fs');

// Set up environment
process.chdir(path.join(__dirname, '..'));
const config = require('./mcp-server/config');
const store = require('./mcp-server/store');

async function main() {
  console.log('🔍 Checking Skills Exchange marketplace status...\n');
  
  try {
    // Check existing data
    const existingPosts = await store.getSkillExchanges() || [];
    
    if (existingPosts.length > 0) {
      console.log(`✅ Skills Exchange already active with ${existingPosts.length} posts!`);
      
      const offers = existingPosts.filter(p => p.type === 'offer').length;
      const requests = existingPosts.filter(p => p.type === 'request').length;
      const users = [...new Set(existingPosts.map(p => p.handle))];
      
      console.log(`   • ${offers} skill offerings`);
      console.log(`   • ${requests} skill requests`);  
      console.log(`   • ${users.length} users: ${users.map(u => '@' + u).join(', ')}`);
      console.log('\n🎯 Skills Exchange marketplace is ready for use!');
      return;
    }
    
    console.log('📭 No skill posts found. Bootstrapping marketplace...\n');
    
    // Bootstrap with sample data
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
    
    // Create sample posts
    for (const postData of samplePosts) {
      const post = {
        id: Date.now() + Math.random(),
        ...postData,
        timestamp: Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000), // Random time in last 3 days
        status: 'active'
      };
      
      await store.appendSkillExchange(post);
      console.log(`✅ Created ${post.type}: ${post.skill} by @${post.handle}`);
    }
    
    console.log(`\n🎉 Successfully bootstrapped Skills Exchange with ${samplePosts.length} posts!`);
    
    const offers = samplePosts.filter(p => p.type === 'offer').length;
    const requests = samplePosts.filter(p => p.type === 'request').length;
    const users = [...new Set(samplePosts.map(p => p.handle))];
    
    console.log(`\n📊 Marketplace Summary:`);
    console.log(`   • ${offers} skill offerings from experts`);
    console.log(`   • ${requests} skill requests from learners`);
    console.log(`   • ${users.length} active users: ${users.map(u => '@' + u).join(', ')}`);
    
    console.log(`\n🚀 Skills Exchange marketplace is now live and ready!`);
    console.log(`\n💡 Users can now:`);
    console.log(`   • skills-exchange browse — Explore all offerings`);
    console.log(`   • skills-exchange match — Find personalized matches`);
    console.log(`   • skills-exchange post --type offer --skill "expertise"`);
    console.log(`   • dm @username "I saw your skills post..." — Connect!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}