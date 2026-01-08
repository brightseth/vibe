/**
 * Run the smart connection analysis
 */

const { generateSmartConnections, generateAnalyticsReport } = require('./smart-connection-suggester.js');

async function runAnalysis() {
  try {
    const report = await generateAnalyticsReport();
    
    console.log('🔍 SMART CONNECTION SUGGESTIONS FOR SKILLS EXCHANGE\n');
    
    console.log('📊 MARKETPLACE HEALTH');
    console.log('='.repeat(60));
    console.log(`• Total Users: ${report.summary.totalUsers}`);
    console.log(`• Skill Posts: ${report.summary.totalSkillPosts} (${report.summary.offers} offers, ${report.summary.requests} requests)`);
    console.log(`• Potential Connections: ${report.summary.potentialConnections}`);
    console.log(`• High-Value Matches: ${report.summary.highValueConnections}`);
    console.log(`• Health Status: ${report.marketplaceHealth.status}\n`);
    
    if (report.topConnections.length > 0) {
      console.log('🎯 TOP CONNECTION OPPORTUNITIES');
      console.log('='.repeat(60));
      report.topConnections.slice(0, 8).forEach((conn, i) => {
        const emoji = conn.matchType === 'high' ? '🔥' : conn.matchType === 'medium' ? '✨' : '💡';
        console.log(`${i + 1}. ${emoji} @${conn.user1} ↔ @${conn.user2} (Score: ${conn.score})`);
        console.log(`   Reasons: ${conn.reasons.join(', ')}`);
        console.log(`   ${conn.user1}: ${conn.user1Building?.substring(0, 50) || 'Building something cool'}${conn.user1Building?.length > 50 ? '...' : ''}`);
        console.log(`   ${conn.user2}: ${conn.user2Building?.substring(0, 50) || 'Building something cool'}${conn.user2Building?.length > 50 ? '...' : ''}\n`);
      });
    }
    
    if (report.skillGaps.length > 0) {
      console.log('🕳️  SKILL GAPS - OPPORTUNITIES FOR NEW MEMBERS');
      console.log('='.repeat(60));
      report.skillGaps.forEach(gap => {
        console.log(`• "${gap.skill}" - ${gap.requests} request${gap.requests > 1 ? 's' : ''}, no offers`);
      });
      console.log('');
    }
    
    if (report.mostActiveUsers.length > 0) {
      console.log('🏆 MOST ACTIVE SKILLS CONTRIBUTORS');
      console.log('='.repeat(60));
      report.mostActiveUsers.forEach(user => {
        console.log(`• @${user.handle}: ${user.posts} posts - ${user.building?.substring(0, 40) || 'Building something cool'}${user.building?.length > 40 ? '...' : ''}`);
      });
      console.log('');
    }
    
    console.log('🚀 RECOMMENDATIONS FOR DISCOVERY AGENT');
    console.log('='.repeat(60));
    console.log('• Suggest top 3 connections to users when they check skills-exchange match');
    console.log('• Proactively DM users about high-value matches (score >= 10)');
    console.log('• Encourage posting in gap skill areas');
    console.log('• Celebrate successful skill exchanges');
    console.log(`• Current marketplace balance: ${report.marketplaceHealth.balance}:1 (offers:requests)\n`);
    
    return report;
  } catch (error) {
    console.error('Error running analysis:', error.message);
    return null;
  }
}

runAnalysis();