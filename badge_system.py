import json
from datetime import datetime

class BadgeSystem:
    def __init__(self, badges_file="badges.json"):
        self.badges_file = badges_file
        self.load_badges()
    
    def load_badges(self):
        try:
            with open(self.badges_file, 'r') as f:
                self.data = json.load(f)
        except FileNotFoundError:
            self.data = {"badge_definitions": {}, "user_badges": {}, "badge_log": [], "stats": {}}
    
    def save_badges(self):
        with open(self.badges_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def award_badge(self, user_handle, badge_key, reason=""):
        """Award a badge to a user if they don't already have it"""
        if badge_key not in self.data["badge_definitions"]:
            return False, f"Badge '{badge_key}' not found"
        
        if user_handle not in self.data["user_badges"]:
            self.data["user_badges"][user_handle] = []
        
        # Check if user already has this badge
        user_badges = [b["badge_key"] for b in self.data["user_badges"][user_handle]]
        if badge_key in user_badges:
            return False, f"User already has '{badge_key}' badge"
        
        # Award the badge
        badge_info = self.data["badge_definitions"][badge_key]
        awarded_badge = {
            "badge_key": badge_key,
            "awarded_at": datetime.now().isoformat(),
            "reason": reason
        }
        
        self.data["user_badges"][user_handle].append(awarded_badge)
        
        # Log the award
        log_entry = {
            "user": user_handle,
            "badge": badge_key,
            "badge_name": badge_info["name"],
            "points": badge_info["points"],
            "awarded_at": awarded_badge["awarded_at"],
            "reason": reason
        }
        self.data["badge_log"].append(log_entry)
        
        # Update stats
        self.data["stats"]["total_badges_awarded"] = self.data["stats"].get("total_badges_awarded", 0) + 1
        
        self.save_badges()
        return True, f"Awarded '{badge_info['name']}' to {user_handle}!"
    
    def get_user_badges(self, user_handle):
        """Get all badges for a user with full details"""
        if user_handle not in self.data["user_badges"]:
            return []
        
        user_badges = []
        for badge in self.data["user_badges"][user_handle]:
            badge_def = self.data["badge_definitions"][badge["badge_key"]]
            full_badge = {
                **badge_def,
                "badge_key": badge["badge_key"],
                "awarded_at": badge["awarded_at"],
                "reason": badge["reason"]
            }
            user_badges.append(full_badge)
        
        return user_badges
    
    def get_user_points(self, user_handle):
        """Calculate total points for a user"""
        badges = self.get_user_badges(user_handle)
        return sum(badge["points"] for badge in badges)
    
    def get_leaderboard(self):
        """Get leaderboard by total points"""
        leaderboard = []
        for user_handle in self.data["user_badges"]:
            points = self.get_user_points(user_handle)
            badge_count = len(self.data["user_badges"][user_handle])
            leaderboard.append({
                "user": user_handle,
                "points": points,
                "badge_count": badge_count
            })
        
        return sorted(leaderboard, key=lambda x: x["points"], reverse=True)
    
    def check_streak_badges(self, user_handle, current_streak, best_streak):
        """Check and award streak-based badges"""
        awarded = []
        
        # Week Streak
        if current_streak >= 7:
            success, msg = self.award_badge(user_handle, "week_streak", f"Achieved {current_streak}-day streak")
            if success:
                awarded.append("week_streak")
        
        # Month Legend
        if current_streak >= 30:
            success, msg = self.award_badge(user_handle, "month_legend", f"Achieved {current_streak}-day streak")
            if success:
                awarded.append("month_legend")
        
        # Century Club
        if current_streak >= 100:
            success, msg = self.award_badge(user_handle, "century_club", f"Achieved {current_streak}-day streak")
            if success:
                awarded.append("century_club")
        
        return awarded

    def display_badge(self, badge_key):
        """Get display string for a badge"""
        if badge_key not in self.data["badge_definitions"]:
            return "Unknown Badge"
        
        badge = self.data["badge_definitions"][badge_key]
        return f"{badge['name']} - {badge['description']} ({badge['points']} pts)"

# Example usage and streak integration
if __name__ == "__main__":
    badge_system = BadgeSystem()
    
    # Example: Award first ship badge
    # badge_system.award_badge("@demo_user", "first_ship", "Shipped their first project")
    
    # Example: Check streak badges for current users
    # badge_system.check_streak_badges("@demo_user", 1, 1)
    # badge_system.check_streak_badges("@vibe_champion", 1, 1)