#!/usr/bin/env python3
"""
Live Badge Dashboard for @streaks-agent
Shows current badge status and identifies new achievements
"""

import json
import os
from datetime import datetime, timezone

class StreaksBadgeDashboard:
    def __init__(self):
        self.badges_file = 'badges.json'
        self.streaks_file = 'streak_data.json'
        
    def load_badges_data(self):
        """Load current badge data"""
        try:
            with open(self.badges_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self.create_empty_badge_data()
    
    def load_streaks_data(self):
        """Load streak data"""
        try:
            with open(self.streaks_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def create_empty_badge_data(self):
        """Create empty badge structure"""
        return {
            "user_badges": {},
            "award_history": [],
            "badge_categories": {}
        }
    
    def check_new_badge_eligibility(self, user, streak_days):
        """Check if user qualifies for new streak badges"""
        badges_data = self.load_badges_data()
        user_badges = badges_data.get('user_badges', {}).get(user, {}).get('earned', [])
        earned_badge_keys = [badge['badge_key'] for badge in user_badges]
        
        new_badges = []
        
        # Check streak badges
        if streak_days >= 1 and 'first_day' not in earned_badge_keys:
            new_badges.append('first_day')
        if streak_days >= 7 and 'week_streak' not in earned_badge_keys:
            new_badges.append('week_streak')  
        if streak_days >= 30 and 'month_streak' not in earned_badge_keys:
            new_badges.append('month_streak')
        if streak_days >= 100 and 'century_streak' not in earned_badge_keys:
            new_badges.append('century_streak')
        
        return new_badges
    
    def award_badge(self, user, badge_key):
        """Award a badge to a user"""
        badges_data = self.load_badges_data()
        
        # Find badge info
        badge_info = None
        for category in badges_data.get('badge_categories', {}).values():
            if badge_key in category:
                badge_info = category[badge_key]
                break
        
        if not badge_info:
            return False
        
        # Initialize user data if needed
        if user not in badges_data['user_badges']:
            badges_data['user_badges'][user] = {
                'earned': [],
                'total_points': 0,
                'achievements_unlocked': 0
            }
        
        # Check if already has badge
        earned_keys = [b['badge_key'] for b in badges_data['user_badges'][user]['earned']]
        if badge_key in earned_keys:
            return False
        
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
        
        # Add to award history
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
        
        return True
    
    def get_celebration_message(self, user, badge_key):
        """Generate celebration message for new badge"""
        badges_data = self.load_badges_data()
        
        # Find badge info
        badge_info = None
        for category in badges_data.get('badge_categories', {}).values():
            if badge_key in category:
                badge_info = category[badge_key]
                break
        
        if not badge_info:
            return ""
        
        rarity_emoji = {
            'common': '🟢',
            'uncommon': '🔵', 
            'rare': '🟣',
            'epic': '🟡',
            'legendary': '🔴',
            'mythical': '💫'
        }
        
        rarity = badge_info.get('rarity', 'common')
        emoji = rarity_emoji.get(rarity, '🎉')
        
        return f"""🎉 {user} earned the "{badge_info['name']}" badge! {emoji}

{badge_info['description']}
+{badge_info['points']} points

Keep building that streak! ✨"""
    
    def generate_dashboard_report(self):
        """Generate current badge status report"""
        badges_data = self.load_badges_data()
        streaks_data = self.load_streaks_data()
        
        report = []
        report.append("🏆 STREAKS BADGE DASHBOARD")
        report.append("=" * 40)
        report.append()
        
        # Current streak status
        report.append("📊 CURRENT STREAK STATUS:")
        for user, streak_info in streaks_data.items():
            if isinstance(streak_info, dict):
                current = streak_info.get('current', 0)
                best = streak_info.get('best', 0)
            else:
                current = streak_info
                best = streak_info
            
            report.append(f"  {user}: {current} days (best: {best})")
            
            # Check for new badge eligibility
            new_badges = self.check_new_badge_eligibility(user, current)
            if new_badges:
                report.append(f"    🚨 ELIGIBLE FOR: {', '.join(new_badges)}")
        
        report.append()
        
        # Badge leaderboard
        report.append("🏅 BADGE LEADERBOARD:")
        user_badges = badges_data.get('user_badges', {})
        if user_badges:
            # Sort by points
            sorted_users = sorted(user_badges.items(), 
                                key=lambda x: x[1].get('total_points', 0), 
                                reverse=True)
            
            for i, (user, data) in enumerate(sorted_users, 1):
                badges_count = data.get('achievements_unlocked', 0)
                points = data.get('total_points', 0)
                report.append(f"  {i}. {user}: {badges_count} badges, {points} points")
                
                # Show recent badges
                recent_badges = data.get('earned', [])[-2:]
                for badge in recent_badges:
                    report.append(f"     • {badge['badge_key']} ({badge['awarded_at'][:10]})")
        else:
            report.append("  No badges awarded yet!")
        
        report.append()
        
        # Recent achievements
        report.append("🎉 RECENT ACHIEVEMENTS:")
        recent_awards = badges_data.get('award_history', [])[-5:]
        if recent_awards:
            for award in recent_awards:
                date = award['awarded_at'][:10]
                report.append(f"  {award['user']}: {award['badge_name']} (+{award['points']} pts) - {date}")
        else:
            report.append("  No recent achievements")
        
        report.append()
        report.append("🎯 Next: Check for new badges and celebrate achievements!")
        
        return "\n".join(report)
    
    def run_badge_check_and_awards(self):
        """Check streaks and award new badges"""
        streaks_data = self.load_streaks_data()
        results = []
        
        for user, streak_info in streaks_data.items():
            if isinstance(streak_info, dict):
                current_streak = streak_info.get('current', 0)
            else:
                current_streak = streak_info
            
            # Check for new badges
            new_badges = self.check_new_badge_eligibility(user, current_streak)
            
            for badge_key in new_badges:
                if self.award_badge(user, badge_key):
                    celebration = self.get_celebration_message(user, badge_key)
                    results.append({
                        'user': user,
                        'badge': badge_key,
                        'celebration': celebration,
                        'awarded': True
                    })
        
        return results

if __name__ == "__main__":
    dashboard = StreaksBadgeDashboard()
    
    # Check for new badges
    print("Checking for new badge eligibility...")
    new_awards = dashboard.run_badge_check_and_awards()
    
    if new_awards:
        print(f"\n🎉 AWARDED {len(new_awards)} NEW BADGES!")
        for award in new_awards:
            print(f"\n{award['celebration']}")
    else:
        print("\nNo new badges to award at this time.")
    
    # Generate dashboard
    print("\n" + dashboard.generate_dashboard_report())