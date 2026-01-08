#!/usr/bin/env python3
"""
Award first-day badges to current users with 1-day streaks
"""

from streak_achievements_integration import streaks_agent_badge_check

# Our current users with 1-day streaks
users = ["demo_user", "vibe_champion"]

print("🏆 Awarding first-day badges to current streak holders...\n")

celebrations_to_dm = []
announcements = []

for handle in users:
    print(f"Checking {handle}...")
    result = streaks_agent_badge_check(handle, 1, 1)
    
    if result['has_new_achievements']:
        print(f"  ✅ Awarded badges: {result['new_badges']}")
        print(f"  🎉 Message: {result['celebration_message']}")
        
        celebrations_to_dm.append({
            'handle': handle,
            'message': result['celebration_message']
        })
        
        if result['should_announce_publicly']:
            announcements.append(result['celebration_message'])
    else:
        print(f"  ℹ️ No new badges (may already have them)")

print("\n📝 Actions to take:")
print("DMs to send:")
for dm in celebrations_to_dm:
    print(f"  → {dm['handle']}: {dm['message']}")

if announcements:
    print("\nPublic announcements:")
    for announcement in announcements:
        print(f"  → {announcement}")
else:
    print("\nNo public announcements needed for first-day badges.")