# Universal Messaging Architecture

**Vision**: Message anyone, anywhere, from /vibe. Claude helps you write better messages across all platforms.

---

## The Power

```bash
# One interface, every platform
vibe dm founder@startup.com "Saw your launch..."           # Gmail
vibe dm @flynjamm --platform farcaster "Check this..."     # Farcaster
vibe dm @naval --platform x "Loved your essay..."          # X/Twitter
vibe dm +14155551234 "Quick question..."                   # WhatsApp
vibe dm @channel --platform telegram "Update: shipped!"    # Telegram
vibe dm @user#1234 --platform discord "Hey team..."        # Discord
vibe dm @alice "shipped the feature!"                      # /vibe native

# Smart auto-detection
vibe dm seth@gmail.com "..."        # Auto: Gmail
vibe dm @someone@farcaster.xyz "..." # Auto: Farcaster
vibe dm +1234567890 "..."           # Auto: WhatsApp
```

**Claude helps you:**
- Craft professional emails
- Write engaging DMs
- Maintain context across conversations
- Translate tone for different platforms

---

## Architecture

### Core Components

**1. Unified DM Router** (`mcp-server/tools/dm-universal.js`)
- Single entry point for all messaging
- Platform detection (auto or explicit)
- Credential validation
- Message routing

**2. Platform Adapters** (`lib/messaging/adapters/`)
- Modular design
- Each adapter implements standard interface
- BYOK (Bring Your Own Keys)
- Error handling & retries

**3. Credential Manager** (`lib/messaging/credentials.js`)
- Secure storage (KV + encryption)
- OAuth flows where needed
- Validation & refresh
- User-friendly setup

**4. Message Formatter** (`lib/messaging/formatter.js`)
- Platform-specific formatting
- Character limits
- Link handling
- Attachment support

---

## Platform Support Matrix

| Platform   | Auth Method          | API Cost | Status      | Priority |
|------------|---------------------|----------|-------------|----------|
| /vibe      | Session             | Free     | ✅ Working  | P0       |
| Gmail      | OAuth 2.0           | Free     | 🚧 Building | P0       |
| X/Twitter  | OAuth 1.0a/2.0      | $100/mo* | 🚧 Building | P1       |
| Farcaster  | Neynar API          | Free**   | 🚧 Building | P1       |
| WhatsApp   | Business API        | Pay/msg  | 🚧 Building | P2       |
| Telegram   | Bot API             | Free     | ⚠️ Partial  | P1       |
| Discord    | Bot API             | Free     | ⚠️ Partial  | P2       |

*Can use personal API keys (free for read, paid for DMs)
**Free tier available

---

## Implementation Plan

### Phase 1: Foundation (1 hour)

**Files to create:**
```
lib/messaging/
  ├── adapters/
  │   ├── base.js           # Base adapter interface
  │   ├── vibe.js           # Existing /vibe DMs
  │   ├── gmail.js          # Email via Gmail API
  │   ├── x.js              # X/Twitter DMs
  │   ├── farcaster.js      # Farcaster DMs
  │   ├── whatsapp.js       # WhatsApp Business API
  │   ├── telegram.js       # Telegram Bot API
  │   └── discord.js        # Discord Bot API
  ├── credentials.js        # Credential management
  ├── formatter.js          # Message formatting
  ├── detector.js           # Platform detection
  └── router.js             # Message routing

mcp-server/tools/
  └── dm-universal.js       # Enhanced vibe dm tool
```

**Core Architecture:**

```javascript
// lib/messaging/adapters/base.js
class MessageAdapter {
  constructor(credentials) {
    this.credentials = credentials;
  }

  async send(recipient, message, options = {}) {
    throw new Error('Must implement send()');
  }

  async validateCredentials() {
    throw new Error('Must implement validateCredentials()');
  }

  isConfigured() {
    throw new Error('Must implement isConfigured()');
  }
}

module.exports = MessageAdapter;
```

---

### Phase 2: Gmail Integration (30 min)

**Why first:**
- Free API
- Everyone has email
- Well-documented (Google APIs)
- Immediate value

**Setup Flow:**

```bash
# User runs setup
vibe connect gmail

# Opens OAuth flow in browser
# User grants Gmail send permission
# Stores refresh token in KV

# Ready to use
vibe dm founder@ycombinator.com "Quick question about..."
```

**Implementation:**

```javascript
// lib/messaging/adapters/gmail.js
const { google } = require('googleapis');
const MessageAdapter = require('./base');

class GmailAdapter extends MessageAdapter {
  async send(recipient, message, options = {}) {
    const { subject = '(no subject)' } = options;

    const oauth2Client = new google.auth.OAuth2(
      this.credentials.clientId,
      this.credentials.clientSecret,
      'http://localhost:3000/oauth/gmail/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: this.credentials.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const raw = this.createMessage(recipient, subject, message);

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    return {
      success: true,
      messageId: result.data.id,
      platform: 'gmail',
      recipient
    };
  }

  createMessage(to, subject, body) {
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\n');

    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async validateCredentials() {
    // Test by fetching user profile
    const oauth2Client = new google.auth.OAuth2(
      this.credentials.clientId,
      this.credentials.clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: this.credentials.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    await gmail.users.getProfile({ userId: 'me' });

    return true;
  }

  isConfigured() {
    return !!(
      this.credentials.clientId &&
      this.credentials.clientSecret &&
      this.credentials.refreshToken
    );
  }
}

module.exports = GmailAdapter;
```

---

### Phase 3: X/Twitter DMs (30 min)

**API Requirements:**
- Twitter API v2
- Read + Write + Direct Messages permission
- User must apply for elevated access OR use personal API keys

**Setup:**

```bash
vibe connect twitter

# Prompts for API credentials
# (or opens OAuth flow if we set up app credentials)

# Ready to use
vibe dm @flynjamm --platform x "Check out this prototype..."
```

**Implementation:**

```javascript
// lib/messaging/adapters/x.js
const MessageAdapter = require('./base');

class XAdapter extends MessageAdapter {
  async send(recipient, message, options = {}) {
    // 1. Look up user ID from username
    const userId = await this.getUserId(recipient);

    // 2. Create DM conversation or get existing
    const conversationId = await this.getOrCreateConversation(userId);

    // 3. Send message
    const response = await fetch(
      `https://api.twitter.com/2/dm_conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: message.slice(0, 10000) // DM char limit
        })
      }
    );

    const data = await response.json();

    return {
      success: true,
      messageId: data.data.dm_event_id,
      platform: 'x',
      recipient
    };
  }

  async getUserId(username) {
    const cleanUsername = username.replace('@', '');

    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${cleanUsername}`,
      {
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`
        }
      }
    );

    const data = await response.json();
    return data.data.id;
  }

  async getOrCreateConversation(participantId) {
    const response = await fetch(
      'https://api.twitter.com/2/dm_conversations',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_type: 'Group',
          participant_ids: [participantId]
        })
      }
    );

    const data = await response.json();
    return data.data.dm_conversation_id;
  }

  isConfigured() {
    return !!(
      this.credentials.accessToken &&
      this.credentials.refreshToken
    );
  }
}

module.exports = XAdapter;
```

---

### Phase 4: Farcaster DMs (20 min)

**Check Neynar API:**
- If DM API exists: Use it
- If not: Fall back to public mentions

**Implementation:**

```javascript
// lib/messaging/adapters/farcaster.js
const MessageAdapter = require('./base');

class FarcasterAdapter extends MessageAdapter {
  async send(recipient, message, options = {}) {
    // Check if Neynar supports DMs
    // For now, use public mention as fallback

    const response = await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: {
        'api_key': this.credentials.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        signer_uuid: this.credentials.signerUuid,
        text: `${recipient} ${message}`,
        parent: options.channelId || null
      })
    });

    const data = await response.json();

    return {
      success: true,
      castHash: data.cast.hash,
      platform: 'farcaster',
      recipient,
      note: 'Sent as public mention (Farcaster DMs not yet supported via API)'
    };
  }

  isConfigured() {
    return !!(
      this.credentials.apiKey &&
      this.credentials.signerUuid &&
      this.credentials.fid
    );
  }
}

module.exports = FarcasterAdapter;
```

---

### Phase 5: WhatsApp Business API (30 min)

**Setup:**
- Requires Facebook Business account
- WhatsApp Business API access
- Phone number verification

**Implementation:**

```javascript
// lib/messaging/adapters/whatsapp.js
const MessageAdapter = require('./base');

class WhatsAppAdapter extends MessageAdapter {
  async send(recipient, message, options = {}) {
    const cleanNumber = recipient.replace(/[^\d]/g, '');

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${this.credentials.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanNumber,
          type: 'text',
          text: { body: message }
        })
      }
    );

    const data = await response.json();

    return {
      success: true,
      messageId: data.messages[0].id,
      platform: 'whatsapp',
      recipient: cleanNumber
    };
  }

  isConfigured() {
    return !!(
      this.credentials.accessToken &&
      this.credentials.phoneNumberId
    );
  }
}

module.exports = WhatsAppAdapter;
```

---

### Phase 6: Telegram Integration (15 min)

**Leverage existing bridge:**
Already have Telegram bot support in `mcp-server/bridges/telegram.js`

**Enhancement:**

```javascript
// lib/messaging/adapters/telegram.js
const MessageAdapter = require('./base');
const telegram = require('../../mcp-server/bridges/telegram');

class TelegramAdapter extends MessageAdapter {
  async send(recipient, message, options = {}) {
    // Use existing Telegram bridge
    const result = await telegram.sendMessage(
      this.credentials.botToken,
      recipient, // Can be username, chat ID, or channel
      message
    );

    return {
      success: true,
      messageId: result.message_id,
      platform: 'telegram',
      recipient
    };
  }

  isConfigured() {
    return !!this.credentials.botToken;
  }
}

module.exports = TelegramAdapter;
```

---

### Phase 7: Discord Integration (15 min)

**Leverage existing bridge:**
Already have Discord support in `mcp-server/discord.js`

**Enhancement:**

```javascript
// lib/messaging/adapters/discord.js
const MessageAdapter = require('./base');
const discord = require('../../mcp-server/discord');

class DiscordAdapter extends MessageAdapter {
  async send(recipient, message, options = {}) {
    // Parse Discord user format: username#1234 or user ID
    const result = await discord.sendDM(
      this.credentials.botToken,
      recipient,
      message
    );

    return {
      success: true,
      messageId: result.id,
      platform: 'discord',
      recipient
    };
  }

  isConfigured() {
    return !!this.credentials.botToken;
  }
}

module.exports = DiscordAdapter;
```

---

### Phase 8: Unified Router (30 min)

**The magic happens here:**

```javascript
// lib/messaging/router.js
const GmailAdapter = require('./adapters/gmail');
const XAdapter = require('./adapters/x');
const FarcasterAdapter = require('./adapters/farcaster');
const WhatsAppAdapter = require('./adapters/whatsapp');
const TelegramAdapter = require('./adapters/telegram');
const DiscordAdapter = require('./adapters/discord');
const VibeAdapter = require('./adapters/vibe');

const credentials = require('./credentials');
const detector = require('./detector');

class MessageRouter {
  constructor() {
    this.adapters = {};
  }

  async send(recipient, message, options = {}) {
    // 1. Detect platform (auto or explicit)
    const platform = options.platform || detector.detectPlatform(recipient);

    // 2. Get or create adapter
    const adapter = await this.getAdapter(platform);

    // 3. Validate configuration
    if (!adapter.isConfigured()) {
      throw new Error(
        `${platform} not configured. Run: vibe connect ${platform}`
      );
    }

    // 4. Format message for platform
    const formatted = this.formatMessage(message, platform);

    // 5. Send via adapter
    const result = await adapter.send(recipient, formatted, options);

    // 6. Log the message
    await this.logMessage(platform, recipient, message, result);

    return result;
  }

  async getAdapter(platform) {
    if (this.adapters[platform]) {
      return this.adapters[platform];
    }

    const creds = await credentials.get(platform);

    const AdapterClass = {
      vibe: VibeAdapter,
      gmail: GmailAdapter,
      x: XAdapter,
      twitter: XAdapter,
      farcaster: FarcasterAdapter,
      whatsapp: WhatsAppAdapter,
      telegram: TelegramAdapter,
      discord: DiscordAdapter
    }[platform];

    if (!AdapterClass) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    this.adapters[platform] = new AdapterClass(creds);
    return this.adapters[platform];
  }

  formatMessage(message, platform) {
    // Platform-specific formatting
    const limits = {
      x: 10000,
      gmail: Infinity,
      farcaster: 1024,
      whatsapp: 4096,
      telegram: 4096,
      discord: 2000,
      vibe: Infinity
    };

    const limit = limits[platform] || Infinity;
    return message.slice(0, limit);
  }

  async logMessage(platform, recipient, message, result) {
    // Log to database for history
    // TODO: Implement message history tracking
  }
}

module.exports = new MessageRouter();
```

---

### Phase 9: Platform Detection (15 min)

**Smart auto-detection:**

```javascript
// lib/messaging/detector.js

function detectPlatform(recipient) {
  // Email
  if (recipient.includes('@') && recipient.includes('.') && !recipient.includes('@farcaster')) {
    return 'gmail';
  }

  // Phone number (WhatsApp)
  if (/^\+?\d{10,15}$/.test(recipient.replace(/[\s\-()]/g, ''))) {
    return 'whatsapp';
  }

  // Farcaster
  if (recipient.includes('@farcaster') || recipient.includes('.eth')) {
    return 'farcaster';
  }

  // Discord (username#1234)
  if (/^.+#\d{4}$/.test(recipient)) {
    return 'discord';
  }

  // Telegram (starts with @ and alphanumeric)
  if (recipient.startsWith('@') && /^@[a-zA-Z0-9_]+$/.test(recipient)) {
    // Could be Twitter or Telegram, default to vibe
    // User should specify --platform if ambiguous
    return 'vibe';
  }

  // Default to /vibe native
  return 'vibe';
}

module.exports = { detectPlatform };
```

---

### Phase 10: Enhanced DM Tool (20 min)

**Unified interface:**

```javascript
// mcp-server/tools/dm-universal.js
const router = require('../../lib/messaging/router');

module.exports = {
  name: 'vibe_dm',
  description: 'Send DM to anyone, anywhere (vibe, email, X, Farcaster, WhatsApp, Telegram, Discord)',
  parameters: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Recipient (e.g., @user, email@domain.com, +1234567890)'
      },
      message: {
        type: 'string',
        description: 'Message content'
      },
      platform: {
        type: 'string',
        enum: ['vibe', 'gmail', 'x', 'twitter', 'farcaster', 'whatsapp', 'telegram', 'discord'],
        description: 'Platform (auto-detected if not specified)'
      },
      subject: {
        type: 'string',
        description: 'Email subject (for gmail)'
      }
    },
    required: ['handle', 'message']
  },

  handler: async (args) => {
    const { handle, message, platform, subject } = args;

    try {
      const result = await router.send(handle, message, {
        platform,
        subject
      });

      return {
        success: true,
        ...result,
        message: `✓ Message sent via ${result.platform}

Recipient: ${result.recipient}
${result.messageId ? `Message ID: ${result.messageId}` : ''}
${result.note ? `\nNote: ${result.note}` : ''}
`
      };
    } catch (error) {
      if (error.message.includes('not configured')) {
        const detectedPlatform = platform || require('../../lib/messaging/detector').detectPlatform(handle);

        return {
          error: true,
          message: `${detectedPlatform} is not configured.

To set up ${detectedPlatform}:
  vibe connect ${detectedPlatform}

This will walk you through authentication.
`
        };
      }

      return {
        error: true,
        message: `Failed to send message: ${error.message}`
      };
    }
  }
};
```

---

## User Setup Flows

### Gmail Setup

```bash
$ vibe connect gmail

Opening Gmail OAuth flow...

1. Browser opens to Google OAuth consent
2. User grants Gmail send permission
3. Redirect back to localhost
4. Refresh token stored securely

✓ Gmail connected!

Test it:
  vibe dm someone@example.com "Hello from /vibe!"
```

### X/Twitter Setup

```bash
$ vibe connect twitter

Choose authentication method:
  1. Use personal API keys (recommended)
  2. OAuth flow (requires app setup)

[User selects 1]

Enter your Twitter API credentials:
  API Key: [user inputs]
  API Secret: [user inputs]
  Access Token: [user inputs]
  Access Token Secret: [user inputs]

✓ Twitter connected!

Test it:
  vibe dm @someone --platform x "Hey!"
```

### Farcaster Setup

```bash
$ vibe connect farcaster

Enter your Neynar API key:
  API Key: [user inputs]

Enter your Farcaster signer UUID:
  Signer UUID: [user inputs]

Enter your FID:
  FID: [user inputs]

✓ Farcaster connected!

Test it:
  vibe dm @someone --platform farcaster "GM!"
```

---

## Documentation

### User Guide

**Getting Started:**

```bash
# Connect platforms
vibe connect gmail       # Email
vibe connect twitter     # X/Twitter DMs
vibe connect farcaster   # Farcaster
vibe connect whatsapp    # WhatsApp Business
vibe connect telegram    # Telegram bot
vibe connect discord     # Discord bot

# Send messages
vibe dm founder@startup.com "Saw your launch..."
vibe dm @naval --platform x "Loved your essay..."
vibe dm @vitalik --platform farcaster "Thoughts on..."
vibe dm +14155551234 "Quick question..."
vibe dm @channel --platform telegram "Update!"
vibe dm user#1234 --platform discord "Hey team!"
vibe dm @alice "shipped the feature!"

# View connection status
vibe connections

# Disconnect platform
vibe disconnect gmail
```

**Platform-Specific Notes:**

**Gmail:**
- Free API
- Requires OAuth consent
- Can send to any email address

**X/Twitter:**
- Requires API access ($100/mo for full access)
- OR use personal API keys (free tier limited)
- Recipient must allow DMs from you

**Farcaster:**
- Requires Neynar API key (free tier available)
- May fall back to public mentions if DM API unavailable

**WhatsApp:**
- Requires Business API access
- Pay per message (~$0.005-0.01)
- Phone number must be verified

**Telegram:**
- Free bot API
- Recipient must have started your bot first
- Can message channels if bot is admin

**Discord:**
- Free bot API
- Recipient must share a server with bot
- Can message users or post in channels

---

## Success Metrics

**Adoption:**
- % of users who connect at least one platform
- Most popular platforms
- Messages sent per platform

**Engagement:**
- Average platforms connected per user
- Cross-platform message volume
- Claude-assisted message improvements

**Quality:**
- Message delivery success rate
- Error rate by platform
- Time to send (latency)

---

## Security & Privacy

**Credential Storage:**
- All tokens encrypted in Vercel KV
- User owns their credentials (BYOK)
- Can revoke access anytime

**Message Privacy:**
- Messages not stored (optional history)
- End-to-end encryption where platform supports
- User controls all data

**API Safety:**
- Rate limiting per platform
- Retry logic with backoff
- Clear error messages

---

## Timeline

**Phase 1-2 (Gmail + X):** 2 hours
**Phase 3-7 (All platforms):** 2 hours
**Phase 8-10 (Router + UX):** 1.5 hours

**Total:** ~5-6 hours to complete universal messaging

---

## Next Steps

1. **Start with Gmail** (highest value, easiest)
2. **Add X/Twitter** (message Flynn!)
3. **Build router** (unified interface)
4. **Add remaining platforms** (Farcaster, WhatsApp, etc.)
5. **Test end-to-end**
6. **Document setup flows**
7. **Ship it**

**Ready to start? I'll begin with Gmail integration!**
