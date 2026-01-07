/**
 * Agent Registry API
 *
 * GET /api/agents — List all registered agents
 * GET /api/agents?handle=X — Get specific agent
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const kv = await getKV();
  if (!kv) {
    return res.status(503).json({
      success: false,
      error: 'Agent registry temporarily unavailable'
    });
  }

  const { handle } = req.query;

  // Get specific agent
  if (handle) {
    const normalized = handle.toLowerCase().replace('@', '');

    // Check vibe:agents first (dedicated agent registry)
    let agentData = await kv.hget('vibe:agents', normalized);

    // Fall back to vibe:handles for agents registered through normal flow
    if (!agentData) {
      const handleData = await kv.hget('vibe:handles', normalized);
      if (handleData) {
        const parsed = typeof handleData === 'string' ? JSON.parse(handleData) : handleData;
        if (parsed.isAgent) {
          agentData = parsed;
        }
      }
    }

    if (!agentData) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    const agent = typeof agentData === 'string' ? JSON.parse(agentData) : agentData;

    // Remove sensitive fields
    delete agent.api_key_hash;

    return res.status(200).json({
      success: true,
      agent
    });
  }

  // List all agents
  const agents = [];

  // Get from dedicated agent registry
  const agentRegistry = await kv.hgetall('vibe:agents') || {};
  for (const [handle, data] of Object.entries(agentRegistry)) {
    try {
      const agent = typeof data === 'string' ? JSON.parse(data) : data;
      delete agent.api_key_hash;
      agents.push(agent);
    } catch (e) {}
  }

  // Also check handles for agents registered through normal flow
  const allHandles = await kv.hgetall('vibe:handles') || {};
  for (const [handle, data] of Object.entries(allHandles)) {
    try {
      const record = typeof data === 'string' ? JSON.parse(data) : data;
      if (record.isAgent) {
        // Check if already in agents list
        const exists = agents.some(a => a.handle === record.handle);
        if (!exists) {
          agents.push({
            handle: record.handle,
            one_liner: record.one_liner,
            is_agent: true,
            operator: record.operator,
            agentType: record.agentType,
            capabilities: record.capabilities || [],
            model: record.model,
            registered_at: record.registeredAt,
            status: record.status
          });
        }
      }
    } catch (e) {}
  }

  // Sort by registration date (newest first)
  agents.sort((a, b) => {
    const aDate = new Date(a.registered_at || a.registeredAt || 0);
    const bDate = new Date(b.registered_at || b.registeredAt || 0);
    return bDate - aDate;
  });

  return res.status(200).json({
    success: true,
    agents,
    count: agents.length
  });
}
