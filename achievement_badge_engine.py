#!/usr/bin/env python3
"""
🏆 Achievement Badge Engine
Complete badge system for /vibe workshop

Features:
- Automatic badge awarding based on streaks and activity
- Real-time achievement checking
- Celebration system integration
- Badge progression tracking
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any

class AchievementBadgeEngine:
    def __init__(self):
        self.badges_file = "badges.json"
        self.users_file = "data/users.json" 
        self.streaks_file = "agents/streaks-agent/memory.json"
        self.celebration_log = "celebration_log.json"
        
        # Badge definitions
        self.badge_definitions = {
            "first_day": {
                "name": "First Day 🌱",
                "description": "Started your workshop journey!",
                "tier": "bronze", 
                "criteria": "1_day_streak",
                "icon": "🌱",
                "points": 10
            },
            "early_bird": {
                "name": "Early Bird 🌅", 
                "description": "Maintained activity for 3 days straight!",
                "tier": "bronze",
                "criteria": "3_day_streak", 
                "icon": "🌅",
                "points": 25
            },
            "week_warrior": {
                "name": "Week Warrior 💪",
                "description": "Achieved a full week streak!",
                "tier": "silver",
                "criteria": "7_day_streak",
                "icon": "💪", 
                "points": 50
            },
            "consistency_champion": {
                "name": "Consistency Champion 🔥",
                "description": "Maintained a 14-day streak!",
                "tier": "gold",
                "criteria": "14_day_streak",
                "icon": "🔥",
                "points": 100
            },
            "monthly_legend": {
                "name": "Monthly Legend 🏆",
                "description": "Reached the legendary 30-day streak!",
                "tier": "platinum", 
                "criteria": "30_day_streak",
                "icon": "🏆",
                "points": 250
            },
            "century_club": {
                "name": "Century Club 👑",
                "description": "Achieved the ultimate 100-day streak!",
                "tier": "diamond",
                "criteria": "100_day_streak", 
                "icon": "👑",
                "points": 1000
            },
            "first_ship": {
                "name": "First Ship 🚢",
                "description": "Shared your first creation with the workshop!",
                "tier": "bronze",
                "criteria": "first_announcement",
                "icon": "🚢", 
                "points": 30
            },
            "game_master": {
                "name": "Game Master 🎮",
                "description": "Created or participated in workshop games!",
                "tier": "gold", 
                "criteria": "game_participation",
                "icon": "🎮",
                "points": 75
            },
            "community_builder": {
                "name": "Community Builder 🌟",
                "description": "Helped others and fostered positive workshop vibes!",
                "tier": "special",
                "criteria": "community_engagement", 
                "icon": "🌟",
                "points": 100
            }
        }
    
    def load_current_streaks(self) -> Dict[str, Any]:
        """Load current streak data from streaks-agent memory"""
        try:
            if os.path.exists(self.streaks_file):
                with open(self.streaks_file, 'r') as f:
                    memory = json.load(f)
                    return memory.get('streaks', {})
            return {}
        except Exception as e:
            print(f"Could not load streaks: {e}")
            return {}
    
    def load_badges(self) -> Dict[str, Any]:
        """Load existing badge data"""
        try:
            if os.path.exists(self.badges_file):
                with open(self.badges_file, 'r') as f:
                    return json.load(f)
            return {"achievement_badges": self.badge_definitions, "user_badges": {}}
        except Exception as e:
            print(f"Could not load badges: {e}")
            return {"achievement_badges": self.badge_definitions, "user_badges": {}}
    
    def save_badges(self, badge_data: Dict[str, Any]):
        """Save updated badge data"""
        try:
            with open(self.badges_file, 'w') as f:
                json.dump(badge_data, f, indent=2)
        except Exception as e:
            print(f"Could not save badges: {e}")
    
    def check_streak_badges(self, handle: str, current_streak: int, best_streak: int) -> List[str]:
        """Check which streak badges a user qualifies for"""
        earned_badges = []
        
        # Check each streak milestone
        streak_milestones = [
            (1, "first_day"),
            (3, "early_bird"), 
            (7, "week_warrior"),
            (14, "consistency_champion"),
            (30, "monthly_legend"),
            (100, "century_club")
        ]
        
        for threshold, badge_id in streak_milestones:
            if current_streak >= threshold:
                earned_badges.append(badge_id)
        
        return earned_badges
    
    def award_badge(self, handle: str, badge_id: str, badge_data: Dict[str, Any]) -> bool:
        """Award a specific badge to a user"""
        if handle not in badge_data["user_badges"]:
            badge_data["user_badges"][handle] = []
        
        # Check if user already has this badge
        user_badges = badge_data["user_badges"][handle]
        if badge_id not in user_badges:
            user_badges.append(badge_id)
            self.log_celebration(handle, badge_id)
            return True
        return False
    
    def log_celebration(self, handle: str, badge_id: str):
        """Log badge award for celebration system"""
        celebration = {
            "timestamp": datetime.now().isoformat(),
            "type": "badge_award",
            "user": handle, 
            "badge": badge_id,
            "badge_name": self.badge_definitions[badge_id]["name"],
            "message": f"🎉 {handle} earned {self.badge_definitions[badge_id]['name']}!"
        }
        
        try:
            if os.path.exists(self.celebration_log):
                with open(self.celebration_log, 'r') as f:
                    celebrations = json.load(f)
            else:
                celebrations = []
            
            celebrations.append(celebration)
            
            with open(self.celebration_log, 'w') as f:
                json.dump(celebrations, f, indent=2)
                
        except Exception as e:
            print(f"Could not log celebration: {e}")
    
    def get_user_badge_summary(self, handle: str, badge_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get comprehensive badge summary for a user"""
        user_badges = badge_data["user_badges"].get(handle, [])
        
        total_points = sum(
            self.badge_definitions[badge_id]["points"] 
            for badge_id in user_badges 
            if badge_id in self.badge_definitions
        )
        
        badge_details = []
        for badge_id in user_badges:
            if badge_id in self.badge_definitions:
                badge_details.append({
                    "id": badge_id,
                    "name": self.badge_definitions[badge_id]["name"],
                    "icon": self.badge_definitions[badge_id]["icon"],
                    "tier": self.badge_definitions[badge_id]["tier"], 
                    "points": self.badge_definitions[badge_id]["points"]
                })
        
        return {
            "handle": handle,
            "total_badges": len(user_badges),
            "total_points": total_points,
            "badges": badge_details,
            "rank": self.calculate_user_rank(total_points)
        }
    
    def calculate_user_rank(self, points: int) -> str:
        """Calculate user rank based on points"""
        if points >= 1000: return "Legend 👑"
        elif points >= 500: return "Champion 🏆"
        elif points >= 250: return "Expert 💎"
        elif points >= 100: return "Builder 🔥" 
        elif points >= 50: return "Creator 💪"
        elif points >= 25: return "Explorer 🌅"
        else: return "Newcomer 🌱"
    
    def run_badge_check(self) -> Dict[str, Any]:
        """Run complete badge check for all users"""
        print("🏆 Running Achievement Badge Check...")
        
        # Load data
        streaks = self.load_current_streaks()
        badge_data = self.load_badges()
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "users_checked": 0,
            "badges_awarded": 0,
            "new_celebrations": [],
            "user_summaries": {}
        }
        
        # Process each user
        for handle, streak_data in streaks.items():
            if not handle.startswith('@'):
                continue
                
            results["users_checked"] += 1
            current_streak = streak_data.get('current', 0)
            best_streak = streak_data.get('best', 0)
            
            # Check streak badges
            eligible_badges = self.check_streak_badges(handle, current_streak, best_streak)
            
            for badge_id in eligible_badges:
                if self.award_badge(handle, badge_id, badge_data):
                    results["badges_awarded"] += 1
                    results["new_celebrations"].append({
                        "user": handle,
                        "badge": self.badge_definitions[badge_id]["name"]
                    })
            
            # Get user summary
            results["user_summaries"][handle] = self.get_user_badge_summary(handle, badge_data)
        
        # Save updated badge data
        self.save_badges(badge_data)
        
        return results
    
    def generate_leaderboard(self) -> List[Dict[str, Any]]:
        """Generate badge leaderboard"""
        badge_data = self.load_badges()
        leaderboard = []
        
        for handle in badge_data["user_badges"]:
            summary = self.get_user_badge_summary(handle, badge_data)
            leaderboard.append(summary)
        
        # Sort by points, then by number of badges
        leaderboard.sort(key=lambda x: (x["total_points"], x["total_badges"]), reverse=True)
        
        return leaderboard

def main():
    """Run the achievement badge engine"""
    engine = AchievementBadgeEngine()
    results = engine.run_badge_check()
    
    print(f"✅ Badge check complete!")
    print(f"   Users checked: {results['users_checked']}")
    print(f"   Badges awarded: {results['badges_awarded']}")
    
    if results["new_celebrations"]:
        print("\n🎉 New achievements:")
        for celebration in results["new_celebrations"]:
            print(f"   {celebration['user']} → {celebration['badge']}")
    
    print(f"\n🏆 Current leaderboard:")
    leaderboard = engine.generate_leaderboard()
    for i, user in enumerate(leaderboard[:5], 1):
        badges_text = ", ".join([b["icon"] for b in user["badges"]])
        print(f"   {i}. {user['handle']}: {user['total_points']} pts ({user['total_badges']} badges) {badges_text}")

if __name__ == "__main__":
    main()