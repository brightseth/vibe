/**
 * /api/webhooks/x/test — X Webhook Test Endpoint
 * 
 * Test the X webhook receiver with mock payloads.
 * Useful for development and debugging.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  // Mock X webhook payloads for testing
  const mockPayloads = {
    mention: {
      tweet_create_events: [{
        id_str: "1234567890",
        text: "@yourusername Hey, love what you're building with /vibe!",
        user: {
          id_str: "987654321",
          screen_name: "testuser",
          name: "Test User",
          profile_image_url_https: "https://pbs.twimg.com/profile_images/default.jpg"
        },
        created_at: new Date().toUTCString(),
        entities: {
          user_mentions: [{
            id_str: "your_user_id",
            screen_name: "yourusername"
          }]
        }
      }]
    },
    
    dm: {
      direct_message_events: [{
        id: "dm_12345",
        created_timestamp: Date.now().toString(),
        message_create: {
          sender_id: "987654321",
          message_data: {
            text: "Hello! I'd like to join /vibe workshop. How do I get started?"
          },
          target: {
            recipient_id: "your_user_id"
          }
        }
      }]
    },
    
    like: {
      favorite_events: [{
        id_str: "like_12345",
        user: {
          id_str: "987654321",
          screen_name: "testuser",
          name: "Test User",
          profile_image_url_https: "https://pbs.twimg.com/profile_images/default.jpg"
        },
        favorited_status: {
          id_str: "your_tweet_id",
          text: "Just shipped another feature in /vibe! The velocity is incredible 🚀",
          user: {
            id_str: "your_user_id"
          }
        },
        created_at: new Date().toUTCString()
      }]
    },
    
    follow: {
      follow_events: [{
        source: {
          id_str: "987654321",
          screen_name: "newbuilder",
          name: "New Builder",
          profile_image_url_https: "https://pbs.twimg.com/profile_images/default.jpg",
          description: "Full-stack developer interested in AI and developer tools"
        },
        target: {
          id_str: "your_user_id"
        },
        created_at: new Date().toUTCString()
      }]
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
    const webhookResponse = await fetch(`${req.headers.host || 'localhost:3000'}/api/webhooks/x`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Skip signature in test mode
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