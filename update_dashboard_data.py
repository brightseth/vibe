#!/usr/bin/env python3
"""
Streak Analytics Dashboard Data Updater
Automatically refreshes dashboard with current streak data
"""

import json
import datetime
from pathlib import Path

def get_current_streaks():
    """Get current streak data - this would integrate with your streak system"""
    # This would read from your actual streak storage
    return {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }

def analyze_streaks(streaks):
    """Analyze streak patterns and generate insights"""
    users = list(streaks.keys())
    current_streaks = [data["current"] for data in streaks.values()]
    best_streaks = [data["best"] for data in streaks.values()]
    
    analysis = {
        "total_users": len(users),
        "avg_current": round(sum(current_streaks) / len(current_streaks), 1),
        "longest_current": max(current_streaks),
        "avg_best": round(sum(best_streaks) / len(best_streaks), 1),
        "longest_ever": max(best_streaks),
        "distribution": {
            "1_day": sum(1 for s in current_streaks if s == 1),
            "2_3_days": sum(1 for s in current_streaks if 2 <= s <= 3),
            "4_7_days": sum(1 for s in current_streaks if 4 <= s <= 7),
            "8_plus": sum(1 for s in current_streaks if s >= 8)
        }
    }
    
    return analysis

def generate_insights(analysis, streaks):
    """Generate pattern insights based on data"""
    insights = []
    
    if analysis["total_users"] <= 2:
        insights.append({
            "icon": "🌱",
            "type": "Fresh Start",
            "message": "Perfect foundation - early users are building consistency!"
        })
    
    if analysis["avg_current"] < 3:
        insights.append({
            "icon": "⚡",
            "type": "Early Stage",
            "message": f"{analysis['total_users']} users building momentum - encourage daily habits!"
        })
    
    # Look for users approaching milestones
    approaching_3 = sum(1 for data in streaks.values() if data["current"] in [1, 2])
    if approaching_3:
        insights.append({
            "icon": "🎯",
            "type": "Milestone Alert",
            "message": f"{approaching_3} users approaching 3-day milestone - celebrate when they hit it!"
        })
    
    return insights

def update_dashboard_json(streaks, analysis, insights):
    """Generate JSON data file for dashboard consumption"""
    data = {
        "last_updated": datetime.datetime.now().isoformat(),
        "streaks": streaks,
        "analysis": analysis,
        "insights": insights,
        "milestones": {
            "approaching_3_days": sum(1 for data in streaks.values() if data["current"] in [1, 2]),
            "approaching_7_days": sum(1 for data in streaks.values() if data["current"] in [5, 6]),
            "approaching_14_days": sum(1 for data in streaks.values() if data["current"] in [12, 13]),
            "approaching_30_days": sum(1 for data in streaks.values() if data["current"] in [28, 29])
        }
    }
    
    with open("streak_data.json", "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"✅ Dashboard data updated: {len(streaks)} users tracked")
    return data

if __name__ == "__main__":
    # Get current data
    streaks = get_current_streaks()
    analysis = analyze_streaks(streaks)
    insights = generate_insights(analysis, streaks)
    
    # Update dashboard data
    data = update_dashboard_json(streaks, analysis, insights)
    
    # Print summary
    print(f"📊 Streak Analytics Summary:")
    print(f"   Users: {analysis['total_users']}")
    print(f"   Avg streak: {analysis['avg_current']} days")
    print(f"   Longest: {analysis['longest_current']} days")
    print(f"   Insights: {len(insights)} generated")