#!/usr/bin/env python3
"""
🧠 Enhanced Streak Prediction Analytics
Advanced analytics with AI-powered insights for /vibe workshop engagement
"""

import json
from datetime import datetime, timedelta
import math

class EnhancedStreakAnalytics:
    def __init__(self):
        self.load_data()
        
    def load_data(self):
        """Load streak and achievement data"""
        try:
            with open('achievements.json', 'r') as f:
                self.achievements_data = json.load(f)
        except FileNotFoundError:
            self.achievements_data = {"user_achievements": {}}
            
        # Mock current streak data - would come from real system
        self.current_streaks = {
            "@demo_user": {"current": 1, "best": 1, "last_active": "2026-01-08"},
            "@vibe_champion": {"current": 1, "best": 1, "last_active": "2026-01-08"}
        }
    
    def calculate_engagement_score(self, user_handle):
        """Calculate a user's engagement momentum score (0-100)"""
        user_data = self.current_streaks.get(user_handle, {})
        current = user_data.get("current", 0)
        best = user_data.get("best", 0)
        
        # Base score from current streak
        base_score = min(current * 10, 50)
        
        # Bonus for beating personal best
        if current >= best:
            base_score += 20
            
        # Achievement multiplier
        user_achievements = self.achievements_data["user_achievements"].get(user_handle.replace("@", ""), [])
        achievement_bonus = min(len(user_achievements) * 5, 30)
        
        return min(base_score + achievement_bonus, 100)
    
    def predict_next_milestone_probability(self, user_handle):
        """Predict likelihood of reaching next milestone"""
        user_data = self.current_streaks.get(user_handle, {})
        current = user_data.get("current", 0)
        
        # Define milestone thresholds
        milestones = [3, 7, 14, 30, 100]
        next_milestone = None
        
        for milestone in milestones:
            if current < milestone:
                next_milestone = milestone
                break
                
        if not next_milestone:
            return {"milestone": None, "probability": 0, "days_to_go": 0}
        
        days_to_go = next_milestone - current
        engagement_score = self.calculate_engagement_score(user_handle)
        
        # Calculate probability based on engagement and distance
        if days_to_go == 1:
            base_prob = 85
        elif days_to_go <= 3:
            base_prob = 70
        elif days_to_go <= 7:
            base_prob = 50
        else:
            base_prob = 30
            
        # Adjust based on engagement score
        engagement_modifier = (engagement_score - 50) / 2
        probability = max(10, min(95, base_prob + engagement_modifier))
        
        return {
            "milestone": next_milestone,
            "milestone_name": self.get_milestone_name(next_milestone),
            "probability": round(probability),
            "days_to_go": days_to_go,
            "engagement_score": engagement_score
        }
    
    def get_milestone_name(self, days):
        """Get milestone name for days"""
        milestone_names = {
            3: "Early Bird 🌅",
            7: "Week Warrior 💪", 
            14: "Consistency King 🔥",
            30: "Monthly Legend 🏆",
            100: "Century Club 👑"
        }
        return milestone_names.get(days, f"{days}-Day Milestone")
    
    def analyze_community_patterns(self):
        """Analyze overall community engagement patterns"""
        total_users = len(self.current_streaks)
        if total_users == 0:
            return {}
            
        # Calculate community stats
        all_current = [data["current"] for data in self.current_streaks.values()]
        all_best = [data["best"] for data in self.current_streaks.values()]
        
        active_streaks = sum(1 for streak in all_current if streak > 0)
        avg_current = sum(all_current) / total_users if total_users > 0 else 0
        avg_best = sum(all_best) / total_users if total_users > 0 else 0
        
        # Community health score
        health_score = min(100, (active_streaks / total_users * 40) + (avg_current * 10) + (avg_best * 5))
        
        # Risk analysis - users at risk of dropping
        at_risk_users = []
        for handle, data in self.current_streaks.items():
            if data["current"] == 1:  # First day is critical
                at_risk_users.append(handle)
        
        return {
            "total_users": total_users,
            "active_streaks": active_streaks,
            "avg_current_streak": round(avg_current, 1),
            "avg_best_streak": round(avg_best, 1),
            "retention_rate": f"{(active_streaks/total_users*100):.0f}%",
            "community_health_score": round(health_score),
            "at_risk_users": at_risk_users,
            "users_near_milestone": self.find_users_near_milestone()
        }
    
    def find_users_near_milestone(self):
        """Find users close to achieving milestones"""
        near_milestone = []
        
        for handle, data in self.current_streaks.items():
            prediction = self.predict_next_milestone_probability(handle)
            if prediction["days_to_go"] <= 3 and prediction["probability"] > 50:
                near_milestone.append({
                    "handle": handle,
                    "milestone": prediction["milestone_name"],
                    "days_to_go": prediction["days_to_go"],
                    "probability": prediction["probability"]
                })
        
        return near_milestone
    
    def generate_ai_insights(self):
        """Generate AI-powered insights and recommendations"""
        community_data = self.analyze_community_patterns()
        insights = []
        
        # Community health insights
        health = community_data["community_health_score"]
        if health >= 80:
            insights.append("🌟 Exceptional community engagement! The workshop has strong momentum.")
        elif health >= 60:
            insights.append("💪 Solid community engagement. Focus on supporting users near milestones.")
        elif health >= 40:
            insights.append("⚡ Moderate engagement. Consider motivational campaigns or new features.")
        else:
            insights.append("🚨 Community needs attention! Implement re-engagement strategies.")
        
        # At-risk user insights
        at_risk = len(community_data["at_risk_users"])
        if at_risk > 0:
            if at_risk == 1:
                insights.append(f"🎯 {at_risk} user is in the critical first-day phase. Personal encouragement recommended.")
            else:
                insights.append(f"🎯 {at_risk} users are in the critical first-day phase. Group motivation could help.")
        
        # Milestone insights
        near_milestone = len(community_data["users_near_milestone"])
        if near_milestone > 0:
            insights.append(f"🏆 {near_milestone} users are close to milestone achievements. Prepare celebrations!")
        
        # Pattern insights
        avg_streak = community_data["avg_current_streak"]
        if avg_streak == 1.0:
            insights.append("🌱 Community is in early formation stage. Day 2-3 retention will be critical.")
        elif avg_streak < 3:
            insights.append("📈 Users are building initial habits. Focus on day-to-day encouragement.")
        elif avg_streak >= 7:
            insights.append("🔥 Strong streak culture is emerging! Users are developing consistent habits.")
        
        return insights
    
    def create_dashboard_data(self):
        """Create enhanced dashboard data with predictions"""
        community_data = self.analyze_community_patterns()
        
        # Enhanced leaderboard with predictions
        leaderboard = []
        for handle, data in self.current_streaks.items():
            prediction = self.predict_next_milestone_probability(handle)
            engagement = self.calculate_engagement_score(handle)
            
            user_achievements = self.achievements_data["user_achievements"].get(handle.replace("@", ""), [])
            badge_names = [ach["name"] for ach in user_achievements]
            
            leaderboard.append({
                "handle": handle,
                "current_streak": data["current"],
                "best_streak": data["best"],
                "engagement_score": engagement,
                "next_milestone": prediction["milestone_name"] if prediction["milestone"] else "Century Club+ 👑",
                "days_to_milestone": prediction["days_to_go"],
                "milestone_probability": prediction["probability"],
                "badges": ", ".join(badge_names) if badge_names else "No badges yet",
                "badge_count": len(badge_names)
            })
        
        # Sort by current streak, then best streak
        leaderboard.sort(key=lambda x: (-x["current_streak"], -x["best_streak"]))
        
        return {
            "timestamp": datetime.now().isoformat(),
            "community_stats": community_data,
            "leaderboard": leaderboard,
            "ai_insights": self.generate_ai_insights(),
            "predictions": {
                "high_probability_achievements": [
                    user for user in leaderboard 
                    if user["milestone_probability"] > 70 and user["days_to_milestone"] <= 3
                ],
                "engagement_leaders": [
                    user for user in leaderboard 
                    if user["engagement_score"] > 70
                ],
                "at_risk_users": community_data["at_risk_users"]
            }
        }
    
    def save_enhanced_dashboard(self):
        """Save enhanced dashboard data to file"""
        data = self.create_dashboard_data()
        
        with open('enhanced_streak_analytics_dashboard_data.json', 'w') as f:
            json.dump(data, f, indent=2)
        
        print("✅ Enhanced streak analytics dashboard data generated!")
        return data

def main():
    """Run enhanced analytics and display key insights"""
    analytics = EnhancedStreakAnalytics()
    
    print("🧠 Enhanced Streak Prediction Analytics")
    print("=" * 50)
    
    # Generate and save dashboard data
    data = analytics.save_enhanced_dashboard()
    
    # Display key insights
    print(f"\n📊 Community Stats:")
    stats = data["community_stats"]
    print(f"  👥 Total Users: {stats['total_users']}")
    print(f"  🔥 Active Streaks: {stats['active_streaks']}")
    print(f"  📈 Average Streak: {stats['avg_current_streak']}")
    print(f"  💪 Community Health: {stats['community_health_score']}/100")
    
    print(f"\n🧠 AI Insights:")
    for insight in data["ai_insights"]:
        print(f"  • {insight}")
    
    print(f"\n🎯 Predictions:")
    predictions = data["predictions"]
    if predictions["high_probability_achievements"]:
        print("  High probability milestone achievements:")
        for user in predictions["high_probability_achievements"]:
            print(f"    {user['handle']}: {user['milestone_probability']}% chance of {user['next_milestone']}")
    else:
        print("  • No high-probability milestone achievements in next 3 days")
    
    if predictions["at_risk_users"]:
        print(f"  • {len(predictions['at_risk_users'])} users need Day 2 encouragement")
    
    print(f"\n🏆 Top Performers:")
    for i, user in enumerate(data["leaderboard"][:3], 1):
        print(f"  #{i} {user['handle']}: {user['current_streak']} days (Engagement: {user['engagement_score']}/100)")

if __name__ == "__main__":
    main()