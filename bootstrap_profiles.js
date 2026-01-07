/**
 * Bootstrap Discovery Profiles - Create a sample ecosystem for testing
 */

const userProfiles = require('./mcp-server/store/profiles');

// Import bootstrap data
const bootstrap = require('./mcp-server/tools/discovery-bootstrap');

async function runBootstrap() {
  console.log('🚀 Bootstrapping discovery profiles...');
  
  try {
    // Clear any existing profiles
    await bootstrap.handler({ command: 'clear' });
    console.log('✓ Cleared existing profiles');
    
    // Create sample profiles
    const result = await bootstrap.handler({ command: 'create' });
    console.log('✓ Created sample profiles');
    
    // Show status
    const status = await bootstrap.handler({ command: 'status' });
    console.log('\n📊 Bootstrap complete:');
    console.log(status.display);
    
  } catch (error) {
    console.error('❌ Bootstrap failed:', error.message);
  }
}

runBootstrap();