/**
 * /api/webhooks/farcaster/test — Farcaster Webhook Test Endpoint
 * 
 * Test the Farcaster webhook receiver with mock Farcaster protocol payloads.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  // Mock Farcaster webhook payloads for testing
  const mockPayloads = {
    mention: {
      casts: [{
        hash: '0x1234567890abcdef',
        fid: 12345,
        timestamp: Math.floor(Date.now() / 1000),
        text: 'Hey @yourusername, really impressed by what you're building with /vibe! 🚀',
        mentions: [parseInt(process.env.FARCASTER_FID) || 1234],
        author: {
          fid: 12345,
          username: 'testbuilder',
          displayName: 'Test Builder',
          pfp: {
            url: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/example/original'
          },
          profile: {
            bio: {
              text: 'Building the future of social protocols'
            }
          },
          followerCount: 1500
        },
        embeds: [],
        reactions: {
          likes: 5,
          recasts: 2
        }
      }]
    },
    
    reply: {
      casts: [{
        hash: '0xabcdef1234567890',
        fid: 67890,
        timestamp: Math.floor(Date.now() / 1000),
        text: 'This is such a game changer! Can\'t wait to try it out.',
        parentHash: '0xparent123456789',
        author: {
          fid: 67890,
          username: 'earlyuser',
          displayName: 'Early Adopter',
          pfp: {
            url: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/example2/original'
          }
        }
      }]
    },
    
    reaction: {
      reactions: [{
        fid: 54321,
        reactionType: 1, // 1 = like, 2 = recast
        timestamp: Math.floor(Date.now() / 1000),
        targetCast: {
          hash: '0xyourcast123',
          fid: parseInt(process.env.FARCASTER_FID) || 1234,
          text: 'Just shipped another feature for /vibe! The velocity in this workshop is incredible 🎯'
        },
        author: {
          fid: 54321,
          username: 'validator',
          displayName: 'Protocol Validator',
          pfp: {
            url: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/example3/original'
          }
        }
      }]
    },
    
    recast: {
      reactions: [{
        fid: 98765,
        reactionType: 2, // recast
        timestamp: Math.floor(Date.now() / 1000),
        targetCast: {
          hash: '0xyourcast456',
          fid: parseInt(process.env.FARCASTER_FID) || 1234,
          text: '/vibe is changing how we think about developer workflows. This is the future.'
        },
        author: {
          fid: 98765,
          username: 'amplifier',
          displayName: 'Network Amplifier',
          pfp: {
            url: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/example4/original'
          }
        }
      }]
    },
    
    follow: {
      follows: [{
        fid: 11111,
        targetFid: parseInt(process.env.FARCASTER_FID) || 1234,
        timestamp: Math.floor(Date.now() / 1000),
        author: {
          fid: 11111,
          username: 'newdev',
          displayName: 'New Developer',
          pfp: {
            url: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/example5/original'
          },
          profile: {
            bio: {
              text: 'Frontend developer exploring Web3 social protocols'
            }
          },
          followerCount: 250
        }
      }]
    },
    
    vibe_reference: {
      casts: [{
        hash: '0xvibe1234567890',
        fid: 33333,
        timestamp: Math.floor(Date.now() / 1000),
        text: 'Anyone tried /vibe yet? Heard it\'s revolutionary for developer collaboration',
        mentions: [],
        author: {
          fid: 33333,
          username: 'curious_dev',
          displayName: 'Curious Developer',
          pfp: {
            url: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/example6/original'
          }
        }
      }]
    }
  };

  const { type = 'mention' } = req.body;
  
  if (!mockPayloads[type]) {
    return res.status(400).json({
      error: 'Invalid test type',
      available: Object.keys(mockPayloads),
      examples: {
        mention: 'Cast that mentions your FID',
        reply: 'Reply to one of your casts',
        reaction: 'Like on your cast',
        recast: 'Recast of your content',
        follow: 'New follower',
        vibe_reference: 'Cast mentioning /vibe (not you directly)'
      }
    });
  }

  try {
    // Call the main webhook handler
    const webhookModule = await import('../farcaster.js');
    const webhookHandler = webhookModule.default;

    // Create a mock request object
    const mockReq = {
      method: 'POST',
      body: mockPayloads[type],
      headers: {
        'content-type': 'application/json',
        'host': req.headers.host
        // Skip x-farcaster-signature for test
      }
    };

    // Create a mock response object to capture the result
    let responseData = null;
    let responseStatus = null;
    const mockRes = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      }
    };

    await webhookHandler(mockReq, mockRes);

    return res.status(200).json({
      test_type: type,
      webhook_status: responseStatus,
      webhook_response: responseData,
      mock_payload: mockPayloads[type],
      timestamp: new Date().toISOString(),
      farcaster_config: {
        your_fid: process.env.FARCASTER_FID || 'Not configured',
        private_key_set: !!process.env.FARCASTER_PRIVATE_KEY,
        webhook_secret_set: !!process.env.FARCASTER_WEBHOOK_SECRET
      }
    });

  } catch (error) {
    return res.status(500).json({
      test_type: type,
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
}