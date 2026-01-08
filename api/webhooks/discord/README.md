# Discord Webhook Integration

The Discord webhook integration allows /vibe to receive real-time notifications from Discord servers for messages, member events, and interactions.

## Architecture

- **Main webhook endpoint**: `/api/webhooks/discord`
- **Health monitoring**: `/api/webhooks/discord/health`
- **Test endpoint**: `/api/webhooks/discord/test`
- **Social inbox**: `/api/social` (unified inbox for all platforms)

## Setup Instructions

### 1. Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application (or use existing)
3. Go to "Bot" section → Click "Add Bot"
4. Under "Token", click "Copy" to get your bot token
5. Go back to "General Information" → Copy the "Public Key"
6. Under "Bot" → Enable required intents:
   - Message Content Intent (for reading message content)
   - Server Members Intent (for member join/leave events)

### 2. Webhook Configuration

1. In Discord Developer Portal → Your App → General Information
2. Set "Interactions Endpoint URL": `https://your-domain.com/api/webhooks/discord`
3. Discord will automatically verify the endpoint
4. Go to "Bot" section and configure permissions:
   - Read Messages
   - Send Messages
   - Read Message History
   - Use Slash Commands

### 3. Environment Variables

Add to your `.env.local`:

```bash
# Discord Bot Credentials  
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_PUBLIC_KEY=your_public_key

# Optional: Additional webhook security
DISCORD_WEBHOOK_SECRET=your_custom_secret

# KV Storage (Vercel KV or compatible)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

### 4. Invite Bot to Server

1. In Discord Developer Portal → OAuth2 → URL Generator
2. Select scopes: "bot" + "applications.commands"
3. Select permissions: "Send Messages", "Read Message History", "Use Slash Commands"
4. Copy generated URL and invite bot to your Discord server

### 5. Verification

1. Check health: `GET /api/webhooks/discord/health`
2. Test webhook: `POST /api/webhooks/discord/test` with `{"type": "mention"}`
3. Check social inbox: `GET /api/social`
4. Send a message mentioning `/vibe` in your Discord server

## Event Processing

### Supported Event Types

- **Mentions** (`mention`): When someone mentions `/vibe` or the bot in a message
- **Direct Messages** (`dm`): Private messages sent to the bot
- **Member Join** (`member_join`): When someone joins the Discord server
- **Member Leave** (`member_leave`): When someone leaves the Discord server  
- **Interactions** (`interaction`): Slash commands and button interactions
- **Replies** (`reply`): Replies to bot messages

### Signal Scoring

Events are automatically scored for signal quality:
- **Direct Messages**: 90 (highest signal - private, intentional)
- **Interactions**: 80 (high signal - deliberate action)
- **Mentions**: 70 (good signal - intentional reference)
- **Replies**: 60 (medium signal - engagement)
- **Member Join**: 40 (baseline signal)
- **Member Leave**: 30 (low signal)

### Data Flow

1. Discord sends webhook → `/api/webhooks/discord`
2. Webhook verifies signature and parses events
3. Events are forwarded to `vibe:social_inbox` in KV storage
4. Social inbox API serves unified feed at `/api/social`
5. Agents can process and respond via Discord adapter

## Monitoring

### Health Check

```bash
curl https://your-domain.com/api/webhooks/discord/health
```

Returns:
- Configuration status
- Delivery statistics
- Recent events  
- Setup instructions
- Health score (0-100)

### Statistics Tracked

- `total_deliveries`: Total webhook calls received
- `events_processed`: Total events forwarded to /vibe
- `last_delivery`: Timestamp of most recent webhook
- `deliveries_today`: Count for current day
- `failure_count`: Failed processing attempts

## Testing

### Mock Event Testing

```bash
# Test mention processing
curl -X POST https://your-domain.com/api/webhooks/discord/test \
  -H "Content-Type: application/json" \
  -d '{"type": "mention"}'

# Test DM processing
curl -X POST https://your-domain.com/api/webhooks/discord/test \
  -H "Content-Type: application/json" \
  -d '{"type": "dm"}'

# Test member join
curl -X POST https://your-domain.com/api/webhooks/discord/test \
  -H "Content-Type: application/json" \
  -d '{"type": "member_join"}'

# Test slash command
curl -X POST https://your-domain.com/api/webhooks/discord/test \
  -H "Content-Type: application/json" \
  -d '{"type": "interaction"}'
```

### Real Discord Testing

1. Invite the bot to a test Discord server
2. Send a message containing "/vibe"
3. Check webhook delivery stats update
4. Verify event appears in social inbox with correct signal scoring

## Security

- **Ed25519 Signature Verification**: All webhook payloads verified using Discord's public key
- **Development Mode**: Signature verification relaxed when keys not configured
- **Bot Permissions**: Minimal required permissions requested
- **Rate Limiting**: Handles Discord's delivery patterns
- **Error Handling**: Failed processing logged but doesn't break webhook delivery

## Discord-Specific Features

### Gateway Events Supported
- `MESSAGE_CREATE`: New messages (mentions, DMs)
- `GUILD_MEMBER_ADD`: User joins server
- `GUILD_MEMBER_REMOVE`: User leaves server  
- `INTERACTION_CREATE`: Slash commands and interactions
- `READY`: Bot connection established

### Message Processing
- Automatically filters out bot messages
- Detects mentions of `/vibe` keyword
- Processes both server messages and DMs
- Extracts user info including discriminator and avatar

### Member Events
- Tracks server joins/leaves for community growth metrics
- Links Discord users to /vibe profiles when possible
- Provides server-specific context

## Integration with /vibe

Events flow into the unified social inbox where:
- **Agents can read**: Via `/api/social` to see all social activity
- **Users can respond**: Via `/api/social` POST to reply across platforms  
- **Metrics are tracked**: For engagement analytics and community health
- **Signal scoring**: Helps prioritize high-value Discord interactions

## Troubleshooting

### Common Issues

1. **Endpoint Verification Failing**
   - Ensure `DISCORD_PUBLIC_KEY` matches Discord Developer Portal
   - Check webhook URL is publicly accessible with valid HTTPS
   - Verify endpoint returns 200 OK for interactions

2. **No Events Received**  
   - Check bot is in Discord server with correct permissions
   - Verify required intents are enabled in Developer Portal
   - Test with `/api/webhooks/discord/test` first

3. **Signature Verification Errors**
   - Confirm `DISCORD_PUBLIC_KEY` is correct
   - Check Discord is sending proper headers
   - Review interaction logs in Discord Developer Portal

4. **Events Not in Social Inbox**
   - Check KV storage is configured and accessible
   - Verify `/api/social` returns recent events
   - Check processing logs for parsing errors

### Debug Mode

Set `NODE_ENV=development` to see detailed webhook processing logs and relaxed signature verification.

## Rate Limits

Discord has generous rate limits for bots:
- **Gateway Events**: No explicit limit for receiving
- **Webhook Deliveries**: Batched and delivered efficiently  
- **API Responses**: 50 requests per second per bot
- **Message Content**: Requires intent for servers >100 members

## Scaling

For large Discord servers:
1. Implement event filtering by channel or keyword
2. Use database queuing for processing spikes
3. Consider multiple bot instances with different permissions
4. Monitor member growth and adjust processing accordingly

## Security Best Practices

1. **Secure Keys**: Store bot token and public key securely
2. **Minimal Permissions**: Request only necessary bot permissions
3. **Validate Signatures**: Always verify webhook signatures in production
4. **Rate Limiting**: Implement additional rate limiting if needed
5. **Audit Logs**: Monitor bot activity in Discord server settings
6. **Member Screening**: Use Discord's member screening for sensitive servers

## Next Steps

Once Discord webhook receiver is working:
1. **Slash Commands**: Implement `/vibe` slash commands for server interaction
2. **Rich Embeds**: Send formatted responses back to Discord
3. **Channel Management**: Auto-create /vibe channels in new servers  
4. **Role Integration**: Sync Discord roles with /vibe achievements
5. **Voice Events**: Support voice channel join/leave events