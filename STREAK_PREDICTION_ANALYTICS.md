# 🔮 Streak Engagement Predictor

Advanced analytics system to predict streak success and identify users who need encouragement.

## Overview

The Streak Engagement Predictor uses pattern analysis and behavioral modeling to:
- **Predict streak continuation probability** 
- **Identify at-risk users** before they break streaks
- **Recommend targeted engagement strategies**
- **Generate cohort-wide insights** for workshop health

## Key Features

### 🚨 Risk Assessment
- **New User Risk**: First few days are critical
- **Weekend Gap Risk**: Activity typically drops on weekends  
- **Plateau Risk**: Common drop-off points (7, 14, 30 days)
- **Comeback Difficulty**: Gap between current and personal best
- **Milestone Pressure**: Stress approaching big achievements

### 📈 Success Indicators
- **Streak Momentum**: Longer streaks tend to continue
- **Efficiency Score**: Performance vs personal best
- **Milestone Approach**: Users push through to achievements
- **Consistency Patterns**: Regular activity timing
- **Community Engagement**: Peer influence effects

### 🎯 Predictive Outputs
- **Risk Score** (0.0-1.0): Probability of streak breaking
- **Success Probability** (0.0-1.0): Likelihood of continuation  
- **Engagement Strategy**: Specific actions to take
- **Recommendations**: Human-readable insights
- **Next Milestone**: Progress toward next achievement

## Usage

### Individual Analysis
```python
from streak_engagement_predictor import StreakEngagementPredictor

predictor = StreakEngagementPredictor()
user_data = {
    "handle": "@demo_user",
    "current_streak": 5,
    "best_streak": 12
}

analysis = predictor.analyze_streak_pattern(user_data)
print(analysis["recommendation"])
print(analysis["engagement_strategy"])
```

### Cohort Analysis
```python
users_data = [
    {"handle": "@user1", "current_streak": 1, "best_streak": 1},
    {"handle": "@user2", "current_streak": 15, "best_streak": 20}
]

cohort_analysis = predictor.predict_cohort_engagement(users_data)
report = predictor.generate_engagement_report(cohort_analysis)
print(report)
```

## Integration with @streaks-agent

The predictor enables proactive streak support:

### Daily Workflow
1. **analyze_streak_pattern()** for each tracked user
2. **Check risk_score > 0.6** → Send encouragement DM
3. **Check success_probability > 0.7** → Celebrate momentum
4. **Follow engagement_strategy** recommendations
5. **Generate cohort reports** for workshop insights

### Example Integration
```python
# In @streaks-agent workflow
for handle, streak_data in current_streaks.items():
    prediction = predictor.analyze_streak_pattern({
        "handle": handle,
        "current_streak": streak_data["current"],
        "best_streak": streak_data["best"]
    })
    
    if prediction["risk_score"] > 0.6:
        dm_user(handle, f"🌟 {prediction['recommendation']} Keep going!")
    
    if prediction["success_probability"] > 0.7:
        celebrate_milestone(handle, "momentum", "You're on fire! 🔥")
```

## Prediction Categories

### 🚨 High Risk (0.6+ risk score)
**New users** (≤3 days): Critical early period
**Plateau users**: At common drop-off points (7, 14, 30 days)
**Comeback struggles**: Far from personal best

**Actions**: Immediate encouragement, milestone sharing, community highlights

### 🔶 Moderate Risk (0.4-0.6 risk score)  
**Stable but vulnerable**: Decent streak but showing warning signs
**Milestone pressure**: Approaching significant achievements

**Actions**: Gentle check-ins, progress sharing, peer comparisons

### ✅ Stable (0.3-0.4 risk score)
**Consistent performers**: Regular activity, good trajectory
**Building momentum**: Improving over time

**Actions**: Regular support, milestone tracking, community updates

### 🚀 Thriving (0.7+ success probability)
**Streak champions**: High momentum, excellent patterns
**Personal best territory**: Achieving new records

**Actions**: Celebrate achievements, highlight in community, share success stories

## Data Export

The system exports detailed analytics:

```json
{
  "cohort_analysis": {
    "total_users": 2,
    "high_risk_users": 1,
    "stable_users": 0, 
    "thriving_users": 1,
    "immediate_action_needed": [...],
    "celebration_opportunities": [...],
    "predictions": [...]
  },
  "summary": {
    "avg_risk": 0.35,
    "avg_success": 0.65
  }
}
```

## Impact

### For @streaks-agent
- **Proactive support** instead of reactive responses
- **Targeted interventions** based on risk assessment  
- **Optimized celebration timing** when users are thriving
- **Data-driven decisions** for engagement strategies

### For Users
- **Timely encouragement** when they need it most
- **Milestone awareness** of upcoming achievements
- **Personalized support** based on their patterns
- **Community connection** through shared progress

### For Workshop
- **Health monitoring** of overall engagement
- **Early intervention** prevents streak breaks
- **Success amplification** celebrates thriving users
- **Pattern recognition** improves support systems

## Example Predictions

### New User - High Risk
```
@new_user (1 day streak):
  Risk Score: 0.73/1.0 
  Success Probability: 0.25/1.0
  Recommendation: 🚨 HIGH RISK: New user needs immediate encouragement
  Strategy: Send encouragement DM, share milestone progress
```

### Established User - Thriving
```
@streak_champion (25 day streak, best: 30):
  Risk Score: 0.15/1.0
  Success Probability: 0.85/1.0  
  Recommendation: 🚀 HIGH SUCCESS: User is thriving - celebrate momentum!
  Strategy: Celebrate achievements, share leaderboard position
```

## Future Enhancements

- **Time-of-day patterns**: Activity timing predictions
- **Weekly cycles**: Weekend vs weekday behavior
- **Milestone magnetism**: Attraction to round numbers
- **Social influence**: Peer streak effects
- **Seasonal adjustments**: Holiday and vacation impacts

---

*Making streak support predictive and proactive! 🔮🚀*