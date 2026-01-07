/**
 * Report API — Trust & Safety
 *
 * POST /api/report — Submit a report
 * GET /api/report — List reports (admin only)
 * PATCH /api/report — Take action on report (admin only)
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

const VALID_REASONS = ['spam', 'harassment', 'impersonation', 'inappropriate', 'other'];
const VALID_ACTIONS = ['dismiss', 'warn', 'mute_24h', 'mute_7d', 'suspend', 'ban'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kv = await getKV();
  if (!kv) {
    return res.status(503).json({
      success: false,
      error: 'Reporting temporarily unavailable'
    });
  }

  // POST — Submit a report
  if (req.method === 'POST') {
    const { reporter, reported, reason, message_id, details } = req.body || {};

    if (!reporter || !reported) {
      return res.status(400).json({
        success: false,
        error: 'Reporter and reported handles required'
      });
    }

    if (reporter === reported) {
      return res.status(400).json({
        success: false,
        error: 'Cannot report yourself'
      });
    }

    const normalizedReason = (reason || 'other').toLowerCase();
    if (!VALID_REASONS.includes(normalizedReason)) {
      return res.status(400).json({
        success: false,
        error: `Invalid reason. Valid: ${VALID_REASONS.join(', ')}`
      });
    }

    // Check reported handle exists
    const reportedData = await kv.hget('vibe:handles', reported.toLowerCase());
    if (!reportedData) {
      return res.status(404).json({
        success: false,
        error: 'Reported user not found'
      });
    }

    // Generate report ID
    const reportId = `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const report = {
      id: reportId,
      reporter: reporter.toLowerCase(),
      reported: reported.toLowerCase(),
      reason: normalizedReason,
      message_id: message_id || null,
      details: details || null,
      created_at: new Date().toISOString(),
      created_at_ts: Date.now(),
      status: 'pending',
      reviewed_at: null,
      reviewed_by: null,
      action_taken: null,
      notes: null
    };

    // Store report
    await kv.hset('vibe:reports', { [reportId]: JSON.stringify(report) });

    // Track reports per user (for pattern detection)
    await kv.hincrby('vibe:report_counts', reported.toLowerCase(), 1);

    // Check if user has multiple reports (alert threshold)
    const reportCount = await kv.hget('vibe:report_counts', reported.toLowerCase());
    const needsUrgentReview = reportCount >= 3;

    return res.status(200).json({
      success: true,
      report_id: reportId,
      message: 'Report submitted. Our team will review it.',
      urgent: needsUrgentReview
    });
  }

  // GET — List reports (admin only)
  if (req.method === 'GET') {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      return res.status(503).json({ error: 'Admin not configured' });
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${adminSecret}`) {
      return res.status(401).json({
        error: 'Unauthorized',
        hint: 'Use Authorization: Bearer <ADMIN_SECRET>'
      });
    }

    const { status, reported, limit } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 50, 100);

    const allReports = await kv.hgetall('vibe:reports') || {};
    let reports = Object.values(allReports).map(r => {
      try {
        return typeof r === 'string' ? JSON.parse(r) : r;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // Filter by status
    if (status) {
      reports = reports.filter(r => r.status === status);
    }

    // Filter by reported user
    if (reported) {
      reports = reports.filter(r => r.reported === reported.toLowerCase());
    }

    // Sort by date (newest first)
    reports.sort((a, b) => b.created_at_ts - a.created_at_ts);

    // Limit
    reports = reports.slice(0, maxLimit);

    // Get report counts for context
    const reportCounts = await kv.hgetall('vibe:report_counts') || {};

    return res.status(200).json({
      success: true,
      reports,
      total: reports.length,
      report_counts: reportCounts
    });
  }

  // PATCH — Take action on report (admin only)
  if (req.method === 'PATCH') {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      return res.status(503).json({ error: 'Admin not configured' });
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${adminSecret}`) {
      return res.status(401).json({
        error: 'Unauthorized',
        hint: 'Use Authorization: Bearer <ADMIN_SECRET>'
      });
    }

    const { report_id, action, notes, reviewed_by } = req.body || {};

    if (!report_id || !action) {
      return res.status(400).json({
        success: false,
        error: 'report_id and action required'
      });
    }

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action. Valid: ${VALID_ACTIONS.join(', ')}`
      });
    }

    // Get report
    const reportData = await kv.hget('vibe:reports', report_id);
    if (!reportData) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const report = typeof reportData === 'string' ? JSON.parse(reportData) : reportData;

    // Update report
    report.status = 'reviewed';
    report.reviewed_at = new Date().toISOString();
    report.reviewed_by = reviewed_by || 'admin';
    report.action_taken = action;
    report.notes = notes || null;

    await kv.hset('vibe:reports', { [report_id]: JSON.stringify(report) });

    // Apply action to user if not dismissed
    if (action !== 'dismiss') {
      const userData = await kv.hget('vibe:handles', report.reported);
      if (userData) {
        const user = typeof userData === 'string' ? JSON.parse(userData) : userData;

        switch (action) {
          case 'warn':
            user.warnings = (user.warnings || 0) + 1;
            user.last_warning_at = new Date().toISOString();
            break;
          case 'mute_24h':
            user.muted_until = Date.now() + (24 * 60 * 60 * 1000);
            break;
          case 'mute_7d':
            user.muted_until = Date.now() + (7 * 24 * 60 * 60 * 1000);
            break;
          case 'suspend':
            user.suspended = true;
            user.suspended_at = new Date().toISOString();
            break;
          case 'ban':
            user.banned = true;
            user.banned_at = new Date().toISOString();
            break;
        }

        await kv.hset('vibe:handles', { [report.reported]: JSON.stringify(user) });
      }
    }

    return res.status(200).json({
      success: true,
      report_id,
      action_taken: action,
      message: action === 'dismiss' ? 'Report dismissed' : `Action '${action}' applied to @${report.reported}`
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
