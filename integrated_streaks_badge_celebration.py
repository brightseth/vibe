#!/usr/bin/env python3
"""
Integrated Streaks & Badge Celebration System
Combines streak tracking with badge awards and celebrations
"""

import json
import sys
import os
from datetime import datetime
from typing import Dict, List, Tuple

# Add current directory to path
sys.path.append(os.getcwd())

class IntegratedStreaksBadgeSystem:
    def __init__(self):
        self.achievements_file = 'achievements.json'
        self.badges_file = 'badges.json'
        self.streak_file = 'streak_data.json'
        
        # Load current data
        self.achievements = self._load_json(self.achievements_file, {})
        self.badges = self._load_json(self.badges_file, {})
        self.streak_data = self._load_json(self.streak_file, {})
        
        # Badge definitions (integrated from both systems)
        self.badge_definitions = {
            'first_day': {
                'name': '🌱 First Day',
                'description': 'Started your streak journey',
                'criteria': 'streak_days',
                'threshold': 1,
                'celebration': 'Welcome to the journey! 🌱'
            },
            'early_bird': {
                'name': '🌅 Early Bird', 
                'description': 'Active in the workshop for 3 consecutive days',
                'criteria': 'streak_days',
                'threshold': 3,
                'celebration': 'Getting started! Three days strong! 💪'
            },
            'week_warrior': {
                'name': '💪 Week Warrior',
                'description': 'Maintained a 7-day activity streak', 
                'criteria': 'streak_days',
                'threshold': 7,
                'celebration': 'One week strong! You\'re building a habit! 💪'
            },
            'fortnight_hero': {
                'name': '🔥 Fortnight Hero',
                'description': 'Maintained a 14-day streak',
                'criteria': 'streak_days', 
                'threshold': 14,
                'celebration': 'Two weeks! You\'re committed! 🔥'
            },
            'monthly_legend': {
                'name': '🏆 Monthly Legend',
                'description': 'Maintained a 30-day activity streak',
                'criteria': 'streak_days',
                'threshold': 30,
                'celebration': 'Monthly legend! This is dedication! 🏆'
            },
            'century_club': {
                'name': '👑 Century Club',
                'description': 'Maintained a 100-day activity streak',
                'criteria': 'streak_days',
                'threshold': 100,
                'celebration': 'Century club! You are LEGENDARY! 👑'
            },
            'first_ship': {
                'name': '🚢 First Ship',
                'description': 'Made your first ship announcement',
                'criteria': 'ships',
                'threshold': 1,
                'celebration': 'First ship deployed! Welcome aboard! 🚢'
            },
            'game_master': {
                'name': '🎮 Game Master',
                'description': 'Created or participated in workshop games',
                'criteria': 'games',
                'threshold': 1,
                'celebration': 'Game master! Bringing fun to the workshop! 🎮'
            },
            'comeback_kid': {
                'name': '💫 Comeback Kid',
                'description': 'Returned after a break and restarted streak',
                'criteria': 'comebacks',
                'threshold': 1,
                'celebration': 'Welcome back! Comeback kids are the strongest! 💫'
            }
        }
    
    def _load_json(self, filename: str, default: dict) -> dict:
        """Load JSON file with fallback to default"""
        try:
            with open(filename, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return default
    
    def _save_json(self, filename: str, data: dict):
        """Save data to JSON file"""
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
    
    def check_user_badges(self, handle: str, user_stats: Dict) -> Tuple[List[str], List[str]]:
        """
        Check if user earned new badges, return (new_badges, celebration_messages)
        
        Args:
            handle: User handle (with or without @)
            user_stats: Dict with stats like {'streak_days': 7, 'ships': 1, etc}
            
        Returns:
            Tuple of (new_badge_ids, celebration_messages)
        """
        clean_handle = handle.replace('@', '')
        
        # Initialize user data if needed
        if clean_handle not in self.achievements.get('user_achievements', {}):
            if 'user_achievements' not in self.achievements:
                self.achievements['user_achievements'] = {}
            self.achievements['user_achievements'][clean_handle] = []
        
        # Get currently earned badges
        current_badges = set()
        for badge_data in self.achievements['user_achievements'][clean_handle]:
            current_badges.add(badge_data.get('id', badge_data.get('badge_id', '')))
        
        new_badges = []
        celebration_messages = []
        
        # Check each badge definition
        for badge_id, badge_def in self.badge_definitions.items():
            if badge_id in current_badges:
                continue  # Already earned
            
            # Check if criteria is met
            criteria = badge_def['criteria']
            threshold = badge_def['threshold']
            earned = False
            
            if criteria == 'streak_days':
                earned = user_stats.get('streak_days', 0) >= threshold
            elif criteria == 'ships':
                earned = user_stats.get('ships', 0) >= threshold
            elif criteria == 'games':
                earned = user_stats.get('games', 0) >= threshold
            elif criteria == 'comebacks':
                earned = user_stats.get('comebacks', 0) >= threshold
            
            if earned:
                # Award the badge
                badge_entry = {
                    'id': badge_id,
                    'name': badge_def['name'],
                    'description': badge_def['description'],
                    'earned_at': datetime.now().isoformat(),
                    'criteria': f"{criteria} >= {threshold}"
                }
                
                self.achievements['user_achievements'][clean_handle].append(badge_entry)
                
                # Add to achievement history  
                if 'achievement_history' not in self.achievements:
                    self.achievements['achievement_history'] = []
                
                self.achievements['achievement_history'].append({
                    'handle': clean_handle,
                    'badge': badge_entry,
                    'timestamp': datetime.now().isoformat()
                })
                
                new_badges.append(badge_id)
                celebration_messages.append(badge_def['celebration'])
        
        # Save if new badges were awarded
        if new_badges:
            self._save_json(self.achievements_file, self.achievements)
        
        return new_badges, celebration_messages
    
    def get_user_status(self, handle: str) -> Dict:
        """Get comprehensive status for a user"""
        clean_handle = handle.replace('@', '')
        
        user_badges = self.achievements.get('user_achievements', {}).get(clean_handle, [])
        
        # Get next milestone
        current_streak = 0  # Would get from streak data
        next_milestone = None
        
        for badge_id, badge_def in self.badge_definitions.items():
            if badge_def['criteria'] == 'streak_days':
                threshold = badge_def['threshold']
                if threshold > current_streak:
                    if not next_milestone or threshold < next_milestone['threshold']:
                        next_milestone = {
                            'name': badge_def['name'],
                            'threshold': threshold,
                            'days_remaining': threshold - current_streak
                        }
        
        return {
            'handle': handle,
            'badges_earned': len(user_badges),
            'latest_badges': [b['name'] for b in user_badges[-3:]],  # Latest 3
            'next_milestone': next_milestone,
            'all_badges': user_badges
        }
    
    def generate_leaderboard(self) -> List[Dict]:
        """Generate badge leaderboard"""
        leaderboard = []
        
        for handle, badges in self.achievements.get('user_achievements', {}).items():
            if badges:
                leaderboard.append({
                    'handle': f'@{handle}',
                    'badge_count': len(badges),
                    'latest_badges': [b['name'] for b in badges[-2:]],
                    'latest_earned': badges[-1]['earned_at'] if badges else None
                })
        
        return sorted(leaderboard, key=lambda x: x['badge_count'], reverse=True)
    
    def format_celebration_dm(self, handle: str, new_badges: List[str], messages: List[str]) -> str:
        """Format a celebration DM for newly earned badges"""
        if not new_badges:
            return ""
        
        if len(new_badges) == 1:
            badge_name = self.badge_definitions[new_badges[0]]['name']
            message = messages[0]
            return f"🎉 Congratulations {handle}! You earned {badge_name}!\n\n{message}"
        else:
            badge_names = [self.badge_definitions[bid]['name'] for bid in new_badges]
            return f"🎉 WOW {handle}! You earned {len(new_badges)} badges:\n\n" + \
                   "\n".join([f"• {name}" for name in badge_names]) + \
                   "\n\nYou're on fire! 🔥"
    
    def run_comprehensive_check(self, current_streaks: Dict) -> Dict:
        """Run comprehensive badge check for all users"""
        results = {
            'users_checked': 0,
            'new_badges_awarded': 0,
            'celebrations_needed': [],
            'leaderboard': [],
            'summary': []
        }
        
        for handle, streak_info in current_streaks.items():
            results['users_checked'] += 1
            
            user_stats = {
                'streak_days': streak_info.get('current', 0),
                'ships': 0,     # Default - would be tracked
                'games': 0,     # Default - would be tracked  
                'comebacks': 0  # Default - would be tracked
            }
            
            new_badges, celebrations = self.check_user_badges(handle, user_stats)
            
            if new_badges:
                results['new_badges_awarded'] += len(new_badges)
                celebration_dm = self.format_celebration_dm(handle, new_badges, celebrations)
                
                results['celebrations_needed'].append({
                    'handle': handle,
                    'badges': new_badges,
                    'dm_message': celebration_dm
                })
            
            # Get user status for summary
            status = self.get_user_status(handle)
            results['summary'].append(status)
        
        results['leaderboard'] = self.generate_leaderboard()
        
        return results

def main():
    print("🎯 Integrated Streaks & Badge Celebration System")
    print("=" * 55)
    
    # Current streak data (from streaks-agent memory)
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    # Initialize system
    system = IntegratedStreaksBadgeSystem()
    
    # Run comprehensive check
    results = system.run_comprehensive_check(current_streaks)
    
    print(f"\n📊 Check Results:")
    print(f"   Users checked: {results['users_checked']}")
    print(f"   New badges awarded: {results['new_badges_awarded']}")
    
    # Show celebrations needed
    if results['celebrations_needed']:
        print(f"\n🎉 Celebrations to Send:")
        for celebration in results['celebrations_needed']:
            handle = celebration['handle']
            badges = celebration['badges']
            print(f"\n   {handle}: {len(badges)} new badges")
            badge_names = [system.badge_definitions[bid]['name'] for bid in badges]
            print(f"   Badges: {', '.join(badge_names)}")
            print(f"   DM: {celebration['dm_message'][:100]}...")
    else:
        print(f"\n✅ No new badges to award right now")
    
    # Show user summaries
    print(f"\n👥 User Status Summary:")
    for user in results['summary']:
        handle = user['handle']
        count = user['badges_earned']
        latest = ', '.join(user['latest_badges']) if user['latest_badges'] else 'None yet'
        print(f"   {handle}: {count} badges ({latest})")
        
        if user['next_milestone']:
            milestone = user['next_milestone']
            days_remaining = milestone['days_remaining']
            print(f"      Next: {milestone['name']} in {days_remaining} days")
    
    # Show leaderboard
    if results['leaderboard']:
        print(f"\n🏆 Badge Leaderboard:")
        for i, entry in enumerate(results['leaderboard'], 1):
            handle = entry['handle']
            count = entry['badge_count']
            latest = ', '.join(entry['latest_badges'])
            print(f"   {i}. {handle}: {count} badges ({latest})")
    
    print(f"\n✅ Integration check complete!")
    
    return results

if __name__ == "__main__":
    main()