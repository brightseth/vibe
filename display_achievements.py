#!/usr/bin/env python3
"""
Achievement Display System for /vibe workshop
Shows user badges and recent achievements
"""

from achievement_tracker import AchievementTracker
import json

def main():
    tracker = AchievementTracker()
    
    print("🏆 WORKSHOP ACHIEVEMENTS 🏆\n")
    
    # Show leaderboard
    leaderboard = tracker.get_leaderboard()
    if leaderboard:
        print("📊 Badge Leaderboard:")
        for i, user in enumerate(leaderboard, 1):
            badge_display = " ".join([f"{badge['emoji']}" for badge in user['badges']])
            print(f"{i}. {user['handle']}: {user['badge_count']} badges {badge_display}")
        print()
    else:
        print("📊 No badges awarded yet - be the first to earn one!\n")
    
    # Show recent achievements
    recent_achievements = tracker.data["achievement_log"][-5:] if tracker.data["achievement_log"] else []
    if recent_achievements:
        print("🎉 Recent Achievements:")
        for achievement in reversed(recent_achievements):
            badge = tracker.data["badges"][achievement["badge_id"]]
            print(f"   {badge['emoji']} {achievement['handle']} earned \"{badge['name']}\"")
        print()
    
    # Show available badges
    print("🎯 Available Badges:")
    for badge_id, badge in tracker.data["badges"].items():
        print(f"   {badge['emoji']} {badge['name']}: {badge['description']}")
    
    print("\n✨ Keep building to unlock achievements!")

if __name__ == "__main__":
    main()