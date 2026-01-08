#!/usr/bin/env python3
"""
Streak Analytics Engine for @streaks-agent
Provides comprehensive analytics and insights for workshop engagement
"""

import json
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import statistics

class StreakAnalyticsEngine:
    def __init__(self):
        self.load_data()
    
    def load_data(self):
        """Load current streak and achievement data"""
        # Current streak data from @streaks-agent memory
        self.streak_data = {
            "demo_user": {"current_streak": 1, "best_streak": 1, "joined": "2026-01-08"},
            "vibe_champion": {"current_streak": 1, "best_streak": 1, "joined": "2026-01-08"}
        }
        
        # Load achievements
        try:
            with open("achievements.json", 'r') as f:
                self.achievements = json.load(f)
        except FileNotFoundError:
            self.achievements = {"badges": {}, "user_achievements": {}, "achievement_history": []}
    
    def generate_comprehensive_report(self):
        """Generate comprehensive analytics report"""
        print("📊 STREAK ANALYTICS ENGINE")
        print("=" * 50)
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        self.analyze_current_status()
        self.analyze_engagement_patterns()
        self.analyze_achievement_metrics()
        self.predict_future_milestones()
        self.generate_coaching_insights()
        self.save_analytics_data()
    
    def analyze_current_status(self):
        """Analyze current streak status across all users"""
        print("🔥 CURRENT STREAK STATUS")
        print("-" * 30)
        
        total_users = len(self.streak_data)
        current_streaks = [data["current_streak"] for data in self.streak_data.values()]
        best_streaks = [data["best_streak"] for data in self.streak_data.values()]
        
        print(f"👥 Total active users: {total_users}")
        print(f"📈 Average current streak: {statistics.mean(current_streaks):.1f} days")
        print(f"🏆 Average best streak: {statistics.mean(best_streaks):.1f} days")
        print(f"🔥 Total streak days: {sum(current_streaks)} days")
        print(f"💪 Combined best streaks: {sum(best_streaks)} days")
        
        # Streak distribution
        streak_counts = Counter(current_streaks)
        print(f"\n📊 Current Streak Distribution:")
        for streak_days in sorted(streak_counts.keys()):
            count = streak_counts[streak_days]
            percentage = (count / total_users) * 100
            bar = "█" * count + "░" * (total_users - count)
            print(f"   {streak_days} day{'s' if streak_days != 1 else ''}: {count} user{'s' if count != 1 else ''} ({percentage:.1f}%) {bar}")
        
        print()
    
    def analyze_engagement_patterns(self):
        """Analyze engagement patterns and trends"""
        print("📈 ENGAGEMENT PATTERNS")
        print("-" * 25)
        
        # Engagement momentum analysis
        active_users = sum(1 for data in self.streak_data.values() if data["current_streak"] >= 1)
        consistency_score = (active_users / len(self.streak_data)) * 100
        
        print(f"⚡ Workshop momentum: {consistency_score:.1f}%")
        print(f"🎯 Active participants: {active_users}/{len(self.streak_data)}")
        
        # Growth potential
        users_ready_for_next_milestone = 0
        for handle, data in self.streak_data.items():
            current = data["current_streak"]
            # Check if close to next milestone (within 2 days of 3, 7, 14, 30, 100)
            milestones = [3, 7, 14, 30, 100]
            for milestone in milestones:
                if current < milestone <= current + 2:
                    users_ready_for_next_milestone += 1
                    break
        
        print(f"🚀 Users near milestone: {users_ready_for_next_milestone}")
        
        # Retention risk analysis
        one_day_streaks = sum(1 for data in self.streak_data.values() if data["current_streak"] == 1)
        retention_risk = (one_day_streaks / len(self.streak_data)) * 100
        
        print(f"⚠️  Retention focus needed: {retention_risk:.1f}% at day 1")
        print()
    
    def analyze_achievement_metrics(self):
        """Analyze achievement and badge metrics"""
        print("🏆 ACHIEVEMENT METRICS")
        print("-" * 23)
        
        total_badges = len(self.achievements.get("badges", {}))
        awarded_badges = sum(len(badges) for badges in self.achievements.get("user_achievements", {}).values())
        
        print(f"🎖️  Total badges available: {total_badges}")
        print(f"🏅 Total badges awarded: {awarded_badges}")
        print(f"📊 Badge completion rate: {(awarded_badges / (total_badges * len(self.streak_data))) * 100:.1f}%")
        
        # Badge popularity
        badge_counts = defaultdict(int)
        for user_badges in self.achievements.get("user_achievements", {}).values():
            for badge in user_badges:
                badge_counts[badge['name']] += 1
        
        if badge_counts:
            print(f"\n🔥 Most Popular Badges:")
            for badge_name, count in sorted(badge_counts.items(), key=lambda x: x[1], reverse=True)[:3]:
                percentage = (count / len(self.streak_data)) * 100
                print(f"   {badge_name}: {count} users ({percentage:.1f}%)")
        
        # Achievement velocity
        recent_achievements = [a for a in self.achievements.get("achievement_history", []) 
                             if datetime.fromisoformat(a["timestamp"].replace('Z', '+00:00')).date() == datetime.now().date()]
        print(f"\n⚡ Achievements today: {len(recent_achievements)}")
        print()
    
    def predict_future_milestones(self):
        """Predict when users will hit next milestones"""
        print("🔮 MILESTONE PREDICTIONS")
        print("-" * 25)
        
        milestones = [
            ("early_bird", "Early Bird 🌅", 3),
            ("week_streak", "Week Warrior 💪", 7),
            ("consistency_king", "Consistency King 🔥", 14),
            ("month_streak", "Monthly Legend 🏆", 30),
            ("century_club", "Century Club 👑", 100)
        ]
        
        predictions = []
        
        for handle, data in self.streak_data.items():
            current = data["current_streak"]
            earned_badges = [b["id"] for b in self.achievements.get("user_achievements", {}).get(handle, [])]
            
            for badge_id, badge_name, threshold in milestones:
                if badge_id not in earned_badges and current < threshold:
                    days_needed = threshold - current
                    predicted_date = datetime.now() + timedelta(days=days_needed)
                    predictions.append({
                        "handle": handle,
                        "badge": badge_name,
                        "days_needed": days_needed,
                        "predicted_date": predicted_date.strftime("%Y-%m-%d"),
                        "threshold": threshold
                    })
                    break
        
        # Sort by nearest milestone
        predictions.sort(key=lambda x: x["days_needed"])
        
        print("📅 Next milestone predictions:")
        for pred in predictions[:5]:  # Show next 5 milestones
            print(f"   @{pred['handle']}: {pred['badge']} in {pred['days_needed']} days ({pred['predicted_date']})")
        
        # Milestone clustering analysis
        near_term = sum(1 for p in predictions if p["days_needed"] <= 3)
        print(f"\n🎯 Milestones within 3 days: {near_term}")
        print()
    
    def generate_coaching_insights(self):
        """Generate coaching insights for workshop improvement"""
        print("💡 COACHING INSIGHTS")
        print("-" * 20)
        
        insights = []
        
        # Streak maintenance insights
        one_day_users = [h for h, d in self.streak_data.items() if d["current_streak"] == 1]
        if len(one_day_users) > 0:
            insights.append(f"🎯 {len(one_day_users)} user(s) need day-2 encouragement to build momentum")
        
        # Badge motivation insights
        no_badge_users = [h for h in self.streak_data.keys() 
                         if h not in self.achievements.get("user_achievements", {})]
        if no_badge_users:
            insights.append(f"🏆 {len(no_badge_users)} user(s) haven't earned their first badge yet")
        
        # Community building insights
        if len(self.streak_data) >= 2:
            insights.append("👥 Great foundation with multiple active users - consider streak challenges")
        
        # Gamification insights
        badge_completion = (sum(len(badges) for badges in self.achievements.get("user_achievements", {}).values()) / 
                          (len(self.achievements.get("badges", {})) * len(self.streak_data))) * 100
        if badge_completion < 50:
            insights.append(f"🎮 Low badge completion ({badge_completion:.1f}%) - consider easier milestones")
        
        # Engagement insights
        avg_streak = statistics.mean([d["current_streak"] for d in self.streak_data.values()])
        if avg_streak < 3:
            insights.append("⚡ Early stage community - focus on building consistency habits")
        
        for i, insight in enumerate(insights, 1):
            print(f"{i}. {insight}")
        
        print()
        
        # Success metrics
        print("✅ WORKSHOP HEALTH INDICATORS:")
        participation_rate = (len([d for d in self.streak_data.values() if d["current_streak"] >= 1]) / 
                            len(self.streak_data)) * 100
        print(f"   📈 Participation rate: {participation_rate:.1f}%")
        
        achievement_rate = (len([u for u in self.achievements.get("user_achievements", {}).values() if u]) / 
                          len(self.streak_data)) * 100
        print(f"   🏆 Achievement rate: {achievement_rate:.1f}%")
        
        momentum_score = min(100, avg_streak * 20)  # Scale 1-day = 20%, 5-day = 100%
        print(f"   🔥 Momentum score: {momentum_score:.1f}%")
        print()
    
    def save_analytics_data(self):
        """Save analytics data for dashboard consumption"""
        analytics_data = {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_users": len(self.streak_data),
                "average_current_streak": statistics.mean([d["current_streak"] for d in self.streak_data.values()]),
                "total_badges_awarded": sum(len(badges) for badges in self.achievements.get("user_achievements", {}).values()),
                "participation_rate": (len([d for d in self.streak_data.values() if d["current_streak"] >= 1]) / len(self.streak_data)) * 100
            },
            "user_details": dict(self.streak_data),
            "badge_distribution": {
                badge["name"]: sum(1 for user_badges in self.achievements.get("user_achievements", {}).values() 
                                 if any(b["id"] == badge_id for b in user_badges))
                for badge_id, badge in self.achievements.get("badges", {}).items()
            }
        }
        
        with open("streak_analytics_data.json", 'w') as f:
            json.dump(analytics_data, f, indent=2)
        
        print("💾 Analytics data saved to streak_analytics_data.json")
        print("🔗 Ready for dashboard visualization")

def main():
    engine = StreakAnalyticsEngine()
    engine.generate_comprehensive_report()

if __name__ == "__main__":
    main()