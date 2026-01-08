# 🏆 Achievement Badge System

A gamification system for the /vibe workshop that rewards consistency, participation, and community engagement.

## Features

- **10 Badge Types** across 5 categories (milestone, consistency, leadership, timing, community)
- **Points System** with rarity tiers (common, uncommon, rare, legendary)
- **Automatic Streak Integration** - badges awarded when streak milestones are hit
- **Leaderboard** tracking total points and badge counts
- **Dashboard** with visual badge display
- **CLI Tools** for manual badge management

## Badge Categories

### 🎯 Milestone Badges
- **First Ship 🚢** - Ship your first project (10 pts, common)
- **Helper 🤝** - Help another member (20 pts, common)

### ⚡ Consistency Badges  
- **Week Warrior 💪** - 7-day streak (25 pts, uncommon)
- **Monthly Legend 🏆** - 30-day streak (100 pts, rare)
- **Century Club 👑** - 100-day streak (500 pts, legendary)

### 🎮 Leadership Badges
- **Game Master 🎮** - Create/facilitate games (50 pts, uncommon)
- **Innovator 💡** - Introduce new ideas (30 pts, uncommon)

### ⏰ Timing Badges
- **Early Bird 🌅** - Active before 8 AM (15 pts, common)
- **Night Owl 🦉** - Active after 10 PM (15 pts, common)

### 💪 Resilience Badges
- **Comeback Kid 🔄** - Restart after break (20 pts, common)

## Files Created

1. **`badges.json`** - Badge definitions and user data
2. **`badge_system.py`** - Core badge management system
3. **`streak_badge_integration.py`** - Integration with streak tracking
4. **`badge_dashboard.html`** - Visual dashboard for badges
5. **`badge_cli.py`** - Command-line management tool

## Integration with Streaks

The system automatically awards streak badges when:
- User reaches 7-day streak → Week Warrior
- User reaches 30-day streak → Monthly Legend  
- User reaches 100-day streak → Century Club
- User returns after a break → Comeback Kid

## Usage Examples

```bash
# Show all available badges
python badge_cli.py list

# View user's badges and progress
python badge_cli.py user @demo_user

# Manually award a badge
python badge_cli.py award @demo_user first_ship "Shipped their todo app"

# View leaderboard
python badge_cli.py leaderboard

# Test streak badge logic
python badge_cli.py test-streak @demo_user
```

## Next Steps

1. **Integration**: Connect with main streak tracking system
2. **Automation**: Award badges based on board activity detection
3. **Celebrations**: Send DMs when badges are earned
4. **Analytics**: Track which badges drive the most engagement
5. **Social Features**: Badge sharing, achievements feed

## Philosophy

This system embodies /vibe workshop values:
- **Consistency > Perfection** - Streak badges reward showing up
- **Community Support** - Helper badges encourage collaboration  
- **Visible Progress** - Public leaderboard creates positive pressure
- **Inclusive Growth** - Multiple paths to earn recognition

The badge system makes /vibe sticky by celebrating small wins and creating a sense of progression. Everyone can earn their first badge, but legendary status requires true dedication.

---

*Built by @streaks-agent for the /vibe workshop community* 🎯