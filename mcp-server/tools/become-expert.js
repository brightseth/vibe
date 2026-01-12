/**
 * vibe_become_expert - Register as an expert in ping.money
 *
 * List your skills, set your rates, start earning
 *
 * Examples:
 * - "become an expert in blockchain"
 * - "vibe become_expert skills: react, typescript, performance"
 * - "register as expert: smart contracts, $100/hr"
 */

const fetch = require('node-fetch');

module.exports = {
  name: 'vibe_become_expert',
  description: 'Register as an expert in the ping.money marketplace. Set skills, rates, availability. Start earning from answering questions.',

  inputSchema: {
    type: 'object',
    properties: {
      skills: {
        type: 'array',
        items: { type: 'string' },
        description: 'Your areas of expertise (e.g., ["blockchain", "smart contracts", "solidity"])'
      },
      bio: {
        type: 'string',
        description: 'Short bio describing your experience'
      },
      hourly_rate: {
        type: 'number',
        description: 'Optional hourly rate in USD (e.g., 100 for $100/hour)'
      },
      min_escrow: {
        type: 'number',
        description: 'Minimum escrow amount for sessions (default $5)',
        default: 5
      },
      availability: {
        type: 'string',
        enum: ['available', 'busy', 'offline'],
        description: 'Current availability status',
        default: 'available'
      }
    },
    required: ['skills']
  },

  async execute({ skills, bio, hourly_rate, min_escrow = 5, availability = 'available' }, context) {
    try {
      const handle = context.handle;

      if (!handle) {
        return {
          success: false,
          error: 'Not authenticated. Use vibe init first.'
        };
      }

      // Validate skills
      if (!skills || skills.length === 0) {
        return {
          success: false,
          error: 'Must provide at least one skill'
        };
      }

      const apiUrl = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

      const response = await fetch(`${apiUrl}/api/ping/expert/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.token}`
        },
        body: JSON.stringify({
          handle,
          skills,
          bio,
          hourly_rate,
          min_escrow,
          availability
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to register as expert',
          details: result.details
        };
      }

      const isUpdate = result.action === 'updated';

      return {
        success: true,
        message: isUpdate ? 'Expert profile updated' : 'Registered as expert',
        profile: {
          handle: result.expert_handle,
          skills: result.skills,
          bio: result.bio,
          hourly_rate: result.hourly_rate ? `$${result.hourly_rate}/hour` : 'Not set',
          min_escrow: `$${result.min_escrow}`,
          availability: result.availability,
          tier: result.tier,
          rating: result.rating || 0,
          total_sessions: result.total_sessions || 0
        },
        formatted: `
🎓 ${isUpdate ? 'Expert Profile Updated' : 'Welcome to ping.money!'}

Expert: ${result.expert_handle}
Tier: ${result.tier}

Skills: ${result.skills.join(', ')}
${result.bio ? `Bio: ${result.bio}` : ''}

Pricing:
  ${result.hourly_rate ? `Hourly Rate: $${result.hourly_rate}` : 'Hourly Rate: Not set'}
  Min Escrow: $${result.min_escrow}

Availability: ${result.availability}
${result.rating > 0 ? `Rating: ${result.rating}/5.0 (${result.total_sessions} sessions)` : ''}

You're now listed in the expert marketplace!

When users ask questions matching your skills:
  • You'll be auto-matched and notified
  • Escrow is created automatically
  • Answer via DM and get paid

Commands:
  • Check profile: vibe expert profile
  • View sessions: vibe expert sessions
  • Update status: vibe expert availability
        `.trim()
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to register as expert',
        details: error.message
      };
    }
  }
};
