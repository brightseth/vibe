#!/usr/bin/env python3
"""
Execute streak analytics dashboard generation and check for celebrations
"""

import json
from datetime import datetime

# Generate streak analytics
from streak_dashboard_generator import StreakAnalyticsGenerator

def main():
    print("🔥 Generating Streak Analytics Dashboard")
    print("=" * 50)
    
    generator = StreakAnalyticsGenerator()
    dashboard_data = generator.export_dashboard_data()
    
    # Save dashboard data
    with open('streak_dashboard_data.json', 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    # Display current stats
    stats = dashboard_data["stats"]
    print(f"📊 Current Statistics:")
    print(f"   👥 Total Users: {stats['total_users']}")
    print(f"   🔥 Active Streaks: {stats['active_streaks']}")
    print(f"   📈 Average Streak: {stats['avg_streak']} days")
    print(f"   👑 Longest Current: {stats['longest_current']} days")
    
    # Display leaderboard
    print(f"\n🏆 Current Leaderboard:")
    for i, user in enumerate(dashboard_data["leaderboard"], 1):
        print(f"   {i}. {user['handle']}: {user['current_streak']} days (best: {user['best_streak']})")
        if user['badges'] != "No badges yet":
            print(f"      Badges: {user['badges']}")
    
    # Display insights
    print(f"\n🎯 Key Insights:")
    for insight in dashboard_data["insights"]:
        print(f"   {insight}")
    
    # Check milestone opportunities
    print(f"\n🎖️ Milestone Opportunities:")
    milestones = dashboard_data["milestones"]
    for days, milestone_data in milestones.items():
        progressing = milestone_data["users_progressing"]
        if progressing:
            print(f"   {milestone_data['name']} ({days} days):")
            for user in progressing:
                print(f"     - {user['handle']}: {user['days_needed']} days needed ({user['progress_percent']}% complete)")
    
    print(f"\n✅ Dashboard data generated at: {dashboard_data['generated_at']}")
    print(f"📁 Saved to: streak_dashboard_data.json")
    
    return dashboard_data

if __name__ == "__main__":
    main()