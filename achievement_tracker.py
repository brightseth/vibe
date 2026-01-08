import json
import datetime

class AchievementTracker:
    def __init__(self, achievements_file='achievements.json'):
        self.achievements_file = achievements_file
        self.load_achievements()
    
    def load_achievements(self):
        """Load achievements from JSON file"""
        try:
            with open(self.achievements_file, 'r') as f:
                self.data = json.load(f)
        except FileNotFoundError:
            self.data = {"badges": {}, "user_badges": {}, "achievement_log": []}
    
    def save_achievements(self):
        """Save achievements to JSON file"""
        with open(self.achievements_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def award_badge(self, handle, badge_id):
        """Award a badge to a user"""
        if handle not in self.data["user_badges"]:
            self.data["user_badges"][handle] = []
        
        if badge_id not in self.data["user_badges"][handle]:
            self.data["user_badges"][handle].append(badge_id)
            
            # Log the achievement
            log_entry = {
                "handle": handle,
                "badge_id": badge_id,
                "timestamp": datetime.datetime.now().isoformat(),
                "badge_name": self.data["badges"][badge_id]["name"]
            }
            self.data["achievement_log"].append(log_entry)
            
            self.save_achievements()
            return True
        return False
    
    def check_streak_badges(self, handle, streak_days):
        """Check if user qualifies for streak-based badges"""
        badges_awarded = []
        
        for badge_id, badge in self.data["badges"].items():
            if "streak" in badge_id and streak_days >= badge["threshold"]:
                if self.award_badge(handle, badge_id):
                    badges_awarded.append(badge)
        
        return badges_awarded
    
    def get_user_badges(self, handle):
        """Get all badges for a user"""
        badge_ids = self.data["user_badges"].get(handle, [])
        return [self.data["badges"][badge_id] for badge_id in badge_ids]
    
    def format_badge_display(self, handle):
        """Format user's badges for display"""
        badges = self.get_user_badges(handle)
        if not badges:
            return f"{handle}: No badges yet"
        
        badge_text = " ".join([f"{badge['emoji']}{badge['name']}" for badge in badges])
        return f"{handle}: {badge_text}"
    
    def get_leaderboard(self):
        """Get badge leaderboard"""
        leaderboard = []
        for handle, badge_ids in self.data["user_badges"].items():
            leaderboard.append({
                "handle": handle,
                "badge_count": len(badge_ids),
                "badges": [self.data["badges"][badge_id] for badge_id in badge_ids]
            })
        
        return sorted(leaderboard, key=lambda x: x["badge_count"], reverse=True)