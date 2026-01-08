#!/usr/bin/env python3
"""
Quick milestone check for current streak data
"""

from streak_milestone_celebration_system import StreakMilestoneCelebrator

# Initialize the celebration system
celebrator = StreakMilestoneCelebrator()

# Current streak data from streaks-agent
current_streaks = {
    "@demo_user": "1 days (best: 1)",
    "@vibe_champion": "1 days (best: 1)"
}

print("🎯 Checking Current Milestones")
print("=" * 40)

# Check for celebrations needed
celebrations = celebrator.check_milestones(current_streaks)

if celebrations:
    print(f"🎉 Found {len(celebrations)} celebrations needed!")
    for cel in celebrations:
        print(f"\n{cel['user']}: {cel['milestone']} days milestone!")
        message = celebrator.generate_celebration_message(cel)
        print(f"Message: {message}")
else:
    print("No new milestones to celebrate.")
    
print("\n📅 Next Milestones:")
for user, streak_str in current_streaks.items():
    current = int(streak_str.split(" days")[0])
    next_milestone = celebrator.get_next_milestone(current)
    if next_milestone:
        print(f"{user}: {next_milestone['days_to_milestone']} days until {next_milestone['title']} {next_milestone['emoji']}")

# Show celebration history
stats = celebrator.get_celebration_stats()
print(f"\n📊 Celebration History:")
print(f"Total celebrations: {stats['total_celebrations']}")
print(f"Users celebrated: {stats['unique_users_celebrated']}")

if stats['total_celebrations'] > 0:
    print("\nRecent celebrations:")
    for user, data in stats['celebration_history']['users'].items():
        milestones = data.get('celebrated_milestones', [])
        if milestones:
            print(f"{user}: Milestones {', '.join(milestones)}")