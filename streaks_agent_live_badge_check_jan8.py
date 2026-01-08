#!/usr/bin/env python3
"""
Live Badge Check for @streaks-agent
Checks and awards badges for current users
"""

import json
import os
from datetime import datetime

class StreamlinedBadgeSystem:
    def __init__(self):
        self.badges_file = "badges.json"
        self.current_users = {
            "@demo_user": {"current_streak": 1, "best_streak": 1, "ships_count": 0},
            "@vibe_champion": {"current_streak": 1, "best_streak": 1, "ships_count": 0}
        }
        self.load_badges()
    
    def load_badges(self):
        """Load current badge data"""
        try:
            with open(self.badges_file, 'r') as f:
                self.badge_data = json.load(f)
        except FileNotFoundError:
            print("⚠️ No badges.json found, creating empty structure")
            self.badge_data = {"achievement_badges": {}, "user_badges": {}}
    
    def check_streak_badges(self, handle, current_streak):
        """Check if user should get streak-based badges"""
        earned_badges = []
        
        # Define streak thresholds and corresponding badges
        streak_badges = {
            3: "first_milestone",
            7: "week_streak", 
            14: "two_week_warrior",
            30: "consistency_champion",
            100: "century_club"
        }
        
        user_badges = self.badge_data["user_badges"].get(handle, [])
        
        for threshold, badge_id in streak_badges.items():
            if current_streak >= threshold:
                # Check if user already has this badge
                if not any(badge["badge_id"] == badge_id for badge in user_badges):
                    earned_badges.append({
                        "badge_id": badge_id,
                        "earned_at": datetime.now().isoformat(),
                        "criteria_met": f"{threshold}_day_streak",
                        "value": threshold
                    })
        
        return earned_badges
    
    def award_badges(self, handle, badges):
        """Award badges to user"""
        if handle not in self.badge_data["user_badges"]:
            self.badge_data["user_badges"][handle] = []
        
        for badge in badges:
            self.badge_data["user_badges"][handle].append(badge)
            print(f"🎖️ Awarded {badge['badge_id']} to {handle}")
    
    def get_celebration_message(self, handle, badge_id):
        """Generate celebration message for badge"""
        messages = {
            "first_milestone": f"🌱 {handle} hit their first 3-day streak! The habit is forming!",
            "week_streak": f"💪 {handle} achieved a full week streak! Consistency champion in the making!",
            "two_week_warrior": f"🔥 {handle} is on fire with 2 weeks straight! Unstoppable!",
            "consistency_champion": f"👑 {handle} reached the legendary 30-day streak! Community pillar!",
            "century_club": f"🏆 {handle} joined the Century Club with 100 days! Absolute legend!"
        }
        return messages.get(badge_id, f"🎉 {handle} earned a new achievement!")
    
    def save_badges(self):
        """Save badge data back to file"""
        with open(self.badges_file, 'w') as f:
            json.dump(self.badge_data, f, indent=2)
    
    def run_check(self):
        """Main check routine"""
        print("🎖️ Running Live Badge Check")
        print("=" * 35)
        
        total_awarded = 0
        celebrations_needed = []
        
        for handle, data in self.current_users.items():
            current_streak = data["current_streak"]
            print(f"\n👤 {handle} - {current_streak} day streak")
            
            # Check for new streak badges
            new_badges = self.check_streak_badges(handle, current_streak)
            
            if new_badges:
                print(f"   🎉 {len(new_badges)} new badges!")
                self.award_badges(handle, new_badges)
                total_awarded += len(new_badges)
                
                for badge in new_badges:
                    celebration_msg = self.get_celebration_message(handle, badge["badge_id"])
                    celebrations_needed.append((handle, badge["badge_id"], celebration_msg))
                    print(f"   📢 {celebration_msg}")
            else:
                print(f"   ✅ No new badges (need more streak days)")
            
            # Show current badges
            user_badges = self.badge_data["user_badges"].get(handle, [])
            print(f"   🏅 Total badges: {len(user_badges)}")
        
        # Save if any changes
        if total_awarded > 0:
            self.save_badges()
            print(f"\n💾 Saved {total_awarded} new badge(s) to {self.badges_file}")
        
        print(f"\n🎊 SUMMARY:")
        print(f"   New badges awarded: {total_awarded}")
        print(f"   Celebrations needed: {len(celebrations_needed)}")
        
        return celebrations_needed

def main():
    system = StreamlinedBadgeSystem()
    celebrations = system.run_check()
    
    if celebrations:
        print(f"\n💌 CELEBRATION QUEUE:")
        for handle, badge_id, message in celebrations:
            print(f"   DM {handle}: {message}")
    
    return len(celebrations) > 0

if __name__ == "__main__":
    main()