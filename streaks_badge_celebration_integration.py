#!/usr/bin/env python3
"""
Streaks Badge Celebration Integration
Check for milestone celebrations and integrate with badge system
"""

import json
from datetime import datetime

def check_milestone_celebrations():
    """Check for streak milestones that warrant celebration"""
    
    # Load achievements
    try:
        with open("achievements.json", 'r') as f:
            achievements = json.load(f)
    except FileNotFoundError:
        print("No achievements.json found")
        return []
    
    # Current user data
    users = {
        "demo_user": {"current_streak": 1, "best_streak": 1},
        "vibe_champion": {"current_streak": 1, "best_streak": 1}
    }
    
    celebrations = []
    
    for handle, data in users.items():
        current_streak = data["current_streak"]
        
        # Check for milestone celebrations (3, 7, 14, 30, 100 days)
        milestone_days = [3, 7, 14, 30, 100]
        
        for milestone in milestone_days:
            if current_streak == milestone:
                celebrations.append({
                    "handle": handle,
                    "milestone": milestone,
                    "type": "streak_milestone",
                    "message": f"🎉 {handle} hit {milestone} day streak! {'🌱' if milestone == 3 else '💪' if milestone == 7 else '🔥' if milestone == 14 else '🏆' if milestone == 30 else '👑'}"
                })
        
        # Check for badge celebrations
        user_badges = achievements.get("user_achievements", {}).get(handle, [])
        recent_badges = [b for b in user_badges if b.get("earned_at")]
        
        # If they earned First Day badge recently, celebrate
        for badge in recent_badges:
            if badge["id"] == "first_day":
                celebrations.append({
                    "handle": handle,
                    "milestone": "first_badge",
                    "type": "badge_earned",
                    "message": f"🌱 {handle} earned their first badge: {badge['name']}! Welcome to the journey!"
                })
    
    return celebrations

def generate_engagement_summary():
    """Generate summary of current engagement state"""
    
    try:
        with open("achievements.json", 'r') as f:
            achievements = json.load(f)
    except FileNotFoundError:
        return "No achievement data available"
    
    total_users = len(achievements.get("user_achievements", {}))
    total_badges_awarded = sum(len(badges) for badges in achievements.get("user_achievements", {}).values())
    
    # Badge distribution
    badge_stats = {}
    for badge_id, badge_info in achievements.get("badges", {}).items():
        count = 0
        for user_badges in achievements.get("user_achievements", {}).values():
            if any(b["id"] == badge_id for b in user_badges):
                count += 1
        badge_stats[badge_info["name"]] = count
    
    summary = f"""📊 Engagement Status:
• Active users: {total_users}
• Total badges awarded: {total_badges_awarded}
• Most popular badge: {max(badge_stats, key=badge_stats.get) if badge_stats else 'None'} ({max(badge_stats.values()) if badge_stats else 0} users)

🎯 Current Status:
• Both tracked users at 1-day streaks
• Both earned 'First Day' badges
• Next milestone: Early Bird (3 days) in 2 days
"""
    
    return summary

def main():
    print("🎉 Streaks Badge Celebration Check")
    print("=" * 50)
    
    # Check for celebrations
    celebrations = check_milestone_celebrations()
    
    if celebrations:
        print(f"🎊 Found {len(celebrations)} celebrations:")
        for celebration in celebrations:
            print(f"   {celebration['message']}")
    else:
        print("✅ No immediate celebrations needed")
    
    print("\n" + generate_engagement_summary())
    
    return celebrations

if __name__ == "__main__":
    main()