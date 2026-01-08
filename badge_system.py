import json
import datetime
from typing import Dict, List, Optional

class BadgeSystem:
    def __init__(self, badge_file='badges.json'):
        self.badge_file = badge_file
        self.load_badges()
    
    def load_badges(self):
        """Load badge data from JSON file"""
        try:
            with open(self.badge_file, 'r') as f:
                data = json.load(f)
            self.badges = data.get('achievement_badges', {})
            self.user_badges = data.get('user_badges', {})
            self.tiers = data.get('badge_tiers', {})
        except FileNotFoundError:
            self.badges = {}
            self.user_badges = {}
            self.tiers = {}
    
    def save_badges(self):
        """Save badge data to JSON file"""
        data = {
            'achievement_badges': self.badges,
            'user_badges': self.user_badges,
            'badge_tiers': self.tiers
        }
        with open(self.badge_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def award_badge(self, user: str, badge_id: str, reason: str = "") -> bool:
        """Award a badge to a user"""
        if badge_id not in self.badges:
            return False
        
        if user not in self.user_badges:
            self.user_badges[user] = []
        
        # Check if user already has this badge
        for badge in self.user_badges[user]:
            if badge['badge_id'] == badge_id:
                return False  # Already has badge
        
        # Award the badge
        new_badge = {
            'badge_id': badge_id,
            'awarded_at': datetime.datetime.now().isoformat(),
            'reason': reason
        }
        
        self.user_badges[user].append(new_badge)
        self.save_badges()
        return True
    
    def check_streak_badges(self, user: str, streak_days: int) -> List[str]:
        """Check if user earned any streak-based badges"""
        new_badges = []
        
        if streak_days >= 7 and not self.has_badge(user, 'week_streak'):
            if self.award_badge(user, 'week_streak', f"Achieved {streak_days}-day streak"):
                new_badges.append('week_streak')
        
        if streak_days >= 30 and not self.has_badge(user, 'consistency_champion'):
            if self.award_badge(user, 'consistency_champion', f"Achieved {streak_days}-day streak"):
                new_badges.append('consistency_champion')
        
        if streak_days >= 100 and not self.has_badge(user, 'century_club'):
            if self.award_badge(user, 'century_club', f"Achieved {streak_days}-day streak"):
                new_badges.append('century_club')
        
        return new_badges
    
    def has_badge(self, user: str, badge_id: str) -> bool:
        """Check if user has a specific badge"""
        if user not in self.user_badges:
            return False
        
        for badge in self.user_badges[user]:
            if badge['badge_id'] == badge_id:
                return True
        return False
    
    def get_user_badges(self, user: str) -> List[Dict]:
        """Get all badges for a user"""
        if user not in self.user_badges:
            return []
        
        result = []
        for badge in self.user_badges[user]:
            badge_info = self.badges.get(badge['badge_id'], {})
            result.append({
                **badge,
                'name': badge_info.get('name', 'Unknown Badge'),
                'description': badge_info.get('description', ''),
                'icon': badge_info.get('icon', '🏅'),
                'tier': badge_info.get('tier', 'bronze')
            })
        
        return result
    
    def get_leaderboard(self) -> List[Dict]:
        """Get badge leaderboard sorted by total badge value"""
        leaderboard = []
        
        for user, badges in self.user_badges.items():
            total_value = 0
            badge_count = len(badges)
            
            for badge in badges:
                badge_info = self.badges.get(badge['badge_id'], {})
                tier = badge_info.get('tier', 'bronze')
                tier_value = self.tiers.get(tier, {}).get('value', 0)
                total_value += tier_value
            
            leaderboard.append({
                'user': user,
                'badge_count': badge_count,
                'total_value': total_value,
                'badges': self.get_user_badges(user)
            })
        
        return sorted(leaderboard, key=lambda x: x['total_value'], reverse=True)
    
    def format_badge_display(self, user: str) -> str:
        """Format user's badges for display"""
        badges = self.get_user_badges(user)
        if not badges:
            return f"{user}: No badges yet 🎯"
        
        badge_display = " ".join([badge['icon'] for badge in badges])
        return f"{user}: {badge_display} ({len(badges)} badges)"

# Example usage functions
def check_and_award_streak_badges(user: str, streak_days: int) -> List[str]:
    """Helper function to check and award streak badges"""
    badge_system = BadgeSystem()
    return badge_system.check_streak_badges(user, streak_days)

def award_first_ship_badge(user: str) -> bool:
    """Helper function to award first ship badge"""
    badge_system = BadgeSystem()
    return badge_system.award_badge(user, 'first_ship', 'First project shipped to workshop')

def get_badge_leaderboard() -> List[Dict]:
    """Helper function to get badge leaderboard"""
    badge_system = BadgeSystem()
    return badge_system.get_leaderboard()