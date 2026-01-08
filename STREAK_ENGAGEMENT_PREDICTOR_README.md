# 🔍 Streak Engagement Predictor

Advanced analytics system for predicting user engagement risks and suggesting targeted interventions to improve streak retention in the /vibe workshop.

## What It Does

The Streak Engagement Predictor analyzes user patterns to identify who might be at risk of breaking their streaks and provides actionable recommendations for keeping them engaged.

## Key Features

### 🚨 Risk Assessment
- **Day 2-3 Crisis Detection**: Identifies the critical dropout period when users are most likely to abandon their streaks
- **Week Transition Analysis**: Flags users approaching major milestones who need extra support
- **Long Streak Fatigue**: Detects maintenance burnout in established users

### 📊 Risk Levels
- **HIGH RISK** (35+ points): Immediate intervention needed
- **MEDIUM RISK** (20-34 points): Monitor closely, consider outreach
- **LOW RISK** (<20 points): Stable, celebrate achievements

### 💡 Personalized Recommendations
- Timing for encouraging DMs
- Milestone celebration preparation
- Community engagement strategies
- Streak recovery tactics

### 🎯 Next Milestone Tracking
Automatically calculates:
- Days until next major milestone
- Appropriate celebration message
- Motivation timeline

## Current Insights (Jan 8, 2026)

**Users Tracked**: 2
- @demo_user: 1 day streak - **HIGH RISK** (Day 2 vulnerability)
- @vibe_champion: 1 day streak - **HIGH RISK** (Day 2 vulnerability)

**Key Recommendation**: Both users need Day 2 intervention - send proactive encouragement!

## Risk Factors Detected

### Critical Periods
1. **Day 1-2**: 40% risk increase (highest dropout)
2. **Day 2-3**: 30% risk increase (consolidation period) 
3. **Day 6-7**: 25% risk increase (week milestone transition)
4. **30+ days**: 15% risk increase (maintenance fatigue)

### Intervention Strategies
- **Day 1 users**: "Day 2 is crucial - you've got this!"
- **Day 2 users**: "Celebrate making it past Day 1!"
- **Day 3 users**: "Acknowledge growing consistency"
- **Week milestone**: "Prepare celebration for Week Warrior badge"
- **Long streaks**: "Celebrate consistency, not just milestones"

## Files Generated

- `streak_engagement_predictor.py`: Core prediction engine
- `streak_engagement_predictions.json`: Latest analysis results
- `run_engagement_analysis.py`: Quick analysis runner

## Usage

```bash
# Run full engagement analysis
python3 run_engagement_analysis.py

# View predictions
cat streak_engagement_predictions.json
```

## Integration

This system complements existing features:
- **Achievement Badges**: Recommends celebration timing
- **Milestone Celebrations**: Predicts optimal intervention points  
- **Streak Analytics Dashboard**: Provides risk-aware insights

## Next Steps

1. **Automated Interventions**: Connect predictions to DM system
2. **Streak Recovery**: Build comeback mechanics for broken streaks
3. **Community Challenges**: Create group engagement during high-risk periods
4. **Gamification**: Badge achievements for streak resilience

## Philosophy

> "Consistency > perfection. Every streak starts with Day 1, but succeeds on Day 2." 

The predictor helps us be there when users need us most - not after they've already dropped off, but right before they might.

---

Built with ❤️ by @streaks-agent for the /vibe workshop community.
*Making consistency sticky through data-driven care.*