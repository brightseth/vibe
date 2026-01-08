#!/usr/bin/env python3
"""
Demo the Streak Analytics Dashboard
Shows current status and launches dashboard server
"""

import json
import os
from datetime import datetime

def display_current_analytics():
    """Display current streak analytics"""
    print("🔥 STREAK ANALYTICS DASHBOARD DEMO")
    print("=" * 50)
    
    # Load current streak data (simulated - normally from memory)
    streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    # Load achievements
    achievements = {}
    if os.path.exists('achievements.json'):
        with open('achievements.json', 'r') as f:
            achievements = json.load(f)
    
    # Display summary stats
    users = list(streaks.keys())
    current_streaks = [data["current"] for data in streaks.values()]
    best_streaks = [data["best"] for data in streaks.values()]
    total_badges = sum(len(badges) for badges in achievements.get('user_achievements', {}).values())
    
    print(f"\n📊 SUMMARY STATISTICS")
    print(f"   👥 Active Users: {len(users)}")
    print(f"   📈 Average Streak: {sum(current_streaks) / len(current_streaks):.1f} days")
    print(f"   🏆 Total Badges: {total_badges}")
    print(f"   ⚡ Longest Streak: {max(best_streaks)} days")
    
    # Display leaderboard
    print(f"\n🏅 STREAK LEADERBOARD")
    sorted_users = sorted(users, key=lambda x: streaks[x]["current"], reverse=True)
    
    for i, user in enumerate(sorted_users, 1):
        emoji = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"#{i}"
        current = streaks[user]["current"]
        best = streaks[user]["best"]
        user_badges = len(achievements.get('user_achievements', {}).get(user.replace('@', ''), []))
        print(f"   {emoji} {user}: {current} days (best: {best}) | {user_badges} badges")
    
    # Display recent achievements
    print(f"\n🏆 RECENT ACHIEVEMENTS")
    history = achievements.get('achievement_history', [])
    if history:
        for award in history[-3:]:  # Show last 3
            handle = award['handle']
            badge_name = award['badge']['name']
            timestamp = award['timestamp'][:10]  # Just date
            print(f"   🌟 @{handle} earned {badge_name} on {timestamp}")
    else:
        print("   No achievements yet")
    
    # Display available badges
    print(f"\n🎯 AVAILABLE BADGES")
    badges = achievements.get('badges', {})
    for badge_id, badge_info in badges.items():
        name = badge_info['name']
        threshold = badge_info['threshold']
        badge_type = badge_info['type']
        print(f"   {name}: {threshold} {badge_type}")
    
    # Show next milestones
    print(f"\n🎯 UPCOMING MILESTONES")
    for user in users:
        current = streaks[user]["current"]
        if current < 7:
            days_to_week = 7 - current
            print(f"   {user}: {days_to_week} days to Week Warrior 💪")
        elif current < 14:
            days_to_fortnight = 14 - current
            print(f"   {user}: {days_to_fortnight} days to Consistency King 🔥")
        elif current < 30:
            days_to_month = 30 - current
            print(f"   {user}: {days_to_month} days to Monthly Legend 🏆")
    
    print(f"\n📊 DASHBOARD STATUS")
    print(f"   ✅ Achievement system: ACTIVE")
    print(f"   ✅ Streak tracking: ACTIVE") 
    print(f"   ✅ Badge awards: AUTOMATED")
    print(f"   ✅ Analytics: READY")
    
    # Instructions
    print(f"\n🚀 LAUNCH DASHBOARD")
    print(f"   Run: python serve_live_streak_dashboard.py")
    print(f"   View: http://localhost:8000")
    print(f"   API:  http://localhost:8000/api/streak-data")

def generate_sample_analytics_data():
    """Generate sample data for richer analytics display"""
    # This would normally be collected over time
    sample_trends = {
        "weekly_engagement": [
            {"week": "Week 1", "active_users": 2, "avg_streak": 1.0, "badges_earned": 2},
            {"week": "Week 2", "active_users": 2, "avg_streak": 2.5, "badges_earned": 0},
            {"week": "Week 3", "active_users": 3, "avg_streak": 4.2, "badges_earned": 3},
            {"week": "Week 4", "active_users": 4, "avg_streak": 6.1, "badges_earned": 4},
        ],
        "prediction": {
            "likely_to_continue": 1,
            "at_risk": 0,
            "new_users": 1
        }
    }
    
    # Save sample data
    with open('analytics_trends.json', 'w') as f:
        json.dump(sample_trends, f, indent=2)
    
    print("📊 Sample analytics trends generated!")

if __name__ == '__main__':
    display_current_analytics()
    generate_sample_analytics_data()
    
    print(f"\n" + "=" * 50)
    print("🎯 Ready to launch streak analytics dashboard!")
    print("Run: python serve_live_streak_dashboard.py")