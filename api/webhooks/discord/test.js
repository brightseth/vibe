/**
 * /api/webhooks/discord/test — Discord Webhook Test Endpoint
 * 
 * Test the Discord webhook receiver with mock payloads.
 * Useful for development and debugging.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  // Mock Discord webhook payloads for testing
  const mockPayloads = {
    mention: {
      t: 'MESSAGE_CREATE',
      d: {
        id: '1234567890123456789',
        channel_id: '9876543210987654321',
        guild_id: '1111222233334444555',
        author: {
          id: '5555666677778888999',
          username: 'testuser',
          discriminator: '1234',
          global_name: 'Test User',
          avatar: 'a1b2c3d4e5f6g7h8i9j0',
          bot: false
        },
        content: 'Hey /vibe team, loving what you\'re building! 🚀',
        timestamp: new Date().toISOString(),
        mentions: [{
          id: 'your_bot_id',
          username: 'vibebot',
          discriminator: '0000'
        }],
        message_reference: null,
        edited_timestamp: null
      }
    },
    
    dm: {
      t: 'MESSAGE_CREATE',
      d: {
        id: '1234567890123456790',
        channel_id: '9876543210987654322', // DM channel
        guild_id: null, // No guild = DM
        author: {
          id: '5555666677778888999',
          username: 'newbuilder',
          discriminator: '5678',
          global_name: 'New Builder',
          avatar: 'b2c3d4e5f6g7h8i9j0k1',
          bot: false
        },
        content: 'Hi! I\'d like to join the /vibe workshop. How do I get started?',
        timestamp: new Date().toISOString(),
        mentions: [],
        message_reference: null,
        edited_timestamp: null
      }
    },
    
    member_join: {
      t: 'GUILD_MEMBER_ADD',
      d: {
        user: {
          id: '5555666677778888999',
          username: 'newbuilder',
          discriminator: '5678',
          global_name: 'New Builder',
          avatar: 'b2c3d4e5f6g7h8i9j0k1',
          bot: false
        },
        guild_id: '1111222233334444555',
        joined_at: new Date().toISOString(),
        roles: ['@everyone']
      }
    },
    
    interaction: {
      t: 'INTERACTION_CREATE',
      d: {
        id: '1234567890123456791',
        type: 2, // Application Command
        guild_id: '1111222233334444555',
        channel_id: '9876543210987654321',
        user: {
          id: '5555666677778888999',
          username: 'testuser',
          discriminator: '1234',
          global_name: 'Test User',
          avatar: 'a1b2c3d4e5f6g7h8i9j0',
          bot: false
        },
        data: {
          name: 'vibe',
          options: [{
            name: 'command',
            value: 'status'
          }]
        }
      }
    },
    
    ready: {
      t: 'READY',
      d: {
        v: 10,
        user: {
          id: 'your_bot_id',
          username: 'vibebot',
          discriminator: '0000',
          bot: true
        },
        guilds: [{
          id: '1111222233334444555',
          unavailable: false
        }]
      }
    }
  };

  const { type = 'mention' } = req.body;
  
  if (!mockPayloads[type]) {
    return res.status(400).json({
      error: 'Invalid test type',
      available: Object.keys(mockPayloads)
    });
  }

  try {
    // Forward to the actual webhook handler
    const webhookUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/webhooks/discord`;
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Skip signature verification in test mode
        'x-signature-timestamp': Date.now().toString(),
        'x-signature-ed25519': 'test_signature'
      },
      body: JSON.stringify(mockPayloads[type])
    });

    const result = await webhookResponse.json();

    return res.status(200).json({
      test_type: type,
      webhook_status: webhookResponse.status,
      webhook_response: result,
      mock_payload: mockPayloads[type],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
}