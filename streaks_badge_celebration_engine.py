#!/usr/bin/env python3
"""
Streaks Badge Celebration Engine
Integrates streak tracking with badge system and sends celebrations
"""

import json
import os
from datetime import datetime, timezone

class StreaksBadgeCelebrationEngine:
    def __init__(self):
        self.badges_file = 'badges.json'
        self.streaks_file = 'streak_data.json'
        
    def load_data(self):
        """Load both streak and badge data"""
        # Load streaks
        try:
            with open(self.streaks_file, 'r') as f:
                streaks_data = json.load(f)
        except FileNotFoundError:
            streaks_data = {"streaks": {}}
            
        # Load badges  
        try:
            with open(self.badges_file, 'r') as f:
                badges_data = json.load(f)
        except FileNotFoundError:
            badges_data = {"user_badges": {}, "award_history": [], "badge_categories": {}}
            
        return streaks_data, badges_data
    
    def check_streak_badges_eligibility(self, user, current_streak):
        """Check what streak badges user qualifies for"""
        _, badges_data = self.load_data()
        
        # Get user's current badges
        user_badges = badges_data.get('user_badges', {}).get(user, {}).get('earned', [])
        earned_badge_keys = [badge['badge_key'] for badge in user_badges]
        
        new_badges = []
        
        # Check streak thresholds
        thresholds = [
            (1, 'first_day', 'First Day 🌱'),
            (7, 'week_streak', 'Week Streak 🔥'),
            (30, 'month_streak', 'Monthly Legend 👑'),
            (100, 'century_streak', 'Century Club 💎')
        ]
        
        for threshold, badge_key, badge_name in thresholds:
            if current_streak >= threshold and badge_key not in earned_badge_keys:
                new_badges.append({
                    'key': badge_key,
                    'name': badge_name,
                    'threshold': threshold,
                    'eligible': True
                })
        
        return new_badges
    
    def award_badge_to_user(self, user, badge_key):
        """Award a specific badge to user"""
        _, badges_data = self.load_data()
        
        # Find badge info
        badge_info = None
        for category in badges_data.get('badge_categories', {}).values():
            if badge_key in category:
                badge_info = category[badge_key]
                break
        
        if not badge_info:
            return False, f"Badge {badge_key} not found"
        
        # Initialize user if needed
        if user not in badges_data['user_badges']:
            badges_data['user_badges'][user] = {
                'earned': [],
                'total_points': 0,
                'achievements_unlocked': 0
            }
        
        # Check if already earned
        earned_keys = [b['badge_key'] for b in badges_data['user_badges'][user]['earned']]
        if badge_key in earned_keys:
            return False, f"User {user} already has badge {badge_key}"
        
        # Award the badge
        now = datetime.now(timezone.utc).isoformat()
        badge_award = {
            'badge_key': badge_key,
            'awarded_at': now,
            'reason': badge_info['description']
        }
        
        badges_data['user_badges'][user]['earned'].append(badge_award)
        badges_data['user_badges'][user]['total_points'] += badge_info['points']
        badges_data['user_badges'][user]['achievements_unlocked'] += 1
        
        # Add to history
        badges_data['award_history'].append({
            'user': user,
            'badge': badge_key,
            'badge_name': badge_info['name'],
            'points': badge_info['points'],
            'awarded_at': now
        })
        
        # Save updated data
        with open(self.badges_file, 'w') as f:
            json.dump(badges_data, f, indent=2)
        
        return True, f"Awarded {badge_info['name']} to {user}"
    
    def get_celebration_message(self, user, badge_key, streak_milestone=None):
        """Generate celebration message"""
        _, badges_data = self.load_data()
        
        # Find badge info
        badge_info = None
        for category in badges_data.get('badge_categories', {}).values():
            if badge_key in category:
                badge_info = category[badge_key]
                break
        
        if not badge_info:
            return ""
        
        # Special messages for streak badges
        if badge_key == 'first_day':
            return f"""🌱 Welcome to the streak journey, {user}! 

You've earned your first badge: "{badge_info['name']}"
{badge_info['description']}

+{badge_info['points']} points

Every journey begins with a single day. Keep it up! ✨"""

        elif badge_key == 'week_streak':
            return f"""🔥 {user} is on fire! One week strong! 

Badge earned: "{badge_info['name']}" 
{badge_info['description']}

+{badge_info['points']} points

You're building a real habit now! The consistency is paying off. 💪"""

        elif badge_key == 'month_streak':
            return f"""👑 {user} is now a Monthly Legend! 

Badge earned: "{badge_info['name']}"
{badge_info['description']}

+{badge_info['points']} points

30 consecutive days! You've proven your dedication to the workshop. Incredible! 🏆"""

        elif badge_key == 'century_streak':
            return f"""💎 {user} joined the Century Club! 

Badge earned: "{badge_info['name']}"
{badge_info['description']}

+{badge_info['points']} points

100 CONSECUTIVE DAYS! You are workshop royalty! This is legendary dedication! 👑✨"""

        # Default celebration
        rarity_messages = {
            'common': 'Nice work!',
            'uncommon': 'Great achievement!',
            'rare': 'Impressive dedication!',
            'epic': 'Outstanding work!',
            'legendary': "Legendary achievement!",
            'mythical': 'MYTHICAL STATUS UNLOCKED! 💫'
        }
        
        rarity = badge_info.get('rarity', 'common')
        message = rarity_messages.get(rarity, 'Congratulations!')
        
        return f"""🎉 {user} earned the "{badge_info['name']}" badge!

{badge_info['description']}
+{badge_info['points']} points

{message} Keep building momentum! ✨"""
    
    def process_all_users(self):
        """Check all users for new badges and generate celebrations"""
        streaks_data, _ = self.load_data()
        
        results = []
        
        # Process each user
        for user, streak_info in streaks_data.get('streaks', {}).items():
            current_streak = streak_info.get('current', 0) if isinstance(streak_info, dict) else streak_info
            
            # Check for new streak badges
            new_badges = self.check_streak_badges_eligibility(user, current_streak)
            
            for badge in new_badges:
                # Award the badge
                success, message = self.award_badge_to_user(user, badge['key'])
                
                if success:
                    celebration = self.get_celebration_message(user, badge['key'], current_streak)
                    
                    results.append({
                        'user': user,
                        'badge_key': badge['key'],
                        'badge_name': badge['name'],
                        'streak_days': current_streak,
                        'celebration_message': celebration,
                        'award_status': 'success'
                    })
                else:
                    results.append({
                        'user': user,
                        'badge_key': badge['key'],
                        'award_status': 'failed',
                        'error': message
                    })
        
        return results
    
    def generate_status_report(self):
        """Generate comprehensive status report"""
        streaks_data, badges_data = self.load_data()
        
        report = []
        report.append("🏆 STREAKS + BADGES STATUS REPORT")
        report.append("=" * 50)
        report.append()
        
        # Current streaks
        report.append("📊 CURRENT STREAKS:")
        for user, streak_info in streaks_data.get('streaks', {}).items():
            if isinstance(streak_info, dict):
                current = streak_info.get('current', 0)
                best = streak_info.get('best', 0)
            else:
                current = streak_info
                best = streak_info
            
            report.append(f"  {user}: {current} days (best: {best})")
            
            # Check badge eligibility
            new_badges = self.check_streak_badges_eligibility(user, current)
            if new_badges:
                eligible = [b['name'] for b in new_badges]
                report.append(f"    🚨 ELIGIBLE: {', '.join(eligible)}")
        
        report.append()
        
        # Badge leaderboard
        report.append("🏅 BADGE LEADERBOARD:")
        user_badges = badges_data.get('user_badges', {})
        if user_badges:
            sorted_users = sorted(user_badges.items(), 
                                key=lambda x: x[1].get('total_points', 0), 
                                reverse=True)
            
            for i, (user, data) in enumerate(sorted_users, 1):
                badges_count = data.get('achievements_unlocked', 0)
                points = data.get('total_points', 0)
                report.append(f"  {i}. {user}: {badges_count} badges, {points} points")
        else:
            report.append("  No badges awarded yet!")
        
        report.append()
        
        # Recent awards
        recent_awards = badges_data.get('award_history', [])[-3:]
        if recent_awards:
            report.append("🎉 RECENT AWARDS:")
            for award in recent_awards:
                date = award['awarded_at'][:10]
                report.append(f"  {award['user']}: {award['badge_name']} - {date}")
        
        return "\n".join(report)

def main():
    """Main execution"""
    engine = StreaksBadgeCelebrationEngine()
    
    print("🚀 Starting Streaks Badge Celebration Engine...")
    print()
    
    # Process all users for new badges
    results = engine.process_all_users()
    
    if results:
        print(f"🎉 PROCESSED {len(results)} BADGE AWARDS!")
        print()
        
        for result in results:
            if result['award_status'] == 'success':
                print(f"✅ AWARDED: {result['badge_name']} to {result['user']}")
                print(f"   Streak: {result['streak_days']} days")
                print()
                print("📨 CELEBRATION MESSAGE:")
                print(result['celebration_message'])
                print()
                print("-" * 50)
                print()
            else:
                print(f"❌ FAILED: {result['badge_key']} for {result['user']}")
                print(f"   Error: {result['error']}")
                print()
    else:
        print("ℹ️ No new badges to award at this time.")
    
    print()
    print("📊 CURRENT STATUS:")
    print(engine.generate_status_report())

if __name__ == "__main__":
    main()