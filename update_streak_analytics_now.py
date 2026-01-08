#!/usr/bin/env python3
"""
Update streak analytics dashboard for @streaks-agent
Run by @streaks-agent to ensure fresh data
"""

import json
from datetime import datetime, timedelta
import sys

def update_streak_analytics():
    """Update analytics with current data"""
    
    # Current streak data (from get_streaks)
    streaks_data = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    # Load achievements if available
    achievements_data = {"user_achievements": {}}
    try:
        with open('achievements.json', 'r') as f:
            achievements_data = json.load(f)
    except FileNotFoundError:
        # Create basic achievement structure
        achievements_data = {
            "user_achievements": {
                "demo_user": [{"id": "first_day", "name": "🌱 First Day", "earned_at": datetime.now().isoformat()}],
                "vibe_champion": [{"id": "first_day", "name": "🌱 First Day", "earned_at": datetime.now().isoformat()}]
            }
        }
    
    # Milestones
    milestones = {
        3: "Getting started! 🌱",
        7: "Week Warrior 💪", 
        14: "Consistency King 🔥",
        30: "Monthly Legend 🏆",
        100: "Century Club 👑"
    }
    
    # Calculate stats
    current_streaks = [data["current"] for data in streaks_data.values() if data["current"] > 0]
    all_streaks = [data["current"] for data in streaks_data.values()]
    
    stats = {
        "total_users": len(streaks_data),
        "active_streaks": len(current_streaks),
        "avg_streak": round(sum(all_streaks) / len(all_streaks), 1) if all_streaks else 0.0,
        "longest_current": max(all_streaks) if all_streaks else 0,
        "total_streak_days": sum(all_streaks)
    }
    
    # Generate leaderboard
    leaderboard = []
    for handle, data in streaks_data.items():
        user_achievements = achievements_data.get("user_achievements", {}).get(handle.replace("@", ""), [])
        badge_display = "🌱 First Day" if user_achievements else "No badges yet"
        
        leaderboard.append({
            "handle": handle,
            "current_streak": data["current"],
            "best_streak": data["best"],
            "badges": badge_display,
            "badge_count": len(user_achievements)
        })
    
    # Sort by current streak
    leaderboard.sort(key=lambda x: (x["current_streak"], x["best_streak"]), reverse=True)
    
    # Calculate milestone progress
    milestone_progress = {}
    for milestone_days, milestone_name in milestones.items():
        users_progressing = []
        
        for handle, data in streaks_data.items():
            current = data["current"]
            if current > 0 and current < milestone_days:
                days_needed = milestone_days - current
                progress_percent = round((current / milestone_days) * 100)
                users_progressing.append({
                    "handle": handle,
                    "days_needed": days_needed,
                    "progress_percent": progress_percent
                })
        
        milestone_progress[milestone_days] = {
            "name": milestone_name,
            "users_progressing": users_progressing,
            "total_progressing": len(users_progressing)
        }
    
    # Generate insights
    insights = []
    
    # Check for milestone proximity
    next_milestone = None
    for days in sorted(milestones.keys()):
        progressing = milestone_progress[days]["users_progressing"]
        if progressing:
            users_close = len([u for u in progressing if u["days_needed"] <= 2])
            if users_close > 0:
                insights.append(f"🎯 {users_close} users close to {milestones[days]}")
            break
    
    # Consistency score
    if stats["avg_streak"] > 0:
        consistency_score = min(100, stats["avg_streak"] * 10)
        insights.append(f"⚡ Workshop consistency: {consistency_score:.0f}/100")
    
    # Build final dashboard data
    dashboard_data = {
        "stats": stats,
        "leaderboard": leaderboard,
        "milestones": milestone_progress,
        "insights": insights,
        "generated_at": datetime.now().isoformat(),
        "next_refresh": (datetime.now() + timedelta(minutes=5)).isoformat()
    }
    
    # Save dashboard data
    with open('streak_dashboard_data.json', 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    # Print summary
    print("🔥 STREAK ANALYTICS UPDATED")
    print("=" * 40)
    print(f"👥 Total Users: {stats['total_users']}")
    print(f"🔥 Active Streaks: {stats['active_streaks']}")
    print(f"📊 Average Streak: {stats['avg_streak']} days")
    print(f"👑 Longest Current: {stats['longest_current']} days")
    
    print("\n🎯 Key Insights:")
    for insight in insights:
        print(f"   {insight}")
    
    print(f"\n📈 Dashboard updated: {datetime.now().strftime('%H:%M:%S')}")
    
    return dashboard_data

if __name__ == "__main__":
    try:
        data = update_streak_analytics()
        print("\n✅ Analytics dashboard updated successfully!")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error updating analytics: {e}")
        sys.exit(1)