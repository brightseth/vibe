/**
 * Create sample profiles for discovery testing
 */

const userProfiles = require('./mcp-server/store/profiles');

const sampleProfiles = [
  {
    handle: 'alex_ai',
    building: 'AI-powered code review tool',
    interests: ['ai', 'developer tools', 'startups'],
    tags: ['python', 'machine learning', 'backend'],
    lastSeen: Date.now() - (1000 * 60 * 15) // 15 min ago
  },
  {
    handle: 'sarah_frontend',
    building: 'React component library',
    interests: ['frontend', 'design systems', 'open source'],
    tags: ['react', 'typescript', 'frontend', 'ui/ux'],
    lastSeen: Date.now() - (1000 * 60 * 30) // 30 min ago
  },
  {
    handle: 'mike_mobile',
    building: 'Food discovery mobile app',
    interests: ['mobile', 'food tech', 'local business'],
    tags: ['react native', 'mobile', 'ios', 'android'],
    lastSeen: Date.now() - (1000 * 60 * 45) // 45 min ago
  }
];

async function createProfiles() {
  for (const profile of sampleProfiles) {
    try {
      await userProfiles.updateProfile(profile.handle, {
        ...profile,
        firstSeen: Date.now() - (1000 * 60 * 60 * 24) // 1 day ago
      });
      console.log(`✓ Created @${profile.handle}`);
    } catch (error) {
      console.log(`✗ Failed @${profile.handle}: ${error.message}`);
    }
  }
}

createProfiles();