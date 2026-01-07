# Streak Analytics Dashboard

A comprehensive analytics system for tracking and analyzing user engagement streaks in /vibe workshop.

## Features

### 📊 Distribution Statistics
- Total users and active streaks
- Average current vs best streaks  
- Longest streaks (current and all-time)
- Streak range distribution (1-3 days, 4-7 days, etc.)

### 🔍 Pattern Recognition
- **Consistent Performers**: Users maintaining 80%+ of their best streak
- **Comeback Candidates**: Users with broken streaks who had good runs before
- **Milestone Approachers**: Users within 2 days of major milestones (7, 14, 30, 100)
- **New Users**: Users with best streaks ≤ 3 days

### 💡 Actionable Insights
- Engagement health assessment
- Gamification opportunity identification
- Specific user actions to take
- Community momentum tracking

## Usage

### Basic Analytics
```python
from streak_analytics import StreakAnalytics

# Your streak data (from get_streaks())
streaks_data = {
    "@user1": {"current": 5, "best": 12},
    "@user2": {"current": 0, "best": 8}
}

analytics = StreakAnalytics(streaks_data)
report = analytics.generate_report()
print(report)
```

### Quick Dashboard
```bash
python dashboard.py
```

### Integration with Streak Agent
The analytics can be integrated into the main streak tracking workflow:

1. **Daily Review**: Run analytics to identify users needing attention
2. **Milestone Preparation**: Spot users approaching milestones 
3. **Engagement Campaigns**: Target comeback candidates
4. **Community Health**: Track overall participation trends

## Key Metrics

### Engagement Health
- **Active Streak Rate**: % of users with current streaks > 0
- **Average Streak Length**: Community engagement depth
- **Retention Rate**: Users maintaining streaks over time

### Milestone Tracking
- Users approaching 7, 14, 30, 100 day milestones
- Automatic celebration preparation
- Momentum building opportunities

### Pattern Detection
- Identify users needing encouragement
- Spot consistent performers to highlight
- Find re-engagement opportunities

## Analytics-Driven Actions

### For Milestone Approachers
```python
# DM users close to milestones
# Prepare celebration messages
# Create anticipation
```

### For Comeback Candidates  
```python
# Gentle re-engagement DMs
# Highlight past achievements
# Lower barriers to restart
```

### For Consistent Performers
```python
# Public recognition
# Community role models
# Advanced challenges
```

## Future Enhancements

1. **Trend Analysis**: Week-over-week streak changes
2. **Cohort Analysis**: New user retention patterns
3. **Seasonal Patterns**: Identify engagement cycles
4. **Predictive Models**: Forecast streak breaks
5. **Gamification Metrics**: Achievement unlock rates

## Data Privacy

- Analytics focus on aggregate patterns
- Individual insights used for positive engagement only
- No tracking of private activities
- All data used to improve community experience