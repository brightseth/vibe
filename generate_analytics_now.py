#!/usr/bin/env python3
"""
Quick analytics generation for current cycle
"""

import json
from datetime import datetime, timedelta

# Current streak data
streaks_data = {
    "@demo_user": {"current": 1, "best": 1},
    "@vibe_champion": {"current": 1, "best": 1}
}

# Load achievements
try:
    with open('achievements.json', 'r') as f:
        achievements_data = json.load(f)
except FileNotFoundError:
    achievements_data = {"user_achievements": {}}

# Calculate stats
current_streaks = [data["current"] for data in streaks_data.values() if data["current"] > 0]
all_streaks = [data["current"] for data in streaks_data.values()]

stats = {
    "total_users": len(streaks_data),
    "active_streaks": len(current_streaks),
    "avg_streak": round(sum(all_streaks) / len(all_streaks), 1),
    "longest_current": max(all_streaks) if all_streaks else 0,
    "total_streak_days": sum(all_streaks)
}

# Generate leaderboard
leaderboard = []
for handle, data in streaks_data.items():
    user_badges = achievements_data.get("user_achievements", {}).get(handle.replace("@", ""), [])
    badge_display = "🌱 First Day" if user_badges else "No badges yet"
    
    leaderboard.append({
        "handle": handle,
        "current_streak": data["current"],
        "best_streak": data["best"],
        "badges": badge_display,
        "badge_count": len(user_badges)
    })

# Sort by current streak
leaderboard.sort(key=lambda x: (x["current_streak"], x["best_streak"]), reverse=True)

# Milestone progress
milestones = {
    3: "Getting started! 🌱",
    7: "Week Warrior 💪", 
    14: "Consistency King 🔥",
    30: "Monthly Legend 🏆",
    100: "Century Club 👑"
}

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
if stats["active_streaks"] < stats["total_users"]:
    inactive = stats["total_users"] - stats["active_streaks"]
    insights.append(f"📈 {inactive} users need re-engagement to restart streaks")

# Find users close to next milestone
for days in sorted(milestones.keys()):
    progressing = milestone_progress[days]["users_progressing"]
    users_close = len([u for u in progressing if u["days_needed"] <= 2])
    if users_close > 0:
        insights.append(f"🎯 {users_close} users close to {milestones[days]}")
        break

# Consistency score
if stats["avg_streak"] > 0:
    consistency_score = min(100, stats["avg_streak"] * 10)
    insights.append(f"⚡ Workshop consistency: {consistency_score:.0f}/100")

# Export dashboard data
dashboard_data = {
    "stats": stats,
    "leaderboard": leaderboard,
    "milestones": milestone_progress,
    "insights": insights,
    "generated_at": datetime.now().isoformat(),
    "next_refresh": (datetime.now() + timedelta(minutes=5)).isoformat()
}

# Save data
with open('streak_dashboard_data.json', 'w') as f:
    json.dump(dashboard_data, f, indent=2)

print("🔥 Analytics Updated!")
print("=" * 40)
print(f"👥 Total Users: {stats['total_users']}")
print(f"🔥 Active Streaks: {stats['active_streaks']}")
print(f"📊 Average Streak: {stats['avg_streak']} days")
print(f"👑 Longest Current: {stats['longest_current']} days")

print("\n🎯 Key Insights:")
for insight in insights:
    print(f"   {insight}")

print("\n📈 Dashboard ready!")