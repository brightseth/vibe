#!/usr/bin/env python3
"""
🏆 Real-Time Badge Status Dashboard
Built by @streaks-agent for /vibe workshop

Quick status check and celebration system for achievements
"""

import json
import datetime
from typing import Dict, List, Optional

class BadgeStatusDashboard:
    """Real-time dashboard for badge achievements and celebrations"""
    
    def __init__(self):
        self.achievements_file = "achievements.json"
        self.data = self._load_achievements()
    
    def _load_achievements(self) -> Dict:
        """Load current achievements data"""
        try:
            with open(self.achievements_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "badges": {},
                "user_achievements": {},
                "achievement_history": []
            }
    
    def check_pending_celebrations(self) -> List[Dict]:
        """Check for achievements that need celebration messages"""
        pending = []
        
        for user, achievements in self.data.get("user_achievements", {}).items():
            for achievement in achievements:
                # Check if this achievement needs celebration
                # For now, we'll consider all achievements as celebrated since they're in the file
                # In a real system, we'd track celebration_sent status
                pass
        
        return pending
    
    def get_user_progress(self, handle: str) -> Dict:
        """Get progress toward next badges for a user"""
        user_achievements = self.data.get("user_achievements", {}).get(handle, [])
        earned_badge_ids = [a["id"] for a in user_achievements]
        
        # Define badge progression
        badge_progression = [
            {"id": "first_day", "name": "🌱 First Day", "threshold": 1},
            {"id": "early_bird", "name": "🌅 Early Bird", "threshold": 3}, 
            {"id": "week_streak", "name": "💪 Week Warrior", "threshold": 7},
            {"id": "consistency_king", "name": "🔥 Consistency King", "threshold": 14},
            {"id": "month_streak", "name": "🏆 Monthly Legend", "threshold": 30},
            {"id": "century_club", "name": "👑 Century Club", "threshold": 100}
        ]
        
        next_badges = []
        for badge in badge_progression:
            if badge["id"] not in earned_badge_ids:
                next_badges.append(badge)
        
        return {
            "handle": handle,
            "current_badges": len(user_achievements),
            "earned_badges": user_achievements,
            "next_badges": next_badges[:3],  # Next 3 achievable
            "total_possible": len(badge_progression)
        }
    
    def get_system_status(self) -> Dict:
        """Get overall system status"""
        total_users = len(self.data.get("user_achievements", {}))
        total_badges_awarded = sum(
            len(achievements) 
            for achievements in self.data.get("user_achievements", {}).values()
        )
        total_history = len(self.data.get("achievement_history", []))
        
        # Recent activity
        recent_achievements = self.data.get("achievement_history", [])[-5:]  # Last 5
        
        return {
            "total_users": total_users,
            "total_badges_awarded": total_badges_awarded,
            "total_history_entries": total_history,
            "recent_achievements": recent_achievements,
            "system_health": "healthy" if total_users > 0 else "waiting_for_users",
            "last_updated": datetime.datetime.now().isoformat()
        }
    
    def generate_celebration_messages(self, handle: str, new_badges: List[str]) -> List[str]:
        """Generate celebration messages for new badges"""
        celebrations = []
        
        badge_messages = {
            "first_day": f"🎉 Welcome aboard, {handle}! Your streak journey begins now!",
            "early_bird": f"🌅 {handle} is an Early Bird! Three days of consistency!",
            "week_streak": f"💪 {handle} earned Week Warrior! One full week of dedication!",
            "consistency_king": f"🔥 {handle} is the Consistency King! Two weeks strong!",
            "month_streak": f"🏆 {handle} is a Monthly Legend! 30 days of excellence!",
            "century_club": f"👑 {handle} joined the Century Club! 100 days of mastery!"
        }
        
        for badge_id in new_badges:
            if badge_id in badge_messages:
                celebrations.append(badge_messages[badge_id])
        
        return celebrations
    
    def should_announce_publicly(self, badge_id: str) -> bool:
        """Determine if badge should be announced on board"""
        public_badges = ["week_streak", "consistency_king", "month_streak", "century_club"]
        return badge_id in public_badges
    
    def display_dashboard(self) -> str:
        """Generate formatted dashboard display"""
        status = self.get_system_status()
        
        dashboard = f"""
🏆 Badge Status Dashboard
========================

System Status: {status['system_health'].upper()}
Users: {status['total_users']} | Badges Awarded: {status['total_badges_awarded']}

Current Users:
"""
        
        for handle in self.data.get("user_achievements", {}).keys():
            progress = self.get_user_progress(handle)
            badges_text = " ".join([b["name"] for b in progress["earned_badges"]]) or "None yet"
            next_badge = progress["next_badges"][0]["name"] if progress["next_badges"] else "All earned!"
            
            dashboard += f"  {handle}: {badges_text} → Next: {next_badge}\n"
        
        if status["recent_achievements"]:
            dashboard += "\nRecent Activity:\n"
            for achievement in status["recent_achievements"]:
                badge_name = achievement["badge"]["name"]
                handle = achievement["handle"]
                dashboard += f"  {badge_name} → {handle}\n"
        
        dashboard += f"\nLast Updated: {status['last_updated']}"
        return dashboard

def main():
    """Run the dashboard"""
    dashboard = BadgeStatusDashboard()
    
    print(dashboard.display_dashboard())
    
    # Show individual user progress
    for handle in dashboard.data.get("user_achievements", {}).keys():
        print(f"\n📊 Progress for {handle}:")
        progress = dashboard.get_user_progress(handle)
        print(f"   Badges earned: {progress['current_badges']}/{progress['total_possible']}")
        if progress['next_badges']:
            next_badge = progress['next_badges'][0]
            print(f"   Next milestone: {next_badge['name']} (need {next_badge['threshold']} day streak)")

if __name__ == "__main__":
    main()