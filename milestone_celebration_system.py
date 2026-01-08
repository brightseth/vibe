#!/usr/bin/env python3
"""
Milestone Celebration System for @streaks-agent
Automatically celebrates streak milestones and badge achievements
"""

import json
from datetime import datetime
from typing import Dict, List, Optional

class MilestoneCelebrationSystem:
    def __init__(self):
        self.milestone_thresholds = {
            3: {"name": "Early Bird 🌅", "message": "3 days strong! You're building a habit! 🌱"},
            7: {"name": "Week Warrior 💪", "message": "One week of consistency! You're on fire! 🔥"},
            14: {"name": "Consistency King 🔥", "message": "Two weeks! This is becoming who you are! 👑"},
            30: {"name": "Monthly Legend 🏆", "message": "30 days! You're a /vibe workshop legend! ✨"},
            100: {"name": "Century Club 👑", "message": "100 days! You've transcended to workshop royalty! 💎"}
        }
        
        self.celebrated_milestones = self.load_celebration_history()
        
    def load_celebration_history(self) -> Dict:
        """Load history of celebrated milestones to avoid duplicates"""
        try:
            with open('celebration_history.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"milestones": {}, "badges": {}}
    
    def save_celebration_history(self):
        """Save celebration history to file"""
        with open('celebration_history.json', 'w') as f:
            json.dump(self.celebrated_milestones, f, indent=2)
    
    def check_streak_milestones(self, user: str, current_streak: int, best_streak: int) -> List[Dict]:
        """Check if user has reached any new streak milestones"""
        celebrations_needed = []
        
        for threshold, milestone_info in self.milestone_thresholds.items():
            # Check if they've reached this milestone
            if current_streak >= threshold:
                milestone_key = f"{user}_{threshold}"
                
                # Check if we've already celebrated this milestone
                if milestone_key not in self.celebrated_milestones.get("milestones", {}):
                    celebrations_needed.append({
                        "type": "streak_milestone",
                        "user": user,
                        "milestone": milestone_info["name"],
                        "days": threshold,
                        "message": milestone_info["message"],
                        "is_personal_best": current_streak == best_streak,
                        "celebration_key": milestone_key
                    })
        
        return celebrations_needed
    
    def check_badge_achievements(self, user: str, new_badges: List[str]) -> List[Dict]:
        """Check for new badge achievements that need celebration"""
        celebrations_needed = []
        
        badge_messages = {
            "first_day": "Welcome to the streak journey! Every expert was once a beginner! 🌱",
            "early_bird": "3 days strong! You're building momentum! 🌅",
            "week_streak": "A full week! Consistency is becoming your superpower! 💪",
            "month_streak": "30 days! You're a monthly legend! 🏆",
            "century_streak": "100 days! Century club member! 👑",
            "first_ship": "Your first ship has sailed! Welcome to the builders! 🚢",
            "game_master": "Game master unlocked! You're creating experiences! 🎮"
        }
        
        for badge in new_badges:
            badge_key = f"{user}_{badge}"
            
            if badge_key not in self.celebrated_milestones.get("badges", {}):
                celebrations_needed.append({
                    "type": "badge_achievement",
                    "user": user,
                    "badge": badge,
                    "message": badge_messages.get(badge, f"New badge earned: {badge}! 🎉"),
                    "celebration_key": badge_key
                })
        
        return celebrations_needed
    
    def create_celebration_message(self, celebration: Dict) -> str:
        """Create personalized celebration message"""
        user = celebration["user"]
        
        if celebration["type"] == "streak_milestone":
            milestone = celebration["milestone"]
            days = celebration["days"]
            base_message = celebration["message"]
            
            if celebration["is_personal_best"]:
                message = f"🎉 {user} achieved {milestone}!\n\n{base_message}\n\n🏆 NEW PERSONAL BEST: {days} days!\n\nKeep the momentum going! ✨"
            else:
                message = f"🎉 {user} achieved {milestone}!\n\n{base_message}\n\n📊 Current streak: {days} days\n\nYou're crushing it! 🚀"
                
        elif celebration["type"] == "badge_achievement":
            badge = celebration["badge"]
            message = f"🏆 {user} earned a new badge!\n\n{celebration['message']}\n\nYour dedication is paying off! 🌟"
        
        return message
    
    def mark_celebrated(self, celebration: Dict):
        """Mark a celebration as completed to avoid duplicates"""
        celebration_key = celebration["celebration_key"]
        
        if celebration["type"] == "streak_milestone":
            if "milestones" not in self.celebrated_milestones:
                self.celebrated_milestones["milestones"] = {}
            
            self.celebrated_milestones["milestones"][celebration_key] = {
                "celebrated_at": datetime.now().isoformat(),
                "milestone": celebration["milestone"],
                "days": celebration["days"]
            }
            
        elif celebration["type"] == "badge_achievement":
            if "badges" not in self.celebrated_milestones:
                self.celebrated_milestones["badges"] = {}
                
            self.celebrated_milestones["badges"][celebration_key] = {
                "celebrated_at": datetime.now().isoformat(),
                "badge": celebration["badge"]
            }
        
        self.save_celebration_history()
    
    def get_next_milestone_info(self, current_streak: int) -> Optional[Dict]:
        """Get information about the next milestone to reach"""
        for threshold in sorted(self.milestone_thresholds.keys()):
            if current_streak < threshold:
                days_remaining = threshold - current_streak
                milestone_info = self.milestone_thresholds[threshold]
                
                return {
                    "name": milestone_info["name"],
                    "days_required": threshold,
                    "days_remaining": days_remaining,
                    "progress_percentage": (current_streak / threshold) * 100
                }
        
        return None  # Already achieved all milestones
    
    def check_all_users_for_celebrations(self, user_data: Dict) -> List[Dict]:
        """Check all users for celebration opportunities"""
        all_celebrations = []
        
        for user, data in user_data.items():
            current_streak = data.get("current_streak", 0)
            best_streak = data.get("best_streak", 0)
            new_badges = data.get("new_badges", [])
            
            # Check streak milestones
            streak_celebrations = self.check_streak_milestones(user, current_streak, best_streak)
            all_celebrations.extend(streak_celebrations)
            
            # Check badge achievements
            badge_celebrations = self.check_badge_achievements(user, new_badges)
            all_celebrations.extend(badge_celebrations)
        
        return all_celebrations
    
    def generate_motivation_message(self, user: str, current_streak: int) -> str:
        """Generate motivational message based on current progress"""
        next_milestone = self.get_next_milestone_info(current_streak)
        
        if not next_milestone:
            return f"🏆 {user} has achieved ALL milestones! You're a /vibe workshop legend! 👑"
        
        progress = next_milestone["progress_percentage"]
        days_remaining = next_milestone["days_remaining"]
        next_name = next_milestone["name"]
        
        if progress >= 80:
            tone = "So close"
        elif progress >= 50:
            tone = "Halfway there"
        elif progress >= 25:
            tone = "Building momentum"
        else:
            tone = "Just getting started"
        
        motivation_messages = {
            "So close": f"🔥 {user}, you're almost there! Just {days_remaining} more days to {next_name}!",
            "Halfway there": f"💪 {user}, you're over halfway to {next_name}! {days_remaining} days to go!",
            "Building momentum": f"🌱 {user}, you're building great momentum! {days_remaining} days until {next_name}!",
            "Just getting started": f"🚀 {user}, every journey begins with a single step! {days_remaining} days to {next_name}!"
        }
        
        return motivation_messages[tone]

def main():
    """Test the celebration system with current user data"""
    celebration_system = MilestoneCelebrationSystem()
    
    # Current user data from @streaks-agent
    test_user_data = {
        "@demo_user": {
            "current_streak": 1,
            "best_streak": 1,
            "new_badges": []  # No new badges since they already have first_day
        },
        "@vibe_champion": {
            "current_streak": 1,
            "best_streak": 1,
            "new_badges": []  # No new badges since they already have first_day
        }
    }
    
    print("🎉 Milestone Celebration System Check")
    print("=" * 40)
    
    # Check for celebrations needed
    celebrations = celebration_system.check_all_users_for_celebrations(test_user_data)
    
    if celebrations:
        print(f"🎊 {len(celebrations)} celebrations needed:")
        for celebration in celebrations:
            message = celebration_system.create_celebration_message(celebration)
            print(f"\n{message}")
            print("-" * 30)
    else:
        print("✅ No new celebrations needed - users have appropriate recognition")
    
    # Show next milestone info
    print(f"\n🎯 Next Milestone Progress:")
    for user, data in test_user_data.items():
        next_milestone = celebration_system.get_next_milestone_info(data["current_streak"])
        if next_milestone:
            print(f"   {user}: {next_milestone['progress_percentage']:.1f}% to {next_milestone['name']} ({next_milestone['days_remaining']} days)")
        
        # Generate motivation
        motivation = celebration_system.generate_motivation_message(user, data["current_streak"])
        print(f"   💬 {motivation}")
    
    print(f"\n📊 Celebration System Status: Ready and monitoring! 🚀")

if __name__ == "__main__":
    main()