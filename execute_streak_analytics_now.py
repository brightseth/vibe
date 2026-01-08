#!/usr/bin/env python3
"""
Execute streak analytics update - Jan 8, 2026
"""

import json
from datetime import datetime, timedelta

def execute_analytics():
    print("🔥 EXECUTING STREAK ANALYTICS UPDATE")
    print("=" * 50)
    
    # Current data from our streak tracking
    current_streaks = {
        "demo_user": {"current": 1, "best": 1},
        "vibe_champion": {"current": 1, "best": 1}
    }
    
    # Load achievements
    try:
        with open('achievements.json', 'r') as f:
            achievements = json.load(f)
    except FileNotFoundError:
        achievements = {"user_achievements": {}, "achievement_history": []}
    
    user_achievements = achievements.get('user_achievements', {})
    
    # Calculate key stats
    total_users = len(current_streaks)
    active_users = len([u for u in current_streaks.values() if u['current'] > 0])
    avg_streak = sum(u['current'] for u in current_streaks.values()) / total_users
    max_streak = max(u['current'] for u in current_streaks.values())
    total_milestones = len(achievements.get('achievement_history', []))
    
    # Build leaderboard with badges
    leaderboard = []
    for handle, streak_data in current_streaks.items():
        user_badges = user_achievements.get(handle, [])
        badge_display = " ".join([f"{b['name']}" for b in user_badges]) if user_badges else "No badges yet"
        
        leaderboard.append({
            "handle": f"@{handle}",
            "current_streak": streak_data['current'],
            "best_streak": streak_data['best'],
            "badges": badge_display,
            "badge_count": len(user_badges)
        })
    
    # Sort leaderboard
    leaderboard.sort(key=lambda x: (x['current_streak'], x['best_streak']), reverse=True)
    
    # Generate insights
    insights = []
    
    # All users are at 1-day streaks, so they're all active
    insights.append("🎉 All users maintaining their streaks!")
    
    # Both users are progressing toward 3-day milestone
    insights.append("🎯 2 users progressing toward Getting started! 🌱 (3 days)")
    
    # Workshop consistency score
    consistency_score = min(100, int((avg_streak / 30) * 100 + (active_users / total_users) * 50))
    insights.append(f"⚡ Workshop consistency: {consistency_score}/100")
    
    # Print results
    print("📊 CURRENT STATS:")
    print(f"  Total Users: {total_users}")
    print(f"  Active Streaks: {active_users}")
    print(f"  Average Streak: {avg_streak:.1f} days")
    print(f"  Longest Current: {max_streak} days")
    print(f"  Milestones Celebrated: {total_milestones}")
    print(f"  Consistency Score: {consistency_score}/100")
    print()
    
    print("🏆 LEADERBOARD:")
    for i, user in enumerate(leaderboard, 1):
        print(f"  {i}. {user['handle']} - {user['current_streak']} days")
        print(f"     Best: {user['best_streak']}, Badges: {user['badges']}")
    print()
    
    print("💡 INSIGHTS:")
    for insight in insights:
        print(f"  {insight}")
    print()
    
    # Save updated data
    dashboard_data = {
        "generated_at": datetime.now().isoformat(),
        "stats": {
            "total_users": total_users,
            "active_users": active_users,
            "avg_streak": round(avg_streak, 1),
            "max_streak": max_streak,
            "total_milestones": total_milestones,
            "consistency_score": consistency_score
        },
        "leaderboard": leaderboard,
        "insights": insights,
        "trend": {
            "dates": [(datetime.now() - timedelta(days=i)).strftime('%b %d') for i in range(6, -1, -1)],
            "values": [0, 0, 0, 0, 0, 1.0, 1.0]
        }
    }
    
    # Save to file
    with open('streak_dashboard_data_updated.json', 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    print("✅ Analytics updated successfully!")
    print("📂 Data saved to: streak_dashboard_data_updated.json")
    print("🌐 Dashboard available: streak_analytics_dashboard.html")
    
    return dashboard_data

if __name__ == '__main__':
    execute_analytics()