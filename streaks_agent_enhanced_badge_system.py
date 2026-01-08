#!/usr/bin/env python3
"""
🎖️ Enhanced Badge System for @streaks-agent
Streamlined integration for seamless badge tracking and celebration
Built for /vibe workshop gamification
"""

import json
import datetime
from typing import Dict, List, Optional

class EnhancedBadgeSystem:
    """Streamlined badge system optimized for @streaks-agent workflow"""
    
    def __init__(self):
        self.achievements_file = "achievements.json"
        self.data = self._load_or_create_achievements()
        
    def _load_or_create_achievements(self) -> Dict:
        """Load existing achievements or create with defaults"""
        try:
            with open(self.achievements_file, 'r') as f:
                data = json.load(f)
                # Ensure all required keys exist
                if 'badges' not in data:
                    data['badges'] = self._get_enhanced_badges()
                if 'user_achievements' not in data:
                    data['user_achievements'] = {}
                if 'achievement_history' not in data:
                    data['achievement_history'] = []
                return data
        except FileNotFoundError:
            return {
                "badges": self._get_enhanced_badges(),
                "user_achievements": {},
                "achievement_history": []
            }
    
    def _get_enhanced_badges(self) -> Dict:
        """Enhanced badge definitions with better progression"""
        return {
            # Streak Progression Badges
            "first_day": {
                "name": "First Step 🌱",
                "description": "Started your journey in the workshop", 
                "threshold": 1,
                "type": "streak",
                "tier": "bronze",
                "celebration_level": "dm"
            },
            "early_bird": {
                "name": "Early Bird 🌅",
                "description": "Active for 3 consecutive days - momentum building!",
                "threshold": 3,
                "type": "streak", 
                "tier": "bronze",
                "celebration_level": "dm"
            },
            "week_warrior": {
                "name": "Week Warrior 💪",
                "description": "Maintained a full week of activity - incredible dedication!",
                "threshold": 7,
                "type": "streak",
                "tier": "silver", 
                "celebration_level": "public"
            },
            "consistency_master": {
                "name": "Consistency Master 🔥",
                "description": "Two weeks of unwavering commitment",
                "threshold": 14,
                "type": "streak",
                "tier": "silver",
                "celebration_level": "public" 
            },
            "monthly_legend": {
                "name": "Monthly Legend 🏆",
                "description": "30 days of workshop excellence - truly inspiring!",
                "threshold": 30,
                "type": "streak",
                "tier": "gold",
                "celebration_level": "public"
            },
            "century_champion": {
                "name": "Century Champion 👑", 
                "description": "100 days of mastery - legendary achievement!",
                "threshold": 100,
                "type": "streak",
                "tier": "legendary",
                "celebration_level": "public"
            },
            
            # Activity Badges
            "first_ship": {
                "name": "First Ship 🚢",
                "description": "Made your first announcement to the board",
                "threshold": 1,
                "type": "ships",
                "tier": "bronze",
                "celebration_level": "dm"
            },
            
            # Special Recognition
            "comeback_hero": {
                "name": "Comeback Hero ⭐",
                "description": "Returned after a break and rebuilt your streak",
                "threshold": 1, 
                "type": "special",
                "tier": "silver",
                "celebration_level": "dm"
            }
        }
    
    def check_user_for_new_badges(self, handle: str, streak_data: Dict) -> Dict:
        """
        Main method for @streaks-agent to check badges during workflow
        
        Args:
            handle: User handle (e.g. '@demo_user')
            streak_data: {current_streak: int, best_streak: int, ships: int}
        
        Returns:
            {
                'new_badges': List[str],
                'celebration_messages': List[str], 
                'dm_messages': List[str],
                'public_announcements': List[str],
                'next_milestone': Dict
            }
        """
        current_streak = streak_data.get('current_streak', 0)
        best_streak = streak_data.get('best_streak', 0)
        ships = streak_data.get('ships', 0)
        
        # Get user's existing badges
        user_badges = set()
        if handle in self.data['user_achievements']:
            user_badges = {badge['id'] for badge in self.data['user_achievements'][handle]}
        
        # Check for new badges
        new_badges = []
        dm_messages = []
        public_announcements = []
        
        # Check streak badges
        for badge_id, badge in self.data['badges'].items():
            if badge['type'] == 'streak' and current_streak >= badge['threshold']:
                if badge_id not in user_badges:
                    new_badges.append(badge_id)
                    self._award_badge(handle, badge_id, current_streak)
                    
                    # Generate celebration message
                    message = self._create_celebration_message(handle, badge_id)
                    
                    if badge['celebration_level'] == 'dm':
                        dm_messages.append(message)
                    elif badge['celebration_level'] == 'public':
                        dm_messages.append(message)
                        public_announcements.append(self._create_public_announcement(handle, badge_id))
        
        # Check ship badges
        if ships >= 1 and 'first_ship' not in user_badges:
            new_badges.append('first_ship')
            self._award_badge(handle, 'first_ship', ships)
            dm_messages.append(self._create_celebration_message(handle, 'first_ship'))
        
        # Save if we awarded any new badges
        if new_badges:
            self._save_achievements()
        
        return {
            'new_badges': new_badges,
            'dm_messages': dm_messages,
            'public_announcements': public_announcements, 
            'next_milestone': self._get_next_milestone(handle, current_streak),
            'summary': self._create_summary(handle, new_badges)
        }
    
    def _award_badge(self, handle: str, badge_id: str, value: int) -> None:
        """Award badge to user and record in history"""
        badge = self.data['badges'][badge_id]
        now = datetime.datetime.now().isoformat()
        
        # Add to user achievements
        if handle not in self.data['user_achievements']:
            self.data['user_achievements'][handle] = []
        
        achievement = {
            "id": badge_id,
            "name": badge['name'],
            "description": badge['description'],
            "earned_at": now,
            "criteria": f"{badge['type']} >= {badge['threshold']}"
        }
        
        self.data['user_achievements'][handle].append(achievement)
        
        # Add to history
        self.data['achievement_history'].append({
            "handle": handle,
            "badge_id": badge_id,
            "badge_name": badge['name'],
            "timestamp": now,
            "value_achieved": value
        })
    
    def _create_celebration_message(self, handle: str, badge_id: str) -> str:
        """Create personalized celebration message"""
        badge = self.data['badges'][badge_id]
        
        celebrations = {
            "first_day": f"🎉 Welcome to the workshop, {handle}! You've earned your first badge: {badge['name']}",
            "early_bird": f"🌅 {handle}, you're an Early Bird! Three days of consistency - momentum is building!",
            "week_warrior": f"💪 Incredible, {handle}! One full week of dedication earned you the Week Warrior badge!",
            "consistency_master": f"🔥 {handle}, you're a Consistency Master! Two weeks of unwavering commitment!",
            "monthly_legend": f"🏆 {handle} is now a Monthly Legend! 30 days of excellence - truly inspiring!",
            "century_champion": f"👑 {handle} joined the Century Club! 100 days of mastery - LEGENDARY!",
            "first_ship": f"🚢 {handle} earned the First Ship badge! Welcome to the builders!",
            "comeback_hero": f"⭐ {handle} is a Comeback Hero! Welcome back to the streak!"
        }
        
        return celebrations.get(badge_id, f"🎉 {handle} earned {badge['name']}! {badge['description']}")
    
    def _create_public_announcement(self, handle: str, badge_id: str) -> str:
        """Create public board announcement for major milestones"""
        badge = self.data['badges'][badge_id]
        
        announcements = {
            "week_warrior": f"🎊 {handle} achieved Week Warrior status! 7 days of consistent workshop participation! 💪",
            "consistency_master": f"🔥 {handle} is a Consistency Master! 14 days of dedication to the workshop!",
            "monthly_legend": f"🏆 Incredible achievement: {handle} is now a Monthly Legend! 30 days of excellence!",
            "century_champion": f"👑 LEGENDARY: {handle} joined the Century Club! 100 days of workshop mastery!"
        }
        
        return announcements.get(badge_id, f"🎉 {handle} earned {badge['name']}!")
    
    def _get_next_milestone(self, handle: str, current_streak: int) -> Dict:
        """Get information about next badge milestone"""
        next_badges = []
        
        for badge_id, badge in self.data['badges'].items():
            if badge['type'] == 'streak' and badge['threshold'] > current_streak:
                next_badges.append({
                    "id": badge_id,
                    "name": badge['name'],
                    "threshold": badge['threshold'],
                    "days_remaining": badge['threshold'] - current_streak,
                    "emoji": badge['name'].split()[-1] if len(badge['name'].split()) > 1 else "🎖️"
                })
        
        if next_badges:
            next_badge = min(next_badges, key=lambda x: x['threshold'])
            progress = (current_streak / next_badge['threshold']) * 100
            
            return {
                "badge": next_badge,
                "progress_percentage": min(progress, 100),
                "encouragement": self._get_encouragement_message(next_badge['days_remaining'])
            }
        
        return {"badge": None, "progress_percentage": 100, "encouragement": "All milestones achieved! 🎉"}
    
    def _get_encouragement_message(self, days_remaining: int) -> str:
        """Generate encouraging message for next milestone"""
        if days_remaining == 1:
            return "Just one more day to your next badge! 🚀"
        elif days_remaining <= 3:
            return f"Only {days_remaining} days until your next achievement! 💪"
        elif days_remaining <= 7:
            return f"{days_remaining} days to your next milestone - you've got this! 🔥"
        else:
            return f"Next milestone in {days_remaining} days - every day counts! ✨"
    
    def _create_summary(self, handle: str, new_badges: List[str]) -> str:
        """Create summary for @streaks-agent's done() call"""
        if not new_badges:
            return f"No new badges for {handle}"
        
        badge_names = [self.data['badges'][badge_id]['name'] for badge_id in new_badges]
        return f"🎖️ {handle} earned {len(new_badges)} new badge(s): {', '.join(badge_names)}"
    
    def _save_achievements(self) -> None:
        """Save achievements data"""
        with open(self.achievements_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def get_user_progress_summary(self, handle: str) -> str:
        """Get a quick summary of user's badge progress"""
        user_badges = self.data.get('user_achievements', {}).get(handle, [])
        total_badges = len(self.data['badges'])
        earned_count = len(user_badges)
        
        if not user_badges:
            return f"{handle}: No badges yet - start your streak! 🌱"
        
        latest_badge = user_badges[-1]['name']
        percentage = (earned_count / total_badges) * 100
        
        return f"{handle}: {earned_count}/{total_badges} badges ({percentage:.0f}%) • Latest: {latest_badge}"

def main():
    """Test the enhanced badge system"""
    print("🎖️ Enhanced Badge System Test")
    print("=" * 50)
    
    badge_system = EnhancedBadgeSystem()
    
    # Test current users
    test_users = {
        "@demo_user": {"current_streak": 1, "best_streak": 1, "ships": 0},
        "@vibe_champion": {"current_streak": 1, "best_streak": 1, "ships": 0}
    }
    
    for handle, data in test_users.items():
        print(f"\n🔍 Checking {handle}:")
        
        result = badge_system.check_user_for_new_badges(handle, data)
        
        print(f"   New badges: {len(result['new_badges'])}")
        
        if result['dm_messages']:
            for msg in result['dm_messages']:
                print(f"   📱 DM: {msg}")
        
        if result['public_announcements']:
            for msg in result['public_announcements']:
                print(f"   📢 Public: {msg}")
        
        if result['next_milestone']['badge']:
            milestone = result['next_milestone']
            print(f"   🎯 Next: {milestone['badge']['name']} in {milestone['badge']['days_remaining']} days")
            print(f"   📊 Progress: {milestone['progress_percentage']:.1f}%")
        
        print(f"   📋 Progress: {badge_system.get_user_progress_summary(handle)}")

if __name__ == "__main__":
    main()