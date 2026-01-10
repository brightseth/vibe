# Gmail Setup Guide - Seth's Instance

**Goal**: Enable Gmail messaging from /vibe for yourself
**Time**: 10 minutes
**Date**: 2026-01-10

---

## Step 1: Google Cloud Console Setup

### A. Create/Select Project

1. Open: https://console.cloud.google.com
2. Click project dropdown (top left)
3. Either:
   - Select existing project (e.g., "vibe-platform")
   - OR Create new project: "vibe-messaging"

### B. Enable Gmail API

1. In search bar, type "Gmail API"
2. Click "Gmail API" in results
3. Click "Enable" button
4. Wait ~30 seconds for activation

### C. Create OAuth Credentials

1. Left sidebar: "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: **External** (for testing)
   - App name: **/vibe messaging**
   - User support email: **seth@vibecodings.com** (or your email)
   - Developer contact: **seth@vibecodings.com**
   - Scopes: Skip for now
   - Test users: Add **your email**
   - Click "Save and Continue" through screens

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **vibe-gmail-local**
   - Authorized redirect URIs:
     - Add: `http://localhost:3000/api/oauth/gmail/callback`
     - Add: `https://vibecodings.vercel.app/api/oauth/gmail/callback`
   - Click **Create**

5. Copy credentials:
   - **Client ID**: Looks like `xxx.apps.googleusercontent.com`
   - **Client secret**: Random string
   - Click **Download JSON** (optional backup)

---

## Step 2: Add to .env.local

Open `/Users/sethstudio1/Projects/vibe/.env.local` and add:

```bash
# Gmail OAuth (Universal Messaging)
GMAIL_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GMAIL_CLIENT_SECRET="YOUR_CLIENT_SECRET"
GMAIL_REDIRECT_URI="http://localhost:3000/api/oauth/gmail/callback"

# Credentials encryption (generate once)
CREDENTIALS_ENCRYPTION_KEY="$(openssl rand -hex 32)"
```

**Generate encryption key:**
```bash
openssl rand -hex 32
```

Paste the output as `CREDENTIALS_ENCRYPTION_KEY`.

---

## Step 3: Add to Vercel Environment

1. Go to: https://vercel.com/brightseth/vibecodings/settings/environment-variables
2. Add the same variables:
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `GMAIL_REDIRECT_URI` (use production URL)
   - `CREDENTIALS_ENCRYPTION_KEY` (same value as local)

3. Redeploy after adding variables

---

## Step 4: Deploy OAuth Callback

The callback endpoint is already created at:
`api/oauth/gmail/callback.ts`

**For local testing:**
```bash
cd /Users/sethstudio1/Projects/vibe
npm run dev
```

Server should start on `http://localhost:3000`

**For production:**
```bash
git push origin mcp-server-jan9
```

Vercel auto-deploys. Check: https://vibecodings.vercel.app/api/oauth/gmail/callback

---

## Step 5: Restart MCP Server

After adding env vars:

```bash
# Restart Claude Code or:
vibe reload
```

This reloads the MCP server with new credentials.

---

## Step 6: Test the Flow

### A. Connect Gmail

```bash
vibe connect gmail
```

Expected output:
```
🔐 Connect gmail

1. Open this URL in your browser:
   https://accounts.google.com/o/oauth2/v2/auth?...

2. Authorize /vibe to send messages
3. You'll be redirected back
```

### B. Authorize in Browser

1. Browser opens automatically (or copy URL)
2. Select your Google account
3. Click "Allow" for Gmail permissions
4. Redirected to callback page
5. Page shows: "✓ Gmail Connected"

### C. Verify Connection

```bash
vibe connect gmail --action status
```

Expected:
```
✓ gmail is connected and active
```

### D. Send Test Email

```bash
vibe dm seth@vibecodings.com "Test from /vibe universal messaging!"
```

Expected:
```
✓ Sent via gmail

To: seth@vibecodings.com
Message: "Test from /vibe universal messaging!"
Message ID: xxx
```

### E. Check Your Inbox

Email should arrive within seconds with:
- Subject: "Message from /vibe"
- Body: "Test from /vibe universal messaging!"
- Footer: "Sent via /vibe · slashvibe.dev"

---

## Troubleshooting

### Error: "Gmail not configured"

**Cause**: Missing env vars

**Fix**:
1. Check `.env.local` has `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`
2. Restart MCP server: `vibe reload`

### Error: "redirect_uri_mismatch"

**Cause**: Redirect URI not authorized in Google Cloud Console

**Fix**:
1. Go to Google Cloud Console → Credentials
2. Edit OAuth client
3. Add exact redirect URI from error message
4. Save and retry

### Error: "invalid_grant"

**Cause**: OAuth tokens expired

**Fix**:
```bash
vibe connect gmail --action disconnect
vibe connect gmail
```

Re-authorize from scratch.

### Error: "Error 403: access_denied"

**Cause**: App not published, you're not a test user

**Fix**:
1. Google Cloud Console → OAuth consent screen
2. Add your email to "Test users"
3. OR publish app (submit for verification)

---

## Success Criteria

✅ `vibe connect gmail` opens browser
✅ Google authorization succeeds
✅ `vibe connect gmail --action status` shows "connected"
✅ `vibe dm email@example.com "test"` sends email
✅ Email arrives in recipient inbox
✅ Can send emails from within Claude Code

---

## Next Steps After Testing

Once working for you:

1. **Document for others** - User-friendly setup guide
2. **Build credential UI** - Web UI for managing connections
3. **Add more platforms** - X/Twitter, Farcaster (30 min each)
4. **Add to onboarding** - Suggest connecting platforms during `vibe init`
5. **Monitor usage** - Track which platforms people use most

---

**Status**: Ready to set up Gmail OAuth

Let me know when you have the credentials, and I'll help test!
