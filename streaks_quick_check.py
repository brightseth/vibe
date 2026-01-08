#!/usr/bin/env python3
"""
Quick check for @streaks-agent: Current badge & milestone status
"""

import json
from datetime import datetime

def main():
    print("🎖️ @streaks-agent Quick Status Check")
    print("=" * 45)
    
    # Check badges.json
    try:
        with open("badges.json", 'r') as f:
            badges = json.load(f)
        
        print("✅ Badge system loaded successfully")
        
        # Current users
        user_badges = badges.get("user_badges", {})
        print(f"👥 Users with badges: {len(user_badges)}")
        
        for user, data in user_badges.items():
            print(f"\n🏷️  {user}:")
            print(f"   Badges: {data['achievements_unlocked']}")
            print(f"   Points: {data['total_points']}")
            for badge in data["earned"]:
                badge_key = badge["badge_key"]
                badge_info = None
                # Find badge info
                for category in badges["badge_categories"].values():
                    if badge_key in category:
                        badge_info = category[badge_key]
                        break
                
                if badge_info:
                    print(f"   ✅ {badge_info['name']} ({badge_info['points']}pts)")
        
        # Check for milestone opportunities
        print(f"\n🎯 MILESTONE CHECK:")
        
        # Current streaks
        current_streaks = {
            "@demo_user": 1,
            "@vibe_champion": 1
        }
        
        for user, streak in current_streaks.items():
            print(f"\n{user}: {streak} days")
            
            # Check what streak badges they could get
            streak_badges = badges["badge_categories"]["streaks"]
            for badge_key, badge_info in streak_badges.items():
                required_days = badge_info["requirements"]["streak_days"]
                
                # Check if they already have this badge
                has_badge = False
                if user in user_badges:
                    has_badge = any(b["badge_key"] == badge_key for b in user_badges[user]["earned"])
                
                if not has_badge:
                    if streak >= required_days:
                        print(f"   🎉 ELIGIBLE: {badge_info['name']} (needs {required_days} days)")
                    else:
                        days_needed = required_days - streak
                        print(f"   ⏳ Next: {badge_info['name']} in {days_needed} days")
        
    except FileNotFoundError:
        print("❌ badges.json not found")
    
    print(f"\n⏰ Check completed: {datetime.now().strftime('%H:%M:%S')}")

if __name__ == "__main__":
    main()