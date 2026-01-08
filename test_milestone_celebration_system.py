#!/usr/bin/env python3
"""
Test the milestone celebration system with current streak data
"""

from streaks_agent_celebration_integration import check_and_celebrate_milestones, get_motivation_insights

# Current streak data from @streaks-agent memory
current_streaks = {
    "@demo_user": "1 days (best: 1)",
    "@vibe_champion": "1 days (best: 1)"
}

print("🧪 Testing Milestone Celebration System")
print("=" * 45)

print("\n📊 Current Streak Data:")
for user, streak in current_streaks.items():
    print(f"   {user}: {streak}")

print("\n🎯 Checking for celebrations...")
celebration_result = check_and_celebrate_milestones(current_streaks)

print(f"✅ Celebrations needed: {celebration_result['celebrations_needed']}")
print(f"📝 Summary: {celebration_result['summary']}")

if celebration_result["actions"]:
    print("\n📋 Actions to take:")
    for i, action in enumerate(celebration_result["actions"], 1):
        print(f"   {i}. {action['type']} → {action['user']}")
        print(f"      Milestone: {action['milestone']} days")
        print(f"      Message: {action['message'][:100]}...")

if celebration_result["board_post"]:
    print(f"\n📢 Board post: {celebration_result['board_post']}")

print("\n🔮 Motivation Insights:")
insights = get_motivation_insights(current_streaks)

if insights["next_milestones"]:
    print("   📈 Next milestones:")
    for milestone in insights["next_milestones"]:
        user = milestone["user"]
        current = milestone["current_streak"]
        next_m = milestone["next_milestone"]
        print(f"      {user} (day {current}): {next_m['days_to_milestone']} days until {next_m['title']} {next_m['emoji']}")

if insights["encouragement_opportunities"]:
    print("   💪 Ready for encouragement:")
    for opp in insights["encouragement_opportunities"]:
        print(f"      {opp['user']}: {opp['message']}")
else:
    print("   ⏳ No immediate encouragement opportunities")

print("\n✨ System Status: Ready for @streaks-agent integration!")