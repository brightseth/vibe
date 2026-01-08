#!/usr/bin/env python3
"""
Quick badge check and award for current users
"""

from achievements import AchievementTracker

# Initialize tracker
tracker = AchievementTracker()

print("🏆 Quick Badge Check for Current Users")
print("=" * 50)

# Check badge definitions
print("\n📋 Available Badge Definitions:")
for badge_id, badge_def in tracker.badge_definitions.items():
    print(f"  {badge_id}: {badge_def['name']} (threshold: {badge_def['threshold']})")

# Users with 1-day streaks should get first_day badge
users = [("demo_user", 1), ("vibe_champion", 1)]

for handle, streak_days in users:
    print(f"\n👤 Checking {handle} (streak: {streak_days} days)")
    
    # Build user stats
    user_stats = {'streak_days': streak_days}
    
    # Check for new badges
    new_badges = tracker.check_new_badges(handle, user_stats)
    
    if new_badges:
        msg = tracker.format_badge_announcement(handle, new_badges)
        print(f"   🎉 NEW BADGE: {msg}")
    else:
        # Check current badges
        current_badges = tracker.get_user_badges(handle)
        if current_badges:
            print(f"   ✅ Has {len(current_badges)} badges: {[b['name'] for b in current_badges]}")
        else:
            print(f"   ❌ No badges yet")

print("\n" + "=" * 50)