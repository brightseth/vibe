#!/usr/bin/env python3
"""
Check for milestone celebrations that need to be triggered
"""

import json
from datetime import datetime

def check_milestones():
    print("🎯 Checking for milestone celebrations...")
    
    # Load current streak data
    streak_data = {
        "demo_user": {"current": 1, "best": 1},
        "vibe_champion": {"current": 1, "best": 1}
    }
    
    # Load achievements to see what's already been celebrated
    try:
        with open('achievements.json', 'r') as f:
            achievements = json.load(f)
    except FileNotFoundError:
        achievements = {"achievement_history": []}
    
    # Check what milestones should be celebrated
    milestones_to_celebrate = []
    
    for handle, data in streak_data.items():
        current_streak = data["current"]
        
        # Check if they've already been celebrated for this milestone
        already_celebrated = []
        for achievement in achievements.get("achievement_history", []):
            if achievement["handle"] == handle:
                already_celebrated.append(achievement["badge"]["id"])
        
        # Milestone thresholds
        if current_streak >= 1 and "first_day" not in already_celebrated:
            milestones_to_celebrate.append({
                "handle": handle,
                "milestone": "first_day",
                "message": f"Welcome to your streak journey! 🌱 Day 1 complete!",
                "streak": current_streak
            })
        elif current_streak >= 3 and "early_bird" not in already_celebrated:
            milestones_to_celebrate.append({
                "handle": handle,
                "milestone": "early_bird", 
                "message": f"Getting started! 🌅 {current_streak} days strong!",
                "streak": current_streak
            })
        elif current_streak >= 7 and "week_streak" not in already_celebrated:
            milestones_to_celebrate.append({
                "handle": handle,
                "milestone": "week_streak",
                "message": f"One week strong! 💪 {current_streak} days of consistency!",
                "streak": current_streak
            })
    
    print(f"📊 Current status:")
    for handle, data in streak_data.items():
        print(f"  {handle}: {data['current']} days (best: {data['best']})")
    
    print(f"\n🎉 Milestones to celebrate: {len(milestones_to_celebrate)}")
    for celebration in milestones_to_celebrate:
        print(f"  {celebration['handle']}: {celebration['milestone']} ({celebration['streak']} days)")
    
    return milestones_to_celebrate

if __name__ == "__main__":
    milestones = check_milestones()
    
    if not milestones:
        print("\n✅ All current milestones have been celebrated!")
        print("🎯 Users are ready for their next achievements:")
        print("  - 3-day streak: Early Bird 🌅")
        print("  - 7-day streak: Week Warrior 💪")
        print("  - 30-day streak: Monthly Legend 🏆")