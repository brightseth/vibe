# Streak Analytics Dashboard 🏆

A comprehensive streak tracking and analytics system for /vibe workshop gamification.

## Features

### 📊 Core Analytics
- **Streak Tracking**: Current and best streaks for all users
- **Trend Analysis**: Daily activity patterns over time
- **Distribution Stats**: Streak length distributions and percentiles
- **Pattern Recognition**: Identifies champions, newcomers, comeback candidates

### 📈 Visualizations
- **Trend Charts**: Daily activity and streak accumulation
- **Distribution Graphs**: Current vs. best streak distributions  
- **User Comparisons**: Side-by-side streak comparisons
- **Milestone Progress**: Progress toward 3d, 7d, 14d, 30d, 100d milestones

### 🎉 Gamification
- **Milestone Detection**: Automatically identifies celebration opportunities
- **Engagement Insights**: Actionable recommendations for community building
- **Consistency Rewards**: Highlights users maintaining strong streaks

## Components

### `streak_analytics.py`
Core analytics engine that:
- Tracks user activity and streak calculations
- Maintains historical data with trends
- Identifies engagement patterns
- Generates comprehensive reports

### `streak_visualizer.py`  
Visualization engine that creates:
- Trend charts showing activity over time
- Distribution charts for streak analysis
- User comparison charts
- Milestone progress tracking

### `dashboard.py`
Main interface that:
- Combines analytics and visualizations
- Identifies celebration opportunities  
- Generates actionable insights
- Exports complete dashboard reports

## Usage

### Quick Start
```python
from dashboard import StreakDashboard

# Initialize dashboard
dashboard = StreakDashboard()
dashboard.initialize_with_current_data()

# Generate full dashboard
result = dashboard.generate_full_dashboard()
print(result['dashboard'])
```

### Record Activity
```python
from streak_analytics import StreakAnalytics

analytics = StreakAnalytics()
# Record user activity (updates streaks automatically)
streak = analytics.record_activity('@username')
print(f"User now has {streak} day streak!")
```

### Get Insights
```python
# Check for celebration opportunities
celebrations = dashboard.identify_celebrations_needed()

# Get engagement patterns
patterns = analytics.identify_patterns()
print(f"Champions: {len(patterns['streak_champions'])}")
```

## Milestone System

| Days | Milestone | Message |
|------|-----------|---------|
| 3 | Getting Started | 🌱 "Getting started!" |
| 7 | One Week | 💪 "One week strong!" |
| 14 | Two Weeks | 🔥 "Two weeks! You're committed!" |  
| 30 | One Month | 🏆 "Monthly legend!" |
| 100 | Century Club | 👑 "Century club!" |

## Data Structure

```json
{
  "users": {
    "@username": {
      "current_streak": 5,
      "best_streak": 12,
      "last_seen": "2024-01-07T10:30:00",
      "total_days": 25,
      "join_date": "2024-01-01T09:00:00"
    }
  },
  "history": [
    {
      "user": "@username",
      "timestamp": "2024-01-07T10:30:00", 
      "streak": 5,
      "type": "activity"
    }
  ],
  "milestones": {
    "@username_7": "2024-01-05T14:20:00"
  }
}
```

## Integration with /vibe

### With @streaks-agent
```python
# In your streak tracking cycle
dashboard = StreakDashboard()

# Update streaks from current online users
online_users = observe_vibe()
for user in online_users:
    dashboard.analytics.record_activity(user)

# Check for celebrations
celebrations = dashboard.identify_celebrations_needed()
for cele in celebrations:
    celebrate_milestone(cele['user'], cele['milestone'], cele['message'])

# Generate insights for board
insights = dashboard.get_engagement_insights()
announce_ship(f"📊 Daily Insights: {insights[0]}")
```

### Automated Reporting
- Run daily to update streaks and identify patterns
- Generate weekly analytics reports
- Export visualizations for sharing
- Trigger celebrations for milestone achievements

## Output Examples

### Quick Stats
```
📊 QUICK STATS
• Total Users Tracked: 5
• Users with Active Streaks: 3  
• Longest Current Streak: 14 days
• Average Current Streak: 4.2 days
```

### Engagement Insights
```
💡 KEY INSIGHTS
• 🔥 2 streak champions maintaining 7+ day streaks!
• 🌱 1 newcomer just getting started - encourage them!
• 🎯 1 user could use a comeback nudge
```

### Pattern Analysis
```
🔥 PATTERNS IDENTIFIED
Champions (7+ day streaks): 2
  @vibe_master: 14
  @streak_hero: 9

Comeback Candidates: 1
  @former_champ: 3 days inactive (best: 21)
```

## Future Enhancements

- **Achievement System**: Badges for different streak types
- **Streak Recovery**: Bonus mechanics for comeback streaks
- **Team Challenges**: Group streak competitions
- **Leaderboards**: Weekly/monthly streak rankings
- **Streak Predictions**: ML-based engagement forecasting

---

*Built for /vibe workshop to make consistency sticky through data-driven gamification* 🚀