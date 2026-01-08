#!/usr/bin/env python3
"""
Badge Check for Current /vibe Users
Built by @streaks-agent
"""

import json
import os
from datetime import datetime

# Current user streak data from get_streaks():
# @demo_user: 1 days (best: 1)  
# @vibe_champion: 1 days (best: 1)

def check_first_day_badges():
    """Check if users need First Day achievement"""
    
    # Define the First Day badge
    first_day_badge = {
        "name": "First Day",
        "description": "Started your /vibe journey", 
        "emoji": "🎉",
        "threshold": 1,
        "rarity": "common"
    }
    
    # Current users with 1-day streaks
    users = [
        ("@demo_user", 1, 1),
        ("@vibe_champion", 1, 1) 
    ]
    
    # Load existing celebration log
    celebration_file = "celebration_log.json"
    if os.path.exists(celebration_file):
        with open(celebration_file, 'r') as f:
            log = json.load(f)
    else:
        log = []
    
    # Check who has already been celebrated
    celebrated_users = set()
    for entry in log:
        if entry["badge_id"] == "first_day":
            celebrated_users.add(entry["handle"])
    
    print("🎖️ First Day Badge Check")
    print("=" * 35)
    print(f"👥 Users tracked: {len(users)}")
    print(f"🎉 Already celebrated: {len(celebrated_users)}")
    
    celebration_queue = []
    
    for handle, current_streak, best_streak in users:
        print(f"\n👤 {handle}")
        print(f"   📊 Current Streak: {current_streak} days")
        
        if current_streak >= 1:  # Eligible for First Day badge
            if handle not in celebrated_users:
                # Generate celebration message
                messages = [
                    f"🎉 Welcome to /vibe, {handle}! You've taken your first step on this journey!",
                    f"🌟 {handle}, you're officially part of the /vibe community! Day 1 complete!", 
                    f"🎯 Great start, {handle}! The first day is often the hardest - you've got this!"
                ]
                
                import random
                message = random.choice(messages)
                
                celebration_queue.append({
                    "handle": handle,
                    "badge": first_day_badge,
                    "message": message,
                    "next_milestone": "Seedling 🌱 (day 3)"
                })
                
                print(f"   🎉 ELIGIBLE: First Day badge")
                print(f"   💬 Message: {message}")
                print(f"   🎯 Next: Seedling in 2 days")
            else:
                print(f"   ✅ Already celebrated First Day")
        else:
            print(f"   ⏳ Not yet eligible for First Day badge")
    
    print(f"\n🎊 CELEBRATION SUMMARY:")
    print(f"   🎉 New celebrations needed: {len(celebration_queue)}")
    
    if celebration_queue:
        print(f"\n💌 CELEBRATION QUEUE:")
        for item in celebration_queue:
            print(f"   {item['handle']}: {item['badge']['emoji']} {item['badge']['name']}")
            print(f"   Message: {item['message']}")
            print(f"   Next milestone: {item['next_milestone']}")
            print(f"   ---")
    
    return celebration_queue

def log_celebration(handle: str, badge_id: str, message: str):
    """Log that we've sent a celebration"""
    celebration_file = "celebration_log.json"
    
    if os.path.exists(celebration_file):
        with open(celebration_file, 'r') as f:
            log = json.load(f)
    else:
        log = []
    
    log.append({
        "handle": handle,
        "badge_id": badge_id,
        "badge_name": "First Day",
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "celebrated_by": "@streaks-agent"
    })
    
    with open(celebration_file, 'w') as f:
        json.dump(log, f, indent=2)
    
    print(f"✅ Logged celebration for {handle}")

if __name__ == "__main__":
    celebration_queue = check_first_day_badges()
    
    # Example of how @streaks-agent would process the queue
    if celebration_queue:
        print(f"\n🚀 READY TO SEND CELEBRATIONS:")
        for item in celebration_queue:
            print(f"   dm_user('{item['handle']}', '{item['message']}')")
            print(f"   log_celebration('{item['handle']}', 'first_day', '{item['message']}')")