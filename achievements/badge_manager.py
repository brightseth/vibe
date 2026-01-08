#!/usr/bin/env python3
"""
Badge Management System for /vibe workshop
Tracks and awards achievement badges to users
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional

class BadgeManager:
    def __init__(self, badges_file="achievements/badges.json"):
        self.badges_file = badges_file
        self.data = self.load_badges()
    
    def load_badges(self) -> Dict:
        """Load badge data from storage"""
        if os.path.exists(self.badges_file):
            with open(self.badges_file, 'r') as f:
                return json.load(f)
        return {"badges": {}, "badge_definitions": {}, "stats": {}}
    
    def save_badges(self):
        """Save badge data to storage"""
        os.makedirs(os.path.dirname(self.badges_file), exist_ok=True)
        with open(self.badges_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def award_badge(self, handle: str, badge_id: str) -> bool:
        """Award a badge to a user if they don't already have it"""
        if handle not in self.data["badges"]:
            self.data["badges"][handle] = []
        
        # Check if user already has this badge
        user_badges = [b["badge"] for b in self.data["badges"][handle]]
        if badge_id in user_badges:
            return False  # Already has badge
        
        # Award the badge
        badge_info = {
            "badge": badge_id,
            "earned_date": datetime.now().strftime("%Y-%m-%d"),
            "description": self.data["badge_definitions"][badge_id]["description"]
        }
        
        self.data["badges"][handle].append(badge_info)
        
        # Update stats
        self.data["stats"]["total_badges_awarded"] = self.data["stats"].get("total_badges_awarded", 0) + 1
        
        if "recent_awards" not in self.data["stats"]:
            self.data["stats"]["recent_awards"] = []
        
        self.data["stats"]["recent_awards"].insert(0, {
            "handle": handle,
            "badge": badge_id,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M")
        })
        
        # Keep only last 10 recent awards
        self.data["stats"]["recent_awards"] = self.data["stats"]["recent_awards"][:10]
        
        self.save_badges()
        return True
    
    def check_streak_badges(self, handle: str, streak_days: int):
        """Check and award streak-based badges"""
        badges_to_check = [
            (3, "getting_started"),
            (7, "week_warrior"), 
            (14, "two_week_legend"),
            (30, "monthly_master"),
            (100, "century_club")
        ]
        
        awarded = []
        for threshold, badge_id in badges_to_check:
            if streak_days >= threshold:
                if self.award_badge(handle, badge_id):
                    awarded.append(badge_id)
        
        return awarded
    
    def get_user_badges(self, handle: str) -> List[Dict]:
        """Get all badges for a user"""
        return self.data["badges"].get(handle, [])
    
    def get_badge_leaderboard(self) -> List[Dict]:
        """Get users ranked by badge count"""
        leaderboard = []
        for handle, badges in self.data["badges"].items():
            leaderboard.append({
                "handle": handle,
                "badge_count": len(badges),
                "latest_badge": badges[-1] if badges else None
            })
        
        return sorted(leaderboard, key=lambda x: x["badge_count"], reverse=True)
    
    def format_user_badges(self, handle: str) -> str:
        """Format user's badges for display"""
        badges = self.get_user_badges(handle)
        if not badges:
            return f"{handle}: No badges yet"
        
        badge_names = []
        for badge in badges:
            badge_def = self.data["badge_definitions"][badge["badge"]]
            badge_names.append(badge_def["name"])
        
        return f"{handle}: {' '.join(badge_names)} ({len(badges)} total)"

# Usage example
if __name__ == "__main__":
    bm = BadgeManager()
    
    # Test awarding a badge
    if bm.award_badge("@demo_user", "getting_started"):
        print("Badge awarded!")
    
    # Check user badges
    print(bm.format_user_badges("@demo_user"))
    
    # Show leaderboard
    print("\nLeaderboard:")
    for user in bm.get_badge_leaderboard():
        print(f"  {user['handle']}: {user['badge_count']} badges")