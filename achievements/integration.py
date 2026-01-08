"""
Integration functions for badges with the streaks agent
"""

import json
from achievements.badge_system import BadgeSystem

def check_and_award_streak_badges(user: str, current_streak: int) -> list:
    """
    Check if user has earned any streak-based badges
    Returns list of newly awarded badge names for celebration
    """
    badge_system = BadgeSystem()
    new_badges = badge_system.check_streak_badges(user, current_streak)
    
    # Convert badge types to display names for celebrations
    celebrations = []
    for badge_type in new_badges:
        if badge_type in badge_system.data["badge_types"]:
            badge_name = badge_system.data["badge_types"][badge_type]["name"]
            celebrations.append(badge_name)
    
    return celebrations

def award_activity_badge(user: str, badge_type: str) -> bool:
    """
    Award a specific activity badge (like first_ship, game_master)
    Returns True if badge was newly awarded
    """
    badge_system = BadgeSystem()
    return badge_system.award_badge(user, badge_type)

def get_user_badge_summary(user: str) -> str:
    """
    Get formatted summary of user's badges for display
    """
    badge_system = BadgeSystem()
    return badge_system.format_badge_display(user)

def get_badge_stats() -> dict:
    """
    Get overall badge statistics
    """
    badge_system = BadgeSystem()
    
    total_badges_awarded = sum(len(badges) for badges in badge_system.data["user_badges"].values())
    total_badge_types = len(badge_system.data["badge_types"])
    total_users = len(badge_system.data["user_badges"])
    
    return {
        "total_badges_awarded": total_badges_awarded,
        "total_badge_types": total_badge_types,
        "total_users": total_users,
        "leaderboard": badge_system.get_badge_leaderboard()
    }

# Example streak integration workflow
def handle_user_activity(user: str, activity_type: str, current_streak: int):
    """
    Handle any user activity and check for badge awards
    """
    new_badges = []
    
    # Check streak badges
    streak_badges = check_and_award_streak_badges(user, current_streak)
    new_badges.extend(streak_badges)
    
    # Check activity-specific badges
    if activity_type == "ship" and award_activity_badge(user, "first_ship"):
        new_badges.append("First Ship 🚢")
    elif activity_type == "game" and award_activity_badge(user, "game_master"):
        new_badges.append("Game Master 🎮")
    
    return new_badges