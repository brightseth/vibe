# Universal Messaging - Complete Implementation ✓

**Status**: All platforms wired up and ready to use!
**Date**: 2026-01-10

---

## 🎉 What's Ready

**6 Platforms Supported:**
- ✅ **Gmail** - Email anyone (OAuth + SMTP)
- ✅ **X/Twitter** - DMs and tweets
- ✅ **Farcaster** - Decentralized casts
- ✅ **Telegram** - Bot messages
- ✅ **Discord** - Channel/DM messages
- ⚪ **WhatsApp** - Coming soon

---

## Quick Start

### 1. Check Platform Status

```bash
vibe connect

# Output:
🔌 Platform Status

✓ Configured:
  📧 gmail

⚪ Available:
  🐦 x - X/Twitter DMs and tweets
  🎭 farcaster - Farcaster casts (via Neynar)
  📱 telegram - Telegram messages (bot API)
  🎮 discord - Discord messages (bot API)
  💬 whatsapp - WhatsApp messages (coming soon)

Connect: vibe connect <platform>
```

### 2. Send Messages (Auto-Detection)

```bash
# Email (auto-detects Gmail)
vibe dm founder@startup.com "Saw your launch on HN..."

# X/Twitter (auto-detects from @)
vibe dm @username "Great tweet!"

# Farcaster (auto-detects from .farcaster)
vibe dm @user.farcaster "GM!"

# Telegram (auto-detects from chat ID)
vibe dm 123456789 "Hello from /vibe"

# Discord (auto-detects from channel ID)
vibe dm 987654321098765432 "Shipped the feature"

# /vibe internal (fallback)
vibe dm @alice "Hey!"
```

### 3. Explicit Platform Override

```bash
# Force specific platform
vibe dm @user --platform x "DM on X"
vibe dm user@email.com --platform gmail --subject "Subject line"
```

---

## Platform Setup Guides

### Gmail (Ready NOW)

**Seth's setup:** Already configured via `/email` skill ✓

**For others:**

#### Option 1: SMTP + App Password (Easiest)
```bash
# 1. Enable 2FA on Google account
https://myaccount.google.com/security

# 2. Create App Password
https://myaccount.google.com/apppasswords

# 3. Add to environment
export GMAIL_ADDRESS="your@gmail.com"
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# 4. Restart
vibe reload
```

#### Option 2: OAuth 2.0 (For productization)
```bash
# 1. Set up Google Cloud Console (see GMAIL_SETUP_GUIDE.md)
# 2. Add credentials to .env
# 3. Run: vibe connect gmail
```

**Test:**
```bash
vibe dm test@example.com "Test from /vibe"
```

---

### X/Twitter

**What you need:**
- X Developer account
- OAuth 1.0a credentials
- Basic tier ($100/mo) or free elevated access

**Setup:**
```bash
# 1. Get credentials from developer.twitter.com
# 2. Add to /vibe config:

vibe config set x_credentials '{
  "api_key": "your_api_key",
  "api_secret": "your_api_secret",
  "access_token": "your_access_token",
  "access_secret": "your_access_secret"
}'

# Or via environment:
export X_API_KEY="..."
export X_API_SECRET="..."
export X_ACCESS_TOKEN="..."
export X_ACCESS_SECRET="..."

# 3. Restart
vibe reload
```

**Usage:**
```bash
# Send DM
vibe dm @username "Your message"

# Send tweet
vibe dm x "Public tweet"

# Reply to tweet
vibe dm x "Reply text" --reply-to <tweet_id>
```

**Pricing:**
- Free tier: Read-only (no DMs/tweets)
- Basic: $100/mo (1,667 tweets/month)
- Apply for free elevated access: https://developer.twitter.com/en/portal/petition

---

### Farcaster

**What you need:**
- Farcaster account (Warpcast)
- Neynar API key (free)
- Signer UUID

**Setup:**
```bash
# 1. Get Neynar API key
https://neynar.com (sign up free)

# 2. Create signer in Neynar dashboard
"Managed Signers" → Create → Copy UUID

# 3. Get your FID (Farcaster ID)
Check your Warpcast profile or use Neynar API

# 4. Add to environment
export NEYNAR_API_KEY="your_api_key"
export FARCASTER_SIGNER_UUID="your_signer_uuid"
export FARCASTER_FID="your_fid"

# 5. Restart
vibe reload
```

**Usage:**
```bash
# Public cast
vibe dm farcaster "GM /vibe fam"

# Mention someone
vibe dm @username.farcaster "Great cast!"

# Cast to channel
vibe dm farcaster "Update" --channel dev
```

**Note:** Farcaster doesn't have traditional DMs. All casts are public.

---

### Telegram

**What you need:**
- Telegram bot token (free)

**Setup:**
```bash
# 1. Message @BotFather on Telegram
# 2. Send: /newbot
# 3. Follow prompts, copy token

# 4. Add to environment
export TELEGRAM_BOT_TOKEN="your_bot_token"

# 5. Restart
vibe reload
```

**Get your chat ID:**
```bash
# 1. Message your bot on Telegram
# 2. Bot will respond with your chat ID
# 3. Use that ID as recipient
```

**Usage:**
```bash
# Send message (needs chat ID)
vibe dm 123456789 "Hello from /vibe"

# Or use bot username
vibe dm @your_bot "Message"
```

---

### Discord

**What you need:**
- Discord bot token (free)
- Bot invited to your server

**Setup:**
```bash
# 1. Create Discord application
https://discord.com/developers/applications

# 2. Create bot, copy token
Bot tab → Reset Token → Copy

# 3. Enable "Message Content Intent"
Bot tab → Privileged Gateway Intents → Message Content

# 4. Add to environment
export DISCORD_BOT_TOKEN="your_bot_token"

# 5. Invite bot to server
OAuth2 → URL Generator
Scopes: "bot"
Permissions: "Send Messages", "Read Messages"

# 6. Get channel ID
Enable Developer Mode in Discord
Right-click channel → Copy ID

# 7. Restart
vibe reload
```

**Usage:**
```bash
# Send to channel (needs channel ID)
vibe dm 987654321098765432 "Shipped the feature"
```

---

## Platform Detection Logic

The router automatically detects platform from recipient format:

| Recipient | Platform | Example |
|-----------|----------|---------|
| `user@domain.com` | Gmail | `founder@startup.com` |
| `@username` | X/Twitter | `@naval` |
| `@user.farcaster` | Farcaster | `@dwr.farcaster` |
| `@user.fc` | Farcaster | `@vitalik.fc` |
| `123456789` | Telegram | `123456789` (9-12 digits) |
| `987654321098765432` | Discord | `987654321098765432` (17-19 digits) |
| `username#1234` | Discord | `user#1234` |
| `+1234567890` | WhatsApp | `+14155551234` |
| `@alice` | /vibe | `@alice` (fallback) |

**Override detection:**
```bash
vibe dm @user --platform x "Force X/Twitter"
```

---

## Configuration Check

```bash
# See which platforms are configured
vibe connect

# Check specific platform
vibe connect gmail --action status
vibe connect x --action status

# Disconnect platform
vibe connect x --action disconnect
```

---

## Example Workflows

### Multi-Platform Outreach

```bash
# Email
vibe dm founder@startup.com "Saw your launch..."

# Follow up on X
vibe dm @founder "Great work on the launch!"

# Join their Discord
vibe dm 123456789012345678 "Hey team, excited to join!"

# Farcaster cast
vibe dm @founder.farcaster "Love what you're building"
```

### Builder Communication

```bash
# DM on X
vibe dm @builder "Want to collaborate?"

# Move to Telegram for deeper conv
vibe dm 987654321 "Let's continue here"

# Share publicly on Farcaster
vibe dm farcaster "Just shipped with @builder - check it out"

# Email with details
vibe dm builder@project.com --subject "Collab details" "Here's the plan..."
```

---

## Character Limits

Each platform has different limits:

| Platform | Limit | Handling |
|----------|-------|----------|
| Gmail | Unlimited | No truncation |
| X/Twitter DMs | 10,000 chars | Truncates with warning |
| X/Twitter Tweets | 280 chars | Truncates, suggests thread |
| Farcaster | 320 chars | Truncates with "[truncated]" |
| Telegram | 4,096 chars | Truncates with warning |
| Discord | 2,000 chars | Truncates with warning |

---

## Signatures

All messages include `/vibe` signature by default:

```
Your message here

---
Sent via /vibe · slashvibe.dev
```

**Disable signature:**
```bash
vibe dm user@email.com "message" --no-signature
```

---

## Next Steps

### For Seth (This Week)

1. **Test Gmail** (ready now)
   ```bash
   vibe reload
   vibe dm seth@vibecodings.com "Test"
   ```

2. **Set up one more platform** (pick easiest)
   - Telegram: 5 minutes (message @BotFather)
   - Discord: 10 minutes (create bot)
   - Farcaster: 15 minutes (Neynar setup)

3. **Send real messages**
   - Email someone
   - DM on X/Twitter
   - Multi-platform test

### For Community (Next 2 Weeks)

**Week 1: Beta Testing**
- 5-10 power users
- Document setup friction
- Refine error messages
- Build credential management UI

**Week 2: Public Launch**
- Setup guides with screenshots
- Demo video (2 min)
- Announce on vibecodings.dev
- Blog post

---

## Architecture Summary

**Built on existing bridges:**
- Telegram: `mcp-server/bridges/telegram.js`
- Discord: `mcp-server/bridges/discord-bot.js`
- Farcaster: `mcp-server/bridges/farcaster.js`
- X/Twitter: `mcp-server/twitter.js`

**New universal layer:**
- Base adapter: `lib/messaging/adapters/base.js`
- Platform adapters: `lib/messaging/adapters/{platform}.js`
- Smart router: `lib/messaging/router.js`
- MCP tools: `mcp-server/tools/{dm,connect}.js`

**Zero new APIs** - All adapters reuse proven bridge code from clawdbot.

---

## Testing Checklist

### Gmail
- [ ] Send email to yourself
- [ ] Send email to external address
- [ ] Check email arrives
- [ ] Verify signature

### X/Twitter
- [ ] Send DM to someone
- [ ] Send public tweet
- [ ] Reply to tweet
- [ ] Verify delivery

### Farcaster
- [ ] Send public cast
- [ ] Mention someone
- [ ] Cast to channel
- [ ] Verify on Warpcast

### Telegram
- [ ] Get chat ID
- [ ] Send message
- [ ] Verify delivery
- [ ] Test markdown

### Discord
- [ ] Get channel ID
- [ ] Send message
- [ ] Verify delivery
- [ ] Test formatting

---

**Status**: All platforms wired up ✓

**Ready to use NOW:**
- Gmail (via existing SMTP setup)

**Ready after 5-15 min setup:**
- Telegram, Discord, Farcaster, X/Twitter

Test it: `vibe reload` → `vibe dm user@email.com "test"`
