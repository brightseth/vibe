# X (Twitter) Webhook Integration

The X webhook integration allows /vibe to receive real-time notifications from X Platform (Twitter) for mentions, DMs, likes, and follows.

## Architecture

- **Main webhook endpoint**: `/api/webhooks/x`
- **Health monitoring**: `/api/webhooks/x/health`
- **Test endpoint**: `/api/webhooks/x/test`
- **Social inbox**: `/api/social` (unified inbox for all platforms)

## Setup Instructions

### 1. X Developer Account Setup

1. Go to [X Developer Portal](https://developer.twitter.com/en/portal)
2. Create a new project/app (or use existing)
3. Navigate to your app settings → "Keys and tokens"
4. Generate/note down:
   - API Key (`X_API_KEY`)
   - API Secret (`X_API_SECRET`) 
   - Access Token (`X_ACCESS_TOKEN`)
   - Access Token Secret (`X_ACCESS_SECRET`)

### 2. Webhook Configuration

1. In X Developer Portal, go to your app → "Dev environments"
2. Click "Set up dev environment" for Account Activity API
3. Set webhook URL: `https://your-domain.com/api/webhooks/x`
4. X will perform CRC challenge verification automatically
5. Subscribe to desired events:
   - Tweet create events (mentions)
   - Direct message events
   - Favorite events (optional)
   - Follow events (optional)

### 3. Environment Variables

Add to your `.env.local`:

```bash
# X API Credentials
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret_key
X_ACCESS_TOKEN=your_access_token
X_ACCESS_SECRET=your_access_token_secret

# Webhook Security
X_WEBHOOK_SECRET=your_webhook_secret_from_x_portal

# KV Storage (Vercel KV or compatible)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

### 4. Verification

1. Check health: `GET /api/webhooks/x/health`
2. Test webhook: `POST /api/webhooks/x/test` with `{"type": "mention"}`
3. Check social inbox: `GET /api/social`

## Event Processing

### Supported Event Types

- **Mentions** (`mention`): When someone tweets @yourusername
- **Replies** (`reply`): Direct replies to your tweets  
- **Direct Messages** (`dm`): Private messages sent to you
- **Likes** (`like`): When someone likes your tweet
- **Follows** (`follow`): When someone follows your account

### Signal Scoring

Events are automatically scored for signal quality:
- **Replies**: 80 (high signal - direct engagement)
- **Mentions**: 70 (good signal - intentional reference)  
- **Likes**: 60 (medium signal - passive engagement)
- **Follows**: 50 (baseline signal)

### Data Flow

1. X sends webhook → `/api/webhooks/x`
2. Webhook verifies signature and parses events
3. Events are forwarded to `/vibe:social_inbox` in KV storage
4. Social inbox API serves unified feed at `/api/social`
5. Agents can process and respond via X adapter

## Monitoring

### Health Check

```bash
curl https://your-domain.com/api/webhooks/x/health
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
curl -X POST https://your-domain.com/api/webhooks/x/test \
  -H "Content-Type: application/json" \
  -d '{"type": "mention"}'

# Test DM processing  
curl -X POST https://your-domain.com/api/webhooks/x/test \
  -H "Content-Type: application/json" \
  -d '{"type": "dm"}'
```

### Manual Webhook Test

Send a real mention to your connected X account and check:
1. Webhook delivery stats update
2. Event appears in social inbox
3. Signal scoring is applied correctly

## Security

- **Signature Verification**: All webhook payloads are verified using HMAC-SHA256
- **Development Mode**: Signature verification is relaxed when `X_WEBHOOK_SECRET` is not set
- **Rate Limiting**: Webhook endpoint can handle X's delivery patterns
- **Error Handling**: Failed processing is logged but doesn't break webhook delivery

## Integration with /vibe

Events flow into the unified social inbox where:
- **Agents can read**: Via `/api/social` to see all social activity
- **Users can respond**: Via `/api/social` POST to reply across platforms
- **Metrics are tracked**: For engagement analytics and streak systems

## Troubleshooting

### Common Issues

1. **CRC Challenge Failing**
   - Ensure `X_WEBHOOK_SECRET` matches X Developer Portal
   - Check webhook URL is publicly accessible
   - Verify HTTPS certificate is valid

2. **No Events Received**
   - Check X Developer Portal webhook subscription status
   - Verify webhook URL in X matches exactly
   - Test with `/api/webhooks/x/test` first

3. **Signature Verification Errors**
   - Confirm `X_WEBHOOK_SECRET` is correct
   - Check X is using the right environment
   - Review webhook delivery logs in X Portal

4. **Events Not in Social Inbox**
   - Check KV storage is configured
   - Verify `/api/social` returns recent events
   - Check processing logs for errors

### Debug Mode

Set `NODE_ENV=development` to see detailed webhook processing logs.

## Rate Limits

X has rate limits on webhook deliveries:
- **Account Activity API**: Up to 1000 events/day (free tier)
- **Webhook Deliveries**: Burst of 50/minute, sustained 100/hour
- **API Calls**: 300 requests/15min per endpoint

## Scaling

For high-volume accounts:
1. Consider webhook event filtering in X Portal
2. Implement event queuing for processing spikes  
3. Use multiple webhook endpoints with load balancing
4. Monitor KV storage usage and implement archiving

## Security Best Practices

1. **Rotate Secrets**: Regularly rotate `X_WEBHOOK_SECRET`
2. **Monitor Access**: Track unusual webhook delivery patterns
3. **Validate Payloads**: Always verify webhook signatures in production
4. **Rate Limiting**: Implement additional rate limiting if needed
5. **Logging**: Log webhook events for debugging but sanitize sensitive data