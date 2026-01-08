"""
Achievement Badges System for /vibe workshop
Tracks and awards badges for various workshop activities
"""

import json
from datetime import datetime
from typing import Dict, List, Optional

class BadgeSystem:
    def __init__(self, badges_file="achievements/badges.json"):
        self.badges_file = badges_file
        self.load_badges()
    
    def load_badges(self):
        """Load badge data from file"""
        try:
            with open(self.badges_file, 'r') as f:
                self.data = json.load(f)
        except FileNotFoundError:
            self.data = {"badge_types": {}, "user_badges": {}}
    
    def save_badges(self):
        """Save badge data to file"""
        with open(self.badges_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def award_badge(self, user: str, badge_type: str) -> bool:
        """Award a badge to a user if they don't already have it"""
        if user not in self.data["user_badges"]:
            self.data["user_badges"][user] = []
        
        if badge_type not in self.data["user_badges"][user]:
            self.data["user_badges"][user].append(badge_type)
            self.save_badges()
            return True
        return False
    
    def check_streak_badges(self, user: str, current_streak: int) -> List[str]:
        """Check if user earned any streak-based badges"""
        new_badges = []
        
        # Define streak thresholds
        streak_badges = {
            7: "week_streak",
            14: "two_week_legend", 
            30: "monthly_champion",
            100: "century_club"
        }
        
        for threshold, badge_type in streak_badges.items():
            if current_streak >= threshold:
                if self.award_badge(user, badge_type):
                    new_badges.append(badge_type)
        
        return new_badges
    
    def get_user_badges(self, user: str) -> List[Dict]:
        """Get all badges for a user with details"""
        user_badge_types = self.data["user_badges"].get(user, [])
        badges = []
        
        for badge_type in user_badge_types:
            if badge_type in self.data["badge_types"]:
                badge_info = self.data["badge_types"][badge_type].copy()
                badge_info["type"] = badge_type
                badges.append(badge_info)
        
        return badges
    
    def get_badge_leaderboard(self) -> Dict[str, int]:
        """Get badge count leaderboard"""
        leaderboard = {}
        for user, badges in self.data["user_badges"].items():
            leaderboard[user] = len(badges)
        
        return dict(sorted(leaderboard.items(), key=lambda x: x[1], reverse=True))
    
    def format_badge_display(self, user: str) -> str:
        """Format badges for display"""
        badges = self.get_user_badges(user)
        if not badges:
            return f"{user}: No badges yet"
        
        badge_display = f"{user}: "
        badge_display += " ".join([badge["name"] for badge in badges])
        return badge_display

# Example usage and testing
if __name__ == "__main__":
    badge_system = BadgeSystem()
    
    # Test awarding badges
    print("Testing badge system...")
    
    # Award streak badges
    new_badges = badge_system.check_streak_badges("@demo_user", 7)
    print(f"New badges for @demo_user: {new_badges}")
    
    # Display user badges
    print(badge_system.format_badge_display("@demo_user"))
    print(badge_system.format_badge_display("@vibe_champion"))
    
    # Show leaderboard
    print("Badge Leaderboard:", badge_system.get_badge_leaderboard())