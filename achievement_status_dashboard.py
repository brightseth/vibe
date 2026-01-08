#!/usr/bin/env python3
"""
🏆 Achievement Status Dashboard
Built by @streaks-agent for /vibe workshop

Quick visual overview of badge system status and user progress.
"""

import json
import datetime
from typing import Dict, List

class AchievementDashboard:
    def __init__(self):
        self.streak_file = "streak_data.json"
        self.achievements_file = "achievements.json"
        
    def load_data(self):
        """Load current streak and achievement data"""
        try:
            with open(self.streak_file, 'r') as f:
                streaks = json.load(f)
        except FileNotFoundError:
            streaks = {}
            
        try:
            with open(self.achievements_file, 'r') as f:
                achievements = json.load(f)
        except FileNotFoundError:
            achievements = {"badges": {}, "user_achievements": {}, "achievement_history": []}
            
        return streaks, achievements
    
    def generate_status_report(self):
        """Generate comprehensive status report"""
        streaks, achievements = self.load_data()
        
        # Parse streak data
        parsed_streaks = {}
        for user, streak_data in streaks.items():
            if isinstance(streak_data, dict):
                current = streak_data.get('current', 0)
                best = streak_data.get('best', 0)
            else:
                current = streak_data
                best = current
            parsed_streaks[user] = {'current': current, 'best': best}
        
        # Calculate badge progress for each user
        user_progress = {}
        for user in parsed_streaks:
            clean_user = user.replace('@', '')
            user_badges = achievements.get('user_achievements', {}).get(clean_user, [])
            earned_count = len(user_badges)
            total_badges = len(achievements.get('badges', {}))
            
            # Calculate next milestone
            current_streak = parsed_streaks[user]['current']
            next_milestone = None
            
            streak_thresholds = [1, 3, 7, 14, 30, 100]
            for threshold in streak_thresholds:
                if current_streak < threshold:
                    days_needed = threshold - current_streak
                    next_milestone = {'threshold': threshold, 'days_needed': days_needed}
                    break
            
            user_progress[user] = {
                'current_streak': current_streak,
                'best_streak': parsed_streaks[user]['best'],
                'badges_earned': earned_count,
                'badges_available': total_badges,
                'badge_progress': f"{earned_count}/{total_badges}",
                'next_milestone': next_milestone
            }
        
        # Recent achievements
        recent_achievements = achievements.get('achievement_history', [])[-5:]
        
        return {
            'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'summary': {
                'total_users': len(parsed_streaks),
                'active_streaks': len([s for s in parsed_streaks.values() if s['current'] > 0]),
                'total_badges_available': len(achievements.get('badges', {})),
                'total_achievements_earned': sum(len(badges) for badges in achievements.get('user_achievements', {}).values())
            },
            'user_progress': user_progress,
            'recent_achievements': recent_achievements
        }
    
    def print_dashboard(self):
        """Print formatted dashboard to console"""
        report = self.generate_status_report()
        
        print("🏆 ACHIEVEMENT SYSTEM DASHBOARD")
        print("=" * 50)
        print(f"📅 Generated: {report['timestamp']}")
        print()
        
        # Summary stats
        summary = report['summary']
        print("📊 SUMMARY STATS:")
        print(f"   👥 Total Users: {summary['total_users']}")
        print(f"   🔥 Active Streaks: {summary['active_streaks']}")  
        print(f"   🏅 Available Badges: {summary['total_badges_available']}")
        print(f"   🎯 Total Achievements: {summary['total_achievements_earned']}")
        print()
        
        # User progress
        print("👤 USER PROGRESS:")
        for user, progress in report['user_progress'].items():
            print(f"   {user}:")
            print(f"     🔥 Current Streak: {progress['current_streak']} days")
            print(f"     🏆 Best Streak: {progress['best_streak']} days")
            print(f"     🏅 Badges: {progress['badge_progress']}")
            
            if progress['next_milestone']:
                milestone = progress['next_milestone']
                print(f"     🎯 Next Milestone: {milestone['days_needed']} days to {milestone['threshold']}-day badge")
            else:
                print(f"     👑 All major milestones achieved!")
            print()
        
        # Recent achievements
        if report['recent_achievements']:
            print("🎉 RECENT ACHIEVEMENTS:")
            for achievement in report['recent_achievements']:
                badge = achievement['badge']
                timestamp = achievement.get('timestamp', 'Unknown time')
                print(f"   {badge['name']} → @{achievement['handle']} ({timestamp[:10]})")
        else:
            print("🎉 NO RECENT ACHIEVEMENTS")
        
        print("\n✨ Badge system operational and tracking progress!")

def main():
    dashboard = AchievementDashboard()
    dashboard.print_dashboard()

if __name__ == "__main__":
    main()