"""
Achievement Badges System for /vibe Workshop
Tracks and awards badges for different milestones and participation.
"""

import json
from datetime import datetime
from typing import Dict, List, Set

class AchievementTracker:
    def __init__(self, data_file='achievements.json'):
        self.data_file = data_file
        self.achievements = self._load_achievements()
        
        # Define badge categories and criteria
        self.badge_definitions = {
            # Streak Badges
            'first_day': {
                'name': '🌱 First Day',
                'description': 'Started your streak journey',
                'criteria': 'reach_streak_days',
                'threshold': 1
            },
            'week_warrior': {
                'name': '💪 Week Warrior', 
                'description': 'Maintained a 7-day streak',
                'criteria': 'reach_streak_days',
                'threshold': 7
            },
            'fortnight_hero': {
                'name': '🔥 Fortnight Hero',
                'description': 'Maintained a 14-day streak', 
                'criteria': 'reach_streak_days',
                'threshold': 14
            },
            'monthly_legend': {
                'name': '🏆 Monthly Legend',
                'description': 'Maintained a 30-day streak',
                'criteria': 'reach_streak_days', 
                'threshold': 30
            },
            'century_club': {
                'name': '👑 Century Club',
                'description': 'Maintained a 100-day streak',
                'criteria': 'reach_streak_days',
                'threshold': 100
            },
            
            # Participation Badges
            'first_ship': {
                'name': '🚢 First Ship',
                'description': 'Made your first ship announcement',
                'criteria': 'ship_count',
                'threshold': 1
            },
            'prolific_shipper': {
                'name': '⚡ Prolific Shipper',
                'description': 'Made 10 ship announcements',
                'criteria': 'ship_count', 
                'threshold': 10
            },
            'game_master': {
                'name': '🎮 Game Master',
                'description': 'Participated in first workshop game',
                'criteria': 'game_participation',
                'threshold': 1
            },
            'community_builder': {
                'name': '🤝 Community Builder',
                'description': 'Sent 5 DMs to other participants',
                'criteria': 'dm_count',
                'threshold': 5
            },
            
            # Special Badges
            'early_adopter': {
                'name': '⭐ Early Adopter',
                'description': 'Joined the workshop in its first week',
                'criteria': 'join_date',
                'threshold': '2026-01-15'  # Example early date
            },
            'comeback_kid': {
                'name': '💫 Comeback Kid', 
                'description': 'Restarted streak after a break',
                'criteria': 'streak_restarts',
                'threshold': 1
            }
        }
    
    def _load_achievements(self) -> Dict:
        """Load achievement data from file"""
        try:
            with open(self.data_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def _save_achievements(self):
        """Save achievement data to file"""
        with open(self.data_file, 'w') as f:
            json.dump(self.achievements, f, indent=2)
    
    def check_new_badges(self, handle: str, user_stats: Dict) -> List[str]:
        """
        Check if user has earned any new badges
        
        Args:
            handle: User handle
            user_stats: Dict with stats like {'streak_days': 7, 'ships': 3, 'games': 1}
            
        Returns:
            List of newly earned badge IDs
        """
        if handle not in self.achievements:
            self.achievements[handle] = {
                'badges': [],
                'last_checked': datetime.now().isoformat()
            }
        
        current_badges = set(self.achievements[handle]['badges'])
        new_badges = []
        
        for badge_id, badge_def in self.badge_definitions.items():
            if badge_id in current_badges:
                continue  # Already has this badge
                
            # Check criteria
            criteria = badge_def['criteria']
            threshold = badge_def['threshold']
            
            earned = False
            if criteria == 'reach_streak_days':
                earned = user_stats.get('streak_days', 0) >= threshold
            elif criteria == 'ship_count':
                earned = user_stats.get('ships', 0) >= threshold
            elif criteria == 'game_participation':
                earned = user_stats.get('games', 0) >= threshold
            elif criteria == 'dm_count':
                earned = user_stats.get('dms', 0) >= threshold
            elif criteria == 'streak_restarts':
                earned = user_stats.get('restarts', 0) >= threshold
            elif criteria == 'join_date':
                join_date = user_stats.get('join_date', '')
                if join_date and join_date <= threshold:
                    earned = True
            
            if earned:
                new_badges.append(badge_id)
                self.achievements[handle]['badges'].append(badge_id)
        
        if new_badges:
            self.achievements[handle]['last_checked'] = datetime.now().isoformat()
            self._save_achievements()
        
        return new_badges
    
    def get_user_badges(self, handle: str) -> List[Dict]:
        """Get all badges for a user with their details"""
        if handle not in self.achievements:
            return []
        
        user_badges = self.achievements[handle]['badges']
        return [
            {
                'id': badge_id,
                'name': self.badge_definitions[badge_id]['name'],
                'description': self.badge_definitions[badge_id]['description']
            }
            for badge_id in user_badges
            if badge_id in self.badge_definitions
        ]
    
    def get_leaderboard(self) -> List[Dict]:
        """Get badge leaderboard sorted by total badges"""
        leaderboard = []
        for handle, data in self.achievements.items():
            badge_count = len(data['badges'])
            if badge_count > 0:
                leaderboard.append({
                    'handle': handle,
                    'badge_count': badge_count,
                    'latest_badges': [
                        self.badge_definitions[bid]['name'] 
                        for bid in data['badges'][-3:]  # Show latest 3
                        if bid in self.badge_definitions
                    ]
                })
        
        return sorted(leaderboard, key=lambda x: x['badge_count'], reverse=True)
    
    def format_badge_announcement(self, handle: str, new_badges: List[str]) -> str:
        """Format a celebration message for new badges"""
        if not new_badges:
            return ""
        
        if len(new_badges) == 1:
            badge = self.badge_definitions[new_badges[0]]
            return f"🎉 {handle} earned {badge['name']}! {badge['description']}"
        else:
            badge_names = [self.badge_definitions[bid]['name'] for bid in new_badges]
            return f"🎉 {handle} earned {len(new_badges)} badges: {', '.join(badge_names)}!"

# Usage example for streaks-agent
def check_streak_badges(handle: str, current_streak: int, best_streak: int):
    """Helper function for streaks-agent to check badge eligibility"""
    tracker = AchievementTracker()
    
    user_stats = {
        'streak_days': current_streak,
        'best_streak': best_streak,
        # Add other stats as available
    }
    
    new_badges = tracker.check_new_badges(handle, user_stats)
    
    if new_badges:
        announcement = tracker.format_badge_announcement(handle, new_badges)
        return new_badges, announcement
    
    return [], ""

if __name__ == "__main__":
    # Demo usage
    tracker = AchievementTracker()
    
    # Simulate user achieving 7-day streak
    new_badges, msg = check_streak_badges("demo_user", 7, 7)
    print(f"New badges: {new_badges}")
    print(f"Message: {msg}")