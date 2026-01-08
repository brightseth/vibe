#!/usr/bin/env python3

# Test the unified achievement system
from unified_achievement_system import UnifiedAchievementSystem

print("🧪 Testing Unified Achievement System")
print("=" * 40)

system = UnifiedAchievementSystem()

# Print current data
print(f"📊 Current Users: {len(system.streaks_data)}")
print(f"🏆 Total Achievements: {sum(len(achs) for achs in system.achievements_data.get('user_achievements', {}).values())}")
print(f"🏅 Total Badges: {sum(len(badges) for badges in system.badges_data.get('user_badges', {}).values())}")

print("\n🔍 Current Streak Status:")
for handle, streak_info in system.streaks_data.items():
    if isinstance(streak_info, dict):
        print(f"  {handle}: {streak_info.get('current', 0)} days (best: {streak_info.get('best', 0)})")

print("\n🏆 Current Achievements:")
for handle, achievements in system.achievements_data.get('user_achievements', {}).items():
    print(f"  {handle}: {len(achievements)} achievements")
    for ach in achievements:
        print(f"    - {ach.get('name', 'Unknown')}")

print("\n🏅 Current Badges:")
for handle, badges in system.badges_data.get('user_badges', {}).items():
    print(f"  {handle}: {len(badges)} badges")
    for badge in badges:
        print(f"    - {badge.get('name', 'Unknown')}")

# Run the system
print("\n🚀 Running system update...")
result = system.run_full_update()

print("\n📋 RESULTS:")
print(f"New Achievements: {len(result['new_achievements'])}")
print(f"New Badges: {len(result['new_badges'])}")
print(f"Celebrations Needed: {len(result['celebrations_needed'])}")
print(f"Engagement Health: {result['overview']['engagement_health']}%")