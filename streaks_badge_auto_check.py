#!/usr/bin/env python3
"""
Automatic Badge Checker for @streaks-agent
Runs when streaks are updated to check for new badge eligibility
"""

import json
from datetime import datetime
from typing import Dict, List, Tuple

class AutoBadgeChecker:
    def __init__(self):
        self.badges_data = self.load_badges_data()
    
    def load_badges_data(self) -> Dict:
        """Load current badge system data"""
        try:
            with open('badges.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"user_badges": {}, "badge_categories": {}}
    
    def save_badges_data(self):
        """Save updated badge data"""
        with open('badges.json', 'w') as f:
            json.dump(self.badges_data, f, indent=2)
    
    def check_and_award_badges(self, handle: str, streak_data: Dict) -> List[Dict]:
        """
        Check if user deserves new badges and award them
        Returns list of newly awarded badges
        """
        current_streak = streak_data.get("current", 0)
        best_streak = streak_data.get("best", 0)
        
        # Get user's current badges
        user_badges = self.badges_data.get("user_badges", {}).get(handle, {})
        earned_badge_keys = [b["badge_key"] for b in user_badges.get("earned", [])]
        
        newly_awarded = []
        
        # Check streak-based badges
        streak_badges_to_check = [
            {"key": "first_day", "threshold": 1, "name": "First Day 🌱", "points": 5},
            {"key": "week_streak", "threshold": 7, "name": "Week Streak 🔥", "points": 30},
            {"key": "month_streak", "threshold": 30, "name": "Monthly Legend 👑", "points": 100},
            {"key": "century_streak", "threshold": 100, "name": "Century Club 💎", "points": 500}
        ]
        
        for badge in streak_badges_to_check:
            if current_streak >= badge["threshold"] and badge["key"] not in earned_badge_keys:
                # Award the badge!
                awarded_badge = self.award_badge(handle, badge)
                if awarded_badge:
                    newly_awarded.append(awarded_badge)
        
        return newly_awarded
    
    def award_badge(self, handle: str, badge_info: Dict) -> Dict:
        """Award a badge to a user"""
        # Initialize user badges if not exists
        if "user_badges" not in self.badges_data:
            self.badges_data["user_badges"] = {}
        
        if handle not in self.badges_data["user_badges"]:
            self.badges_data["user_badges"][handle] = {
                "earned": [],
                "total_points": 0,
                "achievements_unlocked": 0
            }
        
        user_data = self.badges_data["user_badges"][handle]
        
        # Create badge entry
        badge_entry = {
            "badge_key": badge_info["key"],
            "awarded_at": datetime.now().isoformat(),
            "reason": f"Achieved {badge_info['threshold']} day streak"
        }
        
        # Add to user's badges
        user_data["earned"].append(badge_entry)
        user_data["total_points"] += badge_info["points"]
        user_data["achievements_unlocked"] += 1
        
        # Add to award history
        if "award_history" not in self.badges_data:
            self.badges_data["award_history"] = []
        
        self.badges_data["award_history"].append({
            "user": handle,
            "badge": badge_info["key"],
            "badge_name": badge_info["name"],
            "points": badge_info["points"],
            "awarded_at": datetime.now().isoformat()
        })
        
        # Update leaderboard
        self.update_leaderboard()
        
        # Save changes
        self.save_badges_data()
        
        return {
            "badge_key": badge_info["key"],
            "name": badge_info["name"],
            "points": badge_info["points"],
            "awarded_at": badge_entry["awarded_at"]
        }
    
    def update_leaderboard(self):
        """Update the leaderboard based on current badge data"""
        if "user_badges" not in self.badges_data:
            return
        
        leaderboard_points = []
        leaderboard_badges = []
        leaderboard_rarity = []
        
        for handle, user_data in self.badges_data["user_badges"].items():
            points = user_data.get("total_points", 0)
            badges = user_data.get("achievements_unlocked", 0)
            
            leaderboard_points.append({
                "user": handle,
                "points": points,
                "badges": badges
            })
            
            leaderboard_badges.append({
                "user": handle,
                "badges": badges,
                "points": points
            })
            
            # Count rarity distribution (simplified)
            earned = user_data.get("earned", [])
            common = len([b for b in earned if b["badge_key"] in ["first_day"]])
            rare = len([b for b in earned if b["badge_key"] in ["week_streak"]])
            epic = len([b for b in earned if b["badge_key"] in ["early_adopter"]])
            legendary = len([b for b in earned if b["badge_key"] in ["month_streak", "century_streak"]])
            
            leaderboard_rarity.append({
                "user": handle,
                "common": common,
                "rare": rare,
                "epic": epic,
                "legendary": legendary,
                "total": len(earned)
            })
        
        # Sort leaderboards
        leaderboard_points.sort(key=lambda x: x["points"], reverse=True)
        leaderboard_badges.sort(key=lambda x: x["badges"], reverse=True)
        leaderboard_rarity.sort(key=lambda x: x["total"], reverse=True)
        
        # Update in data
        self.badges_data["leaderboard"] = {
            "by_points": leaderboard_points,
            "by_badges": leaderboard_badges,
            "by_rarity": leaderboard_rarity
        }
    
    def create_celebration_message(self, handle: str, badge: Dict) -> str:
        """Create celebration message for newly awarded badge"""
        messages = {
            "first_day": f"🎉 {handle} started their streak journey! Welcome to the /vibe workshop! 🌱",
            "week_streak": f"🔥 {handle} hit a 7-day streak! Consistency is key! 💪",
            "month_streak": f"👑 {handle} achieved a 30-day streak! Workshop royalty! 🏆",
            "century_streak": f"💎 {handle} reached the legendary 100-day streak! Incredible dedication! 🚀"
        }
        
        return messages.get(badge["badge_key"], f"🎉 {handle} earned the {badge['name']} badge!")

def main():
    print("🤖 Auto Badge Checker - Testing Mode")
    print("=" * 40)
    
    checker = AutoBadgeChecker()
    
    # Test current users
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    for handle, streak_data in current_streaks.items():
        print(f"\\nChecking {handle}...")
        new_badges = checker.check_and_award_badges(handle, streak_data)
        
        if new_badges:
            print(f"  ✅ Awarded {len(new_badges)} new badges:")
            for badge in new_badges:
                print(f"     🏅 {badge['name']} (+{badge['points']} points)")
        else:
            print(f"  ℹ️  No new badges (current streak: {streak_data['current']} days)")
    
    print("\\n📊 Current leaderboard:")
    leaderboard = checker.badges_data.get("leaderboard", {}).get("by_points", [])
    for i, entry in enumerate(leaderboard[:3], 1):
        print(f"  {i}. {entry['user']}: {entry['points']} pts ({entry['badges']} badges)")

if __name__ == "__main__":
    main()