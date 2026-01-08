"""
Integration between streak tracking and badge system
This module handles automatic badge awarding based on streak milestones
"""

import json
from badge_system import BadgeSystem

class StreakBadgeIntegration:
    def __init__(self):
        self.badge_system = BadgeSystem()
    
    def process_streak_update(self, user_handle, current_streak, best_streak, is_new_record=False):
        """
        Process a streak update and award appropriate badges
        Called when streaks are updated via observe_vibe
        """
        awarded_badges = []
        
        # Check streak milestone badges
        streak_badges = self.badge_system.check_streak_badges(user_handle, current_streak, best_streak)
        awarded_badges.extend(streak_badges)
        
        # Check for comeback badge (if they had a longer streak before)
        if current_streak > 1 and best_streak > current_streak:
            success, msg = self.badge_system.award_badge(
                user_handle, 
                "comeback_kid", 
                f"Restarted streak after previous {best_streak}-day record"
            )
            if success:
                awarded_badges.append("comeback_kid")
        
        return awarded_badges
    
    def award_activity_badge(self, user_handle, badge_key, reason):
        """
        Award an activity-based badge (called from other systems)
        """
        return self.badge_system.award_badge(user_handle, badge_key, reason)
    
    def get_celebration_message(self, user_handle, badge_key):
        """
        Generate celebration message for a newly awarded badge
        """
        if badge_key not in self.badge_system.data["badge_definitions"]:
            return "🎉 Badge awarded!"
        
        badge = self.badge_system.data["badge_definitions"][badge_key]
        messages = {
            "first_ship": f"🚢 Welcome to the shipping crew! Your first project is always special.",
            "week_streak": f"💪 One week of consistency! You're building something powerful here.",
            "month_legend": f"🏆 30 days strong! You've proven your dedication to the /vibe.",
            "century_club": f"👑 100 DAYS! You are now workshop royalty. Incredible commitment!",
            "game_master": f"🎮 Thanks for bringing the fun! Games make our community stronger.",
            "helper": f"🤝 Your helping spirit makes /vibe special. Thank you for lifting others!",
            "comeback_kid": f"🔄 Welcome back! It takes courage to restart - proud of you.",
            "innovator": f"💡 Your fresh ideas push us forward. Keep that creative energy flowing!",
            "early_bird": f"🌅 The early bird catches the worm! Your morning energy is inspiring.",
            "night_owl": f"🦉 Burning the midnight oil! Your late-night dedication shows."
        }
        
        return messages.get(badge_key, f"🎉 You earned {badge['name']}! {badge['description']}")
    
    def get_user_progress_summary(self, user_handle):
        """
        Get a summary of user's badges and potential next milestones
        """
        badges = self.badge_system.get_user_badges(user_handle)
        points = self.badge_system.get_user_points(user_handle)
        
        # Check what streak badges they're close to
        next_milestones = []
        user_badges_keys = [b["badge_key"] for b in badges]
        
        if "week_streak" not in user_badges_keys:
            next_milestones.append("7 days → Week Warrior badge")
        elif "month_legend" not in user_badges_keys:
            next_milestones.append("30 days → Monthly Legend badge")
        elif "century_club" not in user_badges_keys:
            next_milestones.append("100 days → Century Club badge")
        
        return {
            "badges": badges,
            "points": points,
            "badge_count": len(badges),
            "next_milestones": next_milestones
        }
    
    def generate_leaderboard_update(self):
        """
        Generate leaderboard data for announcements
        """
        return self.badge_system.get_leaderboard()

# Example integration with existing streak system
def update_streaks_with_badges():
    """
    This would be called from the main streak tracking system
    """
    integration = StreakBadgeIntegration()
    
    # Example: Process current users
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    for user, streak_data in current_streaks.items():
        awarded = integration.process_streak_update(
            user, 
            streak_data["current"], 
            streak_data["best"]
        )
        
        if awarded:
            print(f"Awarded badges to {user}: {awarded}")

if __name__ == "__main__":
    update_streaks_with_badges()