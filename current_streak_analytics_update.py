#!/usr/bin/env python3
"""
Current Streak Analytics Update for @streaks-agent
Updates dashboard with latest data
"""

import json
from datetime import datetime, timedelta

# Current data from @streaks-agent memory
current_streaks = {
    "@demo_user": {"current": 1, "best": 1},
    "@vibe_champion": {"current": 1, "best": 1}
}

# Achievement data
achievements = {
    "badges": {
        "first_day": {
            "name": "🌱 First Day",
            "description": "Completed first day in workshop"
        }
    },
    "user_achievements": {
        "demo_user": [{"id": "first_day", "name": "🌱 First Day"}],
        "vibe_champion": [{"id": "first_day", "name": "🌱 First Day"}]
    }
}

# Calculate stats
total_users = len(current_streaks)
active_streaks = len([s for s in current_streaks.values() if s["current"] > 0])
avg_streak = sum(s["current"] for s in current_streaks.values()) / total_users
longest_current = max(s["current"] for s in current_streaks.values())

# Generate leaderboard
leaderboard = []
for handle, data in current_streaks.items():
    user_key = handle.replace("@", "")
    user_achievements = achievements["user_achievements"].get(user_key, [])
    badges = ", ".join([b["name"] for b in user_achievements]) if user_achievements else "No badges yet"
    
    leaderboard.append({
        "handle": handle,
        "current_streak": data["current"],
        "best_streak": data["best"],
        "badges": badges,
        "badge_count": len(user_achievements)
    })

leaderboard.sort(key=lambda x: x["current_streak"], reverse=True)

# Milestone progress
milestones = {
    3: {"name": "Getting started! 🌱", "users_progressing": []},
    7: {"name": "Week Warrior 💪", "users_progressing": []},
    14: {"name": "Consistency King 🔥", "users_progressing": []},
    30: {"name": "Monthly Legend 🏆", "users_progressing": []},
    100: {"name": "Century Club 👑", "users_progressing": []}
}

for handle, data in current_streaks.items():
    current = data["current"]
    for milestone_days in milestones.keys():
        if current > 0 and current < milestone_days:
            milestones[milestone_days]["users_progressing"].append({
                "handle": handle,
                "days_needed": milestone_days - current,
                "progress_percent": round((current / milestone_days) * 100)
            })

# Generate insights
insights = []
inactive = total_users - active_streaks
if inactive > 0:
    insights.append(f"📈 {inactive} users need re-engagement to restart streaks")

# Find next milestone opportunity
for days in sorted(milestones.keys()):
    close_users = [u for u in milestones[days]["users_progressing"] if u["days_needed"] <= 2]
    if close_users:
        insights.append(f"🎯 {len(close_users)} users close to {milestones[days]['name']}")
        break

consistency_score = min(100, avg_streak * 20)
insights.append(f"⚡ Workshop consistency: {consistency_score:.0f}/100")

# Badge distribution
badge_dist = {}
for user_achievements in achievements["user_achievements"].values():
    for badge in user_achievements:
        name = badge["name"]
        badge_dist[name] = badge_dist.get(name, 0) + 1

# Compile dashboard data
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
    "badge_distribution": badge_dist,
    "generated_at": datetime.now().isoformat(),
    "next_refresh": (datetime.now() + timedelta(minutes=5)).isoformat()
}

# Save the data
with open('streak_dashboard_data.json', 'w') as f:
    json.dump(dashboard_data, f, indent=2)

print("🔥 Streak Analytics Dashboard Updated!")
print("=" * 45)
print(f"👥 Total Users: {dashboard_data['stats']['total_users']}")
print(f"🔥 Active Streaks: {dashboard_data['stats']['active_streaks']}")
print(f"📊 Average Streak: {dashboard_data['stats']['avg_streak']} days")
print(f"👑 Longest Current: {dashboard_data['stats']['longest_current']} days")
print(f"🏅 Total Badges: {sum(badge_dist.values())}")

print("\n🎯 Key Insights:")
for insight in insights:
    print(f"   {insight}")

print("\n📊 Current Leaderboard:")
for i, user in enumerate(leaderboard, 1):
    print(f"   {i}. {user['handle']}: {user['current_streak']} days - {user['badges']}")

print(f"\n✅ Dashboard data saved to streak_dashboard_data.json")
print(f"🌐 View at: streak_analytics_dashboard.html")