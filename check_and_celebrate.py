#!/usr/bin/env python3

# Direct achievement award and check
from achievements import AchievementTracker

tracker = AchievementTracker()

# Check current users for First Day badge
users = [("demo_user", 1, 1), ("vibe_champion", 1, 1)]

for handle, current_streak, best_streak in users:
    print(f"\nChecking {handle}...")
    
    user_stats = {'streak_days': current_streak, 'best_streak': best_streak}
    new_badges = tracker.check_new_badges(handle, user_stats)
    
    if new_badges:
        msg = tracker.format_badge_announcement(handle, new_badges)
        print(f"🎉 NEW BADGE: {msg}")
        print(f"Badges awarded: {new_badges}")
    else:
        existing = tracker.get_user_badges(handle)
        if existing:
            print(f"Already has badges: {[b['name'] for b in existing]}")
        else:
            print("No badges yet awarded")

print(f"\nCelebration messages ready for DMs!")