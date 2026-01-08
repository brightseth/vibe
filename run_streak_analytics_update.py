#!/usr/bin/env python3
"""
Quick streak analytics update for @streaks-agent
Updates the dashboard with current streak data
"""

import json
from datetime import datetime, timedelta

def update_streak_analytics():
    """Update streak analytics with current data"""
    
    # Current streak data from memory
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    # Calculate stats
    total_users = len(current_streaks)
    active_streaks = len([s for s in current_streaks.values() if s["current"] > 0])
    avg_streak = sum(s["current"] for s in current_streaks.values()) / total_users
    longest_current = max(s["current"] for s in current_streaks.values())
    
    # Generate leaderboard
    leaderboard = []
    for handle, data in current_streaks.items():
        leaderboard.append({
            "handle": handle,
            "current_streak": data["current"], 
            "best_streak": data["best"],
            "badges": "🌱 First Day",  # Both users have first day badges
            "badge_count": 1
        })
    
    # Sort by current streak
    leaderboard.sort(key=lambda x: x["current_streak"], reverse=True)
    
    # Generate milestone progress
    milestones = {
        "3": {
            "name": "Getting started! 🌱",
            "users_progressing": [
                {"handle": "@demo_user", "days_needed": 2, "progress_percent": 33},
                {"handle": "@vibe_champion", "days_needed": 2, "progress_percent": 33}
            ],
            "total_progressing": 2
        },
        "7": {
            "name": "Week Warrior 💪", 
            "users_progressing": [
                {"handle": "@demo_user", "days_needed": 6, "progress_percent": 14},
                {"handle": "@vibe_champion", "days_needed": 6, "progress_percent": 14}
            ],
            "total_progressing": 2
        },
        "14": {
            "name": "Consistency King 🔥",
            "users_progressing": [
                {"handle": "@demo_user", "days_needed": 13, "progress_percent": 7},
                {"handle": "@vibe_champion", "days_needed": 13, "progress_percent": 7}
            ],
            "total_progressing": 2
        },
        "30": {
            "name": "Monthly Legend 🏆",
            "users_progressing": [
                {"handle": "@demo_user", "days_needed": 29, "progress_percent": 3},
                {"handle": "@vibe_champion", "days_needed": 29, "progress_percent": 3}
            ],
            "total_progressing": 2
        },
        "100": {
            "name": "Century Club 👑",
            "users_progressing": [
                {"handle": "@demo_user", "days_needed": 99, "progress_percent": 1},
                {"handle": "@vibe_champion", "days_needed": 99, "progress_percent": 1}
            ],
            "total_progressing": 2
        }
    }
    
    # Generate insights
    insights = [
        "🎯 2 users close to Getting started! 🌱 (in 2 days)",
        "⚡ Workshop consistency: 10/100",
        "📈 Both users maintaining day-1 streaks - encouraging start!"
    ]
    
    # Create dashboard data
    dashboard_data = {
        "stats": {
            "total_users": total_users,
            "active_streaks": active_streaks,
            "avg_streak": round(avg_streak, 1),
            "longest_current": longest_current,
            "total_streak_days": sum(s["current"] for s in current_streaks.values())
        },
        "leaderboard": leaderboard,
        "milestones": milestones,
        "insights": insights,
        "generated_at": datetime.now().isoformat(),
        "next_refresh": (datetime.now() + timedelta(minutes=5)).isoformat()
    }
    
    # Save updated data
    with open('streak_dashboard_data.json', 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    print("🔥 Streak Analytics Dashboard Updated!")
    print("=" * 45)
    print(f"👥 Total Users: {dashboard_data['stats']['total_users']}")
    print(f"🔥 Active Streaks: {dashboard_data['stats']['active_streaks']}")
    print(f"📊 Average Streak: {dashboard_data['stats']['avg_streak']} days")
    print(f"👑 Longest Current: {dashboard_data['stats']['longest_current']} days")
    
    print(f"\n🎯 Key Insights:")
    for insight in insights:
        print(f"   {insight}")
    
    print(f"\n✨ Dashboard ready at: streak_analytics_dashboard.html")
    
    return dashboard_data

if __name__ == "__main__":
    update_streak_analytics()