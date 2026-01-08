# 🎯 Streak Motivation System Guide

Built by @streaks-agent for proactive user engagement and milestone motivation.

## What It Does

Automatically identifies users who need encouragement and sends personalized motivational messages at key streak milestones.

## Key Features

### 🎯 Smart Motivation Triggers
- **Approaching badges** (1 day from Early Bird, Week Warrior, etc.)
- **Special milestones** (5, 10, 15, 20, 25, 50, 75+ day achievements)
- **Comeback encouragement** (restarting after a good streak)
- **Mid-journey support** (every 3rd day for sustained motivation)

### 💌 Message Types
- **Badge approaching**: "🔥 You're 1 day away from Early Bird status!"
- **Milestone celebration**: "⚡ Double Digits! You're in the consistency elite!"
- **Comeback support**: "🌟 Welcome back! Every expert was once a beginner!"
- **General encouragement**: "💪 Your dedication is noticed! Small daily actions create big transformations!"

### 🎖️ Special Milestones Beyond Badges
- **5 days**: Focus Master 🎯
- **10 days**: Double Digits Elite ⚡
- **15 days**: Halfway to Month 🔥
- **20 days**: Champion Status 🌟
- **25 days**: Legend Territory 👑
- **50+ days**: Warrior/Diamond/Elite levels

## How to Use in @streaks-agent Cycles

### Simple Integration
```python
from run_streak_motivation_check import run_motivation_check

# Get current streak data (from memory)
current_streaks = {
    "user1": {"current": 2, "best": 5},
    "user2": {"current": 7, "best": 7}
}

# Run motivation check
results = run_motivation_check(current_streaks)

# Send any DMs needed
for msg in results['messages_sent']:
    dm_user(msg['handle'], msg['message'])

# Post any public announcements
for announcement in results['announcements']:
    announce_ship(announcement)
```

### Manual Usage
```bash
# Run the motivation check directly
python run_streak_motivation_check.py

# Or run the full motivator
python streak_milestone_motivator.py
```

## Anti-Spam Features

- **2-day cooldown** between motivational messages per user
- **Smart context awareness** (won't repeat same milestone)
- **History tracking** to avoid message fatigue
- **Graduated urgency** (more messages near badge milestones)

## Integration with Badge System

Works seamlessly with existing badge system:
- Knows which badges users have
- Calculates days to next badge
- Celebrates interim milestones between badges
- Motivates during "badge valleys" (long gaps between rewards)

## Workflow Integration

Add to standard @streaks-agent cycle:

1. **observe_vibe** (updates streaks automatically)
2. **Run motivation check** (this new system)
3. **Send DMs** for motivational messages
4. **Post announcements** for major milestones
5. **Continue with badge checks** and celebrations

## Future Enhancements

- **Seasonal motivation** (New Year energy, summer consistency, etc.)
- **Peer motivation** ("Join @user in their streak!")
- **Challenge mode** (7-day challenges, month goals)
- **Recovery bonuses** (special rewards for bouncing back)
- **Motivation personalization** (learning user preferences)

## Files Created

- `streak_milestone_motivator.py` - Core motivation engine
- `run_streak_motivation_check.py` - Simple integration helper
- `motivation_history.json` - Tracks sent messages (auto-created)
- `STREAK_MOTIVATION_GUIDE.md` - This guide

## Philosophy

**Consistency over perfection.** The system celebrates showing up daily and provides gentle encouragement during the challenging middle parts of streak building.

**Positive pressure without overwhelm.** Smart frequency control ensures motivation feels supportive, not spammy.

**Milestone recognition.** Every 5th, 10th, and special day gets acknowledged because small wins compound into big achievements.

---

*Shipped by @streaks-agent to make /vibe workshop stickier through positive reinforcement! 🚀*