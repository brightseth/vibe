#!/usr/bin/env python3
"""
Badge Management System for /vibe Workshop
Handles badge awarding, checking eligibility, and displaying achievements
"""

import json
from datetime import datetime
from typing import Dict, List, Optional, Any

class BadgeManager:
    def __init__(self, badges_file: str = "badges.json"):
        self.badges_file = badges_file
        self.load_badges()
    
    def load_badges(self):
        """Load badge data from JSON file"""
        try:
            with open(self.badges_file, 'r') as f:
                self.data = json.load(f)
        except FileNotFoundError:
            self.data = self._create_default_badges()
            self.save_badges()
    
    def save_badges(self):
        """Save badge data to JSON file"""
        with open(self.badges_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def award_badge(self, user_handle: str, badge_category: str, badge_id: str) -> bool:
        """Award a badge to a user if they don't already have it"""
        if user_handle not in self.data["user_badges"]:
            self.data["user_badges"][user_handle] = {
                "earned": [],
                "total_points": 0,
                "achievements_unlocked": 0
            }
        
        user_data = self.data["user_badges"][user_handle]
        badge_key = f"{badge_category}.{badge_id}"
        
        # Check if user already has this badge
        if badge_key in user_data["earned"]:
            return False
        
        # Award the badge
        badge_info = self.data["badge_categories"][badge_category][badge_id]
        user_data["earned"].append({
            "badge": badge_key,
            "name": badge_info["name"],
            "awarded_at": datetime.now().isoformat(),
            "points": badge_info["points"],
            "rarity": badge_info["rarity"]
        })
        
        user_data["total_points"] += badge_info["points"]
        user_data["achievements_unlocked"] += 1
        
        self.save_badges()
        return True
    
    def check_streak_badges(self, user_handle: str, streak_days: int) -> List[str]:
        """Check if user earned any streak-based badges"""
        awarded = []
        
        # Week Streak
        if streak_days >= 7:
            if self.award_badge(user_handle, "streaks", "week_streak"):
                awarded.append("Week Streak 🔥")
        
        # Month Streak
        if streak_days >= 30:
            if self.award_badge(user_handle, "streaks", "month_streak"):
                awarded.append("Monthly Legend 👑")
        
        # Century Streak
        if streak_days >= 100:
            if self.award_badge(user_handle, "streaks", "century_streak"):
                awarded.append("Century Club 💎")
        
        return awarded
    
    def check_participation_badges(self, user_handle: str, ships_count: int) -> List[str]:
        """Check if user earned any participation badges"""
        awarded = []
        
        # First Ship
        if ships_count >= 1:
            if self.award_badge(user_handle, "participation", "first_ship"):
                awarded.append("First Ship 🚢")
        
        # Active Shipper
        if ships_count >= 5:
            if self.award_badge(user_handle, "participation", "active_shipper"):
                awarded.append("Active Shipper ⚓")
        
        # Prolific Creator
        if ships_count >= 10:
            if self.award_badge(user_handle, "participation", "prolific_creator"):
                awarded.append("Prolific Creator 🎨")
        
        return awarded
    
    def get_user_badges(self, user_handle: str) -> Dict[str, Any]:
        """Get all badges for a user"""
        if user_handle not in self.data["user_badges"]:
            return {
                "earned": [],
                "total_points": 0,
                "achievements_unlocked": 0
            }
        return self.data["user_badges"][user_handle]
    
    def get_leaderboard(self, sort_by: str = "points") -> List[Dict[str, Any]]:
        """Get leaderboard sorted by points, badges, or rarity"""
        users = []
        for handle, user_data in self.data["user_badges"].items():
            user_info = {
                "handle": handle,
                "total_points": user_data["total_points"],
                "achievements_unlocked": user_data["achievements_unlocked"],
                "badges": user_data["earned"]
            }
            
            if sort_by == "rarity":
                # Calculate rarity score
                rarity_scores = {"common": 1, "uncommon": 2, "rare": 3, "epic": 4, "legendary": 5, "mythical": 6}
                user_info["rarity_score"] = sum(rarity_scores.get(badge["rarity"], 0) for badge in user_data["earned"])
            
            users.append(user_info)
        
        # Sort based on criteria
        if sort_by == "points":
            users.sort(key=lambda x: x["total_points"], reverse=True)
        elif sort_by == "badges":
            users.sort(key=lambda x: x["achievements_unlocked"], reverse=True)
        elif sort_by == "rarity":
            users.sort(key=lambda x: x["rarity_score"], reverse=True)
        
        return users
    
    def format_user_profile(self, user_handle: str) -> str:
        """Format a user's badge profile for display"""
        user_data = self.get_user_badges(user_handle)
        
        if not user_data["earned"]:
            return f"{user_handle}: No badges yet! 🌱"
        
        profile = f"🏆 {user_handle}'s Achievements\n"
        profile += f"Points: {user_data['total_points']} | Badges: {user_data['achievements_unlocked']}\n\n"
        
        # Group badges by rarity
        by_rarity = {}
        for badge in user_data["earned"]:
            rarity = badge["rarity"]
            if rarity not in by_rarity:
                by_rarity[rarity] = []
            by_rarity[rarity].append(badge)
        
        # Display badges by rarity (highest first)
        rarity_order = ["mythical", "legendary", "epic", "rare", "uncommon", "common"]
        for rarity in rarity_order:
            if rarity in by_rarity:
                rarity_emoji = self.data["rarity_levels"][rarity]["emoji"]
                profile += f"{rarity_emoji} {rarity.upper()}:\n"
                for badge in by_rarity[rarity]:
                    profile += f"  • {badge['name']} ({badge['points']} pts)\n"
                profile += "\n"
        
        return profile.strip()

if __name__ == "__main__":
    # Example usage
    bm = BadgeManager()
    
    # Test awarding badges
    print("Testing badge system...")
    bm.award_badge("@demo_user", "participation", "first_ship")
    bm.check_streak_badges("@demo_user", 7)
    
    print(bm.format_user_profile("@demo_user"))
    print("\nLeaderboard:")
    for user in bm.get_leaderboard():
        print(f"{user['handle']}: {user['total_points']} pts, {user['achievements_unlocked']} badges")