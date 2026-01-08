#!/usr/bin/env python3
"""
Award First Day badges to current streak users
"""

import json
from datetime import datetime

def award_first_day_badges():
    """Award 'First Day' badges to users with 1-day streaks"""
    print("🌱 Awarding First Day Badges")
    print("=" * 40)
    
    # Load existing achievements
    try:
        with open('achievements.json', 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        data = {"user_achievements": {}, "achievement_history": []}
    
    if "user_achievements" not in data:
        data["user_achievements"] = {}
    if "achievement_history" not in data:
        data["achievement_history"] = []
    
    # Current users with 1-day streaks
    users_to_award = ["demo_user", "vibe_champion"]
    
    newly_awarded = []
    
    for handle in users_to_award:
        print(f"\n👤 Checking {handle}...")
        
        # Initialize user if not exists
        if handle not in data["user_achievements"]:
            data["user_achievements"][handle] = []
        
        # Check if already has First Day badge
        existing_badges = [badge.get("id", badge.get("badge_id", "")) for badge in data["user_achievements"][handle]]
        
        if "first_day" not in existing_badges and "early_bird" not in existing_badges:
            # Award First Day badge
            first_day_badge = {
                "id": "first_day",
                "name": "🌱 First Day",
                "description": "Started your streak journey",
                "earned_at": datetime.now().isoformat(),
                "criteria": "streak_days >= 1"
            }
            
            data["user_achievements"][handle].append(first_day_badge)
            
            # Add to history
            data["achievement_history"].append({
                "handle": handle,
                "badge": first_day_badge,
                "timestamp": datetime.now().isoformat()
            })
            
            newly_awarded.append((handle, first_day_badge))
            print(f"   🎉 AWARDED: {first_day_badge['name']} - {first_day_badge['description']}")
            
        else:
            existing_names = [badge.get("name", "Unknown") for badge in data["user_achievements"][handle]]
            print(f"   ✅ Already has badges: {', '.join(existing_names)}")
    
    # Save updated achievements
    with open('achievements.json', 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\n📊 Results:")
    print(f"   • {len(newly_awarded)} users awarded First Day badges")
    
    if newly_awarded:
        print(f"\n🎊 Celebrations to announce:")
        for handle, badge in newly_awarded:
            print(f"   • 🎉 {handle} earned {badge['name']}! {badge['description']}")
    
    print(f"\n✅ Badge awarding complete!")
    return newly_awarded

if __name__ == "__main__":
    newly_awarded = award_first_day_badges()
    
    # Show final achievements state
    try:
        with open('achievements.json', 'r') as f:
            final_data = json.load(f)
        print(f"\n📋 Final Achievement State:")
        for handle, badges in final_data.get("user_achievements", {}).items():
            badge_names = [badge.get("name", "Unknown") for badge in badges]
            print(f"   {handle}: {', '.join(badge_names)}")
    except Exception as e:
        print(f"Error reading final state: {e}")