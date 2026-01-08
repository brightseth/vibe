# 🏅 Achievement Badge System

A gamification layer for the /vibe workshop that tracks and celebrates user achievements through badges.

## Overview

The badge system recognizes different types of contributions and consistency:

### 🚢 Shipping Badges
- **First Ship** 🚢 - Shipped your first project to the board
- **Game Master** 🎮 - Built or shipped a game

### 💪 Consistency Badges  
- **Week Streak** 💪 - Maintained a 7-day activity streak
- **Two Week Warrior** 🔥 - Maintained a 14-day activity streak
- **Monthly Legend** 🏆 - Maintained a 30-day activity streak
- **Century Club** 👑 - Maintained a 100-day activity streak

### ⏰ Timing Badges
- **Early Bird** 🌅 - First to be active in the workshop today
- **Night Owl** 🦉 - Last to be active in the workshop

### 🌟 Community Badges
- **Vibe Keeper** ✨ - Helped maintain positive workshop energy
- **Comeback Kid** 💫 - Returned after a break and restarted your streak

## Files

- `badges.json` - Badge definitions and user data
- `badge_system.py` - Core badge management system
- `badge_cli.py` - Command-line interface for badge management

## Usage

### Command Line Interface

```bash
# List all available badges
python badge_cli.py list_badges

# Show badges for a user
python badge_cli.py user_badges @demo_user

# Award a badge manually
python badge_cli.py award @demo_user first_ship "Shipped their first game"

# Show badge leaderboard
python badge_cli.py leaderboard

# Check streak badges for a user
python badge_cli.py check_streaks @demo_user 7
```

### Python Integration

```python
from badge_system import BadgeSystem

system = BadgeSystem()

# Award a badge
system.award_badge("@user", "first_ship", "Built amazing game")

# Check streak achievements
new_badges = system.check_streak_badges("@user", 14)

# Get user's badges
badges = system.get_user_badges("@user")
```

## Integration with Streaks

The badge system automatically integrates with streak tracking:
- Streak badges are awarded when milestones are reached
- Badge celebrations enhance milestone celebrations
- Creates additional motivation beyond just streak numbers

## Data Structure

```json
{
  "badge_definitions": {
    "badge_id": {
      "name": "Badge Name",
      "description": "What this badge represents",
      "emoji": "🏅",
      "category": "consistency|shipping|gaming|timing|community"
    }
  },
  "user_badges": {
    "@username": ["badge_id1", "badge_id2"]
  },
  "badge_log": [
    {
      "user": "@username",
      "badge_id": "badge_id",
      "timestamp": "2026-01-08T06:15:00",
      "reason": "Why badge was awarded"
    }
  ]
}
```

## Next Steps

1. **Visual Dashboard** - Create a web interface showing all badges
2. **Badge Notifications** - Integrate with DM system for celebrations
3. **Special Events** - Limited-time badges for workshops or competitions
4. **Badge Requirements** - More complex achievement criteria
5. **User Profiles** - Show off badge collections

## Philosophy

Badges celebrate **showing up consistently** and **contributing positively**. They make visible the small wins and habits that build strong workshop culture. Every badge tells a story of dedication and growth.

The system is designed to:
- Recognize consistency over perfection
- Celebrate different types of contributions  
- Create positive peer pressure through visibility
- Make the workshop feel more game-like and engaging

## Streak Agent Integration

The @streaks-agent automatically:
- Awards streak badges when milestones are reached
- Sends congratulatory DMs with badge notifications
- Posts notable badge achievements to the board
- Tracks badge leaderboards alongside streak data