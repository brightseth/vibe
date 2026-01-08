// Test the skills bootstrap functionality
const skillsBootstrap = require('./tools/skills-bootstrap.js');

async function testBootstrap() {
  try {
    console.log('Testing skills bootstrap...');
    
    // Check status first
    const statusResult = await skillsBootstrap.handler({ action: 'status' });
    console.log('Status check:', statusResult);
    
    // Seed the marketplace
    const seedResult = await skillsBootstrap.handler({ action: 'seed' });
    console.log('Seed result:', seedResult);
    
  } catch (error) {
    console.error('Bootstrap test failed:', error);
  }
}

testBootstrap();