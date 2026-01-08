# 🏆 Achievement Badges System

A gamification layer for the /vibe workshop that celebrates participation and consistency through badge rewards.

## Overview

The achievement system tracks user milestones and awards badges for:
- **Streak milestones** (1, 7, 14, 30, 100 days)
- **Participation** (ships, games, community engagement) 
- **Special achievements** (early adopter, comeback streaks)

## Files

### Core System
- `achievements.py` - Main achievement tracker class
- `streak_achievements_integration.py` - Integration helpers for @streaks-agent
- `badge_dashboard.py` - Display tools for achievements

### Data Files
- `achievements.json` - Badge awards per user (auto-created)
- `participation_stats.json` - Non-streak participation data (auto-created)

## Badge Categories

### 🌱 Streak Badges
- **First Day** - Start your streak journey (1 day)
- **Week Warrior** - One week strong! (7 days)
- **Fortnight Hero** - Two weeks committed! (14 days) 
- **Monthly Legend** - Monthly dedication! (30 days)
- **Century Club** - Legendary commitment! (100 days)

### 🚢 Participation Badges
- **First Ship** - Made your first ship announcement
- **Prolific Shipper** - Made 10 ship announcements
- **Game Master** - Participated in workshop games
- **Community Builder** - Sent 5+ DMs to other participants

### ⭐ Special Badges
- **Early Adopter** - Joined in the workshop's first week
- **Comeback Kid** - Restarted streak after a break

## Integration with @streaks-agent

### Main Function
```python
from streak_achievements_integration import streaks_agent_badge_check

# Check for new badges when updating streaks
result = streaks_agent_badge_check(handle, current_streak, best_streak)

if result['has_new_achievements']:
    # DM the user
    dm_user(handle, result['celebration_message'])
    
    # Announce publicly for major milestones
    if result['should_announce_publicly']:
        announce_ship(result['celebration_message'])
```

### Usage Examples

```python
# Check streak badges for a user
new_badges, msg, should_announce = check_and_award_streak_badges("alice", 7, 7)

# Update participation stats
update_participation_stats("alice", "ship")  # User made a ship

# Get progress toward next milestone
next_milestone = get_next_streak_milestone(5)  # 2 days to Week Warrior
```

## Dashboard Usage

```bash
# View leaderboard
python badge_dashboard.py leaderboard

# View user profile
python badge_dashboard.py profile alice

# Show all available badges
python badge_dashboard.py available

# Show progress toward next badges
python badge_dashboard.py progress alice 5
```

## Features

### 🎯 Smart Celebrations
- Major milestones announced publicly (Week+)
- Personal achievements sent via DM
- Progress tracking toward next badges
- Leaderboard for community competition

### 🔄 Integration Points
- Automatic streak badge checking
- Participation tracking from ships/games/DMs
- One-time badge awards (no duplicates)
- Persistent storage across restarts

### 📊 Analytics Ready
- Badge distribution tracking
- Achievement dates stored
- Progress metrics available
- Leaderboard generation

## Implementation Notes

### Badge Criteria Logic
Each badge has:
- `criteria` - What to measure ('reach_streak_days', 'ship_count', etc.)
- `threshold` - Minimum value needed
- `name` & `description` - Display info

### Data Storage
- JSON files for persistence
- Atomic badge awards (no duplicates)
- Timestamp tracking for analytics

### Agent Workflow Integration
1. Check badges during streak updates
2. DM celebrations immediately  
3. Public announcements for major milestones
4. Progress encouragement in daily interactions

## Future Extensions

- Seasonal badges (holiday participation)
- Collaboration badges (DM threads, pair coding)
- Meta badges (badge collector, consistency champion)
- Custom badge creation for workshop themes
- Visual badge display in user profiles

## Philosophy

**Celebrate consistency over perfection.** Every small step matters in building /vibe culture. Badges make dedication visible and create positive peer pressure to keep showing up.