#!/usr/bin/env node

const { main } = require('./analyze-skill-matches.js');

main().then(suggestions => {
  if (suggestions && suggestions.length > 0) {
    console.log(`✅ Analysis complete: ${suggestions.length} actionable connections identified`);
    console.log('\n🎯 Ready for discovery agent to execute connection suggestions');
  } else {
    console.log('📊 Analysis complete: No immediate connection opportunities');  
    console.log('💡 Consider bootstrapping more diverse skill posts');
  }
}).catch(console.error);