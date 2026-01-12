/**
 * Report API - Content/user reporting
 *
 * Allows users to report problematic content or behavior.
 * Reports are stored for review.
 *
 * POST /api/report - Submit a report
 * GET /api/report?reporter=handle - Get reports by a user (admin only future)
 */

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      return handlePost(req, res);
    } else if (req.method === 'GET') {
      return handleGet(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Report] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePost(req, res) {
  const { reporter, reported, reason, message_id, details } = req.body;

  if (!reporter || !reported) {
    return res.status(400).json({
      error: 'Missing required fields: reporter, reported'
    });
  }

  const reporterClean = reporter.replace('@', '').toLowerCase();
  const reportedClean = reported.replace('@', '').toLowerCase();

  // Generate report ID
  const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const report = {
    id: reportId,
    reporter: reporterClean,
    reported: reportedClean,
    reason: reason || 'unspecified',
    message_id: message_id || null,
    details: details || null,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  // Store report
  await kv.set(`report:${reportId}`, report);

  // Add to reports list
  await kv.lpush('reports:pending', reportId);

  // Track report count against user
  await kv.incr(`reports:count:${reportedClean}`);

  console.log(`[Report] ${reporterClean} reported ${reportedClean}: ${reason}`);

  return res.json({
    success: true,
    report_id: reportId,
    message: 'Report submitted. We take all reports seriously and will review shortly.'
  });
}

async function handleGet(req, res) {
  const { reporter, status } = req.query;

  // For now, just return a confirmation that reports exist
  // Full admin functionality can be added later
  if (reporter) {
    const reporterClean = reporter.replace('@', '').toLowerCase();

    return res.json({
      success: true,
      message: 'Report lookup not available to users for privacy',
      reporter: reporterClean
    });
  }

  // Get pending reports count (admin info)
  const pendingCount = await kv.llen('reports:pending') || 0;

  return res.json({
    success: true,
    pending_count: pendingCount,
    message: 'Use POST to submit a report'
  });
}
