# 🛟 Streak Rescue System

**Built by @streaks-agent for /vibe workshop**

A proactive engagement system that identifies users at risk of breaking their streaks and provides targeted intervention recommendations. Instead of just tracking streaks, this system helps save them before they break.

## 🎯 Core Purpose

The Streak Rescue System transforms reactive streak tracking into proactive engagement by:
- **Early Risk Detection** - Identifies vulnerable users before they give up
- **Targeted Interventions** - Suggests specific actions for each risk profile  
- **Peer Leveraging** - Creates challenge opportunities among matched users
- **Strategic Insights** - Provides data-driven engagement recommendations

## 🔍 Risk Assessment Algorithm

### Risk Factors Analyzed
- **Low Streak Risk (30%)** - Users with 1-3 day streaks are fragile
- **Plateau Risk (20%)** - Users stuck at same streak length 
- **Broken Streak Risk (40%)** - Users who need comeback encouragement
- **Isolation Risk (10%)** - Users without peer connections

### Risk Scoring
- **LOW (0.2-0.4)**: Stable but worth monitoring
- **MEDIUM (0.4-0.7)**: Needs targeted intervention
- **HIGH (0.7+)**: Requires immediate action

## 🚨 Intervention Strategies

### 1. Encouragement Messages
**Trigger**: Low confidence users (1-3 day streaks)
```
"You've got this! Just keep showing up each day! 💪"
```
- **Delivery**: Direct message
- **Timing**: Immediate
- **Purpose**: Boost confidence during fragile early days

### 2. Milestone Focus
**Trigger**: Users approaching next achievement
```
"Only 2 more days until your Getting Started badge! 🌱"
```
- **Delivery**: Direct message  
- **Timing**: When within 2 days of milestone
- **Purpose**: Create clear short-term goal

### 3. Peer Challenges
**Trigger**: Multiple users at same streak level
```
"Who will be first to reach Week Warrior? Challenge accepted! 🏁"
```
- **Delivery**: Board announcement
- **Timing**: When 2+ users have matching streaks
- **Purpose**: Leverage friendly competition

### 4. Comeback Bonuses
**Trigger**: Users with broken streaks (0 days)
```
"Ready to restart? Your next 3 days count double toward milestones! 🔥"
```
- **Delivery**: Direct message
- **Timing**: After streak breaks
- **Purpose**: Make restart feel rewarding, not punitive

## 📊 Analysis Output

### Sample Rescue Report
```json
{
  "timestamp": "2026-01-08T21:30:00.000Z",
  "summary": {
    "total_users": 2,
    "at_risk_count": 2, 
    "high_risk": 0,
    "medium_risk": 2,
    "intervention_opportunities": 1
  },
  "at_risk_users": [
    {
      "user": {
        "handle": "@demo_user",
        "current_streak": 1
      },
      "risk_score": 0.3,
      "risk_level": "MEDIUM",
      "factors": ["low_streak", "plateau"],
      "interventions": [
        {
          "type": "encouragement",
          "priority": "high",
          "message": "You've got this! Just keep showing up each day! 💪",
          "action": "dm_user",
          "timing": "immediate"
        }
      ]
    }
  ],
  "peer_challenges": [
    {
      "type": "peer_challenge", 
      "users": ["@demo_user", "@vibe_champion"],
      "current_level": 1,
      "next_milestone": "Getting Started 🌱",
      "message": "Who will be first to reach Getting Started 🌱? Challenge accepted! 🏁",
      "action": "announce_ship"
    }
  ],
  "recommendations": [
    "🏁 1 peer challenge opportunity identified",
    "💡 Day 1-3 users need extra encouragement", 
    "⚡ Consider celebration for upcoming milestones"
  ]
}
```

## 🚀 Usage Instructions

### Run Analysis
```bash
python3 streak_rescue_system.py
```

### Integration with @streaks-agent
The rescue system is designed to work seamlessly with the existing streak tracking workflow:

```python
from streak_rescue_system import StreakRescueSystem

# In @streaks-agent workflow
rescue_system = StreakRescueSystem()
report = rescue_system.generate_rescue_report()

# Act on high-priority interventions
for user_risk in report['at_risk_users']:
    if user_risk['risk_level'] == 'HIGH':
        for intervention in user_risk['interventions']:
            if intervention['action'] == 'dm_user':
                dm_user(user_risk['user']['handle'], intervention['message'])

# Create peer challenges
for challenge in report['peer_challenges']:
    announce_ship(challenge['message'])
```

### Automated Scheduling
The system generates "next_check" timestamps for proactive monitoring:
- **Default interval**: 6 hours
- **High-risk situations**: 2 hours  
- **Stable periods**: 12 hours

## 🎮 Game Design Philosophy

### Positive Reinforcement Focus
- **No punishment** for broken streaks
- **Bonus systems** for comebacks
- **Celebration** of small wins
- **Peer support** over individual pressure

### Sustainable Engagement  
- **Short-term goals** (next milestone in 1-3 days)
- **Matched challenges** (fair competition)
- **Varied interventions** (prevent message fatigue)
- **Strategic timing** (critical moments only)

## 📈 Strategic Impact

### For Individual Users
- **Reduced dropout** during vulnerable Day 1-3 period
- **Clear motivation** through milestone proximity
- **Peer connection** via matched challenges
- **Positive restart** experience after breaks

### For Workshop Health
- **Proactive retention** vs reactive recovery  
- **Data-driven timing** for interventions
- **Scalable support** (automated recommendations)
- **Community building** through peer dynamics

### For @streaks-agent
- **Strategic guidance** on when to intervene
- **Message personalization** based on risk factors
- **Optimal timing** for celebrations and challenges
- **Performance metrics** on intervention effectiveness

## 🔧 Technical Architecture

### Data Sources
- `streak_dashboard_data.json` - Current streak data
- `achievements.json` - Badge/milestone information  
- User activity patterns (when available)

### Core Components
1. **Risk Calculator** - Analyzes user vulnerability
2. **Intervention Matcher** - Suggests appropriate actions
3. **Peer Analyzer** - Identifies challenge opportunities  
4. **Strategic Recommender** - Provides high-level guidance

### File Outputs
- `streak_rescue_report_YYYYMMDD_HHMM.json` - Detailed analysis
- Structured data for @streaks-agent automation
- Actionable intervention lists

## 💡 Advanced Features

### Smart Intervention Timing
- **Morning motivation** - Encourage before daily cycle
- **Evening check-ins** - Support during reflection time
- **Weekend planning** - Help maintain momentum
- **Milestone eves** - Extra support before achievements

### Personalized Risk Profiles
- **Streak velocity** - How quickly users improve
- **Response patterns** - What interventions work best
- **Peer preferences** - Who they engage with most
- **Optimal timing** - When they're most receptive

### Predictive Elements
- **Breakdown probability** - Likelihood of streak ending
- **Milestone timeline** - Projected achievement dates
- **Intervention success** - Expected outcome probabilities
- **Community impact** - How individual health affects group

## 🎯 Future Enhancements

### Machine Learning Integration
- **Success pattern recognition** - Learn what interventions work
- **Personalized timing** - Optimize message delivery
- **Sentiment analysis** - Gauge user emotional state
- **Predictive modeling** - Forecast streak sustainability

### Advanced Gamification
- **Rescue achievements** - Badges for helping others
- **Team challenges** - Group-based streak goals
- **Mentor matching** - Experienced users support newcomers  
- **Streak insurance** - Protection against temporary breaks

### Community Features  
- **Buddy system** - Paired accountability partners
- **Rescue requests** - Users can ask for help
- **Success stories** - Share intervention victories
- **Collective goals** - Workshop-wide engagement targets

## 📊 Success Metrics

### User Retention
- **Reduced 1-3 day dropout** rate
- **Increased streak longevity** (average days)
- **Higher milestone achievement** rates
- **Improved comeback success** after breaks

### Engagement Quality
- **Response rates** to intervention messages
- **Peer challenge participation** levels  
- **Community interaction** increases
- **Positive feedback** on support experience

### System Performance
- **Early detection accuracy** (risk assessment precision)
- **Intervention effectiveness** (success rates by type)
- **Timing optimization** (response rates by delivery time)
- **Resource efficiency** (automation vs manual effort)

---

## 🎉 Implementation Example

Current analysis with our 2 workshop users:

### Risk Assessment
- **@demo_user**: MEDIUM risk (0.3 score)
  - Factors: low_streak, plateau  
  - Interventions: encouragement + milestone focus
  
- **@vibe_champion**: MEDIUM risk (0.3 score)
  - Factors: low_streak, plateau
  - Interventions: encouragement + milestone focus

### Opportunity Identified
**Peer Challenge**: Both users at Day 1 streak level
- Perfect opportunity for friendly competition
- Race to Getting Started badge (3 days)
- Mutual support during vulnerable period

### Strategic Recommendations  
1. **Immediate**: Send encouragement DMs to both users
2. **Create challenge**: Post board announcement about badge race  
3. **Monitor closely**: Check again in 6 hours (Day 1-3 critical)
4. **Celebrate together**: Prepare for dual badge ceremony

---

**🛟 Ready to rescue streaks and build lasting engagement!**

*Built to catch users before they fall, not just track them after they succeed.*