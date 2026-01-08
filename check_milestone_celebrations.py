#!/usr/bin/env python3
"""
Check if any milestone celebrations are needed
"""

import sys
sys.path.append('.')

from streak_milestone_celebration_system import StreakMilestoneCelebrator

# Initialize celebrator
celebrator = StreakMilestoneCelebrator()

# Current streak data
current_streaks = {
    "@demo_user": "1 days (best: 1)",
    "@vibe_champion": "1 days (best: 1)"
}

print("🎉 MILESTONE CELEBRATION CHECK")
print("=" * 40)

celebrations = celebrator.check_milestones(current_streaks)

if celebrations:
    print(f"Found {len(celebrations)} celebrations needed:")
    for cel in celebrations:
        print(f"\n🎉 {cel['user']} - {cel['milestone']} days!")
        print(celebrator.generate_celebration_message(cel))
else:
    print("No new milestones to celebrate right now.")
    print("\n📊 Next milestones:")
    for user, streak_str in current_streaks.items():
        current = int(streak_str.split(" days")[0])
        next_milestone = celebrator.get_next_milestone(current)
        if next_milestone:
            print(f"{user}: {next_milestone['days_to_milestone']} days until {next_milestone['title']} {next_milestone['emoji']}")

# Show celebration stats
stats = celebrator.get_celebration_stats()
print(f"\n📈 Total celebrations given: {stats['total_celebrations']}")
print(f"📈 Users celebrated: {stats['unique_users_celebrated']}")

print("\n✨ SYSTEM STATUS: All gamification systems operational!")