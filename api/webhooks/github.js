/**
 * /api/webhooks/github — GitHub Webhook Endpoint
 * 
 * Receives real-time events from GitHub repositories:
 * - Issues opened/closed/commented
 * - Pull requests opened/merged/reviewed
 * - Push events (commits)
 * - Repository stars/forks
 * - Release published
 * 
 * Verifies webhook signature and forwards events to /vibe core.
 */

import crypto from 'crypto';

// GitHub webhook config
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

// KV store for /vibe integration
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

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(body, signature, secret) {
  if (!secret) {
    console.warn('[GitHub Webhook] Secret not configured - skipping verification');
    return true; // Allow in development
  }
  
  if (!signature || !signature.startsWith('sha256=')) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
    
  const receivedSignature = signature.replace('sha256=', '');
    
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

/**
 * Forward GitHub event to /vibe inbox
 */
async function forwardToVibe(kv, event) {
  try {
    const inboxKey = 'vibe:social_inbox';
    const eventId = `github_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const inboxEvent = {
      id: eventId,
      platform: 'github',
      type: event.type,
      timestamp: new Date().toISOString(),
      from: event.from,
      content: event.content,
      metadata: event.metadata || {},
      signal_score: event.signal_score || 50,
      processed: false
    };
    
    // Add to social inbox
    await kv.lpush(inboxKey, JSON.stringify(inboxEvent));
    
    // Keep only last 100 events
    await kv.ltrim(inboxKey, 0, 99);
    
    console.log(`[GitHub Webhook] Forwarded ${event.type} to /vibe:`, eventId);
    return eventId;
    
  } catch (e) {
    console.error('[GitHub Webhook] Failed to forward to /vibe:', e);
    return null;
  }
}

/**
 * Process GitHub push events
 */
async function processPushEvent(payload, kv) {
  try {
    const { commits, pusher, repository, ref } = payload;
    
    if (!commits || commits.length === 0) return null;
    
    // Skip automated commits
    const meaningfulCommits = commits.filter(c => 
      !c.message.toLowerCase().includes('merge branch') &&
      !c.message.toLowerCase().includes('auto-generated')
    );
    
    if (meaningfulCommits.length === 0) return null;
    
    const branch = ref ? ref.replace('refs/heads/', '') : 'unknown';
    const isMainBranch = ['main', 'master', 'develop'].includes(branch);
    
    const event = {
      type: 'commit',
      from: {
        id: pusher.name,
        handle: pusher.name,
        name: pusher.name,
        avatar: null
      },
      content: meaningfulCommits.length === 1 
        ? `Pushed to ${repository.name}: ${meaningfulCommits[0].message}`
        : `Pushed ${meaningfulCommits.length} commits to ${repository.name}/${branch}`,
      metadata: {
        repository: repository.full_name,
        branch,
        commits: meaningfulCommits.map(c => ({
          id: c.id.slice(0, 7),
          message: c.message,
          author: c.author.name,
          url: c.url
        })),
        compareUrl: payload.compare
      },
      signal_score: isMainBranch ? 70 : 50
    };
    
    return await forwardToVibe(kv, event);
    
  } catch (e) {
    console.error('[GitHub Webhook] Error processing push event:', e);
    return null;
  }
}

/**
 * Process GitHub issue events
 */
async function processIssueEvent(payload, kv) {
  try {
    const { action, issue, sender, repository } = payload;
    
    // Only process significant issue events
    const significantActions = ['opened', 'closed', 'reopened'];
    if (!significantActions.includes(action)) return null;
    
    const event = {
      type: 'issue',
      from: {
        id: sender.login,
        handle: sender.login,
        name: sender.login,
        avatar: sender.avatar_url
      },
      content: `${action} issue in ${repository.name}: "${issue.title}"`,
      metadata: {
        repository: repository.full_name,
        action,
        issueNumber: issue.number,
        issueTitle: issue.title,
        issueUrl: issue.html_url,
        labels: issue.labels?.map(l => l.name) || []
      },
      signal_score: action === 'opened' ? 80 : 60
    };
    
    return await forwardToVibe(kv, event);
    
  } catch (e) {
    console.error('[GitHub Webhook] Error processing issue event:', e);
    return null;
  }
}

/**
 * Process GitHub pull request events
 */
async function processPullRequestEvent(payload, kv) {
  try {
    const { action, pull_request, sender, repository } = payload;
    
    // Only process significant PR events
    const significantActions = ['opened', 'closed', 'ready_for_review'];
    if (!significantActions.includes(action)) return null;
    
    const isMerged = action === 'closed' && pull_request.merged;
    const actionText = isMerged ? 'merged' : action.replace('_', ' ');
    
    const event = {
      type: 'pull_request',
      from: {
        id: sender.login,
        handle: sender.login,
        name: sender.login,
        avatar: sender.avatar_url
      },
      content: `${actionText} PR in ${repository.name}: "${pull_request.title}"`,
      metadata: {
        repository: repository.full_name,
        action: isMerged ? 'merged' : action,
        prNumber: pull_request.number,
        prTitle: pull_request.title,
        prUrl: pull_request.html_url,
        draft: pull_request.draft,
        baseBranch: pull_request.base.ref,
        headBranch: pull_request.head.ref
      },
      signal_score: isMerged ? 90 : action === 'opened' ? 75 : 60
    };
    
    return await forwardToVibe(kv, event);
    
  } catch (e) {
    console.error('[GitHub Webhook] Error processing PR event:', e);
    return null;
  }
}

/**
 * Process GitHub release events
 */
async function processReleaseEvent(payload, kv) {
  try {
    const { action, release, sender, repository } = payload;
    
    if (action !== 'published') return null;
    
    const event = {
      type: 'release',
      from: {
        id: sender.login,
        handle: sender.login,
        name: sender.login,
        avatar: sender.avatar_url
      },
      content: `🚀 Published release ${release.tag_name} for ${repository.name}`,
      metadata: {
        repository: repository.full_name,
        tagName: release.tag_name,
        releaseName: release.name,
        releaseUrl: release.html_url,
        prerelease: release.prerelease,
        draft: release.draft
      },
      signal_score: 95 // Releases are high signal
    };
    
    return await forwardToVibe(kv, event);
    
  } catch (e) {
    console.error('[GitHub Webhook] Error processing release event:', e);
    return null;
  }
}

/**
 * Process GitHub star events
 */
async function processStarEvent(payload, kv) {
  try {
    const { action, sender, repository } = payload;
    
    if (action !== 'created') return null; // Only care about new stars
    
    const event = {
      type: 'star',
      from: {
        id: sender.login,
        handle: sender.login,
        name: sender.login,
        avatar: sender.avatar_url
      },
      content: `⭐ ${sender.login} starred ${repository.name}`,
      metadata: {
        repository: repository.full_name,
        repositoryUrl: repository.html_url,
        starCount: repository.stargazers_count
      },
      signal_score: 60
    };
    
    return await forwardToVibe(kv, event);
    
  } catch (e) {
    console.error('[GitHub Webhook] Error processing star event:', e);
    return null;
  }
}

export default async function handler(req, res) {
  const { method, body, headers } = req;
  
  console.log(`[GitHub Webhook] ${method} request received`);
  
  try {
    // Handle health check
    if (method === 'GET') {
      const kv = await getKV();
      const stats = kv ? await kv.hgetall('vibe:github_webhook_stats') : null;
      
      return res.status(200).json({
        status: 'healthy',
        webhook_url: '/api/webhooks/github',
        configured: !!GITHUB_WEBHOOK_SECRET,
        kv_available: !!kv,
        stats: stats || { total_deliveries: 0, events_processed: 0 },
        supported_events: [
          'push', 'issues', 'pull_request', 'release', 'star', 'fork'
        ]
      });
    }
    
    // Handle webhook events (POST request from GitHub)
    if (method === 'POST') {
      const signature = headers['x-hub-signature-256'];
      const event = headers['x-github-event'];
      const bodyStr = JSON.stringify(body);
      
      // Verify signature
      if (!verifyGitHubSignature(bodyStr, signature, GITHUB_WEBHOOK_SECRET)) {
        console.warn('[GitHub Webhook] Invalid signature');
        return res.status(401).json({
          error: 'Invalid webhook signature'
        });
      }
      
      console.log(`[GitHub Webhook] Processing ${event} event...`);
      
      const kv = await getKV();
      if (!kv) {
        console.warn('[GitHub Webhook] KV not available');
        return res.status(503).json({
          error: 'Storage unavailable'
        });
      }
      
      let eventId = null;
      
      // Process different GitHub event types
      switch (event) {
        case 'push':
          eventId = await processPushEvent(body, kv);
          break;
          
        case 'issues':
          eventId = await processIssueEvent(body, kv);
          break;
          
        case 'pull_request':
          eventId = await processPullRequestEvent(body, kv);
          break;
          
        case 'release':
          eventId = await processReleaseEvent(body, kv);
          break;
          
        case 'star':
          eventId = await processStarEvent(body, kv);
          break;
          
        case 'ping':
          console.log('[GitHub Webhook] Ping received - webhook configured successfully');
          break;
          
        default:
          console.log(`[GitHub Webhook] Unhandled event type: ${event}`);
          break;
      }
      
      // Store webhook delivery stats
      const statsKey = 'vibe:github_webhook_stats';
      const stats = await kv.hgetall(statsKey) || {};
      const today = new Date().toISOString().split('T')[0];
      
      stats.total_deliveries = (parseInt(stats.total_deliveries) || 0) + 1;
      stats.last_delivery = new Date().toISOString();
      stats[`deliveries_${today}`] = (parseInt(stats[`deliveries_${today}`]) || 0) + 1;
      if (eventId) {
        stats.events_processed = (parseInt(stats.events_processed) || 0) + 1;
      }
      
      await kv.hmset(statsKey, stats);
      
      const processed = eventId ? 1 : 0;
      console.log(`[GitHub Webhook] Processed ${processed} events from ${event} event`);
      
      return res.status(200).json({
        status: 'success',
        event_type: event,
        processed: !!eventId,
        event_id: eventId
      });
    }
    
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'POST']
    });
    
  } catch (error) {
    console.error('[GitHub Webhook] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}