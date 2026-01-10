# Artifact Cards Demo - NFL Playoff Markets

## Live Demo Artifact

**URL:** https://slashvibe.dev/a/nfl-playoffs-prediction-markets-kalshi-vs-polymarket-ab1681

**Artifact ID:** `artifact_1768089307984_e74e3ebb`

**Slug:** `nfl-playoffs-prediction-markets-kalshi-vs-polymarket-ab1681`

## What's In It

A comprehensive guide tracking NFL playoff prediction markets across:
- **Kalshi** (CFTC-regulated, US-only)
- **Polymarket** (crypto-based, global)

Features:
- Live market comparison (Super Bowl + Conference Championships)
- Platform differences and advantages
- Weekly tracking checklist
- Arbitrage opportunity indicators
- Market links and resources

## How to Share as a Card

### Via MCP Tool (Claude Code)

```javascript
// Share with someone
vibe_dm({
  handle: "@friend",
  message: "Check out this NFL playoff markets tracker!",
  artifact_slug: "nfl-playoffs-prediction-markets-kalshi-vs-polymarket-ab1681"
})
```

### What They See

When the recipient opens the thread with `vibe_open(@seth)`, they'll see:

```
📘 **NFL Playoffs Prediction Markets - Kalshi vs Polymarket**
> Live tracking of NFL playoff prediction markets across **Kalshi** (CFTC-regulated) and **Polymarket** (crypto-based). Compare odds, liquidity...

🔗 [View artifact](https://slashvibe.dev/a/nfl-playoffs-prediction-markets-kalshi-vs-polymarket-ab1681)
```

## Browse All Artifacts

Visit https://slashvibe.dev/artifacts to see all public artifacts including this one.

## Technical Details

**Protocol Schema:** `artifact` payload type (mcp-server/protocol/index.js:119)

**Payload Structure:**
```json
{
  "type": "artifact",
  "version": "0.1.0",
  "artifactId": "artifact_1768089307984_e74e3ebb",
  "slug": "nfl-playoffs-prediction-markets-kalshi-vs-polymarket-ab1681",
  "title": "NFL Playoffs Prediction Markets - Kalshi vs Polymarket",
  "template": "guide",
  "preview": "Live tracking of NFL playoff prediction markets...",
  "url": "https://slashvibe.dev/a/nfl-playoffs-prediction-markets-kalshi-vs-polymarket-ab1681"
}
```

**Rendering:**
- Template badge: 📘 (guide), 💡 (learning), 🗂️ (workspace)
- Preview: First 120 chars from first paragraph block
- Clickable link to full artifact page

## Storage

✅ Dual-write to both:
- Vercel KV (instant fallback)
- Neon Postgres (primary storage)

## Next Steps

1. Share this artifact with users to demo the feature
2. Create more example artifacts (workspace, learning templates)
3. Add artifact browser to MCP tools for discovery
