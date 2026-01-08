#!/usr/bin/env python3
"""
Execute live badge check for current users
"""

import json
import datetime
from pathlib import Path

def load_achievements():
    try:
        with open('achievements.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"badges": {}, "user_achievements": {}, "achievement_history": []}

def save_achievements(data):
    with open('achievements.json', 'w') as f:
        json.dump(data, f, indent=2)

def check_and_award_badges():
    """Check current users for badge eligibility"""
    data = load_achievements()
    
    # Current users and their streaks (from streak memory)
    current_users = {
        "demo_user": {"current_streak": 1, "best_streak": 1},
        "vibe_champion": {"current_streak": 1, "best_streak": 1}
    }
    
    celebrations = []
    
    print("🎖️ LIVE BADGE CHECK")
    print("=" * 30)
    
    for handle, streak_data in current_users.items():
        print(f"\n👤 {handle}")
        print(f"   Current streak: {streak_data['current_streak']} days")
        
        # Get current badges
        user_badges = data.get("user_achievements", {}).get(handle, [])
        earned_badge_ids = [badge["id"] for badge in user_badges]
        
        print(f"   Current badges: {[badge['name'] for badge in user_badges]}")
        
        # Check for new badges
        available_badges = data.get("badges", {})
        new_badges = []
        
        for badge_id, badge_info in available_badges.items():
            if badge_info["type"] == "streak":
                if badge_info["threshold"] <= streak_data["current_streak"]:
                    if badge_id not in earned_badge_ids:
                        new_badges.append(badge_id)
        
        # Award new badges
        if new_badges:
            print(f"   🎉 NEW BADGES: {new_badges}")
            
            for badge_id in new_badges:
                badge_info = available_badges[badge_id]
                
                # Add to user achievements
                if handle not in data["user_achievements"]:
                    data["user_achievements"][handle] = []
                
                new_achievement = {
                    "id": badge_id,
                    "name": badge_info["name"],
                    "description": badge_info["description"],
                    "earned_at": datetime.datetime.now().isoformat(),
                    "criteria": f"streak_days >= {badge_info['threshold']}"
                }
                
                data["user_achievements"][handle].append(new_achievement)
                
                # Add to history
                data["achievement_history"].append({
                    "handle": handle,
                    "badge": {
                        "id": badge_id,
                        "name": badge_info["name"],
                        "description": badge_info["description"],
                        "earned_at": new_achievement["earned_at"]
                    },
                    "timestamp": new_achievement["earned_at"]
                })
                
                print(f"     ✅ Awarded: {badge_info['name']}")
                
                # Create celebration message
                celebrations.append({
                    'handle': handle,
                    'badge_name': badge_info['name'],
                    'message': f"🎉 {handle} earned the '{badge_info['name']}' badge! {badge_info['description']}"
                })
        else:
            print("   ✅ No new badges to award")
        
        # Show next milestone
        next_thresholds = [3, 7, 14, 30, 100]
        for threshold in next_thresholds:
            if threshold > streak_data['current_streak']:
                days_needed = threshold - streak_data['current_streak']
                print(f"   🎯 Next milestone: {threshold} days (need {days_needed} more)")
                break
    
    # Save updated achievements
    save_achievements(data)
    
    print(f"\n💾 Updated achievements saved!")
    print(f"🎉 Celebrations to send: {len(celebrations)}")
    
    return celebrations, data

if __name__ == "__main__":
    celebrations, data = check_and_award_badges()
    
    print("\n" + "="*40)
    print("BADGE SYSTEM STATUS")
    print("="*40)
    
    total_badges = len(data.get("badges", {}))
    total_users = len(data.get("user_achievements", {}))
    total_awarded = sum(len(badges) for badges in data.get("user_achievements", {}).values())
    
    print(f"📊 Available badges: {total_badges}")
    print(f"👥 Users with badges: {total_users}")
    print(f"🏆 Total badges awarded: {total_awarded}")
    
    if celebrations:
        print(f"\n🎉 READY TO CELEBRATE:")
        for celebration in celebrations:
            print(f"   • {celebration['message']}")