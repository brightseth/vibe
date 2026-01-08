#!/usr/bin/env python3
"""
Streak Analytics Dashboard Generator for @streaks-agent
Generates real-time analytics for the /vibe workshop streak system
"""

import json
from datetime import datetime, timedelta
import math

class StreakAnalyticsGenerator:
    def __init__(self):
        self.streaks_data = {
            "@demo_user": {"current": 1, "best": 1},
            "@vibe_champion": {"current": 1, "best": 1}
        }
        
        self.achievements_data = self.load_achievements()
        self.milestones = {
            3: "Getting started! 🌱",
            7: "Week Warrior 💪", 
            14: "Consistency King 🔥",
            30: "Monthly Legend 🏆",
            100: "Century Club 👑"
        }
    
    def load_achievements(self):
        """Load current achievements data"""
        try:
            with open('achievements.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"user_achievements": {}}
    
    def calculate_stats(self):
        """Calculate overall streak statistics"""
        if not self.streaks_data:
            return {
                "total_users": 0,
                "active_streaks": 0,
                "avg_streak": 0.0,
                "longest_current": 0,
                "total_streak_days": 0
            }
        
        current_streaks = [data["current"] for data in self.streaks_data.values() if data["current"] > 0]
        all_streaks = [data["current"] for data in self.streaks_data.values()]
        
        return {
            "total_users": len(self.streaks_data),
            "active_streaks": len(current_streaks),
            "avg_streak": round(sum(all_streaks) / len(all_streaks), 1),
            "longest_current": max(all_streaks) if all_streaks else 0,
            "total_streak_days": sum(all_streaks)
        }
    
    def generate_leaderboard(self):
        """Generate sorted leaderboard"""
        leaderboard = []
        
        for handle, data in self.streaks_data.items():
            # Get user badges
            user_badges = self.achievements_data.get("user_achievements", {}).get(handle.replace("@", ""), [])
            badge_display = self.format_badges(user_badges)
            
            leaderboard.append({
                "handle": handle,
                "current_streak": data["current"],
                "best_streak": data["best"],
                "badges": badge_display,
                "badge_count": len(user_badges)
            })
        
        # Sort by current streak, then by best streak
        leaderboard.sort(key=lambda x: (x["current_streak"], x["best_streak"]), reverse=True)
        
        return leaderboard
    
    def format_badges(self, user_badges):
        """Format user badges for display"""
        if not user_badges:
            return "No badges yet"
        
        badges = []
        for badge in user_badges:
            if badge.get("name"):
                badges.append(badge["name"])
            elif badge.get("id") == "first_day":
                badges.append("🌱 First Day")
        
        return ", ".join(badges[:3])  # Show max 3 badges
    
    def analyze_streak_distribution(self):
        """Analyze how streaks are distributed across ranges"""
        if not self.streaks_data:
            return {}
        
        ranges = {
            "1-3": 0,
            "4-7": 0, 
            "8-30": 0,
            "31-100": 0,
            "100+": 0
        }
        
        total_users = len(self.streaks_data)
        
        for data in self.streaks_data.values():
            streak = data["current"]
            if 1 <= streak <= 3:
                ranges["1-3"] += 1
            elif 4 <= streak <= 7:
                ranges["4-7"] += 1
            elif 8 <= streak <= 30:
                ranges["8-30"] += 1
            elif 31 <= streak <= 100:
                ranges["31-100"] += 1
            elif streak > 100:
                ranges["100+"] += 1
        
        # Convert to percentages
        percentages = {}
        for range_key, count in ranges.items():
            percentages[range_key] = round((count / total_users) * 100) if total_users > 0 else 0
        
        return percentages
    
    def get_milestone_progress(self):
        """Calculate progress toward next milestones"""
        milestone_progress = {}
        
        for milestone_days, milestone_name in self.milestones.items():
            users_at_milestone = []
            users_progressing = []
            
            for handle, data in self.streaks_data.items():
                current = data["current"]
                if current >= milestone_days:
                    users_at_milestone.append(handle)
                elif current > 0 and current < milestone_days:
                    days_needed = milestone_days - current
                    progress_percent = round((current / milestone_days) * 100)
                    users_progressing.append({
                        "handle": handle,
                        "days_needed": days_needed,
                        "progress_percent": progress_percent
                    })
            
            milestone_progress[milestone_days] = {
                "name": milestone_name,
                "users_achieved": users_at_milestone,
                "users_progressing": users_progressing,
                "total_achieved": len(users_at_milestone),
                "total_progressing": len(users_progressing)
            }
        
        return milestone_progress
    
    def get_badge_distribution(self):
        """Analyze badge distribution across users"""
        badge_stats = {}
        
        # Get all available badges
        available_badges = self.achievements_data.get("badges", {})
        
        for badge_id, badge_info in available_badges.items():
            badge_stats[badge_id] = {
                "name": badge_info.get("name", badge_id),
                "description": badge_info.get("description", ""),
                "users_earned": [],
                "total_earned": 0
            }
        
        # Count who has each badge
        user_achievements = self.achievements_data.get("user_achievements", {})
        for handle, badges in user_achievements.items():
            for badge in badges:
                badge_id = badge.get("id")
                if badge_id in badge_stats:
                    badge_stats[badge_id]["users_earned"].append(f"@{handle}")
                    badge_stats[badge_id]["total_earned"] += 1
        
        return badge_stats
    
    def generate_insights(self):
        """Generate actionable insights about streak patterns"""
        stats = self.calculate_stats()
        leaderboard = self.generate_leaderboard()
        milestone_progress = self.get_milestone_progress()
        
        insights = []
        
        # Engagement insight
        if stats["active_streaks"] < stats["total_users"]:
            inactive = stats["total_users"] - stats["active_streaks"]
            insights.append(f"📈 {inactive} users need re-engagement to restart streaks")
        
        # Milestone insights
        next_milestone = None
        for days in sorted(self.milestones.keys()):
            progressing = milestone_progress[days]["users_progressing"]
            if progressing:
                next_milestone = {
                    "days": days,
                    "name": self.milestones[days],
                    "users_close": len([u for u in progressing if u["days_needed"] <= 2])
                }
                break
        
        if next_milestone and next_milestone["users_close"] > 0:
            insights.append(f"🎯 {next_milestone['users_close']} users close to {next_milestone['name']}")
        
        # Consistency insight
        if stats["avg_streak"] > 0:
            consistency_score = min(100, stats["avg_streak"] * 10)
            insights.append(f"⚡ Workshop consistency: {consistency_score:.0f}/100")
        
        return insights
    
    def export_dashboard_data(self):
        """Export all data needed for the dashboard"""
        return {
            "stats": self.calculate_stats(),
            "leaderboard": self.generate_leaderboard(),
            "distribution": self.analyze_streak_distribution(),
            "milestones": self.get_milestone_progress(),
            "badges": self.get_badge_distribution(),
            "insights": self.generate_insights(),
            "generated_at": datetime.now().isoformat(),
            "next_refresh": (datetime.now() + timedelta(minutes=5)).isoformat()
        }

def main():
    """Generate and save dashboard data"""
    generator = StreakAnalyticsGenerator()
    dashboard_data = generator.export_dashboard_data()
    
    # Save data for dashboard consumption
    with open('streak_dashboard_data.json', 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    # Print summary
    stats = dashboard_data["stats"]
    print("🔥 Streak Analytics Generated")
    print("=" * 40)
    print(f"👥 Total Users: {stats['total_users']}")
    print(f"🔥 Active Streaks: {stats['active_streaks']}")
    print(f"📊 Average Streak: {stats['avg_streak']} days")
    print(f"👑 Longest Current: {stats['longest_current']} days")
    
    print("\n🎯 Key Insights:")
    for insight in dashboard_data["insights"]:
        print(f"   {insight}")
    
    print(f"\n📈 Dashboard data saved to streak_dashboard_data.json")
    print(f"🌐 Open streak_analytics_dashboard.html to view")

if __name__ == "__main__":
    main()