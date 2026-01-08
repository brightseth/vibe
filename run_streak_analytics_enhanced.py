#!/usr/bin/env python3
"""
Enhanced Streak Analytics Runner for @streaks-agent
Generates comprehensive analytics with current data
"""

import json
from datetime import datetime, timedelta

def load_current_streaks():
    """Load current streak data"""
    # This would normally come from the streaks agent memory system
    return {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }

def load_achievements():
    """Load achievement data"""
    try:
        with open('achievements.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            "badges": {
                "first_day": {
                    "name": "🌱 First Day",
                    "description": "Completed first day in workshop"
                },
                "week_streak": {
                    "name": "💪 Week Warrior", 
                    "description": "7-day streak achieved"
                },
                "month_streak": {
                    "name": "🏆 Monthly Legend",
                    "description": "30-day streak achieved"
                }
            },
            "user_achievements": {
                "demo_user": [{"id": "first_day", "name": "🌱 First Day", "earned_at": "2026-01-08"}],
                "vibe_champion": [{"id": "first_day", "name": "🌱 First Day", "earned_at": "2026-01-08"}]
            }
        }

def calculate_enhanced_analytics():
    """Calculate comprehensive analytics"""
    streaks_data = load_current_streaks()
    achievements_data = load_achievements()
    
    # Basic stats
    current_streaks = [data["current"] for data in streaks_data.values() if data["current"] > 0]
    all_streaks = [data["current"] for data in streaks_data.values()]
    
    stats = {
        "total_users": len(streaks_data),
        "active_streaks": len(current_streaks),
        "avg_streak": round(sum(all_streaks) / len(all_streaks), 1) if all_streaks else 0,
        "longest_current": max(all_streaks) if all_streaks else 0,
        "total_streak_days": sum(all_streaks)
    }
    
    # Enhanced leaderboard with progress
    leaderboard = []
    for handle, data in streaks_data.items():
        user_achievements = achievements_data.get("user_achievements", {}).get(handle.replace("@", ""), [])
        badge_names = [badge.get("name", "Unknown") for badge in user_achievements]
        
        # Calculate progress to next milestone
        current = data["current"]
        next_milestone = None
        for milestone in [3, 7, 14, 30, 100]:
            if current < milestone:
                next_milestone = {
                    "days": milestone,
                    "progress_percent": round((current / milestone) * 100),
                    "days_needed": milestone - current
                }
                break
        
        leaderboard.append({
            "handle": handle,
            "current_streak": current,
            "best_streak": data["best"],
            "badges": ", ".join(badge_names) if badge_names else "No badges yet",
            "badge_count": len(user_achievements),
            "next_milestone": next_milestone
        })
    
    leaderboard.sort(key=lambda x: (x["current_streak"], x["best_streak"]), reverse=True)
    
    # Milestone analysis
    milestones = {
        3: {"name": "Getting started! 🌱", "users_progressing": [], "users_achieved": []},
        7: {"name": "Week Warrior 💪", "users_progressing": [], "users_achieved": []},
        14: {"name": "Consistency King 🔥", "users_progressing": [], "users_achieved": []},
        30: {"name": "Monthly Legend 🏆", "users_progressing": [], "users_achieved": []},
        100: {"name": "Century Club 👑", "users_progressing": [], "users_achieved": []}
    }
    
    for handle, data in streaks_data.items():
        current = data["current"]
        for milestone_days, milestone_info in milestones.items():
            if current >= milestone_days:
                milestone_info["users_achieved"].append(handle)
            elif current > 0 and current < milestone_days:
                milestone_info["users_progressing"].append({
                    "handle": handle,
                    "days_needed": milestone_days - current,
                    "progress_percent": round((current / milestone_days) * 100)
                })
    
    # Generate insights
    insights = []
    inactive_users = stats["total_users"] - stats["active_streaks"]
    if inactive_users > 0:
        insights.append(f"📈 {inactive_users} users need re-engagement to restart streaks")
    
    # Find users close to milestones
    for days, info in milestones.items():
        close_users = [u for u in info["users_progressing"] if u["days_needed"] <= 2]
        if close_users:
            insights.append(f"🎯 {len(close_users)} users close to {info['name']}")
            break
    
    consistency_score = min(100, stats["avg_streak"] * 20)
    insights.append(f"⚡ Workshop consistency: {consistency_score:.0f}/100")
    
    # Badge distribution
    all_badges = {}
    for user_achievements in achievements_data.get("user_achievements", {}).values():
        for badge in user_achievements:
            badge_name = badge.get("name", "Unknown")
            all_badges[badge_name] = all_badges.get(badge_name, 0) + 1
    
    return {
        "stats": stats,
        "leaderboard": leaderboard,
        "milestones": milestones,
        "insights": insights,
        "badge_distribution": all_badges,
        "generated_at": datetime.now().isoformat(),
        "next_refresh": (datetime.now() + timedelta(minutes=5)).isoformat()
    }

def generate_trend_data():
    """Generate trend data for charts"""
    # Simulated trend data - in real implementation would come from historical data
    dates = []
    avg_streaks = []
    
    for i in range(7):
        date = datetime.now() - timedelta(days=6-i)
        dates.append(date.strftime("%b %d"))
        
        # Simulate growing engagement
        if i < 4:
            avg_streaks.append(0)
        elif i == 4:
            avg_streaks.append(0.2)
        elif i == 5:
            avg_streaks.append(0.7)
        else:
            avg_streaks.append(1.0)
    
    return {
        "dates": dates,
        "avg_streaks": avg_streaks
    }

def main():
    """Run enhanced analytics and save data"""
    print("🔄 Generating Enhanced Streak Analytics...")
    
    analytics = calculate_enhanced_analytics()
    trend_data = generate_trend_data()
    
    # Combine all data
    dashboard_data = {
        **analytics,
        "trends": trend_data
    }
    
    # Save for dashboard
    with open('streak_dashboard_data.json', 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    # Update the HTML dashboard with latest data
    update_dashboard_html(dashboard_data)
    
    # Print summary
    stats = analytics["stats"]
    print("🔥 Enhanced Streak Analytics Generated")
    print("=" * 50)
    print(f"👥 Total Users: {stats['total_users']}")
    print(f"🔥 Active Streaks: {stats['active_streaks']}")
    print(f"📊 Average Streak: {stats['avg_streak']} days")
    print(f"👑 Longest Current: {stats['longest_current']} days")
    print(f"🏅 Total Badges Earned: {sum(analytics['badge_distribution'].values())}")
    
    print("\n🎯 Key Insights:")
    for insight in analytics["insights"]:
        print(f"   {insight}")
    
    print("\n📊 Leaderboard:")
    for i, user in enumerate(analytics["leaderboard"][:3], 1):
        milestone_info = ""
        if user["next_milestone"]:
            milestone_info = f" (need {user['next_milestone']['days_needed']} more days for next milestone)"
        print(f"   {i}. {user['handle']}: {user['current_streak']} days{milestone_info}")
    
    print(f"\n✅ Dashboard updated: streak_analytics_dashboard.html")
    print(f"📈 Data saved: streak_dashboard_data.json")

def update_dashboard_html(data):
    """Update the HTML dashboard with latest data"""
    try:
        with open('streak_analytics_dashboard.html', 'r') as f:
            html = f.read()
        
        # Update key metrics in the HTML
        stats = data["stats"]
        html = html.replace('id="total-users">2', f'id="total-users">{stats["total_users"]}')
        html = html.replace('id="avg-streak">1.0', f'id="avg-streak">{stats["avg_streak"]}')
        html = html.replace('id="max-streak">1', f'id="max-streak">{stats["longest_current"]}')
        html = html.replace('id="total-milestones">7', f'id="total-milestones">{sum(data["badge_distribution"].values())}')
        
        with open('streak_analytics_dashboard.html', 'w') as f:
            f.write(html)
            
    except Exception as e:
        print(f"Note: Could not update HTML dashboard: {e}")

if __name__ == "__main__":
    main()