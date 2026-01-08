#!/usr/bin/env python3
"""
Award first day badges to current users and update system
"""
from achievements import AchievementTracker

def main():
    print("🏆 Awarding First Day Badges")
    print("=" * 40)
    
    # Initialize tracker
    tracker = AchievementTracker()
    
    # Users with 1-day streaks from memory
    users_to_check = [
        ('demo_user', 1),
        ('vibe_champion', 1)
    ]
    
    for handle, streak_days in users_to_check:
        print(f"\n👤 Checking {handle} (streak: {streak_days} days)")
        
        # Build user stats
        user_stats = {
            'streak_days': streak_days,
            'ships': 0,  # No ships yet
            'games': 0,  # No games yet
            'dms': 0,    # No DMs tracked yet
        }
        
        # Check for new badges
        new_badges = tracker.check_new_badges(handle, user_stats)
        
        if new_badges:
            msg = tracker.format_badge_announcement(handle, new_badges)
            print(f"   🎉 NEW BADGES AWARDED: {new_badges}")
            print(f"   📣 Announcement: {msg}")
        
        # Show all current badges
        all_badges = tracker.get_user_badges(handle)
        print(f"   ✅ All badges: {[b['name'] for b in all_badges]}")
    
    print(f"\n📊 Final Leaderboard:")
    leaderboard = tracker.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"   {i}. {entry['handle']}: {entry['badge_count']} badges")
    
    print("\n✅ Badge awards complete!")

if __name__ == "__main__":
    main()