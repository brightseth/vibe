#!/usr/bin/env node

const { handler } = require('./mcp-server/tools/discovery-analytics.js');

async function runAnalytics() {
  console.log('🔍 Running Discovery Analytics...\n');
  
  try {
    // Community overview
    const overview = await handler({ command: 'overview' });
    console.log('='.repeat(60));
    console.log('COMMUNITY OVERVIEW');
    console.log('='.repeat(60));
    console.log(overview.display);
    console.log('\n');
    
    // Connection gaps
    const gaps = await handler({ command: 'gaps' });
    console.log('='.repeat(60));
    console.log('CONNECTION GAPS');
    console.log('='.repeat(60));
    console.log(gaps.display);
    console.log('\n');
    
    // Popular trends
    const popular = await handler({ command: 'popular' });
    console.log('='.repeat(60));
    console.log('POPULAR TRENDS');
    console.log('='.repeat(60));
    console.log(popular.display);
    console.log('\n');
    
    // Lonely users
    const lonely = await handler({ command: 'lonely' });
    console.log('='.repeat(60));
    console.log('PEOPLE NEEDING CONNECTIONS');
    console.log('='.repeat(60));
    console.log(lonely.display);
    console.log('\n');
    
  } catch (error) {
    console.error('Analytics Error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  runAnalytics();
}

module.exports = { runAnalytics };