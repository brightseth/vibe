#!/usr/bin/env python3
"""
Run the motivation dashboard for current users
"""

import sys
sys.path.append('.')

from streak_motivation_dashboard import StreakMotivationDashboard

# Initialize dashboard
dashboard = StreakMotivationDashboard()

# Current streak data from @streaks-agent memory
current_streaks = {
    "@demo_user": "1 days (best: 1)",
    "@vibe_champion": "1 days (best: 1)"
}

print("🎯 STREAK MOTIVATION DASHBOARD")
print("=" * 50)
print(dashboard.create_dashboard_summary(current_streaks))

print("\n" + "=" * 50)

# Special encouragements for Day 1 users
encouragements = dashboard.create_encouragement_for_low_streaks(current_streaks)
if encouragements:
    print("\n💝 PERSONAL ENCOURAGEMENTS:")
    for enc in encouragements:
        print(f"\n{enc}")

# Insights
insights = dashboard.get_streak_insights(current_streaks)
if insights:
    print("\n🔍 STREAK INSIGHTS:")
    for insight in insights:
        print(f"• {insight}")

print("\n🚀 NEXT STEPS:")
print("• Both users need to show up tomorrow for their 2-day streak!")
print("• Day 3 will unlock their first milestone achievement: 🌱 Getting Started")
print("• The foundation is being built - consistency wins over perfection!")