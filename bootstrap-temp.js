// Temporary bootstrap runner for skills exchange
const bootstrapSkills = require('./mcp-server/tools/bootstrap-skills.js');
const store = require('./mcp-server/store');

async function runBootstrap() {
  console.log('🚀 Bootstrapping Skills Exchange marketplace...');
  
  try {
    const result = await bootstrapSkills.handler({ force: false });
    console.log('\n' + result.display);
    console.log('\n✅ Bootstrap complete!');
  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
  }
}

runBootstrap();