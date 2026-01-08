#!/usr/bin/env python3
"""
🎯 Streak Badge Motivation Dashboard
Motivates users by showing progress toward next badges
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

class StreakBadgeMotivation:
    def __init__(self):
        self.streak_data = {
            "@demo_user": {"current": 1, "best": 1},
            "@vibe_champion": {"current": 1, "best": 1}
        }
        
        # Badge milestones mapped to streak days
        self.streak_badges = {
            1: {"name": "First Day 🌱", "awarded": True},
            3: {"name": "Early Bird 🌅", "awarded": False}, 
            7: {"name": "Week Warrior 💪", "awarded": False},
            14: {"name": "Consistency King 🔥", "awarded": False},
            30: {"name": "Monthly Legend 🏆", "awarded": False},
            100: {"name": "Century Club 👑", "awarded": False}
        }
    
    def get_next_badge_info(self, user: str) -> Dict[str, Any]:
        """Get info about user's next badge milestone"""
        current_streak = self.streak_data.get(user, {}).get("current", 0)
        
        # Find next unearned badge
        for days, badge_info in sorted(self.streak_badges.items()):
            if days > current_streak:
                days_remaining = days - current_streak
                progress_percent = (current_streak / days) * 100
                
                return {
                    "next_badge": badge_info["name"],
                    "target_days": days,
                    "current_streak": current_streak,
                    "days_remaining": days_remaining,
                    "progress_percent": min(progress_percent, 100),
                    "motivation_level": self.get_motivation_level(days_remaining)
                }
        
        return {"next_badge": "All badges earned! 🎉", "days_remaining": 0}
    
    def get_motivation_level(self, days_remaining: int) -> str:
        """Get motivational message based on days remaining"""
        if days_remaining <= 1:
            return "🔥 SO CLOSE! Just keep showing up!"
        elif days_remaining <= 3:
            return "💪 You're almost there! Stay consistent!"
        elif days_remaining <= 7:
            return "🌟 Building momentum! Keep it up!"
        else:
            return "🚀 Every day counts! You've got this!"
    
    def generate_user_motivation(self, user: str) -> str:
        """Generate personalized motivation message"""
        info = self.get_next_badge_info(user)
        
        if info["days_remaining"] == 0:
            return f"{user}: {info['next_badge']}"
        
        return f"""
🎯 {user} Badge Progress:
┌─ Next: {info['next_badge']}
├─ Current streak: {info['current_streak']} days
├─ Days to go: {info['days_remaining']} days  
├─ Progress: {info['progress_percent']:.0f}%
└─ {info['motivation_level']}
"""
    
    def generate_dashboard(self) -> str:
        """Generate full motivation dashboard"""
        dashboard = "🏆 STREAK BADGE MOTIVATION DASHBOARD\n"
        dashboard += "=" * 50 + "\n\n"
        
        for user in self.streak_data.keys():
            dashboard += self.generate_user_motivation(user) + "\n"
        
        # Add general encouragement
        dashboard += "\n🌟 STREAK TIPS:\n"
        dashboard += "• Show up consistently, even for 5 minutes\n"
        dashboard += "• Share your progress to stay accountable\n"
        dashboard += "• Every day you show up builds toward your next badge!\n"
        dashboard += "• The /vibe workshop rewards consistency over perfection\n\n"
        
        # Show available badges
        dashboard += "🎖️ AVAILABLE STREAK BADGES:\n"
        for days, badge in self.streak_badges.items():
            status = "✅" if badge["awarded"] else "🎯"
            dashboard += f"{status} {badge['name']} - {days} days\n"
        
        return dashboard
    
    def get_encouragement_for_offline_users(self) -> List[str]:
        """Get encouragement messages for users who aren't online"""
        messages = []
        
        for user in self.streak_data.keys():
            info = self.get_next_badge_info(user)
            if info["days_remaining"] <= 3 and info["days_remaining"] > 0:
                msg = f"🔥 {user}: Only {info['days_remaining']} more days to earn {info['next_badge']}! Keep that momentum going!"
                messages.append(msg)
        
        return messages

def main():
    """Run the motivation dashboard"""
    motivation = StreakBadgeMotivation()
    
    print(motivation.generate_dashboard())
    
    # Show encouragement for users close to milestones
    encouragement = motivation.get_encouragement_for_offline_users()
    if encouragement:
        print("\n🎉 MILESTONE ALERTS:")
        for msg in encouragement:
            print(msg)

if __name__ == "__main__":
    main()