#!/usr/bin/env python3
"""
Streak Milestone Celebration System for @streaks-agent
Enhanced celebration system for major streak achievements
"""

import json
import os
from datetime import datetime

class StreakMilestoneCelebrationSystem:
    def __init__(self):
        self.badge_file = 'badges.json'
        self.milestone_celebrations = {
            3: {
                "title": "Three Day Thunder! ⚡",
                "message": "You've built momentum! Three days of consistent activity shows dedication. Keep the streak alive!",
                "badge": "early_bird",
                "board_announce": False
            },
            7: {
                "title": "Week Warrior Achievement! 🔥",
                "message": "One full week of consistent activity! You're building serious momentum. The rhythm is becoming natural!",
                "badge": "week_streak", 
                "board_announce": True
            },
            14: {
                "title": "Two Week Legend! 💪",
                "message": "Fourteen consecutive days! You've turned showing up into a habit. This is where magic happens!",
                "badge": "consistency_king",
                "board_announce": True
            },
            30: {
                "title": "Monthly Mastery! 👑", 
                "message": "THIRTY DAYS! You're officially a workshop legend. This level of consistency transforms everything!",
                "badge": "month_streak",
                "board_announce": True,
                "special_recognition": True
            },
            50: {
                "title": "Fifty Day Force! 🌟",
                "message": "Fifty consecutive days of dedication! You're in the elite tier of workshop participants!",
                "badge": "dedication_master",
                "board_announce": True
            },
            100: {
                "title": "CENTURY CLUB! 💎",
                "message": "ONE HUNDRED DAYS! You've achieved legendary status. This is extraordinary dedication to growth!",
                "badge": "century_streak",
                "board_announce": True,
                "special_recognition": True,
                "legendary_status": True
            }
        }
    
    def load_badges(self):
        """Load current badge data"""
        try:
            with open(self.badge_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"user_badges": {}, "award_history": []}
    
    def save_badges(self, badge_data):
        """Save badge data"""
        with open(self.badge_file, 'w') as f:
            json.dump(badge_data, f, indent=2)
    
    def check_milestone_achievements(self, current_streaks):
        """Check for milestone achievements based on current streaks"""
        badges_data = self.load_badges()
        celebrations_to_send = []
        
        for handle, streak_info in current_streaks.items():
            current_streak = streak_info.get('current', 0)
            
            # Get user's badge history
            user_badges = badges_data.get('user_badges', {}).get(handle, {}).get('earned', [])
            earned_badge_keys = [badge['badge_key'] for badge in user_badges]
            
            # Check each milestone
            for milestone_days, celebration in self.milestone_celebrations.items():
                if current_streak >= milestone_days:
                    badge_key = celebration['badge']
                    
                    # Only celebrate if they haven't earned this badge yet
                    if badge_key not in earned_badge_keys:
                        celebration_data = {
                            'handle': handle,
                            'milestone': milestone_days,
                            'current_streak': current_streak,
                            'celebration': celebration,
                            'badge_key': badge_key
                        }
                        celebrations_to_send.append(celebration_data)
        
        return celebrations_to_send
    
    def create_celebration_message(self, handle, milestone_days, celebration):
        """Create personalized celebration message"""
        title = celebration['title']
        message = celebration['message']
        
        full_message = f"""🎉 {title}

{handle}, you've reached {milestone_days} consecutive days!

{message}

Your consistency is inspiring the entire workshop! ✨"""
        
        return full_message
    
    def create_board_announcement(self, handle, milestone_days, celebration):
        """Create board announcement for major milestones"""
        if not celebration.get('board_announce', False):
            return None
            
        if milestone_days == 7:
            return f"🔥 {handle} just hit their FIRST WEEK STREAK! Seven days of consistent workshop participation! 🎯"
        elif milestone_days == 14: 
            return f"💪 {handle} is on FIRE with a 14-day streak! Two weeks of dedication! 🌟"
        elif milestone_days == 30:
            return f"👑 LEGENDARY STATUS: {handle} just completed 30 CONSECUTIVE DAYS! Monthly mastery achieved! 🏆"
        elif milestone_days == 100:
            return f"💎 CENTURY CLUB MEMBER: {handle} has reached 100 CONSECUTIVE DAYS! Absolute workshop legend! 🎖️"
        
        return f"🎯 {handle} achieved {milestone_days}-day streak! Incredible consistency! 🌟"
    
    def award_milestone_badge(self, handle, badge_key, milestone_days):
        """Award badge for milestone achievement"""
        badges_data = self.load_badges()
        
        # Initialize user badges if needed
        if handle not in badges_data.get('user_badges', {}):
            badges_data['user_badges'][handle] = {'earned': [], 'total_points': 0, 'achievements_unlocked': 0}
        
        # Check if already earned
        earned_badges = [b['badge_key'] for b in badges_data['user_badges'][handle]['earned']]
        if badge_key in earned_badges:
            return False  # Already earned
        
        # Award the badge
        badge_award = {
            'badge_key': badge_key,
            'awarded_at': datetime.now().isoformat(),
            'reason': f'{milestone_days}-day streak milestone'
        }
        
        badges_data['user_badges'][handle]['earned'].append(badge_award)
        badges_data['user_badges'][handle]['achievements_unlocked'] += 1
        
        # Add to award history
        if 'award_history' not in badges_data:
            badges_data['award_history'] = []
            
        badges_data['award_history'].append({
            'user': handle,
            'badge': badge_key,
            'badge_name': self.get_badge_name(badge_key),
            'points': self.get_badge_points(badge_key),
            'awarded_at': datetime.now().isoformat()
        })
        
        self.save_badges(badges_data)
        return True
    
    def get_badge_name(self, badge_key):
        """Get display name for badge"""
        badge_names = {
            'early_bird': 'Early Bird 🐦',
            'week_streak': 'Week Streak 🔥', 
            'consistency_king': 'Consistency King 👑',
            'month_streak': 'Monthly Legend 👑',
            'dedication_master': 'Dedication Master 🌟',
            'century_streak': 'Century Club 💎'
        }
        return badge_names.get(badge_key, badge_key)
    
    def get_badge_points(self, badge_key):
        """Get points value for badge"""
        badge_points = {
            'early_bird': 15,
            'week_streak': 30,
            'consistency_king': 60,
            'month_streak': 100,
            'dedication_master': 150,
            'century_streak': 500
        }
        return badge_points.get(badge_key, 10)
    
    def generate_milestone_report(self, current_streaks):
        """Generate report of milestone celebrations needed"""
        celebrations = self.check_milestone_achievements(current_streaks)
        
        if not celebrations:
            return "No milestone celebrations needed at this time."
        
        report = "🎉 MILESTONE CELEBRATION REPORT\n"
        report += "=" * 40 + "\n\n"
        
        for celebration in celebrations:
            handle = celebration['handle']
            milestone = celebration['milestone']
            current = celebration['current_streak']
            title = celebration['celebration']['title']
            
            report += f"🎯 {handle}\n"
            report += f"   Current streak: {current} days\n"
            report += f"   Milestone: {milestone} days - {title}\n"
            report += f"   Badge: {celebration['badge_key']}\n"
            if celebration['celebration'].get('board_announce'):
                report += f"   📢 Board announcement: YES\n"
            report += "\n"
        
        return report

def main():
    """Test the milestone celebration system"""
    celebration_system = StreakMilestoneCelebrationSystem()
    
    # Test with current streak data
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    print("🎖️ Streak Milestone Celebration System")
    print("=" * 45)
    
    # Check for celebrations
    celebrations = celebration_system.check_milestone_achievements(current_streaks)
    
    if celebrations:
        print(f"🎉 Found {len(celebrations)} milestone celebrations to send!")
        
        for celebration in celebrations:
            print(f"\n📢 Celebration for {celebration['handle']}:")
            message = celebration_system.create_celebration_message(
                celebration['handle'],
                celebration['milestone'], 
                celebration['celebration']
            )
            print(message)
            
            # Check for board announcement
            board_msg = celebration_system.create_board_announcement(
                celebration['handle'],
                celebration['milestone'],
                celebration['celebration']
            )
            if board_msg:
                print(f"\n📯 Board Announcement:")
                print(board_msg)
    else:
        print("No milestone celebrations needed at current streak levels.")
        print("\nNext milestones:")
        for handle, streak_info in current_streaks.items():
            current = streak_info['current']
            next_milestone = None
            for milestone in sorted(celebration_system.milestone_celebrations.keys()):
                if current < milestone:
                    next_milestone = milestone
                    break
            
            if next_milestone:
                days_to_go = next_milestone - current
                title = celebration_system.milestone_celebrations[next_milestone]['title']
                print(f"  {handle}: {days_to_go} days to {title}")

if __name__ == "__main__":
    main()