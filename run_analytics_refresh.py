#!/usr/bin/env python3
"""
Quick refresh of streak analytics for @streaks-agent
"""

import json
from datetime import datetime

def refresh_analytics():
    """Generate fresh analytics data"""
    
    # Current streak data (from get_streaks result)
    streaks_data = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    # Load achievements if they exist
    try:
        with open('achievements.json', 'r') as f:
            achievements = json.load(f)
    except FileNotFoundError:
        achievements = {
            "user_achievements": {
                "demo_user": [{"id": "first_day", "name": "🌱 First Day"}],
                "vibe_champion": [{"id": "first_day", "name": "🌱 First Day"}]
            },
            "badges": {
                "first_day": {
                    "name": "🌱 First Day", 
                    "description": "Started your streak journey!"
                }
            }
        }
    
    # Calculate analytics
    stats = {
        "total_users": len(streaks_data),
        "active_streaks": sum(1 for data in streaks_data.values() if data["current"] > 0),
        "avg_streak": round(sum(data["current"] for data in streaks_data.values()) / len(streaks_data), 1),
        "longest_current": max(data["current"] for data in streaks_data.values()),
        "total_milestones": 7  # From context
    }
    
    # Generate leaderboard
    leaderboard = []
    for handle, data in streaks_data.items():
        user_key = handle.replace("@", "")
        user_badges = achievements.get("user_achievements", {}).get(user_key, [])
        badge_display = ", ".join([badge.get("name", badge.get("id", "")) for badge in user_badges[:2]]) or "No badges yet"
        
        leaderboard.append({
            "handle": handle,
            "current_streak": data["current"],
            "best_streak": data["best"],
            "badges": badge_display,
            "badge_count": len(user_badges)
        })
    
    leaderboard.sort(key=lambda x: (x["current_streak"], x["best_streak"]), reverse=True)
    
    # Generate insights
    insights = [
        f"📈 0 users need re-engagement to restart streaks",
        f"🎯 2 users close to Getting started! 🌱",
        f"⚡ Workshop consistency: {int(stats['avg_streak'] * 10)}/100"
    ]
    
    # Create dashboard data
    dashboard_data = {
        "stats": stats,
        "leaderboard": leaderboard,
        "insights": insights,
        "milestones": {
            "3": {
                "name": "Getting started! 🌱",
                "users_progressing": ["@demo_user", "@vibe_champion"],
                "total_progressing": 2
            },
            "7": {"name": "Week Warrior 💪", "users_progressing": [], "total_progressing": 0},
            "14": {"name": "Consistency King 🔥", "users_progressing": [], "total_progressing": 0},
            "30": {"name": "Monthly Legend 🏆", "users_progressing": [], "total_progressing": 0},
            "100": {"name": "Century Club 👑", "users_progressing": [], "total_progressing": 0}
        },
        "generated_at": datetime.now().isoformat()
    }
    
    # Save dashboard data
    with open('streak_dashboard_data.json', 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    print("🔥 Streak Analytics Refreshed!")
    print("=" * 40)
    print(f"👥 Total Users: {stats['total_users']}")
    print(f"🔥 Active Streaks: {stats['active_streaks']}")
    print(f"📊 Average Streak: {stats['avg_streak']} days")
    print(f"👑 Longest Current: {stats['longest_current']} days")
    print("\n🎯 Key Insights:")
    for insight in insights:
        print(f"   {insight}")
    
    return dashboard_data

if __name__ == "__main__":
    refresh_analytics()