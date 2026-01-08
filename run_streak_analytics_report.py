#!/usr/bin/env python3
"""
Run streak analytics and generate live dashboard data
Built by @streaks-agent for /vibe workshop
"""

import json
import datetime
from enhanced_streak_analytics import StreakAnalytics

def generate_live_report():
    """Generate live analytics report with current data"""
    analytics = StreakAnalytics()
    
    # Override with actual current data from memory
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1, "last_seen": "2026-01-08"},
        "@vibe_champion": {"current": 1, "best": 1, "last_seen": "2026-01-08"}
    }
    
    analytics.streak_data = current_streaks
    
    # Generate comprehensive report
    report = analytics.generate_analytics_report()
    
    # Add some workshop-specific insights
    workshop_insights = []
    
    # Perfect start insight
    if all(data["current"] >= 1 for data in current_streaks.values()):
        workshop_insights.append({
            "type": "success",
            "message": "Perfect workshop start! All users have active streaks 🔥",
            "icon": "🚀"
        })
    
    # Tomorrow critical point
    users_at_day_1 = sum(1 for data in current_streaks.values() if data["current"] == 1)
    if users_at_day_1 > 0:
        workshop_insights.append({
            "type": "critical",
            "message": f"Critical retention point: {users_at_day_1} user(s) at day 1 - tomorrow is day 2!",
            "icon": "⚡"
        })
    
    # Day 3 milestone setup
    workshop_insights.append({
        "type": "milestone_prep",
        "message": "Day 3 Seedling 🌱 milestone ready for both users if streaks continue",
        "icon": "🎯"
    })
    
    report["workshop_insights"] = workshop_insights
    
    # Add celebration readiness status
    report["celebration_status"] = {
        "next_celebrations": [
            {"user": "@demo_user", "milestone": "Seedling 🌱", "in_days": 2},
            {"user": "@vibe_champion", "milestone": "Seedling 🌱", "in_days": 2}
        ],
        "celebration_engine": "Ready ✅",
        "achievement_system": "Active ✅"
    }
    
    return report

def main():
    """Run analytics and save dashboard data"""
    print("🔥 Generating Live Streak Analytics...")
    
    report = generate_live_report()
    
    # Save for dashboard
    with open('live_streak_analytics.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # Display key metrics
    summary = report["summary"]
    health = report["health"]
    
    print(f"\n📊 LIVE ANALYTICS SUMMARY")
    print(f"{'=' * 40}")
    print(f"👥 Active Users: {summary['active_streaks']}/{summary['total_users']}")
    print(f"🔥 Average Streak: {summary['avg_streak']} days")
    print(f"💫 Health Status: {health['status'].upper()} ({health['score']}/100)")
    print(f"🎯 Next Milestone: Day 3 Seedling for both users")
    
    # Workshop insights
    print(f"\n🧠 Workshop Insights:")
    for insight in report["workshop_insights"]:
        print(f"   {insight['icon']} {insight['message']}")
    
    print(f"\n✅ Dashboard data updated: live_streak_analytics.json")
    print(f"🕐 Generated: {report['timestamp']}")
    
    return report

if __name__ == "__main__":
    main()