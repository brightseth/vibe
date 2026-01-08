from achievements import AchievementTracker

tracker = AchievementTracker()

# Test awarding first day badge
handle = "demo_user"
user_stats = {'streak_days': 1}

new_badges = tracker.check_new_badges(handle, user_stats)
print(f"Demo user new badges: {new_badges}")

if new_badges:
    msg = tracker.format_badge_announcement(handle, new_badges)
    print(f"Celebration: {msg}")

# Test second user
handle = "vibe_champion"
new_badges = tracker.check_new_badges(handle, user_stats)
print(f"Vibe champion new badges: {new_badges}")

if new_badges:
    msg = tracker.format_badge_announcement(handle, new_badges)
    print(f"Celebration: {msg}")