# 🏅 Achievement Badges System

A gamification system to reward workshop participants for their engagement and consistency.

## Features

- **6 Achievement Badges** across 6 tiers (Bronze to Diamond + Special)
- **Automatic Badge Detection** for streaks and milestones
- **Badge Leaderboard** with point system
- **Beautiful Display** with emojis and tier colors
- **Persistent Storage** in JSON format

## Available Badges

### 🚢 First Ship (Bronze - 10 points)
Shipped your first project to the workshop!

### 💪 Week Warrior (Silver - 25 points) 
Maintained a 7-day activity streak!

### 🎮 Game Master (Gold - 50 points)
Created or participated in workshop games!

### 🔥 Consistency Champion (Platinum - 100 points)
Maintained a 30-day streak!

### 👑 Century Club (Diamond - 250 points)
Achieved the legendary 100-day streak!

### 🌟 Community Builder (Special - 75 points)
Helped others and fostered positive vibes!

## Usage

### Command Line Interface
```bash
python badge_display.py
```

Interactive menu with options to:
- View all available badges
- Check user badges  
- See leaderboard
- Simulate awards for demo

### Programmatic Usage

```python
from badge_system import BadgeSystem

# Initialize system
badge_system = BadgeSystem()

# Award a badge
badge_system.award_badge('@user', 'first_ship', 'Shipped awesome project!')

# Check streak badges automatically
new_badges = badge_system.check_streak_badges('@user', 7)  # 7-day streak

# Get user's badges
user_badges = badge_system.get_user_badges('@user')

# Get leaderboard
leaderboard = badge_system.get_leaderboard()
```

### Integration with Streaks

The badge system automatically integrates with the existing streak system:

```python
# In your streak update code:
from badge_system import check_and_award_streak_badges

# After updating a streak
new_badges = check_and_award_streak_badges(user, streak_days)
if new_badges:
    # Celebrate the new badges!
    pass
```

## Files

- `badges.json` - Badge definitions and user awards
- `badge_system.py` - Core badge system class
- `badge_display.py` - CLI for viewing and managing badges
- `README_badges.md` - This documentation

## Integration Points

1. **Streak Updates** - Automatically check for streak milestone badges
2. **Board Announcements** - Award "First Ship" badge on first announcement
3. **Game Participation** - Award "Game Master" badge for game activities
4. **Community Engagement** - Manual awards for helpful behavior

## Future Enhancements

- Badge notifications in DMs
- Seasonal/event badges
- Badge trading system
- Custom badge creation
- Integration with external achievements

## Badge Psychology

The system is designed around positive reinforcement:
- **Immediate Recognition** - Badges awarded instantly
- **Visible Progress** - Clear milestone progression  
- **Social Status** - Public leaderboard and badge display
- **Achievable Goals** - Multiple difficulty levels
- **Meaningful Rewards** - Badges tied to valuable behaviors

Ready to start earning badges! 🎯