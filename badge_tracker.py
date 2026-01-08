#!/usr/bin/env python3
"""
Achievement Badge Tracker for /vibe workshop
Tracks and awards badges based on user activity and streaks
"""

import json
import datetime
from typing import Dict, List, Optional

class BadgeTracker:
    def __init__(self, achievements_file='achievements.json'):
        self.achievements_file = achievements_file
        self.load_achievements()
    
    def load_achievements(self):
        """Load achievement data from file"""
        try:
            with open(self.achievements_file, 'r') as f:
                self.data = json.load(f)
        except FileNotFoundError:
            self.data = {
                "badges": {},
                "user_achievements": {},
                "achievement_history": []
            }
    
    def save_achievements(self):
        """Save achievement data to file"""
        with open(self.achievements_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def check_streak_badges(self, handle: str, current_streak: int) -> List[str]:
        """Check if user earned any streak-based badges"""
        new_badges = []
        user_badges = self.data["user_achievements"].get(handle, [])
        
        for badge_id, badge in self.data["badges"].items():
            if badge["type"] == "streak":
                if (current_streak >= badge["threshold"] and 
                    badge_id not in user_badges):
                    new_badges.append(badge_id)
                    self.award_badge(handle, badge_id)
        
        return new_badges
    
    def award_badge(self, handle: str, badge_id: str):
        """Award a badge to a user"""
        if handle not in self.data["user_achievements"]:
            self.data["user_achievements"][handle] = []
        
        if badge_id not in self.data["user_achievements"][handle]:
            self.data["user_achievements"][handle].append(badge_id)
            
            # Record in history
            self.data["achievement_history"].append({
                "handle": handle,
                "badge_id": badge_id,
                "timestamp": datetime.datetime.now().isoformat(),
                "badge_name": self.data["badges"][badge_id]["name"]
            })
            
            self.save_achievements()
    
    def get_user_badges(self, handle: str) -> List[Dict]:
        """Get all badges for a user"""
        user_badge_ids = self.data["user_achievements"].get(handle, [])
        return [
            {
                "id": badge_id,
                **self.data["badges"][badge_id]
            }
            for badge_id in user_badge_ids
        ]
    
    def get_leaderboard(self) -> List[Dict]:
        """Get badge leaderboard"""
        leaderboard = []
        for handle, badges in self.data["user_achievements"].items():
            leaderboard.append({
                "handle": handle,
                "badge_count": len(badges),
                "badges": [self.data["badges"][bid]["name"] for bid in badges]
            })
        
        return sorted(leaderboard, key=lambda x: x["badge_count"], reverse=True)

if __name__ == "__main__":
    tracker = BadgeTracker()
    
    # Example usage
    print("Badge system initialized!")
    print(f"Available badges: {len(tracker.data['badges'])}")
    for badge_id, badge in tracker.data["badges"].items():
        print(f"  {badge['name']}: {badge['description']}")