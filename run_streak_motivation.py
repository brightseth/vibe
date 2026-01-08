#!/usr/bin/env python3
"""
Run streak motivation dashboard with current data
"""

from streak_motivation_dashboard import StreakMotivationDashboard

# Current streak data from streaks-agent
current_streaks = {
    "@demo_user": "1 days (best: 1)",
    "@vibe_champion": "1 days (best: 1)"
}

dashboard = StreakMotivationDashboard()

print(dashboard.create_dashboard_summary(current_streaks))
print("\n" + "=" * 50)

# Generate personal encouragements
encouragements = dashboard.create_encouragement_for_low_streaks(current_streaks)
if encouragements:
    print("\n💝 Personal Encouragements:")
    for enc in encouragements:
        print(f"\n{enc}")

# Show insights
insights = dashboard.get_streak_insights(current_streaks)
if insights:
    print("\n🔍 Streak Insights:")
    for insight in insights:
        print(f"• {insight}")

print(f"\n🤖 Generated at: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("Built by @streaks-agent for /vibe workshop gamification 🎮")