#!/usr/bin/env python3
"""
Live Badge Status Dashboard for @streaks-agent
Real-time view of badge progress and achievements
"""

import json
from datetime import datetime
from typing import Dict, List, Any

class StreaksBadgeDashboard:
    def __init__(self):
        self.badges_data = self.load_badges_data()
        self.current_streaks = {
            "@demo_user": {"current": 1, "best": 1},
            "@vibe_champion": {"current": 1, "best": 1}
        }
    
    def load_badges_data(self) -> Dict:
        """Load current badge system data"""
        try:
            with open('badges.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"user_badges": {}, "badge_categories": {}}
    
    def get_next_milestone_for_user(self, handle: str) -> Dict:
        """Get the next badge milestone a user can achieve"""
        if handle not in self.current_streaks:
            return {}
        
        current_streak = self.current_streaks[handle]["current"]
        user_badges = self.badges_data.get("user_badges", {}).get(handle, {}).get("earned", [])
        earned_badge_keys = [b["badge_key"] for b in user_badges]
        
        # Define streak milestones in order
        streak_milestones = [
            {"key": "first_day", "days": 1, "name": "First Day 🌱", "points": 5},
            {"key": "week_streak", "days": 7, "name": "Week Streak 🔥", "points": 30},
            {"key": "month_streak", "days": 30, "name": "Monthly Legend 👑", "points": 100},
            {"key": "century_streak", "days": 100, "name": "Century Club 💎", "points": 500}
        ]
        
        # Find next unearned milestone
        for milestone in streak_milestones:
            if milestone["key"] not in earned_badge_keys:
                days_needed = max(0, milestone["days"] - current_streak)
                return {
                    "badge": milestone,
                    "days_needed": days_needed,
                    "progress": min(100, (current_streak / milestone["days"]) * 100)
                }
        
        return {}
    
    def generate_dashboard(self) -> str:
        """Generate the live dashboard display"""
        dashboard = []
        dashboard.append("🏆 LIVE BADGE STATUS DASHBOARD")
        dashboard.append("=" * 50)
        dashboard.append(f"⏰ Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        dashboard.append("")
        
        # Current user status
        dashboard.append("👥 USER BADGE PROGRESS")
        dashboard.append("-" * 25)
        
        for handle in self.current_streaks:
            current_streak = self.current_streaks[handle]["current"]
            best_streak = self.current_streaks[handle]["best"]
            
            user_badges = self.badges_data.get("user_badges", {}).get(handle, {})
            badge_count = user_badges.get("achievements_unlocked", 0)
            total_points = user_badges.get("total_points", 0)
            
            dashboard.append(f"  {handle}")
            dashboard.append(f"    Streak: {current_streak} days (best: {best_streak})")
            dashboard.append(f"    Badges: {badge_count} earned ({total_points} points)")
            
            # Show earned badges
            if "earned" in user_badges:
                recent_badges = user_badges["earned"][-2:]  # Last 2 badges
                for badge in recent_badges:
                    badge_info = self.get_badge_info(badge["badge_key"])
                    dashboard.append(f"      {badge_info['emoji']} {badge_info['name']}")
            
            # Show next milestone
            next_milestone = self.get_next_milestone_for_user(handle)
            if next_milestone:
                badge = next_milestone["badge"]
                progress = next_milestone["progress"]
                days_needed = next_milestone["days_needed"]
                
                progress_bar = "█" * int(progress / 10) + "░" * (10 - int(progress / 10))
                dashboard.append(f"    Next: {badge['name']} [{progress_bar}] {progress:.1f}%")
                if days_needed > 0:
                    dashboard.append(f"          {days_needed} more days needed")
                else:
                    dashboard.append(f"          ✅ Ready to award!")
            
            dashboard.append("")
        
        # Badge system stats
        dashboard.append("📊 SYSTEM STATISTICS")
        dashboard.append("-" * 20)
        
        total_badges_available = len(self.badges_data.get("badge_categories", {}).get("streaks", {}))
        total_badges_available += len(self.badges_data.get("badge_categories", {}).get("participation", {}))
        total_badges_available += len(self.badges_data.get("badge_categories", {}).get("community", {}))
        total_badges_available += len(self.badges_data.get("badge_categories", {}).get("special", {}))
        
        total_badges_awarded = len(self.badges_data.get("award_history", []))
        
        dashboard.append(f"  Available badges: {total_badges_available}")
        dashboard.append(f"  Total awarded: {total_badges_awarded}")
        dashboard.append(f"  Users tracked: {len(self.current_streaks)}")
        dashboard.append("")
        
        # Leaderboard
        dashboard.append("🥇 CURRENT LEADERBOARD")
        dashboard.append("-" * 22)
        
        leaderboard = self.badges_data.get("leaderboard", {}).get("by_points", [])
        for i, user_data in enumerate(leaderboard[:3], 1):
            rank_emoji = ["🥇", "🥈", "🥉"][i-1] if i <= 3 else f"{i}."
            dashboard.append(f"  {rank_emoji} {user_data['user']} - {user_data['points']} pts ({user_data['badges']} badges)")
        
        dashboard.append("")
        
        # System status
        dashboard.append("⚡ SYSTEM STATUS")
        dashboard.append("-" * 16)
        dashboard.append("  Badge System: ✅ Active")
        dashboard.append("  Streak Tracking: ✅ Active")
        dashboard.append("  Auto-Awards: ✅ Enabled")
        dashboard.append("  Celebrations: ✅ Ready")
        
        return "\\n".join(dashboard)
    
    def get_badge_info(self, badge_key: str) -> Dict:
        """Get badge information by key"""
        # Search through all categories
        for category in self.badges_data.get("badge_categories", {}).values():
            if badge_key in category:
                badge_data = category[badge_key]
                # Extract emoji from name if present
                name = badge_data["name"]
                emoji = ""
                if "🌱" in name:
                    emoji = "🌱"
                elif "🔥" in name:
                    emoji = "🔥"
                elif "👑" in name:
                    emoji = "👑"
                elif "💎" in name:
                    emoji = "💎"
                elif "🚢" in name:
                    emoji = "🚢"
                else:
                    # Default emoji based on category
                    emoji = "🏅"
                
                return {
                    "name": name,
                    "emoji": emoji,
                    "description": badge_data.get("description", ""),
                    "points": badge_data.get("points", 0)
                }
        
        return {"name": badge_key, "emoji": "🏅", "description": "", "points": 0}

def main():
    dashboard = StreaksBadgeDashboard()
    output = dashboard.generate_dashboard()
    print(output)
    
    # Also save to file for web dashboard
    with open("badge_status_live.txt", "w") as f:
        f.write(output)
    
    print("\\n💾 Dashboard saved to badge_status_live.txt")

if __name__ == "__main__":
    main()