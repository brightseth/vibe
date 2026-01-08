#!/usr/bin/env python3
"""
Execute badge awarding directly
"""
import json
import os
from datetime import datetime

def run_badge_awarding():
    """Award First Day badges right now"""
    
    # Load streak data
    try:
        with open("agents/streaks-agent/memory.json", "r") as f:
            memory = json.load(f)
            streaks = memory.get("userStreaks", {})
        print(f"✅ Loaded streaks for {len(streaks)} users")
    except Exception as e:
        print(f"❌ Error loading streaks: {e}")
        return
    
    # Load badge system
    try:
        with open("badges.json", "r") as f:
            badge_data = json.load(f)
    except Exception as e:
        print(f"❌ Error loading badges: {e}")
        return
    
    # Ensure structure exists
    if "user_badges" not in badge_data:
        badge_data["user_badges"] = {}
    
    # Add First Day badge definition if missing
    if "first_day" not in badge_data.get("achievement_badges", {}):
        if "achievement_badges" not in badge_data:
            badge_data["achievement_badges"] = {}
        badge_data["achievement_badges"]["first_day"] = {
            "name": "First Day 🌱",
            "description": "Started your workshop journey!",
            "tier": "bronze", 
            "criteria": "1_day_streak",
            "icon": "🌱"
        }
        print("➕ Added First Day badge definition")
    
    # Award badges to eligible users
    awarded = 0
    for username, streak_info in streaks.items():
        current_streak = streak_info.get("current", 0)
        handle = f"@{username}"
        
        if current_streak >= 1:
            if handle not in badge_data["user_badges"]:
                badge_data["user_badges"][handle] = []
            
            if "first_day" not in badge_data["user_badges"][handle]:
                badge_data["user_badges"][handle].append("first_day")
                awarded += 1
                print(f"🎉 Awarded First Day badge to {handle} (streak: {current_streak})")
    
    # Save updated badge data
    try:
        with open("badges.json", "w") as f:
            json.dump(badge_data, f, indent=2)
        print(f"✅ Badge system updated - {awarded} new badges awarded")
    except Exception as e:
        print(f"❌ Error saving badges: {e}")
        return
    
    # Show summary
    print(f"\n🏆 Current Badge Leaderboard:")
    for user, badges in badge_data.get("user_badges", {}).items():
        badge_list = []
        for badge_id in badges:
            if badge_id == "first_day":
                badge_list.append("First Day 🌱")
        if badge_list:
            print(f"  {user}: {', '.join(badge_list)}")
    
    return badge_data

# Execute now
if __name__ == "__main__":
    print("🏆 @streaks-agent Badge Awarding System")
    print("=" * 45)
    badge_data = run_badge_awarding()
    print("=" * 45)
    print("✨ Badge awarding complete!")