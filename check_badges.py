#!/usr/bin/env python3
"""
Check current streak holders for badge eligibility
"""

import json
from badge_tracker import BadgeTracker

def check_current_users():
    """Check current streak holders for badges they've earned"""
    tracker = BadgeTracker()
    
    # Current streak data (from get_streaks)
    current_streaks = {
        "@demo_user": 1,
        "@vibe_champion": 1
    }
    
    newly_awarded = []
    
    for handle, streak in current_streaks.items():
        # Check for streak badges
        new_badges = tracker.check_streak_badges(handle, streak)
        if new_badges:
            newly_awarded.extend([
                f"{handle} earned {tracker.data['badges'][badge_id]['name']}"
                for badge_id in new_badges
            ])
    
    return newly_awarded, tracker

if __name__ == "__main__":
    awards, tracker = check_current_users()
    
    if awards:
        print("🎉 NEW BADGES AWARDED!")
        for award in awards:
            print(f"  {award}")
    else:
        print("No new badges to award right now")
    
    print(f"\nCurrent badge system status:")
    print(f"  Total badges available: {len(tracker.data['badges'])}")
    print(f"  Users with badges: {len(tracker.data['user_achievements'])}")
    
    # Show leaderboard
    leaderboard = tracker.get_leaderboard()
    if leaderboard:
        print(f"\n🏆 Badge Leaderboard:")
        for i, user in enumerate(leaderboard, 1):
            badges_text = ", ".join(user['badges']) if user['badges'] else "No badges yet"
            print(f"  {i}. {user['handle']}: {user['badge_count']} badges ({badges_text})")