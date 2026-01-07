/**
 * /vibe Farcaster Bridge
 *
 * Connects /vibe to Farcaster via Neynar API for web3 social integration.
 * - Read: Casts, mentions, replies
 * - Write: Casts, replies
 * - Channel integration: Post to specific channels
 */

const config = require('../config');

/**
 * Get Farcaster credentials from config
 */
function getCredentials() {
  const cfg = config.load();
  return {
    apiKey: cfg.neynar_api_key || process.env.NEYNAR_API_KEY || null,
    signerUuid: cfg.farcaster_signer_uuid || process.env.FARCASTER_SIGNER_UUID || null,
    fid: cfg.farcaster_fid || process.env.FARCASTER_FID || null
  };
}

/**
 * Check if Farcaster bridge is configured
 */
function isConfigured() {
  const creds = getCredentials();
  return !!(creds.apiKey && creds.signerUuid && creds.fid);
}

/**
 * Make authenticated request to Neynar API
 */
async function neynarRequest(method, endpoint, params = {}, body = null) {
  const { apiKey } = getCredentials();
  if (!apiKey) throw new Error('Neynar API key not configured');

  const baseUrl = 'https://api.neynar.com/v2';
  let url = `${baseUrl}${endpoint}`;

  const headers = {
    'accept': 'application/json',
    'api_key': apiKey
  };

  // GET requests: params in URL
  if (method === 'GET' && Object.keys(params).length > 0) {
    url += '?' + new URLSearchParams(params);
  }

  // POST/PUT requests: body as JSON
  if (body && (method === 'POST' || method === 'PUT')) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Neynar API error ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Get user info by FID
 */
async function getUser(fid = null) {
  const { fid: defaultFid } = getCredentials();
  const targetFid = fid || defaultFid;
  
  if (!targetFid) throw new Error('No FID specified');

  return neynarRequest('GET', '/farcaster/user/bulk', {
    fids: targetFid.toString()
  });
}

/**
 * Get casts from user's feed
 */
async function getFeed(fid = null, limit = 25) {
  const { fid: defaultFid } = getCredentials();
  const targetFid = fid || defaultFid;
  
  if (!targetFid) throw new Error('No FID specified');

  return neynarRequest('GET', '/farcaster/feed/user', {
    fid: targetFid.toString(),
    limit: limit.toString()
  });
}

/**
 * Get mentions for user
 */
async function getMentions(fid = null, limit = 25) {
  const { fid: defaultFid } = getCredentials();
  const targetFid = fid || defaultFid;
  
  if (!targetFid) throw new Error('No FID specified');

  return neynarRequest('GET', '/farcaster/notifications', {
    fid: targetFid.toString(),
    type: 'mentions',
    limit: limit.toString()
  });
}

/**
 * Get cast by hash
 */
async function getCast(castHash) {
  return neynarRequest('GET', '/farcaster/cast', {
    identifier: castHash,
    type: 'hash'
  });
}

/**
 * Publish a cast
 */
async function publishCast(text, options = {}) {
  const { signerUuid } = getCredentials();
  if (!signerUuid) throw new Error('Signer UUID not configured');

  const body = {
    signer_uuid: signerUuid,
    text
  };

  // Reply to another cast
  if (options.replyTo) {
    body.parent = options.replyTo;
  }

  // Post to specific channel
  if (options.channel) {
    body.channel_id = options.channel;
  }

  // Add embeds (links, images)
  if (options.embeds && options.embeds.length > 0) {
    body.embeds = options.embeds;
  }

  return neynarRequest('POST', '/farcaster/cast', {}, body);
}

/**
 * React to a cast (like/recast)
 */
async function reactToCast(castHash, reaction = 'like') {
  const { signerUuid } = getCredentials();
  if (!signerUuid) throw new Error('Signer UUID not configured');

  const body = {
    signer_uuid: signerUuid,
    target: castHash,
    reaction_type: reaction // 'like' or 'recast'
  };

  return neynarRequest('POST', '/farcaster/reaction', {}, body);
}

/**
 * Follow a user
 */
async function followUser(targetFid) {
  const { signerUuid } = getCredentials();
  if (!signerUuid) throw new Error('Signer UUID not configured');

  const body = {
    signer_uuid: signerUuid,
    target_fids: [parseInt(targetFid)]
  };

  return neynarRequest('POST', '/farcaster/follows', {}, body);
}

/**
 * Get trending casts in a channel
 */
async function getChannelFeed(channelId, limit = 25) {
  return neynarRequest('GET', '/farcaster/feed/channels', {
    channel_ids: channelId,
    limit: limit.toString()
  });
}

/**
 * Search for casts
 */
async function searchCasts(query, limit = 25) {
  return neynarRequest('GET', '/farcaster/cast/search', {
    q: query,
    limit: limit.toString()
  });
}

/**
 * Get user's followers
 */
async function getFollowers(fid = null, limit = 100) {
  const { fid: defaultFid } = getCredentials();
  const targetFid = fid || defaultFid;
  
  if (!targetFid) throw new Error('No FID specified');

  return neynarRequest('GET', '/farcaster/followers', {
    fid: targetFid.toString(),
    limit: limit.toString()
  });
}

/**
 * Get user's following
 */
async function getFollowing(fid = null, limit = 100) {
  const { fid: defaultFid } = getCredentials();
  const targetFid = fid || defaultFid;
  
  if (!targetFid) throw new Error('No FID specified');

  return neynarRequest('GET', '/farcaster/following', {
    fid: targetFid.toString(),
    limit: limit.toString()
  });
}

/**
 * Process cast data into standardized format for /vibe
 */
function processCast(cast) {
  const author = cast.author;
  
  return {
    id: `farcaster:${cast.hash}`,
    channel: 'farcaster',
    type: 'cast',
    from: {
      id: author.fid.toString(),
      handle: author.username,
      name: author.display_name || author.username
    },
    content: cast.text || '[media]',
    timestamp: cast.timestamp,
    hash: cast.hash,
    replies: cast.replies?.count || 0,
    reactions: cast.reactions?.likes_count || 0,
    recasts: cast.reactions?.recasts_count || 0,
    channel_id: cast.channel?.id || null,
    parent_hash: cast.parent_hash || null,
    embeds: cast.embeds || [],
    raw: cast
  };
}

/**
 * Get relevant channels for /vibe users
 */
function getRecommendedChannels() {
  return [
    { id: 'dev', name: 'Development' },
    { id: 'builders', name: 'Builders' },
    { id: 'startups', name: 'Startups' },
    { id: 'crypto-dev', name: 'Crypto Development' },
    { id: 'base', name: 'Base' },
    { id: 'ethereum', name: 'Ethereum' },
    { id: 'farcaster', name: 'Farcaster' },
    { id: 'design', name: 'Design' },
    { id: 'product', name: 'Product' },
    { id: 'ai', name: 'AI' }
  ];
}

module.exports = {
  isConfigured,
  getCredentials,
  getUser,
  getFeed,
  getMentions,
  getCast,
  publishCast,
  reactToCast,
  followUser,
  getChannelFeed,
  searchCasts,
  getFollowers,
  getFollowing,
  processCast,
  getRecommendedChannels
};