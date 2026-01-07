/**
 * Waitlist API — Email capture when genesis fills
 *
 * POST /api/waitlist - Join the waitlist
 *   Body: { email, source?, referrer? }
 *   Returns: { success, position, message }
 *
 * GET /api/waitlist?email=x - Check position
 *   Returns: { position, total, message }
 *
 * GET /api/waitlist?admin=true - Get waitlist stats (no emails)
 *   Returns: { total, sources }
 */

const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

// Simple email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kv = await getKV();
  if (!kv) {
    return res.status(503).json({
      success: false,
      error: 'Waitlist temporarily unavailable'
    });
  }

  // POST — Join waitlist
  if (req.method === 'POST') {
    const { email, source, referrer } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Check if already on waitlist
    const existing = await kv.hget('vibe:waitlist', normalizedEmail);
    if (existing) {
      const data = typeof existing === 'string' ? JSON.parse(existing) : existing;
      return res.status(200).json({
        success: true,
        already_registered: true,
        position: data.position,
        message: "You're already on the waitlist!"
      });
    }

    // Get current waitlist size for position
    const currentSize = await kv.hlen('vibe:waitlist');
    const position = currentSize + 1;

    // Create waitlist entry
    const entry = {
      email: normalizedEmail,
      position,
      source: source || 'direct',
      referrer: referrer || null,
      joinedAt: new Date().toISOString(),
      joinedAtTs: Date.now(),
      invited: false,
      invitedAt: null
    };

    // Store in hash (email -> entry)
    await kv.hset('vibe:waitlist', normalizedEmail, JSON.stringify(entry));

    // Track source stats
    const sourceKey = 'vibe:waitlist:source:' + (source || 'direct');
    await kv.incr(sourceKey);

    return res.status(200).json({
      success: true,
      position,
      message: position <= 50
        ? "You're #" + position + " on the waitlist! You'll be in the next wave."
        : "You're #" + position + " on the waitlist. We'll email you when it's your turn."
    });
  }

  // GET — Check position or stats
  if (req.method === 'GET') {
    const { email, admin } = req.query;

    // Admin stats (no emails exposed)
    if (admin === 'true') {
      const total = await kv.hlen('vibe:waitlist');

      // Get source breakdown
      const sources = {};
      const sourceKeys = ['twitter', 'discord', 'direct', 'referral', 'friend'];
      for (const src of sourceKeys) {
        const count = await kv.get('vibe:waitlist:source:' + src);
        if (count) sources[src] = parseInt(count);
      }

      return res.status(200).json({
        success: true,
        total,
        sources
      });
    }

    // Check specific email position
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await kv.hget('vibe:waitlist', normalizedEmail);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Email not found on waitlist'
        });
      }

      const data = typeof existing === 'string' ? JSON.parse(existing) : existing;
      const total = await kv.hlen('vibe:waitlist');

      return res.status(200).json({
        success: true,
        position: data.position,
        total,
        message: "You're #" + data.position + " of " + total + " on the waitlist."
      });
    }

    // Default: return waitlist stats
    const total = await kv.hlen('vibe:waitlist');
    return res.status(200).json({
      success: true,
      total,
      message: total + " people on the waitlist"
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
