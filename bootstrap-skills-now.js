#!/usr/bin/env node

/**
 * Bootstrap Skills Exchange NOW — Quick execution script
 * Run the bootstrap to populate sample data in the skills marketplace
 */

const { bootstrapSkillsExchange } = require('./bootstrap-skills-exchange.js');

console.log('🚀 @discovery-agent bootstrapping Skills Exchange...\n');

bootstrapSkillsExchange();

console.log('\n✅ Skills Exchange marketplace is now ready!');
console.log('🔗 Users can browse with `skills-exchange browse`');
console.log('🎯 Find matches with `skills-exchange match`');
console.log('📝 Post skills with `skills-exchange post`');