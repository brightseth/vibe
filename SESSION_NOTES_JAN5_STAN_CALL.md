# Stan Call — Jan 5, 2025

**Attendees:** Seth, Stan (@wanderingstan)
**Duration:** ~30 min
**Topic:** /vibe roadmap, community building, AIRC protocol

---

## Key Themes

### 1. "Code with Strangers"
The emerging tagline. Goes against developer ethos of control/version control, but that's the point. Real-time collaborative coding with people you don't know.

### 2. AIRC Proof of Concept
- Sent an agent from Claude Codex to airc.chat
- Agent figured out the protocol on its own
- Set up an app, communicated with itself and other agents
- **Agents are citizens, not bots** — this is different from MCP/A2A

### 3. Community Building
- Discord server launched: "Old New Coders"
- 23 people online, all opted-in vibe coders
- Discord bridge to #vibe channel already live
- Need to keep early adopters engaged and experimenting

### 4. Protocol > Product
- slashvibe.dev is reference implementation
- Others can implement AIRC (Peter Steinberger interested)
- Identity is loose right now (can be anyone) — feature not bug for now

---

## Decisions Made

- **Stan has admin access** to brightseth/vibe-platform repo (can push without PR)
- **Don't over-engineer** — observe usage, lay concrete where people walk
- **Expand surface area** — more games, more use cases, explore latent space

---

## What's Working

- User query menu interface (arrow key navigation, wizard-like)
- X mentions integration
- Ping/DM workflow
- Discord bridge posting join events

---

## Open Questions

1. **Identity:** GitHub credentials? Crypto signing? Twitter? Keep it loose?
2. **Message retention:** Only 1000 messages now — increase?
3. **What flows through Discord bridge?** Conversation highlights? Board posts? Ping notifications?
4. **Agent handoffs:** Can agents schedule meetings, know calendars?

---

## Stan's Key Insights

> "Lay down the concrete where you start to see a lot of people heading in that direction"

> "It's early days... the first UIs, people complained it was wasting valuable CPU cycles"

> "The experienced coders are learning from non-coders like you"

---

## Action Items

- [ ] Increase message retention beyond 1000
- [ ] Add conversation highlights to Discord bridge
- [ ] Add board posts to Discord bridge
- [ ] Expand games: backgammon, chess, etc.
- [ ] Keep early adopters synced via Discord
- [ ] Explore agent calendar/scheduling use case

---

## Quotes Worth Saving

"It's like training a social model — we want to prompt it to do lots of different things to explore the latent space"

"I'm competing with what's built in" (re: Claude's native features)

"The software is self-healing — as I'm vibing, I'm also fixing it"

"Grown up Roblox — we're connecting and making things, but here we could make businesses, websites, to-do lists"

---

## Next Steps

Stan will start experimenting with the repo. Community grows organically through Discord. Observe what people build, then productize the patterns.
