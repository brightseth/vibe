#!/usr/bin/env python3
"""
Execute streak analytics for current cycle
"""

import json
from datetime import datetime, timedelta

class StreakAnalyticsGenerator:
    def __init__(self):
        # Current streak data from get_streaks
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
            return {"user_achievements": {}, "badges": {}}
    
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
            return "🌟 Getting Started"
        
        badges = []
        for badge in user_badges:
            if badge.get("name"):
                badges.append(badge["name"])
            elif badge.get("id") == "first_day":
                badges.append("🌱 First Day")
        
        return ", ".join(badges[:3]) if badges else "🌟 Getting Started"
    
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
    
    def generate_insights(self):
        """Generate actionable insights about streak patterns"""
        stats = self.calculate_stats()
        milestone_progress = self.get_milestone_progress()
        
        insights = []
        
        # Engagement insight
        if stats["active_streaks"] < stats["total_users"]:
            inactive = stats["total_users"] - stats["active_streaks"]
            insights.append(f"📈 {inactive} users need re-engagement to restart streaks")
        elif stats["active_streaks"] == stats["total_users"]:
            insights.append(f"🔥 Perfect engagement! All {stats['total_users']} users have active streaks")
        
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
                insights.append(f"🎯 {len(progressing)} users progressing toward {self.milestones[days]}")
                break
        
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
            "milestones": self.get_milestone_progress(),
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
    
    return dashboard_data

if __name__ == "__main__":
    main()