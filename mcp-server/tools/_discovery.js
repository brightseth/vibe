/**
 * Discovery Tool Suite Registration
 * 
 * Registers all discovery-related tools:
 * - discover.js — Main discovery system
 * - discover-insights.js — Analytics and improvement suggestions  
 * - smart-intro.js — AI-powered introduction messages
 */

const discover = require('./discover');
const discoverInsights = require('./discover-insights');
const smartIntro = require('./smart-intro');

module.exports = {
  tools: [
    discover,
    discoverInsights,
    smartIntro
  ],
  definitions: [
    discover.definition,
    discoverInsights.definition,
    smartIntro.definition
  ]
};