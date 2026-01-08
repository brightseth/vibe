#!/usr/bin/env python3

from achievements import AchievementTracker

# Initialize the achievement tracker
tracker = AchievementTracker()

# Check current badge status
print("Current achievements data:")
print(tracker.achievements)

# Check what badges demo_user would get with 1-day streak
user_stats = {'streak_days': 1}
new_badges = tracker.check_new_badges('demo_user', user_stats)
print(f"\nDemo user new badges: {new_badges}")

# Check what badges vibe_champion would get
new_badges_vc = tracker.check_new_badges('vibe_champion', user_stats)
print(f"Vibe champion new badges: {new_badges_vc}")

# Show updated achievements
print(f"\nUpdated achievements:")
print(tracker.achievements)