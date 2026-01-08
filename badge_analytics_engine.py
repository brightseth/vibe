#!/usr/bin/env python3
"""
🎖️ Badge Analytics Engine - Advanced Achievement Tracking
Comprehensive analytics for the /vibe workshop badge system
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any
import math

class BadgeAnalyticsEngine:
    def __init__(self):
        self.achievements_file = "achievements.json"
        self.streaks_file = "streaks.json"
        
    def load_data(self) -> Dict[str, Any]:
        """Load all achievement and streak data"""
        try:
            with open(self.achievements_file, 'r') as f:
                achievements = json.load(f)
        except FileNotFoundError:
            achievements = {"badges": {}, "user_achievements": {}, "achievement_history": []}
        
        # Mock streak data based on current info
        streaks = {
            "demo_user": {"current": 1, "best": 1, "last_active": datetime.now().isoformat()},
            "vibe_champion": {"current": 1, "best": 1, "last_active": datetime.now().isoformat()}
        }
        
        return achievements, streaks
    
    def calculate_engagement_metrics(self, achievements: Dict, streaks: Dict) -> Dict[str, Any]:
        """Calculate comprehensive engagement metrics"""
        total_users = len(streaks)
        active_users = sum(1 for user_data in streaks.values() if user_data["current"] > 0)
        
        # Badge distribution
        total_badges_awarded = len(achievements.get("achievement_history", []))
        unique_badge_types = len(set(badge["badge"]["id"] for badge in achievements.get("achievement_history", [])))
        
        # Streak analytics
        current_streaks = [data["current"] for data in streaks.values()]
        best_streaks = [data["best"] for data in streaks.values()]
        
        avg_current_streak = sum(current_streaks) / len(current_streaks) if current_streaks else 0
        avg_best_streak = sum(best_streaks) / len(best_streaks) if best_streaks else 0
        
        # Engagement score (0-100)
        engagement_score = min(100, (
            (active_users / total_users * 30) +  # Active participation (30%)
            (avg_current_streak / 7 * 25) +      # Current streak strength (25%)
            (total_badges_awarded / total_users * 20) +  # Badge density (20%)
            (unique_badge_types / 8 * 15) +      # Badge variety (15%)
            (avg_best_streak / 30 * 10)          # Historical performance (10%)
        )) if total_users > 0 else 0
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "engagement_rate": (active_users / total_users * 100) if total_users > 0 else 0,
            "total_badges": total_badges_awarded,
            "unique_badge_types": unique_badge_types,
            "avg_current_streak": round(avg_current_streak, 1),
            "avg_best_streak": round(avg_best_streak, 1),
            "engagement_score": round(engagement_score, 1)
        }
    
    def predict_next_milestones(self, streaks: Dict) -> List[Dict[str, Any]]:
        """Predict when users will hit their next milestones"""
        milestones = [3, 7, 14, 30, 100]  # Early Bird, Week Warrior, Consistency King, Monthly Legend, Century Club
        milestone_names = {
            3: "🌅 Early Bird",
            7: "💪 Week Warrior", 
            14: "🔥 Consistency King",
            30: "🏆 Monthly Legend",
            100: "👑 Century Club"
        }
        
        predictions = []
        
        for handle, data in streaks.items():
            current_streak = data["current"]
            
            # Find next milestone
            next_milestone = None
            for milestone in milestones:
                if current_streak < milestone:
                    next_milestone = milestone
                    break
            
            if next_milestone:
                days_remaining = next_milestone - current_streak
                predictions.append({
                    "handle": handle,
                    "current_streak": current_streak,
                    "next_milestone": next_milestone,
                    "milestone_name": milestone_names[next_milestone],
                    "days_remaining": days_remaining,
                    "progress_percent": round((current_streak / next_milestone) * 100, 1)
                })
        
        # Sort by days remaining (closest first)
        return sorted(predictions, key=lambda x: x["days_remaining"])
    
    def analyze_badge_trends(self, achievements: Dict) -> Dict[str, Any]:
        """Analyze badge earning trends and patterns"""
        history = achievements.get("achievement_history", [])
        
        # Badge popularity
        badge_counts = {}
        for entry in history:
            badge_id = entry["badge"]["id"]
            badge_counts[badge_id] = badge_counts.get(badge_id, 0) + 1
        
        # Most popular badges
        popular_badges = sorted(badge_counts.items(), key=lambda x: x[1], reverse=True)
        
        # Badge earning timeline
        timeline_analysis = {
            "total_awarded": len(history),
            "unique_badge_types": len(badge_counts),
            "most_popular": popular_badges[0] if popular_badges else None,
            "badge_distribution": badge_counts
        }
        
        return timeline_analysis
    
    def generate_motivational_insights(self, streaks: Dict, predictions: List) -> List[str]:
        """Generate personalized motivational insights"""
        insights = []
        
        # Overall workshop momentum
        total_current_streak = sum(data["current"] for data in streaks.values())
        if total_current_streak > 0:
            insights.append(f"🔥 Collective workshop momentum: {total_current_streak} combined streak days!")
        
        # Individual encouragements
        for pred in predictions:
            if pred["days_remaining"] == 1:
                insights.append(f"🎯 {pred['handle']} is just 1 day away from {pred['milestone_name']}!")
            elif pred["days_remaining"] <= 3:
                insights.append(f"⚡ {pred['handle']} is {pred['days_remaining']} days from {pred['milestone_name']} - almost there!")
        
        # Progress highlights
        for handle, data in streaks.items():
            if data["current"] == data["best"]:
                insights.append(f"🚀 {handle} is on their personal best streak of {data['current']} days!")
        
        return insights
    
    def generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate a comprehensive analytics report"""
        achievements, streaks = self.load_data()
        
        engagement_metrics = self.calculate_engagement_metrics(achievements, streaks)
        milestone_predictions = self.predict_next_milestones(streaks)
        badge_trends = self.analyze_badge_trends(achievements)
        motivational_insights = self.generate_motivational_insights(streaks, milestone_predictions)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "engagement_metrics": engagement_metrics,
            "milestone_predictions": milestone_predictions,
            "badge_trends": badge_trends,
            "motivational_insights": motivational_insights,
            "workshop_health": {
                "status": "healthy" if engagement_metrics["engagement_score"] > 70 else "needs_attention",
                "active_streak_count": engagement_metrics["active_users"],
                "badge_velocity": badge_trends["total_awarded"] / max(1, engagement_metrics["total_users"]),
                "growth_potential": "high" if engagement_metrics["engagement_rate"] > 80 else "moderate"
            }
        }

def main():
    print("🎖️ BADGE ANALYTICS ENGINE")
    print("=" * 50)
    
    engine = BadgeAnalyticsEngine()
    report = engine.generate_comprehensive_report()
    
    print(f"\n📊 ENGAGEMENT METRICS:")
    metrics = report["engagement_metrics"]
    print(f"   Engagement Score: {metrics['engagement_score']}/100")
    print(f"   Active Users: {metrics['active_users']}/{metrics['total_users']} ({metrics['engagement_rate']:.1f}%)")
    print(f"   Total Badges Awarded: {metrics['total_badges']}")
    print(f"   Average Current Streak: {metrics['avg_current_streak']} days")
    
    print(f"\n🎯 UPCOMING MILESTONES:")
    for pred in report["milestone_predictions"][:5]:  # Show top 5
        progress_bar = "█" * int(pred["progress_percent"] / 10) + "░" * (10 - int(pred["progress_percent"] / 10))
        print(f"   {pred['handle']}: {pred['milestone_name']} in {pred['days_remaining']} days")
        print(f"      Progress: [{progress_bar}] {pred['progress_percent']}%")
    
    print(f"\n🏆 BADGE TRENDS:")
    trends = report["badge_trends"]
    print(f"   Total Badges: {trends['total_awarded']}")
    print(f"   Unique Types: {trends['unique_badge_types']}")
    if trends["most_popular"]:
        print(f"   Most Popular: {trends['most_popular'][0]} ({trends['most_popular'][1]} awarded)")
    
    print(f"\n💡 MOTIVATIONAL INSIGHTS:")
    for insight in report["motivational_insights"]:
        print(f"   • {insight}")
    
    print(f"\n🏥 WORKSHOP HEALTH:")
    health = report["workshop_health"]
    print(f"   Status: {health['status'].title()}")
    print(f"   Badge Velocity: {health['badge_velocity']:.1f} badges per user")
    print(f"   Growth Potential: {health['growth_potential'].title()}")
    
    # Save detailed report
    with open("badge_analytics_report.json", 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n💾 Detailed report saved to badge_analytics_report.json")
    print(f"📅 Report generated: {report['timestamp']}")

if __name__ == "__main__":
    main()