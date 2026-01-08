#!/usr/bin/env node

const { generateDashboard } = require('./skills-exchange-dashboard.js');

async function analyzeSkillsExchange() {
  console.log('🔍 Analyzing Skills Exchange Marketplace...\n');
  
  try {
    const dashboard = generateDashboard();
    
    console.log('📊 SKILLS EXCHANGE STATUS');
    console.log('='.repeat(50));
    console.log(`Health: ${dashboard.summary.health}`);
    console.log(`Users: ${dashboard.summary.users}`);
    console.log(`Total Posts: ${dashboard.summary.posts}`);
    console.log(`Offers: ${dashboard.summary.offers}`);
    console.log(`Requests: ${dashboard.summary.requests}`);
    console.log(`Balance: ${dashboard.summary.balance}:1 (offers:requests)\n`);
    
    // Top connection opportunities
    if (dashboard.opportunities.length > 0) {
      console.log('🎯 TOP CONNECTION OPPORTUNITIES');
      console.log('-'.repeat(40));
      dashboard.opportunities.slice(0, 5).forEach((opp, i) => {
        console.log(`${i + 1}. ${opp.skill} (${opp.confidence}% confidence)`);
        console.log(`   @${opp.requester} ← @${opp.provider}`);
        if (opp.requestDetails) console.log(`   Request: ${opp.requestDetails.substring(0, 60)}...`);
        if (opp.offerDetails) console.log(`   Offer: ${opp.offerDetails.substring(0, 60)}...`);
        console.log('');
      });
    }
    
    // Key insights
    if (dashboard.insights.length > 0) {
      console.log('💡 KEY INSIGHTS');
      console.log('-'.repeat(20));
      dashboard.insights.forEach(insight => {
        const emoji = insight.priority === 'high' ? '🔥' : '⚡';
        console.log(`${emoji} ${insight.title}`);
        console.log(`   ${insight.description}`);
        console.log(`   → ${insight.action}\n`);
      });
    }
    
    // High-demand skills
    if (dashboard.metrics.highDemand.length > 0) {
      console.log('📈 HIGH-DEMAND SKILLS');
      console.log('-'.repeat(25));
      dashboard.metrics.highDemand.forEach(skill => {
        console.log(`• ${skill.skill}: ${skill.demand} unmet requests`);
      });
      console.log('');
    }
    
    // Recommendations
    if (dashboard.recommendations.length > 0) {
      console.log('🚀 RECOMMENDATIONS FOR DISCOVERY AGENT');
      console.log('-'.repeat(40));
      dashboard.recommendations.forEach(rec => {
        if (rec.target === 'discovery-agent') {
          console.log(`• ${rec.description}`);
          if (rec.count) console.log(`  ${rec.count} opportunities available`);
          if (rec.skills) console.log(`  Focus skills: ${rec.skills.join(', ')}`);
        }
      });
    }
    
    return dashboard;
    
  } catch (error) {
    console.error('Error analyzing skills exchange:', error.message);
    return null;
  }
}

if (require.main === module) {
  analyzeSkillsExchange().then(dashboard => {
    if (dashboard && dashboard.opportunities.length > 0) {
      console.log('\n✅ Skills Exchange analysis complete!');
      console.log(`Found ${dashboard.opportunities.length} connection opportunities.`);
    } else {
      console.log('\n❌ No connection opportunities found or analysis failed.');
    }
  });
}

module.exports = { analyzeSkillsExchange };