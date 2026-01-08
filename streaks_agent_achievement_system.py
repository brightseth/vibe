#!/usr/bin/env python3
"""
🏆 Streaks Agent Achievement System
Built by @streaks-agent for /vibe workshop

A simple, focused achievement system that monitors for badge opportunities
and awards them automatically based on user activity.
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any

class StreaksAchievementSystem:
    def __init__(self):
        self.badges_file = "badges.json"
        self.streaks_file = "streaks.json"  # Will create if doesn't exist
        
    def load_badges(self) -> Dict:
        """Load current badge system data."""
        try:
            with open(self.badges_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"achievement_badges": {}, "user_badges": {}, "badge_tiers": {}}
    
    def save_badges(self, badges_data: Dict):
        """Save badge system data."""
        with open(self.badges_file, 'w') as f:
            json.dump(badges_data, f, indent=2)
    
    def load_streaks(self) -> Dict:
        """Load streak data (simulated from memory)."""
        # This would normally come from observe_vibe or memory
        # Simulating current streak state
        return {
            "@demo_user": {"current": 1, "best": 1},
            "@vibe_champion": {"current": 1, "best": 1}
        }
    
    def check_streak_badges(self) -> List[Dict]:
        """Check if any users deserve streak-based badges."""
        badges_data = self.load_badges()
        streaks_data = self.load_streaks()
        new_awards = []
        
        for user, streak_info in streaks_data.items():
            current_streak = streak_info["current"]
            user_badges = badges_data.get("user_badges", {}).get(user, [])
            
            # Check 7-day streak badge
            if current_streak >= 7 and "week_streak" not in user_badges:
                new_awards.append({
                    "user": user,
                    "badge": "week_streak",
                    "badge_name": "Week Warrior 💪",
                    "reason": f"Achieved {current_streak}-day streak!"
                })
            
            # Check 30-day streak badge  
            if current_streak >= 30 and "consistency_champion" not in user_badges:
                new_awards.append({
                    "user": user,
                    "badge": "consistency_champion", 
                    "badge_name": "Consistency Champion 🔥",
                    "reason": f"Achieved {current_streak}-day streak!"
                })
            
            # Check 100-day streak badge
            if current_streak >= 100 and "century_club" not in user_badges:
                new_awards.append({
                    "user": user,
                    "badge": "century_club",
                    "badge_name": "Century Club 👑", 
                    "reason": f"Achieved legendary {current_streak}-day streak!"
                })
        
        return new_awards
    
    def award_badge(self, user: str, badge_key: str) -> bool:
        """Award a badge to a user."""
        badges_data = self.load_badges()
        
        if user not in badges_data["user_badges"]:
            badges_data["user_badges"][user] = []
        
        if badge_key not in badges_data["user_badges"][user]:
            badges_data["user_badges"][user].append(badge_key)
            self.save_badges(badges_data)
            return True
        
        return False
    
    def generate_celebration_message(self, user: str, badge_name: str, reason: str) -> str:
        """Generate a personalized celebration message."""
        messages = [
            f"🎉 Congratulations {user}! You've earned the **{badge_name}** badge!",
            f"✨ {reason}",
            f"💪 Your consistency is inspiring the whole workshop!",
            f"🚀 Keep that momentum going!"
        ]
        return "\n".join(messages)
    
    def check_and_award_achievements(self) -> Dict:
        """Main method: check for achievements and award them."""
        results = {
            "timestamp": datetime.now().isoformat(),
            "new_awards": [],
            "total_checks": 0,
            "awards_given": 0,
            "celebration_messages": []
        }
        
        # Check streak-based achievements
        potential_awards = self.check_streak_badges()
        results["total_checks"] = len(potential_awards)
        
        for award in potential_awards:
            success = self.award_badge(award["user"], award["badge"])
            if success:
                results["new_awards"].append(award)
                results["awards_given"] += 1
                
                # Generate celebration message
                celebration = self.generate_celebration_message(
                    award["user"], 
                    award["badge_name"], 
                    award["reason"]
                )
                results["celebration_messages"].append({
                    "user": award["user"],
                    "message": celebration
                })
        
        return results
    
    def get_user_badge_status(self) -> Dict:
        """Get current badge status for all users."""
        badges_data = self.load_badges()
        streaks_data = self.load_streaks()
        
        status = {
            "timestamp": datetime.now().isoformat(),
            "users": {}
        }
        
        for user, streak_info in streaks_data.items():
            user_badges = badges_data.get("user_badges", {}).get(user, [])
            current_streak = streak_info["current"]
            
            # Calculate next milestone
            next_milestone = None
            if current_streak < 7:
                next_milestone = {"badge": "Week Warrior 💪", "days_needed": 7 - current_streak}
            elif current_streak < 30:
                next_milestone = {"badge": "Consistency Champion 🔥", "days_needed": 30 - current_streak}
            elif current_streak < 100:
                next_milestone = {"badge": "Century Club 👑", "days_needed": 100 - current_streak}
            
            status["users"][user] = {
                "current_streak": current_streak,
                "best_streak": streak_info["best"],
                "badges_earned": len(user_badges),
                "badge_list": user_badges,
                "next_milestone": next_milestone
            }
        
        return status

def main():
    """Main execution function for testing."""
    system = StreaksAchievementSystem()
    
    print("🏆 Streaks Agent Achievement System")
    print("=" * 50)
    
    # Check for new achievements
    print("\n🔍 Checking for new achievements...")
    results = system.check_and_award_achievements()
    
    print(f"✅ Checked {results['total_checks']} potential awards")
    print(f"🎉 Awarded {results['awards_given']} new badges")
    
    if results["celebration_messages"]:
        print("\n🎊 CELEBRATIONS:")
        for celebration in results["celebration_messages"]:
            print(f"\n{celebration['message']}")
    else:
        print("\n💭 No new achievements to celebrate (users need more streak days)")
    
    # Show current status
    print("\n📊 Current Badge Status:")
    status = system.get_user_badge_status()
    
    for user, info in status["users"].items():
        print(f"\n{user}:")
        print(f"  Current Streak: {info['current_streak']} days")
        print(f"  Badges Earned: {info['badges_earned']}")
        if info["next_milestone"]:
            milestone = info["next_milestone"]
            print(f"  Next Goal: {milestone['badge']} in {milestone['days_needed']} days")
    
    return results

if __name__ == "__main__":
    main()