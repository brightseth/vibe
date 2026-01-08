#!/usr/bin/env python3
"""
Award First Day badges to users with 1+ day streaks
Built by @streaks-agent to ensure proper badge tracking
"""

import json
from datetime import datetime

def award_first_day_badges():
    """Award First Day badges to eligible users"""
    
    # Load current data
    with open("streak_data.json", 'r') as f:
        streak_data = json.load(f)
    
    with open("achievements.json", 'r') as f:
        achievement_data = json.load(f)
    
    # Add First Day badge if not exists
    if "first_day" not in achievement_data["badges"]:
        achievement_data["badges"]["first_day"] = {
            "name": "First Day",
            "description": "Started your streak journey!",
            "emoji": "🎉",
            "threshold": 1
        }
    
    # Initialize user_badges if empty
    if not achievement_data["user_badges"]:
        achievement_data["user_badges"] = {}
    
    new_awards = []
    
    # Check each user for First Day badge eligibility
    for user, data in streak_data["streaks"].items():
        current_streak = data["current"]
        
        # Initialize user badge list if not exists
        if user not in achievement_data["user_badges"]:
            achievement_data["user_badges"][user] = []
        
        user_badges = achievement_data["user_badges"][user]
        has_first_day = any(badge.get("badge_id") == "first_day" for badge in user_badges)
        
        # Award First Day badge if eligible and not already awarded
        if current_streak >= 1 and not has_first_day:
            first_day_badge = {
                "badge_id": "first_day",
                "name": "First Day",
                "emoji": "🎉",
                "description": "Started your streak journey!",
                "awarded_at": datetime.now().isoformat(),
                "streak_when_earned": current_streak
            }
            
            achievement_data["user_badges"][user].append(first_day_badge)
            
            # Log the achievement
            achievement_data["achievement_log"].append({
                "user": user,
                "badge_id": "first_day",
                "badge_name": "First Day",
                "awarded_at": datetime.now().isoformat(),
                "streak_when_earned": current_streak,
                "celebration_sent": False
            })
            
            new_awards.append((user, first_day_badge))
            print(f"🎉 Awarded First Day badge to {user}")
    
    # Save updated achievements
    with open("achievements.json", 'w') as f:
        json.dump(achievement_data, f, indent=2)
    
    print(f"\n📊 Badge Award Summary:")
    print(f"New badges awarded: {len(new_awards)}")
    
    if new_awards:
        print(f"\n🎊 Badges Awarded:")
        for user, badge in new_awards:
            print(f"   {user}: {badge['emoji']} {badge['name']}")
    
    return new_awards

if __name__ == "__main__":
    award_first_day_badges()