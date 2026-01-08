#!/usr/bin/env python3
"""
Quick Achievement Check for Current Users
Built by @streaks-agent for immediate badge checking
"""

import json
import os
from datetime import datetime

def load_data():
    """Load current streak and achievement data"""
    # Load streak data
    with open("streak_data.json", 'r') as f:
        streak_data = json.load(f)
    
    # Load achievement data
    with open("achievements.json", 'r') as f:
        achievement_data = json.load(f)
    
    return streak_data, achievement_data

def check_badge_eligibility(user, current_streak, achievement_data):
    """Check what badges a user is eligible for"""
    eligible_badges = []
    user_badges = achievement_data.get("user_badges", {}).get(user, [])
    existing_badge_ids = [badge.get("badge_id", "") for badge in user_badges]
    
    # Check each badge type
    badges = achievement_data["badges"]
    
    # First Day badge (should be earned at day 1)
    if current_streak >= 1 and "first_day" not in existing_badge_ids:
        eligible_badges.append({
            "badge_id": "first_day",
            "name": "First Day",
            "emoji": "🎉",
            "description": "Started your streak journey!"
        })
    
    # Week Warrior (7 days)
    if current_streak >= 7 and "week_streak" not in existing_badge_ids:
        eligible_badges.append({
            "badge_id": "week_streak", 
            "name": "Week Warrior",
            "emoji": "💪",
            "description": "Maintained a 7-day streak"
        })
    
    # Monthly Legend (30 days)
    if current_streak >= 30 and "month_streak" not in existing_badge_ids:
        eligible_badges.append({
            "badge_id": "month_streak",
            "name": "Monthly Legend", 
            "emoji": "🏆",
            "description": "Sustained a 30-day streak"
        })
    
    # Century Club (100 days)
    if current_streak >= 100 and "century_club" not in existing_badge_ids:
        eligible_badges.append({
            "badge_id": "century_club",
            "name": "Century Club",
            "emoji": "👑", 
            "description": "Achieved 100 days of consistency"
        })
    
    return eligible_badges

def main():
    print("🎖️ Achievement Check - Current Status")
    print("=" * 50)
    
    streak_data, achievement_data = load_data()
    
    new_achievements = []
    
    for user, data in streak_data["streaks"].items():
        current = data["current"]
        best = data["best"]
        
        print(f"\n👤 {user}")
        print(f"   Current: {current} days | Best: {best} days")
        
        # Check current badges
        user_badges = achievement_data.get("user_badges", {}).get(user, [])
        print(f"   Current badges: {len(user_badges)}")
        for badge in user_badges:
            print(f"      {badge.get('emoji', '🏆')} {badge.get('name', 'Unknown')}")
        
        # Check for new badges
        eligible = check_badge_eligibility(user, current, achievement_data)
        
        if eligible:
            print(f"   🎉 NEW BADGES AVAILABLE: {len(eligible)}")
            for badge in eligible:
                print(f"      {badge['emoji']} {badge['name']} - {badge['description']}")
                new_achievements.append((user, badge))
        else:
            print(f"   ✅ All eligible badges earned")
        
        # Next milestone
        if current < 7:
            days_to_week = 7 - current
            print(f"   🎯 Next: Week Warrior in {days_to_week} days")
        elif current < 30:
            days_to_month = 30 - current  
            print(f"   🎯 Next: Monthly Legend in {days_to_month} days")
        elif current < 100:
            days_to_century = 100 - current
            print(f"   🎯 Next: Century Club in {days_to_century} days")
    
    print(f"\n📊 SUMMARY")
    print(f"Total users: {len(streak_data['streaks'])}")
    print(f"New achievements ready: {len(new_achievements)}")
    
    if new_achievements:
        print(f"\n🎊 READY TO CELEBRATE:")
        for user, badge in new_achievements:
            print(f"   {user}: {badge['emoji']} {badge['name']}")
    
    return new_achievements

if __name__ == "__main__":
    main()