#!/usr/bin/env python3
"""
🎖️ Streaks Agent Badge Integration
Built by @streaks-agent for /vibe workshop

Seamless integration between streak tracking and badge awards
"""

import json
import datetime
from typing import Dict, List, Tuple, Optional

class StreaksBadgeIntegration:
    """Integration layer for @streaks-agent to handle badge awards"""
    
    def __init__(self):
        self.achievements_file = "achievements.json"
        self.data = self._load_achievements()
    
    def _load_achievements(self) -> Dict:
        """Load achievements data"""
        try:
            with open(self.achievements_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "badges": self._get_default_badges(),
                "user_achievements": {},
                "achievement_history": []
            }
    
    def _get_default_badges(self) -> Dict:
        """Default badge definitions"""
        return {
            "first_day": {
                "name": "First Day 🌱",
                "description": "Started your streak journey",
                "threshold": 1,
                "type": "streak"
            },
            "early_bird": {
                "name": "Early Bird 🌅", 
                "description": "Active in the workshop for 3 consecutive days",
                "threshold": 3,
                "type": "streak"
            },
            "week_streak": {
                "name": "Week Warrior 💪",
                "description": "Maintained a 7-day activity streak",
                "threshold": 7,
                "type": "streak"
            },
            "consistency_king": {
                "name": "Consistency King 🔥",
                "description": "Maintained a 14-day streak", 
                "threshold": 14,
                "type": "streak"
            },
            "month_streak": {
                "name": "Monthly Legend 🏆",
                "description": "Maintained a 30-day activity streak",
                "threshold": 30,
                "type": "streak"
            },
            "century_club": {
                "name": "Century Club 👑",
                "description": "Maintained a 100-day activity streak",
                "threshold": 100,
                "type": "streak"
            }
        }
    
    def _save_achievements(self) -> None:
        """Save achievements data"""
        with open(self.achievements_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def check_new_badges(self, handle: str, current_streak: int, best_streak: int) -> Dict:
        """
        Check for new badges earned by user
        
        Returns:
        {
            'has_new_achievements': bool,
            'new_badges': List[str],
            'celebration_message': str,
            'should_announce_publicly': bool,
            'progress_to_next': Dict
        }
        """
        
        # Get user's current badges
        user_badges = self.data.get("user_achievements", {}).get(handle, [])
        earned_badge_ids = [badge["id"] for badge in user_badges]
        
        # Check which badges user should have now
        new_badges = []
        for badge_id, badge_info in self.data.get("badges", {}).items():
            if badge_info["type"] == "streak" and badge_info["threshold"] <= current_streak:
                if badge_id not in earned_badge_ids:
                    new_badges.append(badge_id)
        
        result = {
            'has_new_achievements': len(new_badges) > 0,
            'new_badges': new_badges,
            'celebration_message': '',
            'should_announce_publicly': False,
            'progress_to_next': self._get_progress_to_next(handle, current_streak)
        }
        
        if new_badges:
            # Award the new badges
            for badge_id in new_badges:
                self._award_badge(handle, badge_id, current_streak)
            
            # Generate celebration message
            result['celebration_message'] = self._generate_celebration(handle, new_badges)
            
            # Check if should announce publicly (week+ milestones)
            public_badges = ['week_streak', 'consistency_king', 'month_streak', 'century_club']
            result['should_announce_publicly'] = any(badge in public_badges for badge in new_badges)
            
            # Save changes
            self._save_achievements()
        
        return result
    
    def _award_badge(self, handle: str, badge_id: str, streak_value: int) -> None:
        """Award a badge to user"""
        badge_info = self.data["badges"][badge_id]
        
        # Add to user achievements
        if handle not in self.data["user_achievements"]:
            self.data["user_achievements"][handle] = []
        
        new_achievement = {
            "id": badge_id,
            "name": badge_info["name"],
            "description": badge_info["description"],
            "earned_at": datetime.datetime.now().isoformat(),
            "criteria": f"streak_days >= {badge_info['threshold']}"
        }
        
        self.data["user_achievements"][handle].append(new_achievement)
        
        # Add to achievement history
        self.data["achievement_history"].append({
            "handle": handle,
            "badge": {
                "id": badge_id,
                "name": badge_info["name"],
                "description": badge_info["description"], 
                "earned_at": new_achievement["earned_at"]
            },
            "timestamp": new_achievement["earned_at"]
        })
    
    def _generate_celebration(self, handle: str, badge_ids: List[str]) -> str:
        """Generate celebration message for new badges"""
        badge_messages = {
            "first_day": f"🎉 Welcome to the streak journey, {handle}! Every expert was once a beginner.",
            "early_bird": f"🌅 {handle} is an Early Bird! Three days of consistency - you're building momentum!",
            "week_streak": f"💪 {handle} earned Week Warrior! One full week of showing up - incredible dedication!",
            "consistency_king": f"🔥 {handle} is the Consistency King! Two weeks of commitment - you're in the zone!",
            "month_streak": f"🏆 {handle} is a Monthly Legend! 30 days of excellence - truly inspiring!",
            "century_club": f"👑 {handle} joined the Century Club! 100 days of mastery - legendary achievement!"
        }
        
        if len(badge_ids) == 1:
            return badge_messages.get(badge_ids[0], f"🎖️ {handle} earned a new badge!")
        else:
            # Multiple badges - focus on the highest
            highest_badge = max(badge_ids, key=lambda b: self.data["badges"][b]["threshold"])
            return badge_messages.get(highest_badge, f"🎖️ {handle} earned multiple badges!")
    
    def _get_progress_to_next(self, handle: str, current_streak: int) -> Dict:
        """Get progress toward next badge"""
        user_badges = self.data.get("user_achievements", {}).get(handle, [])
        earned_badge_ids = [badge["id"] for badge in user_badges]
        
        # Find next badge
        next_badges = []
        for badge_id, badge_info in self.data.get("badges", {}).items():
            if badge_info["type"] == "streak" and badge_info["threshold"] > current_streak:
                if badge_id not in earned_badge_ids:
                    next_badges.append({
                        "id": badge_id,
                        "name": badge_info["name"],
                        "threshold": badge_info["threshold"],
                        "days_needed": badge_info["threshold"] - current_streak
                    })
        
        if next_badges:
            next_badge = min(next_badges, key=lambda b: b["threshold"])
            return {
                "next_badge": next_badge,
                "days_remaining": next_badge["days_needed"],
                "progress_percentage": (current_streak / next_badge["threshold"]) * 100
            }
        
        return {"next_badge": None, "days_remaining": 0, "progress_percentage": 100}
    
    def get_user_summary(self, handle: str) -> Dict:
        """Get user's badge summary"""
        user_badges = self.data.get("user_achievements", {}).get(handle, [])
        
        return {
            "handle": handle,
            "total_badges": len(user_badges),
            "badges": [{"name": b["name"], "earned_at": b["earned_at"]} for b in user_badges],
            "latest_badge": user_badges[-1] if user_badges else None
        }
    
    def get_leaderboard(self) -> List[Dict]:
        """Get badge leaderboard"""
        leaderboard = []
        
        for handle, badges in self.data.get("user_achievements", {}).items():
            # Calculate score based on badge thresholds
            score = sum(
                self.data["badges"].get(badge["id"], {}).get("threshold", 1) 
                for badge in badges
            )
            
            leaderboard.append({
                "handle": handle,
                "badge_count": len(badges),
                "score": score,
                "latest_badge": badges[-1] if badges else None
            })
        
        return sorted(leaderboard, key=lambda x: (x["score"], x["badge_count"]), reverse=True)

# Convenience function for @streaks-agent
def check_badges_for_streak_update(handle: str, current_streak: int, best_streak: int) -> Dict:
    """
    Main function for @streaks-agent to check badges during streak updates
    
    Usage:
    result = check_badges_for_streak_update("alice", 7, 7)
    if result['has_new_achievements']:
        dm_user(handle, result['celebration_message'])
        if result['should_announce_publicly']:
            announce_ship(result['celebration_message'])
    """
    integration = StreaksBadgeIntegration()
    return integration.check_new_badges(handle, current_streak, best_streak)

def main():
    """Demo the integration"""
    integration = StreaksBadgeIntegration()
    
    # Test badge checking
    print("🎖️ Testing Badge Integration")
    print("=" * 40)
    
    # Check current users
    for handle in ["demo_user", "vibe_champion"]:
        print(f"\n{handle}:")
        result = integration.check_new_badges(handle, 1, 1)  # Both have 1-day streaks
        print(f"  New badges: {result['has_new_achievements']}")
        if result['celebration_message']:
            print(f"  Message: {result['celebration_message']}")
        
        progress = result['progress_to_next']
        if progress['next_badge']:
            next_badge = progress['next_badge']
            print(f"  Next: {next_badge['name']} in {next_badge['days_needed']} days")
    
    # Show leaderboard
    print("\n🏆 Leaderboard:")
    leaderboard = integration.get_leaderboard()
    for i, user in enumerate(leaderboard, 1):
        print(f"  {i}. {user['handle']}: {user['badge_count']} badges (score: {user['score']})")

if __name__ == "__main__":
    main()