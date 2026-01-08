#!/usr/bin/env python3
"""
🌱 Award First Day badges to current users
Direct implementation for @streaks-agent
"""

import json
import os
from datetime import datetime

def load_streaks():
    """Load current streak data from memory"""
    try:
        with open("agents/streaks-agent/memory.json", "r") as f:
            memory = json.load(f)
            return memory.get("userStreaks", {})
    except Exception as e:
        print(f"Error loading streaks: {e}")
        return {}

def load_badges():
    """Load badge system"""
    try:
        with open("badges.json", "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading badges: {e}")
        return {}

def save_badges(badge_data):
    """Save updated badge data"""
    try:
        with open("badges.json", "w") as f:
            json.dump(badge_data, f, indent=2)
        print("✅ Badges saved successfully")
    except Exception as e:
        print(f"Error saving badges: {e}")

def add_first_day_badge(badge_data):
    """Add First Day badge to system if it doesn't exist"""
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
        print("➕ Added First Day badge to system")
        return True
    return False

def award_first_day_badges():
    """Award First Day badges to users with 1+ day streaks"""
    print("🌱 Awarding First Day badges...")
    
    # Load data
    streaks = load_streaks() 
    badge_data = load_badges()
    
    # Ensure user_badges exists
    if "user_badges" not in badge_data:
        badge_data["user_badges"] = {}
    
    # Add First Day badge if needed
    add_first_day_badge(badge_data)
    
    awarded_count = 0
    
    # Award badges
    for username, streak_info in streaks.items():
        current_streak = streak_info.get("current", 0)
        handle = f"@{username}"
        
        if current_streak >= 1:
            # Initialize user badges if needed
            if handle not in badge_data["user_badges"]:
                badge_data["user_badges"][handle] = []
            
            # Award First Day badge if not already awarded
            if "first_day" not in badge_data["user_badges"][handle]:
                badge_data["user_badges"][handle].append("first_day")
                awarded_count += 1
                print(f"🎉 {handle} earned First Day 🌱 badge!")
    
    # Save updates
    save_badges(badge_data)
    
    return awarded_count, badge_data

def create_celebration_log(badge_data):
    """Create celebration log for new badges"""
    celebration_log = []
    
    for user, badges in badge_data.get("user_badges", {}).items():
        if "first_day" in badges:
            celebration_log.append({
                "timestamp": datetime.now().isoformat(),
                "type": "badge_award",
                "user": user,
                "badge": "first_day",
                "badge_name": "First Day 🌱",
                "message": f"🎉 {user} earned their First Day badge! Welcome to the workshop! 🌱"
            })
    
    try:
        with open("celebration_log.json", "w") as f:
            json.dump(celebration_log, f, indent=2)
        print("📝 Created celebration log")
    except Exception as e:
        print(f"Error creating celebration log: {e}")

def main():
    """Execute badge awarding"""
    print("🏆 First Day Badge Awarding System")
    print("=" * 40)
    
    streaks = load_streaks()
    print(f"Found {len(streaks)} users with streak data:")
    for user, data in streaks.items():
        print(f"  @{user}: {data.get('current', 0)} day streak")
    
    print("\n" + "=" * 40)
    
    awarded_count, badge_data = award_first_day_badges()
    
    print(f"\n✅ Awarded {awarded_count} First Day badges!")
    
    # Show current badge status
    print(f"\n🏆 Current Badge Status:")
    for user, badges in badge_data.get("user_badges", {}).items():
        badge_names = []
        for badge_id in badges:
            if badge_id == "first_day":
                badge_names.append("First Day 🌱")
        if badge_names:
            print(f"  {user}: {', '.join(badge_names)}")
    
    # Create celebration log
    create_celebration_log(badge_data)
    
    print(f"\n🎊 Badge system ready for celebrations!")

if __name__ == "__main__":
    main()