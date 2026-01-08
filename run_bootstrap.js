#!/usr/bin/env node

/**
 * Bootstrap the /vibe discovery system with sample data
 * This creates a thriving skills marketplace for testing
 */

const { bootstrapSkillsExchange } = require('./bootstrap-skills-exchange.js');

console.log('🚀 Bootstrapping /vibe Skills Exchange...\n');

try {
  // Create sample skill exchange posts
  bootstrapSkillsExchange();
  
  console.log('✅ Bootstrap complete!\n');
  console.log('🎯 The Skills Exchange marketplace is now populated with:');
  console.log('   • Frontend ↔ Backend opportunities');
  console.log('   • Design ↔ Development partnerships');  
  console.log('   • AI ↔ Product strategy exchanges');
  console.log('   • Mobile ↔ UI design collaborations');
  console.log('\n💡 Users can now:');
  console.log('   • Browse active skill exchanges');
  console.log('   • Find perfect skill matches');
  console.log('   • Connect with complementary builders');
  console.log('   • Start productive collaborations');

} catch (error) {
  console.error('❌ Bootstrap failed:', error.message);
  process.exit(1);
}