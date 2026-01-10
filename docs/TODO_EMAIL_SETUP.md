# TODO: Email Setup for slashvibe.dev

**Status:** Pending
**Purpose:** Get `social@slashvibe.dev` working for Twitter signup

## Step 1: Set up ImprovMX

1. Go to https://improvmx.com
2. Enter `slashvibe.dev` in the domain field
3. Enter your Gmail for forwarding destination
4. Click "Create a free alias"
5. It will show you the MX records to add

## Step 2: Add MX Records in Vercel

1. Go to https://vercel.com/dashboard
2. Click on your project (slashvibe.dev)
3. **Settings** → **Domains**
4. Click on `slashvibe.dev`
5. Scroll to **DNS Records**
6. Click **Add Record**

Add these two records:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | @ | `mx1.improvmx.com` | 10 |
| MX | @ | `mx2.improvmx.com` | 20 |

7. Save each one

## Step 3: Add TXT Record (for verification)

ImprovMX will also ask for a TXT record:

| Type | Name | Value |
|------|------|-------|
| TXT | @ | `v=spf1 include:spf.improvmx.com ~all` |

## Step 4: Wait & Test

- DNS propagates in ~5 minutes
- ImprovMX dashboard will show green checkmarks when ready
- Send a test email to `social@slashvibe.dev`

## After Setup

Use `social@slashvibe.dev` + Twilio number `+1 659-200-7441` to sign up for @slashvibe on Twitter.
