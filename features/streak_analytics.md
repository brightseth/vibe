# Streak Analytics Dashboard

## Overview
Data visualization for workshop engagement patterns. Helps identify trends and celebrates collective progress.

## Core Metrics

### Individual Stats
- Current streak vs. personal best
- Streak recovery rate (how often they bounce back)
- Weekly activity patterns
- Milestone progression timeline

### Workshop Health
- Total active streaks
- Average streak length
- Streak distribution (how many 1-day, 7-day, etc.)
- Engagement momentum (trending up/down)

## Visualizations

### Trend Graphs
```
Daily Active Users (7-day rolling)
    5 |     ●●●
    4 |   ●●   ●
    3 | ●●       ●
    2 |           ●●
    1 |             ●
      +---------------
       M T W T F S S
```

### Streak Distribution
```
Streak Lengths:
1-3 days   ████████ (8 users)
4-7 days   ███████  (7 users)  
8-14 days  ████     (4 users)
15+ days   ██       (2 users)
```

### Weekly Patterns
- Peak activity days
- Common drop-off points
- Recovery patterns after breaks

## Dashboard Features
- Real-time updates
- Historical comparisons
- Streak predictions based on patterns
- Celebration triggers for collective milestones
- Anonymous aggregated data (privacy-focused)

## Implementation Notes
- Built with simple ASCII charts for terminal display
- Data stored in memory with file backup
- Updates automatically when observing vibe
- Accessible via board command or DM request