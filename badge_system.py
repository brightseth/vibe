#!/usr/bin/env python3
"""
Achievement Badge System for /vibe workshop
Tracks and awards badges for various workshop activities
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional

class BadgeSystem:
    def __init__(self, badges_file="badges.json"):
        self.badges_file = badges_file
        self.load_badges()
    
    def load_badges(self):
        """Load badge data from file"""
        if os.path.exists(self.badges_file):
            with open(self.badges_file, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = {
                "badge_definitions": {},
                "user_badges": {},
                "badge_log": []
            }
    
    def save_badges(self):
        """Save badge data to file"""
        with open(self.badges_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def award_badge(self, user: str, badge_id: str, reason: str = "") -> bool:
        """Award a badge to a user"""
        # Check if badge exists
        if badge_id not in self.data["badge_definitions"]:
            return False
        
        # Initialize user if not exists
        if user not in self.data["user_badges"]:
            self.data["user_badges"][user] = []
        
        # Check if user already has this badge
        if badge_id in self.data["user_badges"][user]:
            return False  # Already has badge
        
        # Award the badge
        self.data["user_badges"][user].append(badge_id)
        
        # Log the award
        log_entry = {
            "user": user,
            "badge_id": badge_id,
            "timestamp": datetime.now().isoformat(),
            "reason": reason
        }
        self.data["badge_log"].append(log_entry)
        
        self.save_badges()
        return True
    
    def get_user_badges(self, user: str) -> List[Dict]:
        """Get all badges for a user with full details"""
        if user not in self.data["user_badges"]:
            return []
        
        badges = []
        for badge_id in self.data["user_badges"][user]:
            if badge_id in self.data["badge_definitions"]:
                badge_info = self.data["badge_definitions"][badge_id].copy()
                badge_info["id"] = badge_id
                badges.append(badge_info)
        
        return badges
    
    def check_streak_badges(self, user: str, streak_days: int) -> List[str]:
        """Check which streak badges a user should have"""
        badges_to_award = []
        
        # Define streak thresholds
        streak_badges = {
            7: "week_streak",
            14: "two_week_streak", 
            30: "monthly_legend",
            100: "century_club"
        }
        
        for threshold, badge_id in streak_badges.items():
            if streak_days >= threshold:
                if self.award_badge(user, badge_id, f"Achieved {streak_days} day streak"):
                    badges_to_award.append(badge_id)
        
        return badges_to_award
    
    def get_badge_summary(self, user: str) -> str:
        """Get a summary string of user's badges"""
        badges = self.get_user_badges(user)
        if not badges:
            return f"{user}: No badges yet"
        
        badge_emojis = [badge["emoji"] for badge in badges]
        return f"{user}: {' '.join(badge_emojis)} ({len(badges)} badges)"
    
    def get_leaderboard(self) -> List[tuple]:
        """Get badge leaderboard (user, badge_count)"""
        leaderboard = []
        for user, badges in self.data["user_badges"].items():
            leaderboard.append((user, len(badges)))
        
        return sorted(leaderboard, key=lambda x: x[1], reverse=True)

# Example usage functions
def award_first_ship(user: str):
    """Award first ship badge"""
    system = BadgeSystem()
    if system.award_badge(user, "first_ship", "Shipped first project"):
        return f"🎉 {user} earned their First Ship badge! 🚢"
    return None

def check_streak_achievements(user: str, days: int):
    """Check and award streak badges"""
    system = BadgeSystem()
    new_badges = system.check_streak_badges(user, days)
    
    messages = []
    for badge_id in new_badges:
        badge = system.data["badge_definitions"][badge_id]
        messages.append(f"🎉 {user} earned: {badge['emoji']} {badge['name']}!")
    
    return messages

if __name__ == "__main__":
    # Demo the system
    system = BadgeSystem()
    print("Badge system loaded!")
    print(f"Available badges: {len(system.data['badge_definitions'])}")
    
    # Show leaderboard
    leaderboard = system.get_leaderboard()
    print("\n🏆 Badge Leaderboard:")
    for user, count in leaderboard:
        print(f"  {system.get_badge_summary(user)}")