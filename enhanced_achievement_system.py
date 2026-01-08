#!/usr/bin/env python3
"""
Enhanced Achievement Badge System for /vibe Workshop
Built by @streaks-agent - Making consistency irresistible!

Tracks detailed achievements, milestone celebrations, and engagement patterns.
Integrates with streak tracking for comprehensive gamification.
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

class EnhancedAchievementSystem:
    def __init__(self, data_file="enhanced_achievements.json"):
        self.data_file = data_file
        self.load_data()
        
    def load_data(self):
        """Load achievement data from file"""
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = {
                "badges": self.get_default_badges(),
                "user_achievements": {},
                "milestone_history": [],
                "engagement_metrics": {},
                "celebration_log": []
            }
            self.save_data()
    
    def save_data(self):
        """Save achievement data to file"""
        with open(self.data_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def get_default_badges(self):
        """Enhanced badge system with more granular achievements"""
        return {
            # Streak Progression Badges
            "first_day": {
                "name": "First Day",
                "description": "Started your /vibe journey",
                "emoji": "🎉",
                "type": "streak",
                "threshold": 1,
                "rarity": "common"
            },
            "seedling": {
                "name": "Seedling",
                "description": "Growing your consistency habit",
                "emoji": "🌱",
                "type": "streak", 
                "threshold": 3,
                "rarity": "common"
            },
            "week_warrior": {
                "name": "Week Warrior", 
                "description": "One week of dedication",
                "emoji": "💪",
                "type": "streak",
                "threshold": 7,
                "rarity": "uncommon"
            },
            "fortnight_force": {
                "name": "Fortnight Force",
                "description": "Two weeks of unwavering commitment", 
                "emoji": "🔥",
                "type": "streak",
                "threshold": 14,
                "rarity": "rare"
            },
            "monthly_legend": {
                "name": "Monthly Legend",
                "description": "A full month of consistency",
                "emoji": "🏆", 
                "type": "streak",
                "threshold": 30,
                "rarity": "epic"
            },
            "century_club": {
                "name": "Century Club",
                "description": "100 days of dedication",
                "emoji": "👑",
                "type": "streak", 
                "threshold": 100,
                "rarity": "legendary"
            },
            
            # Activity Badges
            "first_ship": {
                "name": "First Ship",
                "description": "Shipped your first project",
                "emoji": "🚀",
                "type": "activity",
                "threshold": 1,
                "rarity": "common"
            },
            "prolific_shipper": {
                "name": "Prolific Shipper",
                "description": "Shipped 10 projects",
                "emoji": "🏭",
                "type": "activity",
                "threshold": 10,
                "rarity": "rare"
            },
            "game_master": {
                "name": "Game Master", 
                "description": "Built and shipped a game",
                "emoji": "🎮",
                "type": "activity",
                "threshold": 1,
                "rarity": "uncommon"
            },
            
            # Engagement Badges
            "vibe_keeper": {
                "name": "Vibe Keeper",
                "description": "Consistently positive energy",
                "emoji": "✨",
                "type": "engagement",
                "threshold": 14,
                "rarity": "rare"
            },
            "community_champion": {
                "name": "Community Champion", 
                "description": "Actively supports others",
                "emoji": "🤝",
                "type": "engagement", 
                "threshold": 20,
                "rarity": "epic"
            },
            
            # Special Badges
            "comeback_kid": {
                "name": "Comeback Kid",
                "description": "Rebuilt streak after a break",
                "emoji": "🎯",
                "type": "special",
                "threshold": 1,
                "rarity": "uncommon"
            },
            "early_adopter": {
                "name": "Early Adopter",
                "description": "Among the first /vibe members",
                "emoji": "🌟",
                "type": "special", 
                "threshold": 1,
                "rarity": "rare"
            }
        }
    
    def check_user_achievements(self, handle: str, current_streak: int, best_streak: int, ships_count: int = 0) -> List[Dict]:
        """Check what new achievements a user has earned"""
        if handle not in self.data["user_achievements"]:
            self.data["user_achievements"][handle] = {
                "badges": [],
                "last_checked": datetime.now().isoformat(),
                "streak_milestones": [],
                "activity_count": 0
            }
        
        user_data = self.data["user_achievements"][handle]
        existing_badges = set(user_data["badges"])
        new_achievements = []
        
        # Check streak-based achievements
        for badge_id, badge in self.data["badges"].items():
            if badge["type"] == "streak" and badge_id not in existing_badges:
                if current_streak >= badge["threshold"]:
                    new_achievements.append({
                        "badge_id": badge_id,
                        "badge": badge,
                        "earned_at": datetime.now().isoformat(),
                        "trigger": f"{current_streak}-day streak"
                    })
                    user_data["badges"].append(badge_id)
                    user_data["streak_milestones"].append({
                        "milestone": badge["threshold"], 
                        "achieved_at": datetime.now().isoformat(),
                        "streak_at_time": current_streak
                    })
        
        # Check activity-based achievements
        user_data["activity_count"] = ships_count
        for badge_id, badge in self.data["badges"].items():
            if badge["type"] == "activity" and badge_id not in existing_badges:
                if badge_id == "first_ship" and ships_count >= 1:
                    new_achievements.append({
                        "badge_id": badge_id,
                        "badge": badge,
                        "earned_at": datetime.now().isoformat(),
                        "trigger": "first project shipped"
                    })
                    user_data["badges"].append(badge_id)
                elif badge_id == "prolific_shipper" and ships_count >= 10:
                    new_achievements.append({
                        "badge_id": badge_id,
                        "badge": badge,
                        "earned_at": datetime.now().isoformat(), 
                        "trigger": f"{ships_count} projects shipped"
                    })
                    user_data["badges"].append(badge_id)
        
        # Log new achievements
        for achievement in new_achievements:
            self.data["milestone_history"].append({
                "handle": handle,
                "achievement": achievement,
                "timestamp": datetime.now().isoformat()
            })
        
        user_data["last_checked"] = datetime.now().isoformat()
        self.save_data()
        
        return new_achievements
    
    def get_next_milestone(self, handle: str, current_streak: int) -> Optional[Dict]:
        """Get the next milestone a user is working toward"""
        if handle not in self.data["user_achievements"]:
            return None
        
        user_badges = set(self.data["user_achievements"][handle]["badges"])
        
        # Find next unearned streak milestone
        streak_milestones = []
        for badge_id, badge in self.data["badges"].items():
            if badge["type"] == "streak" and badge_id not in user_badges:
                if badge["threshold"] > current_streak:
                    streak_milestones.append({
                        "badge_id": badge_id,
                        "badge": badge,
                        "days_remaining": badge["threshold"] - current_streak,
                        "progress_percent": round((current_streak / badge["threshold"]) * 100, 1)
                    })
        
        if not streak_milestones:
            return None
        
        # Return the closest milestone
        return min(streak_milestones, key=lambda x: x["days_remaining"])
    
    def get_user_stats(self, handle: str) -> Dict:
        """Get comprehensive stats for a user"""
        if handle not in self.data["user_achievements"]:
            return {}
        
        user_data = self.data["user_achievements"][handle]
        badges_by_rarity = {}
        
        for badge_id in user_data["badges"]:
            if badge_id in self.data["badges"]:
                rarity = self.data["badges"][badge_id]["rarity"]
                badges_by_rarity[rarity] = badges_by_rarity.get(rarity, 0) + 1
        
        return {
            "total_badges": len(user_data["badges"]),
            "badges_by_rarity": badges_by_rarity,
            "milestone_history": user_data.get("streak_milestones", []),
            "activity_count": user_data.get("activity_count", 0),
            "last_achievement": max(self.data["milestone_history"], 
                                  key=lambda x: x["timestamp"],
                                  default=None) if self.data["milestone_history"] else None
        }
    
    def get_leaderboard(self) -> List[Dict]:
        """Get leaderboard of users by achievements"""
        leaderboard = []
        
        for handle, user_data in self.data["user_achievements"].items():
            total_badges = len(user_data["badges"])
            rarity_score = 0
            
            # Calculate weighted score by rarity
            rarity_weights = {"common": 1, "uncommon": 2, "rare": 4, "epic": 8, "legendary": 16}
            
            for badge_id in user_data["badges"]:
                if badge_id in self.data["badges"]:
                    rarity = self.data["badges"][badge_id]["rarity"]
                    rarity_score += rarity_weights.get(rarity, 1)
            
            leaderboard.append({
                "handle": handle,
                "total_badges": total_badges,
                "rarity_score": rarity_score,
                "recent_badges": [badge_id for badge_id in user_data["badges"][-3:]]
            })
        
        return sorted(leaderboard, key=lambda x: x["rarity_score"], reverse=True)
    
    def generate_celebration_message(self, handle: str, achievement: Dict) -> str:
        """Generate a personalized celebration message"""
        badge = achievement["badge"]
        
        celebration_templates = {
            "first_day": [
                f"🎉 Welcome to /vibe, {handle}! You've taken your first step on this journey!",
                f"🌟 {handle}, you're officially part of the /vibe community! Day 1 complete!",
                f"🎯 Great start, {handle}! The first day is often the hardest - you've got this!"
            ],
            "seedling": [
                f"🌱 {handle}, you're growing! 3 days of consistency - your habits are taking root!",
                f"✨ Look at you, {handle}! 3 days strong and building momentum!",
                f"💪 {handle} is showing real commitment! Day 3 unlocks the Seedling achievement!"
            ],
            "week_warrior": [
                f"💪 WEEK WARRIOR UNLOCKED! {handle}, you've built a real habit now - 7 days strong!",
                f"🔥 {handle} just crushed their first week! Week Warrior status achieved!",
                f"🏆 One full week of dedication, {handle}! You're proving consistency pays off!"
            ]
        }
        
        badge_id = achievement["badge_id"]
        if badge_id in celebration_templates:
            import random
            return random.choice(celebration_templates[badge_id])
        else:
            return f"🎊 Congratulations {handle}! You've earned the {badge['name']} {badge['emoji']} achievement! {badge['description']}"
    
    def has_been_celebrated(self, handle: str, badge_id: str) -> bool:
        """Check if we've already celebrated this achievement"""
        for log_entry in self.data["celebration_log"]:
            if log_entry["handle"] == handle and log_entry["badge_id"] == badge_id:
                return True
        return False
    
    def log_celebration(self, handle: str, badge_id: str, message: str):
        """Log that we've celebrated an achievement"""
        self.data["celebration_log"].append({
            "handle": handle,
            "badge_id": badge_id,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        self.save_data()

def main():
    """Test the enhanced achievement system"""
    system = EnhancedAchievementSystem()
    
    # Test with sample data
    achievements = system.check_user_achievements("demo_user", current_streak=3, best_streak=3)
    print(f"New achievements for demo_user: {len(achievements)}")
    
    for achievement in achievements:
        print(f"  {achievement['badge']['emoji']} {achievement['badge']['name']}")
    
    # Check next milestone
    next_milestone = system.get_next_milestone("demo_user", current_streak=3)
    if next_milestone:
        print(f"\nNext milestone: {next_milestone['badge']['name']} in {next_milestone['days_remaining']} days")
        print(f"Progress: {next_milestone['progress_percent']}%")
    
    # Show stats
    stats = system.get_user_stats("demo_user")
    print(f"\nUser stats: {stats}")
    
    # Show leaderboard
    leaderboard = system.get_leaderboard()
    print(f"\nLeaderboard: {leaderboard}")

if __name__ == "__main__":
    main()