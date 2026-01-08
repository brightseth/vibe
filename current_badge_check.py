#!/usr/bin/env python3
"""
Current Badge Status Check for @streaks-agent
Check if users are eligible for new badges based on current streaks
"""

import json
from datetime import datetime

def check_badge_eligibility(handle, current_streak, achievements):
    """Check if user is eligible for new badges"""
    user_badges = achievements.get("user_achievements", {}).get(handle, [])
    earned_badge_ids = [badge["id"] for badge in user_badges]
    
    eligible_badges = []
    
    # Check streak badges
    for badge_id, badge_info in achievements.get("badges", {}).items():
        if badge_info.get("type") == "streak" and badge_id not in earned_badge_ids:
            threshold = badge_info.get("threshold", 0)
            if current_streak >= threshold:
                eligible_badges.append({
                    "id": badge_id,
                    "name": badge_info["name"],
                    "description": badge_info["description"],
                    "threshold": threshold
                })
    
    return eligible_badges

def main():
    print("🎯 Badge Eligibility Check")
    print("=" * 40)
    
    # Load current achievements
    try:
        with open("achievements.json", 'r') as f:
            achievements = json.load(f)
    except FileNotFoundError:
        print("❌ No achievements.json found")
        return
    
    # Current users and their streaks
    users = {
        "demo_user": 1,      # 1 day streak
        "vibe_champion": 1   # 1 day streak  
    }
    
    new_badges_to_award = []
    
    for handle, current_streak in users.items():
        print(f"\n👤 {handle} (streak: {current_streak} days)")
        
        # Current badges
        current_badges = achievements.get("user_achievements", {}).get(handle, [])
        print(f"   Current badges: {len(current_badges)}")
        for badge in current_badges:
            print(f"   ✅ {badge['name']}")
        
        # Check eligibility
        eligible = check_badge_eligibility(handle, current_streak, achievements)
        
        if eligible:
            print(f"   🎉 Eligible for {len(eligible)} new badges:")
            for badge in eligible:
                print(f"   🆕 {badge['name']} (threshold: {badge['threshold']} days)")
                new_badges_to_award.append({
                    "handle": handle,
                    "badge": badge
                })
        else:
            print(f"   ✅ No new badges (or all streak badges earned)")
        
        # Next milestone
        next_thresholds = []
        for badge_id, badge_info in achievements.get("badges", {}).items():
            if badge_info.get("type") == "streak":
                threshold = badge_info.get("threshold", 0)
                if threshold > current_streak:
                    earned_ids = [b["id"] for b in current_badges]
                    if badge_id not in earned_ids:
                        next_thresholds.append({
                            "name": badge_info["name"],
                            "threshold": threshold,
                            "days_needed": threshold - current_streak
                        })
        
        if next_thresholds:
            next_badge = min(next_thresholds, key=lambda x: x["threshold"])
            print(f"   🎯 Next: {next_badge['name']} in {next_badge['days_needed']} days")
    
    # Summary
    print(f"\n📊 Summary:")
    print(f"   Total new badges to award: {len(new_badges_to_award)}")
    
    if new_badges_to_award:
        print(f"\n🎁 Ready to award:")
        for award in new_badges_to_award:
            print(f"   {award['handle']} → {award['badge']['name']}")

if __name__ == "__main__":
    main()