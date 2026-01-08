#!/usr/bin/env python3
"""
Run milestone celebrations for current users
Built by @streaks-agent
"""

import json
import sys
from datetime import datetime
import random

class StreakMilestoneCelebrator:
    def __init__(self):
        self.celebration_config = {
            "milestones": {
                1: {
                    "name": "First Day",
                    "emoji": "🌱", 
                    "celebration_type": "welcome",
                    "message_templates": [
                        "🌱 Welcome to your streak journey, {handle}! You've taken your first step - this is where consistency begins!",
                        "🎉 Day 1 complete, {handle}! Every journey starts with a single step. You're officially building momentum!",
                        "✨ {handle}, you just planted your first seed in the /vibe garden! Let's watch it grow day by day!"
                    ],
                    "should_announce": False
                },
                3: {
                    "name": "Seedling Growth",
                    "emoji": "🌿",
                    "celebration_type": "encouragement", 
                    "message_templates": [
                        "🌿 {handle}, 3 days strong! Your consistency habit is taking root - this is when the magic starts!",
                        "💚 Look at that growth, {handle}! 3 days of dedication shows you're serious about this journey!",
                        "🌱➡️🌿 {handle} just leveled up! Day 3 is when habits begin to form. You're building something beautiful!"
                    ],
                    "should_announce": True,
                    "announce_template": "🌿 {handle} hit their 3-day streak! Growing strong! 💪"
                },
                7: {
                    "name": "Week Warrior",
                    "emoji": "🔥",
                    "celebration_type": "milestone",
                    "message_templates": [
                        "🔥 WEEK WARRIOR UNLOCKED! {handle}, you've built a real habit - 7 days of pure consistency!",
                        "💪 {handle} just crushed their first week! This is where momentum becomes unstoppable!",
                        "🏆 One full week of dedication, {handle}! You're proving that small daily actions create big results!"
                    ],
                    "should_announce": True,
                    "announce_template": "🔥 WEEK WARRIOR! {handle} just completed 7 days of consistency! 🏆"
                }
            }
        }
        self.celebration_log_file = "celebration_log.json"
        self.load_celebration_log()
    
    def load_celebration_log(self):
        try:
            with open(self.celebration_log_file, 'r') as f:
                self.celebration_log = json.load(f)
        except FileNotFoundError:
            self.celebration_log = {
                "celebrated_milestones": {},
                "celebration_history": []
            }
    
    def save_celebration_log(self):
        with open(self.celebration_log_file, 'w') as f:
            json.dump(self.celebration_log, f, indent=2)
    
    def has_been_celebrated(self, handle, milestone_days):
        user_celebrations = self.celebration_log.get("celebrated_milestones", {}).get(handle, [])
        return milestone_days in user_celebrations
    
    def celebrate_user_milestone(self, handle, current_streak):
        """Celebrate a user's milestone if they hit one"""
        if current_streak not in self.celebration_config["milestones"]:
            return None
            
        milestone_config = self.celebration_config["milestones"][current_streak]
        
        # Check if already celebrated
        if self.has_been_celebrated(handle, current_streak):
            return f"✅ {handle} already celebrated for {current_streak}-day milestone"
        
        # Generate celebration message
        template = random.choice(milestone_config["message_templates"])
        message = template.format(handle=handle)
        
        # Mark as celebrated
        if handle not in self.celebration_log["celebrated_milestones"]:
            self.celebration_log["celebrated_milestones"][handle] = []
        
        self.celebration_log["celebrated_milestones"][handle].append(current_streak)
        
        # Add to history
        self.celebration_log["celebration_history"].append({
            "handle": handle,
            "milestone": current_streak,
            "milestone_name": milestone_config["name"],
            "timestamp": datetime.now().isoformat(),
            "dm_message": message,
            "celebration_type": milestone_config["celebration_type"]
        })
        
        self.save_celebration_log()
        
        return {
            "handle": handle,
            "milestone": current_streak,
            "message": message,
            "milestone_name": milestone_config["name"],
            "emoji": milestone_config["emoji"]
        }

def main():
    print("🎊 Running Milestone Celebrations")
    print("=" * 40)
    
    celebrator = StreakMilestoneCelebrator()
    
    # Current streak data from agent memory
    current_users = {
        "@demo_user": 1,
        "@vibe_champion": 1
    }
    
    celebrations = []
    
    for handle, streak in current_users.items():
        print(f"\n👤 Checking {handle} (streak: {streak} days)")
        
        result = celebrator.celebrate_user_milestone(handle, streak)
        
        if isinstance(result, dict):
            celebrations.append(result)
            print(f"   🎉 NEW CELEBRATION: {result['milestone_name']} {result['emoji']}")
            print(f"   💬 Message: {result['message']}")
        elif result:
            print(f"   {result}")
        else:
            print(f"   ⏳ No milestone at {streak} days")
    
    if celebrations:
        print(f"\n✨ Summary: {len(celebrations)} new celebrations generated!")
        print("\n📝 Celebration Actions Needed:")
        for celebration in celebrations:
            print(f"   • DM {celebration['handle']}: {celebration['message'][:60]}...")
        return celebrations
    else:
        print("\n✅ No new celebrations needed at this time")
        return []

if __name__ == "__main__":
    celebrations = main()
    
    # For @streaks-agent integration: return celebration data
    if celebrations:
        print(f"\n🤖 @streaks-agent should send {len(celebrations)} DMs now!")