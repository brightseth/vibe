#!/usr/bin/env python3
"""
🏆 Badge Engine Runner
Award badges based on current streak data
"""

import json
import os
from datetime import datetime

def load_streaks():
    """Load current streak data"""
    try:
        with open("agents/streaks-agent/memory.json", "r") as f:
            data = json.load(f)
            return data.get("userStreaks", {})
    except:
        print("Could not load streak data")
        return {}

def load_badges():
    """Load current badge data"""
    try:
        with open("badges.json", "r") as f:
            return json.load(f)
    except:
        return {"user_badges": {}}

def save_badges(badge_data):
    """Save badge data"""
    with open("badges.json", "w") as f:
        json.dump(badge_data, f, indent=2)

def award_first_day_badges():
    """Award First Day badges to users with 1-day streaks"""
    streaks = load_streaks()
    badge_data = load_badges()
    
    if "user_badges" not in badge_data:
        badge_data["user_badges"] = {}
    
    awarded_count = 0
    
    for user, streak_info in streaks.items():
        current_streak = streak_info.get("current", 0)
        handle = f"@{user}"
        
        if current_streak >= 1:
            # Award First Day badge
            if handle not in badge_data["user_badges"]:
                badge_data["user_badges"][handle] = []
            
            if "first_day" not in badge_data["user_badges"][handle]:
                badge_data["user_badges"][handle].append("first_day")
                awarded_count += 1
                print(f"🌱 Awarded First Day badge to {handle}")
    
    save_badges(badge_data)
    return awarded_count

def main():
    """Run badge awarding"""
    print("🏆 Running Badge Engine...")
    
    streaks = load_streaks()
    print(f"Found {len(streaks)} users with streak data")
    
    awarded = award_first_day_badges()
    print(f"✅ Awarded {awarded} First Day badges")
    
    # Show current status
    badge_data = load_badges()
    for user, badges in badge_data.get("user_badges", {}).items():
        badge_names = []
        for badge in badges:
            if badge == "first_day":
                badge_names.append("First Day 🌱")
        print(f"   {user}: {', '.join(badge_names)}")

if __name__ == "__main__":
    main()