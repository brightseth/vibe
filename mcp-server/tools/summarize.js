/**
 * vibe summarize — Generate session summary
 *
 * Smart Summary: Local, copyable, optionally shareable.
 * NOT sent automatically to the room.
 *
 * Triggers:
 * - Explicit: vibe summarize
 * - Session end: vibe bye (calls this internally)
 * - Burst: 5+ messages in thread (future)
 */

const config = require('../config');
const store = require('../store');
const fs = require('fs');
const path = require('path');

// Track session start time
const SESSION_START = Date.now();

// Session activity tracking file
const ACTIVITY_FILE = path.join(config.VIBE_DIR, `.activity_${process.pid}`);

function getActivity() {
  try {
    if (fs.existsSync(ACTIVITY_FILE)) {
      return JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    startTime: SESSION_START,
    messagesSent: 0,
    messagesReceived: 0,
    participants: [],
    moodChanges: [],
    threads: {}
  };
}

function saveActivity(activity) {
  try {
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(activity, null, 2));
  } catch (e) {}
}

function trackMessage(from, to, direction) {
  const activity = getActivity();

  if (direction === 'sent') {
    activity.messagesSent++;
    if (!activity.participants.includes(to)) {
      activity.participants.push(to);
    }
  } else {
    activity.messagesReceived++;
    if (!activity.participants.includes(from)) {
      activity.participants.push(from);
    }
  }

  // Track per-thread message count for burst detection
  const threadKey = direction === 'sent' ? to : from;
  activity.threads[threadKey] = (activity.threads[threadKey] || 0) + 1;

  saveActivity(activity);
  return activity;
}

function trackMood(mood) {
  const activity = getActivity();
  activity.moodChanges.push({ mood, time: Date.now() });
  saveActivity(activity);
}

function clearActivity() {
  try {
    if (fs.existsSync(ACTIVITY_FILE)) {
      fs.unlinkSync(ACTIVITY_FILE);
    }
  } catch (e) {}
}

// Check if burst threshold met (5+ messages in one thread)
function checkBurst() {
  const activity = getActivity();
  for (const [thread, count] of Object.entries(activity.threads)) {
    if (count >= 5) return { triggered: true, thread, count };
  }
  return { triggered: false };
}

const definition = {
  name: 'vibe_summarize',
  description: 'Generate a session summary. Shows participants, activity, mood, and open threads. Local-first: not sent to the room.',
  inputSchema: {
    type: 'object',
    properties: {
      share: {
        type: 'boolean',
        description: 'If true, offers to share summary with participants (default: false)'
      }
    }
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const myHandle = config.getHandle();
  const { share = false } = args;

  // Get inbox for thread analysis
  const inbox = await store.getInbox(myHandle);
  const activity = getActivity();

  // Calculate session duration
  const now = Date.now();
  const startTime = activity.startTime || SESSION_START;
  const duration = now - startTime;
  const startStr = new Date(startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const endStr = new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Build participant list
  const participants = new Set(activity.participants);
  inbox.forEach(thread => participants.add(thread.handle));
  const participantList = Array.from(participants).map(p => `@${p}`).join(', ') || '_none_';

  // Current mood
  const currentMood = activity.moodChanges.length > 0
    ? activity.moodChanges[activity.moodChanges.length - 1].mood
    : null;

  // Mood journey (if changed during session)
  let moodLine = '';
  if (activity.moodChanges.length > 1) {
    const moods = activity.moodChanges.map(m => m.mood).join(' → ');
    moodLine = `\n• Mode: ${moods}`;
  } else if (currentMood) {
    moodLine = `\n• Mode: ${currentMood}`;
  }

  // Events
  const events = [];
  if (activity.messagesSent > 0) {
    events.push(`Sent ${activity.messagesSent} message${activity.messagesSent > 1 ? 's' : ''}`);
  }
  if (activity.messagesReceived > 0) {
    events.push(`Received ${activity.messagesReceived} message${activity.messagesReceived > 1 ? 's' : ''}`);
  }

  // Open threads with unread
  const openThreads = inbox
    .filter(t => t.unread > 0)
    .map(t => `@${t.handle} (${t.unread} unread)`);

  // Build summary
  let summary = `## Session Summary — ${startStr}–${endStr}\n\n`;
  summary += `• Participants: ${participantList}`;
  summary += moodLine;

  if (events.length > 0) {
    summary += `\n• Events:\n`;
    events.forEach(e => summary += `  – ${e}\n`);
  }

  if (openThreads.length > 0) {
    summary += `• Open threads:\n`;
    openThreads.forEach(t => summary += `  – ${t}\n`);
  }

  // Add copy hint
  summary += `\n---\n_This summary is local. Copy it or share with \`vibe summarize --share\`_`;

  if (share) {
    // TODO: Implement optional sharing
    summary += `\n\n⚠️ Sharing not yet implemented. Copy and paste manually.`;
  }

  return { display: summary };
}

module.exports = {
  definition,
  handler,
  // Export helpers for other tools
  trackMessage,
  trackMood,
  checkBurst,
  clearActivity,
  getActivity
};
