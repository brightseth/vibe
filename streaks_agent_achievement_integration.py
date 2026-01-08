#!/usr/bin/env python3
"""
@streaks-agent Achievement Integration System
Comprehensive integration of streaks, badges, and celebrations
"""

import json
import os
from datetime import datetime
from streak_milestone_celebration_system import StreakMilestoneCelebrationSystem

class StreaksAgentAchievementIntegration:
    def __init__(self):
        self.streaks_file = 'streak_data.json'
        self.badges_file = 'badges.json'
        self.celebration_system = StreakMilestoneCelebrationSystem()
        
        # Integration settings
        self.auto_celebrate = True
        self.auto_award_badges = True
        self.board_announcements = True
    
    def load_streaks(self):
        """Load current streak data"""
        try:
            with open(self.streaks_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def save_streaks(self, streak_data):
        """Save streak data"""
        with open(self.streaks_file, 'w') as f:
            json.dump(streak_data, f, indent=2)
    
    def update_user_activity(self, handle, activity_data=None):
        """Update user activity and trigger achievement checks"""
        if activity_data is None:
            activity_data = {}
        
        # Load current data
        streak_data = self.load_streaks()
        
        # Initialize user if needed
        if handle not in streak_data:
            streak_data[handle] = {
                'current': 0,
                'best': 0,
                'last_active': None,
                'total_days': 0,
                'ships': 0,
                'games': 0
            }
        
        # Update activity
        user_data = streak_data[handle]
        now = datetime.now().isoformat()
        
        # Update streak (mark as active today)
        user_data['current'] = activity_data.get('current_streak', user_data['current'])
        user_data['best'] = max(user_data['best'], user_data['current'])
        user_data['last_active'] = now
        user_data['total_days'] = activity_data.get('total_days', user_data['total_days'])
        user_data['ships'] = activity_data.get('ships', user_data['ships'])
        user_data['games'] = activity_data.get('games', user_data['games'])
        
        # Save updated streaks
        self.save_streaks(streak_data)
        
        # Check for achievements to award and celebrate
        achievements_to_process = self.check_achievements_for_user(handle, user_data)
        
        return {
            'handle': handle,
            'updated_data': user_data,
            'achievements': achievements_to_process
        }
    
    def check_achievements_for_user(self, handle, user_data):
        """Check what achievements this user should receive"""
        current_streak = user_data['current']
        achievements_to_award = []
        
        # Check streak milestones
        current_streaks = {handle: user_data}
        celebrations = self.celebration_system.check_milestone_achievements(current_streaks)
        
        for celebration in celebrations:
            achievements_to_award.append({
                'type': 'milestone',
                'handle': handle,
                'milestone_days': celebration['milestone'],
                'badge_key': celebration['badge_key'],
                'celebration_data': celebration['celebration']
            })
        
        # Check participation badges
        ships = user_data.get('ships', 0)
        games = user_data.get('games', 0)
        
        # Load existing badges to avoid duplicates
        badges_data = self.celebration_system.load_badges()
        user_badges = badges_data.get('user_badges', {}).get(handle, {}).get('earned', [])
        earned_badge_keys = [badge['badge_key'] for badge in user_badges]
        
        # Ship-based badges
        if ships >= 1 and 'first_ship' not in earned_badge_keys:
            achievements_to_award.append({
                'type': 'participation',
                'handle': handle,
                'badge_key': 'first_ship',
                'reason': f'First ship posted ({ships} ships)'
            })
        
        if ships >= 5 and 'active_shipper' not in earned_badge_keys:
            achievements_to_award.append({
                'type': 'participation', 
                'handle': handle,
                'badge_key': 'active_shipper',
                'reason': f'Active shipping ({ships} ships)'
            })
        
        # Game-based badges
        if games >= 1 and 'game_master' not in earned_badge_keys:
            achievements_to_award.append({
                'type': 'participation',
                'handle': handle,
                'badge_key': 'game_master',
                'reason': f'Game participation ({games} games)'
            })
        
        return achievements_to_award
    
    def process_achievements(self, achievements):
        """Process and award achievements, send celebrations"""
        results = []
        
        for achievement in achievements:
            handle = achievement['handle']
            badge_key = achievement['badge_key']
            
            # Award the badge
            badge_awarded = self.celebration_system.award_milestone_badge(
                handle, badge_key, 
                achievement.get('milestone_days', 0)
            )
            
            if badge_awarded:
                # Create celebration message
                if achievement['type'] == 'milestone':
                    celebration_msg = self.celebration_system.create_celebration_message(
                        handle,
                        achievement['milestone_days'],
                        achievement['celebration_data']
                    )
                    
                    # Check for board announcement
                    board_msg = self.celebration_system.create_board_announcement(
                        handle,
                        achievement['milestone_days'],
                        achievement['celebration_data']
                    )
                else:
                    # Participation badge celebration
                    celebration_msg = self.create_participation_celebration(handle, achievement)
                    board_msg = None
                
                results.append({
                    'handle': handle,
                    'badge_key': badge_key,
                    'awarded': True,
                    'celebration_message': celebration_msg,
                    'board_announcement': board_msg,
                    'type': achievement['type']
                })
        
        return results
    
    def create_participation_celebration(self, handle, achievement):
        """Create celebration for participation badges"""
        badge_key = achievement['badge_key']
        reason = achievement.get('reason', 'Great participation!')
        
        celebrations = {
            'first_ship': f"🚢 {handle} just made their FIRST SHIP! Welcome to the creator community! {reason} ⚓",
            'active_shipper': f"⚓ {handle} is an ACTIVE SHIPPER! {reason} Keep those creations coming! 🎯",
            'game_master': f"🎮 {handle} earned GAME MASTER status! {reason} Thanks for bringing the fun! 🌟"
        }
        
        return celebrations.get(badge_key, f"🎉 {handle} earned the {badge_key} badge! {reason}")
    
    def run_full_achievement_check(self):
        """Run complete achievement check for all users"""
        print("🎖️ Running Full Achievement Check")
        print("=" * 40)
        
        # Load current streak data
        streak_data = self.load_streaks()
        
        if not streak_data:
            print("No streak data found.")
            return []
        
        all_results = []
        
        for handle, user_data in streak_data.items():
            print(f"\n👤 Checking achievements for {handle}")
            print(f"   Current streak: {user_data['current']} days")
            print(f"   Best streak: {user_data['best']} days") 
            print(f"   Ships: {user_data.get('ships', 0)}")
            print(f"   Games: {user_data.get('games', 0)}")
            
            # Check achievements
            achievements = self.check_achievements_for_user(handle, user_data)
            
            if achievements:
                print(f"   🎯 Found {len(achievements)} achievements to award!")
                
                # Process achievements
                results = self.process_achievements(achievements)
                all_results.extend(results)
                
                # Display results
                for result in results:
                    if result['awarded']:
                        print(f"   ✅ Awarded: {result['badge_key']}")
            else:
                print(f"   ✨ All achievements up to date")
        
        return all_results
    
    def get_achievement_summary(self):
        """Get summary of current achievement state"""
        badges_data = self.celebration_system.load_badges()
        streak_data = self.load_streaks()
        
        summary = {
            'total_users': len(streak_data),
            'total_badges_awarded': 0,
            'active_streaks': 0,
            'longest_streak': 0,
            'user_summaries': []
        }
        
        for handle, user_data in streak_data.items():
            user_badges = badges_data.get('user_badges', {}).get(handle, {})
            badge_count = len(user_badges.get('earned', []))
            current_streak = user_data.get('current', 0)
            
            summary['total_badges_awarded'] += badge_count
            
            if current_streak > 0:
                summary['active_streaks'] += 1
                
            summary['longest_streak'] = max(summary['longest_streak'], user_data.get('best', 0))
            
            summary['user_summaries'].append({
                'handle': handle,
                'current_streak': current_streak,
                'best_streak': user_data.get('best', 0),
                'badges': badge_count,
                'points': user_badges.get('total_points', 0),
                'ships': user_data.get('ships', 0),
                'games': user_data.get('games', 0)
            })
        
        return summary

def main():
    """Test the achievement integration"""
    integration = StreaksAgentAchievementIntegration()
    
    print("🎯 Streaks Agent Achievement Integration")
    print("=" * 45)
    
    # Get current summary
    summary = integration.get_achievement_summary()
    
    print(f"📊 Current State:")
    print(f"   Users tracked: {summary['total_users']}")
    print(f"   Total badges awarded: {summary['total_badges_awarded']}")  
    print(f"   Active streaks: {summary['active_streaks']}")
    print(f"   Longest streak: {summary['longest_streak']} days")
    
    print(f"\n👥 User Details:")
    for user in summary['user_summaries']:
        print(f"   {user['handle']}: {user['current_streak']}d streak, {user['badges']} badges, {user['points']} points")
    
    # Run full achievement check
    print(f"\n🔍 Running Achievement Check...")
    results = integration.run_full_achievement_check()
    
    if results:
        print(f"\n🎉 Achievements Processed: {len(results)}")
        for result in results:
            print(f"   ✨ {result['handle']}: {result['badge_key']} ({result['type']})")
    else:
        print(f"\n✅ All achievements up to date!")

if __name__ == "__main__":
    main()