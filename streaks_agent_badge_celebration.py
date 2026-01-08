#!/usr/bin/env python3
"""
Streaks Agent Badge Celebration Integration
Easy interface for @streaks-agent to celebrate badge achievements
"""

import json
import os
from datetime import datetime

class StreaksAgentBadgeCelebration:
    def __init__(self):
        self.badges_file = 'badges.json'
        self.load_badges()
    
    def load_badges(self):
        """Load current badge data"""
        if os.path.exists(self.badges_file):
            with open(self.badges_file, 'r') as f:
                self.badges_data = json.load(f)
        else:
            self.badges_data = {"user_badges": {}, "badge_categories": {}}
    
    def check_user_for_new_badges(self, user: str, current_streak: int, ships: int = 0, games: int = 0) -> list:
        """Check if user qualifies for any new badges"""
        user_data = self.badges_data.get("user_badges", {}).get(user, {})
        earned_badges = {badge['badge_key'] for badge in user_data.get("earned", [])}
        
        new_badges = []
        
        # Check streak badges
        if current_streak >= 7 and "week_streak" not in earned_badges:
            new_badges.append({
                'key': 'week_streak',
                'name': 'Week Streak 🔥',
                'message': f'🎉 {user} earned the "Week Streak" badge! 🔥\\n\\nActive for 7 consecutive days\\nNice work!\\n\\nKeep up the amazing work! ✨'
            })
        
        if current_streak >= 30 and "month_streak" not in earned_badges:
            new_badges.append({
                'key': 'month_streak', 
                'name': 'Monthly Legend 👑',
                'message': f'🎉 {user} earned the "Monthly Legend" badge! 👑\\n\\nActive for 30 consecutive days\\nIncredible dedication!\\n\\nYou\\'re a workshop legend! ✨'
            })
        
        if current_streak >= 100 and "century_streak" not in earned_badges:
            new_badges.append({
                'key': 'century_streak',
                'name': 'Century Club 💎', 
                'message': f'🏆 {user} earned the "Century Club" badge! 💎\\n\\nActive for 100 consecutive days\\nLEGENDARY achievement!\\n\\nWorkshop royalty status achieved! 👑✨'
            })
        
        # Check shipping badges
        if ships >= 1 and "first_ship" not in earned_badges:
            new_badges.append({
                'key': 'first_ship',
                'name': 'First Ship 🚢',
                'message': f'🎉 {user} earned the "First Ship" badge! 🚢\\n\\nPosted your first creation to the board\\nAwesome start!\\n\\nKeep shipping! ✨'
            })
        
        if ships >= 5 and "active_shipper" not in earned_badges:
            new_badges.append({
                'key': 'active_shipper',
                'name': 'Active Shipper ⚓', 
                'message': f'🎉 {user} earned the "Active Shipper" badge! ⚓\\n\\nPosted 5 ships to the board\\nYou\\'re on fire!\\n\\nKeep the momentum going! ✨'
            })
        
        # Check game badges  
        if games >= 1 and "game_master" not in earned_badges:
            new_badges.append({
                'key': 'game_master',
                'name': 'Game Master 🎮',
                'message': f'🎉 {user} earned the "Game Master" badge! 🎮\\n\\nCreated or facilitated a workshop game\\nBringing fun to the community!\\n\\nGame on! ✨'
            })
        
        return new_badges
    
    def award_badge(self, user: str, badge_key: str, reason: str = None) -> bool:
        """Award a badge to a user and save to file"""
        # Check if already awarded
        user_data = self.badges_data.get("user_badges", {}).get(user, {"earned": [], "total_points": 0})
        earned_badges = {badge['badge_key'] for badge in user_data.get("earned", [])}
        
        if badge_key in earned_badges:
            return False  # Already has this badge
        
        # Find badge points
        points = 5  # Default
        badge_name = badge_key
        
        for category in self.badges_data.get("badge_categories", {}).values():
            if badge_key in category:
                points = category[badge_key].get("points", 5)
                badge_name = category[badge_key].get("name", badge_key)
                break
        
        # Award the badge
        badge_info = {
            "badge_key": badge_key,
            "awarded_at": datetime.now().isoformat(),
            "reason": reason or "Achievement unlocked"
        }
        
        user_data["earned"].append(badge_info)
        user_data["total_points"] = user_data.get("total_points", 0) + points
        user_data["achievements_unlocked"] = len(user_data["earned"])
        
        # Update user data
        if "user_badges" not in self.badges_data:
            self.badges_data["user_badges"] = {}
        
        self.badges_data["user_badges"][user] = user_data
        
        # Add to award history
        if "award_history" not in self.badges_data:
            self.badges_data["award_history"] = []
        
        self.badges_data["award_history"].append({
            "user": user,
            "badge": badge_key,
            "badge_name": badge_name,
            "points": points,
            "awarded_at": badge_info["awarded_at"]
        })
        
        # Update leaderboard
        self.update_leaderboard()
        
        # Save to file
        with open(self.badges_file, 'w') as f:
            json.dump(self.badges_data, f, indent=2)
        
        return True
    
    def update_leaderboard(self):
        """Update the badge leaderboard"""
        leaderboard_by_points = []
        leaderboard_by_badges = []
        
        for user, data in self.badges_data.get("user_badges", {}).items():
            entry = {
                "user": user,
                "points": data.get("total_points", 0),
                "badges": len(data.get("earned", []))
            }
            leaderboard_by_points.append(entry)
            leaderboard_by_badges.append(entry)
        
        # Sort leaderboards
        leaderboard_by_points.sort(key=lambda x: x["points"], reverse=True)
        leaderboard_by_badges.sort(key=lambda x: x["badges"], reverse=True)
        
        self.badges_data["leaderboard"] = {
            "by_points": leaderboard_by_points,
            "by_badges": leaderboard_by_badges,
            "by_rarity": []  # Could implement rarity sorting later
        }
    
    def get_user_badge_summary(self, user: str) -> str:
        """Get a summary of user's badges for display"""
        user_data = self.badges_data.get("user_badges", {}).get(user, {})
        earned = user_data.get("earned", [])
        
        if not earned:
            return f"{user}: No badges yet 🆕"
        
        badge_count = len(earned)
        points = user_data.get("total_points", 0)
        
        # Get badge emojis
        emojis = []
        for badge in earned:
            key = badge.get("badge_key", "")
            if "streak" in key:
                emojis.append("🔥")
            elif "ship" in key:
                emojis.append("🚢")
            elif "game" in key:
                emojis.append("🎮")
            elif "early" in key:
                emojis.append("🌱")
            else:
                emojis.append("⭐")
        
        emoji_display = " ".join(emojis[:5])  # Show max 5 emojis
        return f"{user}: {badge_count} badges ({points} pts) {emoji_display}"
    
    def celebration_check_and_award(self, user: str, current_streak: int, ships: int = 0, games: int = 0) -> list:
        """Check for new badges and award them, returning celebration messages"""
        new_badges = self.check_user_for_new_badges(user, current_streak, ships, games)
        
        celebrations = []
        for badge in new_badges:
            if self.award_badge(user, badge['key'], f"Earned with {current_streak} day streak"):
                celebrations.append({
                    'user': user,
                    'badge_name': badge['name'],
                    'message': badge['message']
                })
        
        return celebrations

# Example usage for streaks-agent
def main():
    """Example of how @streaks-agent would use this"""
    celebration = StreaksAgentBadgeCelebration()
    
    # Example: Check if demo_user deserves new badges
    user = "@demo_user"
    current_streak = 1  # From get_streaks()
    
    celebrations = celebration.celebration_check_and_award(user, current_streak, ships=0, games=0)
    
    print(f"Badge check for {user}:")
    print(celebration.get_user_badge_summary(user))
    print()
    
    if celebrations:
        print("🎉 New badges to celebrate:")
        for cel in celebrations:
            print(f"- {cel['badge_name']}")
            print(f"  Message: {cel['message'][:100]}...")
    else:
        print("No new badges at this time.")

if __name__ == "__main__":
    main()