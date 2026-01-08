#!/usr/bin/env node

const { generateDashboard } = require('./skills-exchange-dashboard.js');

async function main() {
  console.log('🔍 Running Skills Exchange Dashboard Analysis...\n');
  
  const dashboard = await generateDashboard();
  
  console.log('📊 SKILLS EXCHANGE MARKETPLACE DASHBOARD');
  console.log('='.repeat(60));
  console.log(`Generated: ${new Date(dashboard.timestamp).toLocaleString()}`);
  console.log(`Health: ${dashboard.summary.health.toUpperCase()}\n`);
  
  console.log('📈 MARKETPLACE METRICS');
  console.log('-'.repeat(30));
  console.log(`Users: ${dashboard.summary.users}`);
  console.log(`Total Posts: ${dashboard.summary.posts}`);
  console.log(`Offers: ${dashboard.summary.offers}`);
  console.log(`Requests: ${dashboard.summary.requests}`);
  console.log(`Balance Ratio: ${dashboard.summary.balance}:1 (offers:requests)`);
  console.log(`Categories: ${dashboard.summary.categories}\n`);
  
  if (dashboard.opportunities.length > 0) {
    console.log('🎯 TOP CONNECTION OPPORTUNITIES');
    console.log('-'.repeat(30));
    dashboard.opportunities.slice(0, 8).forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.skill} (${opp.confidence}% match)`);
      console.log(`   @${opp.requester} needs ← @${opp.provider} offers`);
      if (opp.requesterBuilding) console.log(`   Requester: ${opp.requesterBuilding}`);
      if (opp.providerBuilding) console.log(`   Provider: ${opp.providerBuilding}`);
      console.log('');
    });
  }
  
  if (dashboard.insights.length > 0) {
    console.log('💡 KEY INSIGHTS & ACTIONS');
    console.log('-'.repeat(30));
    dashboard.insights.forEach((insight, i) => {
      const priorityEmoji = insight.priority === 'high' ? '🔥' : 
                           insight.priority === 'medium' ? '⚡' : '💭';
      console.log(`${priorityEmoji} ${insight.title}`);
      console.log(`   ${insight.description}`);
      console.log(`   Action: ${insight.action}\n`);
    });
  }
  
  console.log('🚀 DISCOVERY AGENT NEXT ACTIONS');
  console.log('-'.repeat(30));
  
  // Specific actionable items for me
  const actionableOpportunities = dashboard.opportunities.filter(opp => opp.confidence >= 70);
  if (actionableOpportunities.length > 0) {
    console.log(`✅ ${actionableOpportunities.length} high-confidence connections ready to suggest`);
    actionableOpportunities.slice(0, 3).forEach(opp => {
      console.log(`   → Suggest @${opp.provider} to @${opp.requester} for "${opp.skill}"`);
    });
  }
  
  if (dashboard.metrics.highDemand.length > 0) {
    console.log(`⚡ ${dashboard.metrics.highDemand.length} skills in high demand`);
    dashboard.metrics.highDemand.slice(0, 3).forEach(skill => {
      console.log(`   → Recruit experts in "${skill.skill}" (${skill.demand} unmet requests)`);
    });
  }
  
  return dashboard;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };