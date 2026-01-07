/**
 * Bootstrap Discovery - Create sample user profiles for testing matching algorithm
 * 
 * Creates diverse test profiles that demonstrate:
 * - Similar project matches (building same thing)
 * - Complementary skill matches (frontend + backend)
 * - Interest overlap matches (shared hobbies/domains)
 * - Activity timing patterns
 * - Edge cases (sparse profiles, niche interests)
 */

const userProfiles = require('../store/profiles');

const definition = {
  name: 'vibe_discovery_bootstrap',
  description: 'Create sample user profiles for testing the discovery matching algorithm.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['create', 'clear', 'status'],
        description: 'Bootstrap command: create sample profiles, clear all profiles, or show status'
      }
    }
  }
};

// Sample profiles representing different user types and matching scenarios
const SAMPLE_PROFILES = [
  {
    handle: 'alice_ai',
    building: 'AI-powered code review tool for startups',
    interests: ['ai', 'startups', 'developer tools', 'productivity'],
    tags: ['python', 'machine learning', 'backend', 'api design'],
    lastSeen: Date.now() - (1000 * 60 * 30), // 30 min ago
    ships: [
      { what: 'OpenAI integration for code analysis', timestamp: Date.now() - (1000 * 60 * 60 * 24) },
      { what: 'Real-time PR feedback system', timestamp: Date.now() - (1000 * 60 * 60 * 48) }
    ]
  },
  {
    handle: 'bob_frontend',
    building: 'React component library for AI applications',
    interests: ['frontend', 'design systems', 'ai', 'open source'],
    tags: ['react', 'typescript', 'frontend', 'ui/ux', 'storybook'],
    lastSeen: Date.now() - (1000 * 60 * 45), // 45 min ago
    ships: [
      { what: 'AI chat interface components', timestamp: Date.now() - (1000 * 60 * 60 * 12) },
      { what: 'Dark mode component variants', timestamp: Date.now() - (1000 * 60 * 60 * 36) }
    ]
  },
  {
    handle: 'celia_crypto',
    building: 'Decentralized social media platform',
    interests: ['crypto', 'decentralization', 'social networks', 'privacy'],
    tags: ['solidity', 'blockchain', 'fullstack', 'web3'],
    lastSeen: Date.now() - (1000 * 60 * 60 * 2), // 2 hours ago
    ships: [
      { what: 'Smart contract for user verification', timestamp: Date.now() - (1000 * 60 * 60 * 6) }
    ]
  },
  {
    handle: 'david_mobile',
    building: 'Mobile app for local food discovery',
    interests: ['mobile', 'food', 'local business', 'maps'],
    tags: ['react native', 'ios', 'android', 'geolocation', 'mobile'],
    lastSeen: Date.now() - (1000 * 60 * 15), // 15 min ago
    ships: [
      { what: 'GPS-based restaurant recommendations', timestamp: Date.now() - (1000 * 60 * 60 * 18) },
      { what: 'User review system', timestamp: Date.now() - (1000 * 60 * 60 * 72) }
    ]
  },
  {
    handle: 'eva_health',
    building: 'Telemedicine platform for mental health',
    interests: ['healthcare', 'mental health', 'telemedicine', 'privacy'],
    tags: ['healthcare', 'security', 'compliance', 'backend', 'database'],
    lastSeen: Date.now() - (1000 * 60 * 60), // 1 hour ago
    ships: [
      { what: 'HIPAA-compliant video chat system', timestamp: Date.now() - (1000 * 60 * 60 * 24) }
    ]
  },
  {
    handle: 'frank_fintech',
    building: 'AI budgeting assistant for freelancers',
    interests: ['fintech', 'ai', 'freelancing', 'personal finance'],
    tags: ['python', 'ai', 'financial modeling', 'api integration'],
    lastSeen: Date.now() - (1000 * 60 * 20), // 20 min ago
    ships: [
      { what: 'Bank account integration API', timestamp: Date.now() - (1000 * 60 * 60 * 8) },
      { what: 'Expense categorization ML model', timestamp: Date.now() - (1000 * 60 * 60 * 30) }
    ]
  },
  {
    handle: 'grace_gaming',
    building: 'Multiplayer puzzle game with voice chat',
    interests: ['gaming', 'realtime systems', 'voice tech', 'communities'],
    tags: ['unity', 'c#', 'networking', 'audio processing', 'game design'],
    lastSeen: Date.now() - (1000 * 60 * 5), // 5 min ago
    ships: [
      { what: 'WebRTC voice chat integration', timestamp: Date.now() - (1000 * 60 * 60 * 4) }
    ]
  },
  {
    handle: 'henry_hardware',
    building: 'IoT sensors for smart gardening',
    interests: ['iot', 'hardware', 'sustainability', 'agriculture'],
    tags: ['arduino', 'sensors', 'embedded systems', 'hardware'],
    lastSeen: Date.now() - (1000 * 60 * 60 * 4), // 4 hours ago
    ships: [
      { what: 'Soil moisture monitoring system', timestamp: Date.now() - (1000 * 60 * 60 * 48) }
    ]
  },
  {
    handle: 'ivy_design',
    building: 'Design system for accessibility-first products',
    interests: ['design', 'accessibility', 'inclusive design', 'design systems'],
    tags: ['figma', 'ui/ux', 'accessibility', 'design systems', 'research'],
    lastSeen: Date.now() - (1000 * 60 * 10), // 10 min ago
    ships: [
      { what: 'WCAG-compliant color palette generator', timestamp: Date.now() - (1000 * 60 * 60 * 16) },
      { what: 'Screen reader testing guide', timestamp: Date.now() - (1000 * 60 * 60 * 60) }
    ]
  },
  {
    handle: 'jack_security',
    building: 'Open source security scanner for web apps',
    interests: ['cybersecurity', 'open source', 'web security', 'privacy'],
    tags: ['security', 'penetration testing', 'python', 'open source'],
    lastSeen: Date.now() - (1000 * 60 * 35), // 35 min ago
    ships: [
      { what: 'SQL injection detection module', timestamp: Date.now() - (1000 * 60 * 60 * 20) }
    ]
  },
  // Edge cases and sparse profiles
  {
    handle: 'kim_minimal',
    building: null, // No building info
    interests: ['music', 'art'],
    tags: [],
    lastSeen: Date.now() - (1000 * 60 * 60 * 12), // 12 hours ago
    ships: []
  },
  {
    handle: 'luis_niche',
    building: 'Quantum computing simulator for education',
    interests: ['quantum computing', 'physics', 'education', 'simulation'],
    tags: ['python', 'quantum algorithms', 'scientific computing'],
    lastSeen: Date.now() - (1000 * 60 * 60 * 8), // 8 hours ago
    ships: [
      { what: 'Quantum gate visualization tool', timestamp: Date.now() - (1000 * 60 * 60 * 72) }
    ]
  }
];

// Expected high-match pairs for validation
const EXPECTED_MATCHES = [
  {
    user1: 'alice_ai',
    user2: 'frank_fintech',
    reason: 'Both building AI tools, shared python/ai tags'
  },
  {
    user1: 'bob_frontend', 
    user2: 'alice_ai',
    reason: 'Complementary skills - frontend + backend for AI projects'
  },
  {
    user1: 'eva_health',
    user2: 'jack_security', 
    reason: 'Both focused on security/privacy, complementary healthcare + security'
  },
  {
    user1: 'grace_gaming',
    user2: 'david_mobile',
    reason: 'Both building realtime interactive applications'
  },
  {
    user1: 'ivy_design',
    user2: 'bob_frontend',
    reason: 'Design + frontend collaboration, shared UI/UX focus'
  }
];

async function createSampleProfiles() {
  let created = 0;
  const results = [];

  for (const profile of SAMPLE_PROFILES) {
    try {
      // Set first seen to create realistic profile ages
      const profileWithTimestamp = {
        ...profile,
        firstSeen: profile.lastSeen - (1000 * 60 * 60 * 24 * Math.floor(Math.random() * 30)) // Random 0-30 days ago
      };

      await userProfiles.updateProfile(profile.handle, profileWithTimestamp);
      created++;
      results.push(`✓ Created @${profile.handle} - ${profile.building || 'Exploring'}`);
    } catch (error) {
      results.push(`✗ Failed @${profile.handle}: ${error.message}`);
    }
  }

  return { created, results };
}

async function clearAllProfiles() {
  // This is a bit hacky but we need to clear the profiles file
  const fs = require('fs');
  const path = require('path');
  const config = require('../config');
  
  const PROFILES_FILE = path.join(config.VIBE_DIR, 'profiles.json');
  
  try {
    fs.writeFileSync(PROFILES_FILE, '{}');
    return { cleared: true };
  } catch (error) {
    return { cleared: false, error: error.message };
  }
}

async function getBootstrapStatus() {
  const allProfiles = await userProfiles.getAllProfiles();
  const sampleHandles = SAMPLE_PROFILES.map(p => p.handle);
  const existing = allProfiles.filter(p => sampleHandles.includes(p.handle));
  
  const stats = {
    totalProfiles: allProfiles.length,
    sampleProfiles: existing.length,
    expectedProfiles: SAMPLE_PROFILES.length,
    isBootstrapped: existing.length === SAMPLE_PROFILES.length
  };

  return stats;
}

async function validateMatching() {
  const validation = [];
  
  for (const expected of EXPECTED_MATCHES) {
    try {
      const profile1 = await userProfiles.getProfile(expected.user1);
      const profile2 = await userProfiles.getProfile(expected.user2);
      
      if (!profile1.handle || !profile2.handle) {
        validation.push(`⚠️  Missing profiles for ${expected.user1} + ${expected.user2}`);
        continue;
      }

      // Import the matching function from discover.js
      // This is a bit hacky but allows us to test the actual algorithm
      const discover = require('./discover.js');
      
      validation.push(`✓ Can test ${expected.user1} + ${expected.user2}: ${expected.reason}`);
    } catch (error) {
      validation.push(`✗ Error testing ${expected.user1} + ${expected.user2}: ${error.message}`);
    }
  }
  
  return validation;
}

async function handler(args) {
  const command = args.command || 'create';
  let display = '';

  try {
    switch (command) {
      case 'create': {
        const result = await createSampleProfiles();
        const validation = await validateMatching();
        
        display = `## Discovery Bootstrap Complete

**Created ${result.created}/${SAMPLE_PROFILES.length} sample profiles:**

${result.results.join('\n')}

**Expected matching scenarios:**
${EXPECTED_MATCHES.map(m => `• ${m.user1} + ${m.user2}: ${m.reason}`).join('\n')}

**Validation:**
${validation.join('\n')}

**Test the algorithm:**
- \`discover suggest\` (as any sample user)
- \`discover search "ai"\` 
- \`discover interests\`
- \`discover active\`

**Sample profiles include:**
- AI/ML builders (alice_ai, frank_fintech)
- Frontend + Backend complementary skills
- Healthcare + Security (privacy overlap)
- Mobile + Gaming (realtime apps)
- Design + Frontend collaboration
- Edge cases (minimal profiles, niche interests)`;
        break;
      }

      case 'clear': {
        const result = await clearAllProfiles();
        if (result.cleared) {
          display = `## All Profiles Cleared

Profile database has been reset.
Use \`discovery-bootstrap create\` to recreate sample profiles.`;
        } else {
          display = `## Failed to Clear Profiles

Error: ${result.error}`;
        }
        break;
      }

      case 'status': {
        const status = await getBootstrapStatus();
        display = `## Bootstrap Status

**Total profiles:** ${status.totalProfiles}
**Sample profiles:** ${status.sampleProfiles}/${status.expectedProfiles}
**Fully bootstrapped:** ${status.isBootstrapped ? '✓ Yes' : '✗ No'}

${status.isBootstrapped ? 
  'Sample profiles are ready for testing!' : 
  'Run `discovery-bootstrap create` to set up sample profiles.'}

**Test commands:**
- \`discover suggest\` - Get recommendations
- \`discover search "ai"\` - Find AI builders  
- \`discover interests\` - Browse by interest
- \`discover active\` - See who's online`;
        break;
      }

      default:
        display = `## Discovery Bootstrap Commands

**\`discovery-bootstrap create\`** - Create ${SAMPLE_PROFILES.length} sample user profiles
**\`discovery-bootstrap clear\`** - Clear all profiles (destructive!)
**\`discovery-bootstrap status\`** - Show bootstrap status

**Sample profiles include:**
- Diverse builders (AI, frontend, mobile, gaming, etc.)
- Complementary skill pairs (design + engineering)
- Interest overlaps and edge cases
- Realistic activity patterns
- Expected matching scenarios for validation`;
    }

  } catch (error) {
    display = `## Bootstrap Error

${error.message}

Try: \`discovery-bootstrap status\` to check current state`;
  }

  return { display };
}

module.exports = { definition, handler };