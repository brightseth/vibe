/**
 * /vibe X/Twitter Bridge
 *
 * Connects your X account to /vibe for unified messaging.
 * - Read: Mentions, DMs
 * - Write: Tweets, DMs
 */

const crypto = require('crypto');
const config = require('./config');

/**
 * Get X credentials from config
 */
function getCredentials() {
  const cfg = config.load();
  return cfg.x_credentials || null;
}

/**
 * Generate OAuth 1.0a signature
 */
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(
      Object.keys(params)
        .sort()
        .map(k => `${k}=${encodeURIComponent(params[k])}`)
        .join('&')
    )
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || '')}`;

  return crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');
}

/**
 * Generate OAuth 1.0a header
 */
function generateOAuthHeader(method, url, params = {}) {
  const creds = getCredentials();
  if (!creds) throw new Error('X credentials not configured');

  const oauthParams = {
    oauth_consumer_key: creds.api_key,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.access_token,
    oauth_version: '1.0'
  };

  const allParams = { ...oauthParams, ...params };

  oauthParams.oauth_signature = generateOAuthSignature(
    method,
    url,
    allParams,
    creds.api_secret,
    creds.access_secret
  );

  const headerString = Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerString}`;
}

/**
 * Make authenticated request to X API
 */
async function xRequest(method, endpoint, params = {}, body = null) {
  const baseUrl = 'https://api.twitter.com';
  const url = `${baseUrl}${endpoint}`;

  const headers = {
    'Authorization': generateOAuthHeader(method, url, method === 'GET' ? params : {}),
    'Content-Type': 'application/json'
  };

  const fetchUrl = method === 'GET' && Object.keys(params).length > 0
    ? `${url}?${new URLSearchParams(params)}`
    : url;

  const response = await fetch(fetchUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`X API error ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Get authenticated user info
 */
async function getMe() {
  return xRequest('GET', '/2/users/me', {
    'user.fields': 'id,name,username,profile_image_url'
  });
}

/**
 * Get recent mentions
 */
async function getMentions(sinceId = null) {
  const creds = getCredentials();
  if (!creds) throw new Error('X credentials not configured');

  // First get our user ID
  const me = await getMe();
  const userId = me.data.id;

  const params = {
    'tweet.fields': 'created_at,author_id,text,conversation_id',
    'expansions': 'author_id',
    'user.fields': 'username,name,profile_image_url',
    max_results: '10'
  };

  if (sinceId) {
    params.since_id = sinceId;
  }

  return xRequest('GET', `/2/users/${userId}/mentions`, params);
}

/**
 * Get DM conversations
 */
async function getDMConversations() {
  return xRequest('GET', '/2/dm_conversations', {
    'dm_event.fields': 'created_at,sender_id,text',
    'expansions': 'sender_id',
    'user.fields': 'username,name'
  });
}

/**
 * Get DM events (messages) from a conversation
 */
async function getDMEvents(conversationId) {
  return xRequest('GET', `/2/dm_conversations/${conversationId}/dm_events`, {
    'dm_event.fields': 'created_at,sender_id,text'
  });
}

/**
 * Send a DM
 */
async function sendDM(recipientId, text) {
  return xRequest('POST', '/2/dm_conversations/with/' + recipientId + '/messages', {}, {
    text
  });
}

/**
 * Send a tweet
 */
async function sendTweet(text, replyToId = null) {
  const body = { text };
  if (replyToId) {
    body.reply = { in_reply_to_tweet_id: replyToId };
  }
  return xRequest('POST', '/2/tweets', {}, body);
}

/**
 * Lookup user by username
 */
async function getUserByUsername(username) {
  const cleanUsername = username.replace('@', '');
  return xRequest('GET', `/2/users/by/username/${cleanUsername}`, {
    'user.fields': 'id,name,username,profile_image_url,description'
  });
}

/**
 * Check if X credentials are configured
 */
function isConfigured() {
  const creds = getCredentials();
  return !!(creds && creds.api_key && creds.access_token);
}

module.exports = {
  isConfigured,
  getCredentials,
  getMe,
  getMentions,
  getDMConversations,
  getDMEvents,
  sendDM,
  sendTweet,
  getUserByUsername
};
