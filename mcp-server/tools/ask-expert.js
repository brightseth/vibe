/**
 * vibe_ask_expert - Ask a question to a human expert via ping.money
 *
 * Creates escrow, matches you with best expert, notifies them
 *
 * Examples:
 * - "ask an expert: how do I implement WebSocket authentication with JWT?"
 * - "vibe ask_expert about smart contract security"
 * - "ping @alice about react performance"
 */

const fetch = require('node-fetch');

module.exports = {
  name: 'vibe_ask_expert',
  description: 'Ask a question to a human expert. Creates escrow, matches you with best expert based on skills/rating/availability. Min budget: $5',

  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'Your question for the expert (be specific)'
      },
      budget: {
        type: 'number',
        description: 'Budget in USD (min $5, typical $10-$50)'
      },
      preferred_expert: {
        type: 'string',
        description: 'Optional: Specific expert handle (e.g., @alice). If not provided, best match will be found.'
      }
    },
    required: ['question', 'budget']
  },

  async execute({ question, budget, preferred_expert }, context) {
    try {
      const from = context.handle;

      if (!from) {
        return {
          success: false,
          error: 'Not authenticated. Use vibe init first.'
        };
      }

      // Validate budget
      if (budget < 5) {
        return {
          success: false,
          error: 'Minimum budget is $5'
        };
      }

      const apiUrl = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

      // If no preferred expert, first show matches
      if (!preferred_expert) {
        // Get expert matches
        const matchResponse = await fetch(`${apiUrl}/api/ping/match`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${context.token}`
          },
          body: JSON.stringify({
            question,
            budget,
            asker_handle: from
          })
        });

        const matchResult = await matchResponse.json();

        if (!matchResponse.ok || !matchResult.success) {
          return {
            success: false,
            error: 'No experts available',
            details: matchResult.error
          };
        }

        const topMatch = matchResult.matches?.[0];

        if (!topMatch) {
          return {
            success: false,
            error: 'No suitable experts found for this question'
          };
        }

        // Use top match
        preferred_expert = topMatch.expert_handle;
      }

      // Create escrow and ask question
      const askResponse = await fetch(`${apiUrl}/api/ping/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.token}`
        },
        body: JSON.stringify({
          from,
          question,
          budget,
          preferred_expert
        })
      });

      const askResult = await askResponse.json();

      if (!askResponse.ok) {
        return {
          success: false,
          error: askResult.error || 'Failed to ask expert',
          details: askResult.details
        };
      }

      return {
        success: true,
        message: `Question sent to ${askResult.expert_handle}`,
        session: {
          session_id: askResult.session_id,
          expert: askResult.expert_handle,
          expert_skills: askResult.expert_skills,
          escrow_amount: `$${askResult.escrow_amount}`,
          escrow_id: askResult.escrow_id,
          tx_hash: askResult.tx_hash,
          status: askResult.status,
          timeout: '48 hours'
        },
        formatted: `
🎓 Question sent to ${askResult.expert_handle}!

Session: ${askResult.session_id}
Expert: ${askResult.expert_handle}
Skills: ${askResult.expert_skills?.join(', ') || 'N/A'}

Escrow: $${askResult.escrow_amount} (locked for 48 hours)
Status: ${askResult.status}

The expert has been notified and will respond soon.
You'll be notified when they answer.

To complete session: vibe ping complete ${askResult.session_id}
        `.trim()
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to ask expert',
        details: error.message
      };
    }
  }
};
