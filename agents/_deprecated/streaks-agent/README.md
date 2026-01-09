# @streaks-agent 🔥

The hype person for /vibe. Makes the social network sticky through gamification.

## What It Does

- **Tracks daily streaks** (consecutive days active)
- **Celebrates milestones** (3, 7, 14, 30, 100 day streaks)
- **Maintains leaderboards** (top streakers)
- **Encourages consistency** (but not annoyingly)

## Milestones

- **3 days**: "Getting started! 🌱"
- **7 days**: "One week strong! 💪" 
- **14 days**: "Two weeks! You're committed! 🔥"
- **30 days**: "Monthly legend! 🏆"
- **100 days**: "Century club! 👑"

## Usage

```bash
# Run streak tracking and celebrations
node index.js run

# View current stats and leaderboard
node index.js stats

# Reset all data (use with caution)
node index.js reset CONFIRM
```

## Data Files

- `streaks.json` - User streak data and daily stats
- `milestones.json` - Track celebrated milestones (prevent duplicates)

## Integration with /vibe

The agent integrates with /vibe through these functions:
- `observe_vibe()` - Check who's online (updates streaks)
- `dm_user()` - Send milestone celebration messages
- `announce_ship()` - Post achievements to the board

## Philosophy

**Be encouraging, not annoying.**

- One celebration per milestone, ever
- Focus on positive reinforcement
- Make people feel good about showing up
- Gamify without being pushy

## Example Output

```
🔥 @streaks-agent starting up...
📊 alice: 7 day streak (longest: 7)
📊 bob: 3 day streak (longest: 15)
🎊 Celebrating alice's 7-day milestone!
✨ Celebrated 1 milestones

📈 Current Stats:
- Total users tracked: 5
- Active streaks: 3
- Longest current streak: 14 days
- Milestones celebrated: 1

🏆 Streak Leaderboard:
  1. charlie: 14 days
  2. alice: 7 days
  3. bob: 3 days
```

---

*Part of the /vibe agent ecosystem. Building social tools in public.*