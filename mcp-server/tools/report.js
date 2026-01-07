/**
 * vibe report — Report a user for Trust & Safety review
 *
 * Usage:
 *   vibe report @handle --reason spam
 *   vibe report @handle --reason harassment --details "sent unwanted messages repeatedly"
 */

const config = require('../config');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_report',
  description: 'Report a user for Trust & Safety review. Use when someone is behaving inappropriately.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Handle of the user to report (e.g., @badactor)'
      },
      reason: {
        type: 'string',
        enum: ['spam', 'harassment', 'impersonation', 'inappropriate', 'other'],
        description: 'Reason for the report'
      },
      message_id: {
        type: 'string',
        description: 'Optional: ID of a specific message to report'
      },
      details: {
        type: 'string',
        description: 'Optional: Additional context about what happened'
      }
    },
    required: ['handle', 'reason']
  }
};

async function handler(args, { store }) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { handle, reason, message_id, details } = args;
  const myHandle = config.getHandle();

  if (!handle) {
    return {
      display: `## Report Failed

Please specify who to report:

\`vibe report @handle --reason spam\`

**Valid reasons:** spam, harassment, impersonation, inappropriate, other`
    };
  }

  // Clean handle
  const reportedHandle = handle.replace('@', '').toLowerCase();

  if (reportedHandle === myHandle) {
    return {
      display: `## Cannot Report Yourself

Nice try, but you can't report yourself.`
    };
  }

  // Submit report
  const result = await store.submitReport({
    reporter: myHandle,
    reported: reportedHandle,
    reason: reason || 'other',
    message_id,
    details
  });

  if (!result.success) {
    return {
      display: `## Report Failed

${result.error || 'Could not submit report. Please try again.'}

If the problem persists, DM @seth directly.`
    };
  }

  let display = `## Report Submitted

**Report ID:** ${result.report_id}
**Reported:** @${reportedHandle}
**Reason:** ${reason || 'other'}
${details ? `**Details:** ${details}` : ''}

Our team will review this report. ${result.urgent ? '⚠️ This user has multiple reports and will be prioritized.' : ''}

**What happens next:**
- Reports are reviewed weekly (or sooner if urgent)
- You won't be notified of the outcome (privacy)
- If action is taken, the user may be warned, muted, or banned

Thank you for helping keep /vibe safe.`;

  return { display };
}

module.exports = { definition, handler };
