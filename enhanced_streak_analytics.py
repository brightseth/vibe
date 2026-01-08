#!/usr/bin/env python3
"""
Enhanced Streak Analytics System for /vibe workshop
Builds trend graphs, distribution statistics, and pattern identification
"""

import json
import datetime
from typing import Dict, List, Tuple
import math

class StreakAnalytics:
    def __init__(self):
        self.streak_data = self.load_streak_data()
        self.achievement_data = self.load_achievement_data()
        
    def load_streak_data(self) -> Dict:
        """Load current streak data"""
        # For now, using the known data - in production would read from memory/db
        return {
            "@demo_user": {"current": 1, "best": 1, "last_seen": "2026-01-08"},
            "@vibe_champion": {"current": 1, "best": 1, "last_seen": "2026-01-08"}
        }
    
    def load_achievement_data(self) -> Dict:
        """Load achievement data"""
        try:
            with open('achievements.json', 'r') as f:
                return json.load(f)
        except:
            return {"badges": {}, "user_badges": {}, "achievement_log": []}

    def calculate_streak_distribution(self) -> Dict:
        """Calculate distribution of streak lengths"""
        distribution = {
            "1-day": 0,      # Getting started
            "2-3-days": 0,   # Building habit
            "4-7-days": 0,   # Week warriors
            "8-14-days": 0,  # Committed
            "15-30-days": 0, # Legends
            "30+": 0         # Hall of Fame
        }
        
        for user, data in self.streak_data.items():
            streak = data["current"]
            if streak == 1:
                distribution["1-day"] += 1
            elif streak <= 3:
                distribution["2-3-days"] += 1
            elif streak <= 7:
                distribution["4-7-days"] += 1
            elif streak <= 14:
                distribution["8-14-days"] += 1
            elif streak <= 30:
                distribution["15-30-days"] += 1
            else:
                distribution["30+"] += 1
                
        return distribution

    def identify_patterns(self) -> List[Dict]:
        """Identify engagement patterns and insights"""
        insights = []
        total_users = len(self.streak_data)
        
        if total_users == 0:
            return [{"type": "warning", "message": "No active users tracked", "icon": "⚠️"}]
        
        # Calculate key metrics
        current_streaks = [data["current"] for data in self.streak_data.values()]
        avg_streak = sum(current_streaks) / len(current_streaks)
        max_streak = max(current_streaks)
        
        # Perfect engagement detection
        if all(streak >= 1 for streak in current_streaks):
            insights.append({
                "type": "success",
                "message": f"Perfect engagement! All {total_users} users maintaining streaks",
                "icon": "🔥"
            })
        
        # Early stage detection (good foundation)
        if total_users >= 2 and avg_streak <= 3:
            insights.append({
                "type": "info", 
                "message": "Strong foundation phase - users building initial habits",
                "icon": "🌱"
            })
        
        # Milestone readiness
        users_ready_for_3day = sum(1 for streak in current_streaks if streak == 2)
        users_ready_for_7day = sum(1 for streak in current_streaks if streak == 6)
        
        if users_ready_for_3day > 0:
            insights.append({
                "type": "milestone",
                "message": f"{users_ready_for_3day} user(s) one day away from Seedling 🌱 milestone!",
                "icon": "🎯"
            })
            
        if users_ready_for_7day > 0:
            insights.append({
                "type": "milestone", 
                "message": f"{users_ready_for_7day} user(s) one day away from Week Warrior 💪!",
                "icon": "🏆"
            })
        
        # Growth potential analysis
        if max_streak <= 7:
            insights.append({
                "type": "opportunity",
                "message": "High growth potential - no long-term streaks yet, room for legends!",
                "icon": "🚀"
            })
            
        return insights

    def calculate_engagement_health(self) -> Dict:
        """Calculate overall community engagement health"""
        total_users = len(self.streak_data)
        if total_users == 0:
            return {"status": "inactive", "score": 0, "description": "No active users"}
        
        # Health factors
        active_streaks = sum(1 for data in self.streak_data.values() if data["current"] > 0)
        avg_streak = sum(data["current"] for data in self.streak_data.values()) / total_users
        has_veterans = any(data["best"] >= 7 for data in self.streak_data.values())
        
        # Calculate health score (0-100)
        activity_score = (active_streaks / total_users) * 40  # Max 40 points
        consistency_score = min(avg_streak * 10, 30)         # Max 30 points
        veteran_bonus = 30 if has_veterans else 0            # Max 30 points
        
        total_score = activity_score + consistency_score + veteran_bonus
        
        if total_score >= 80:
            status = "thriving"
            description = "Community is highly engaged with strong retention"
        elif total_score >= 60:
            status = "healthy" 
            description = "Solid engagement with room for growth"
        elif total_score >= 40:
            status = "building"
            description = "Growing community establishing habits"
        elif total_score >= 20:
            status = "emerging"
            description = "Early stage community with potential"
        else:
            status = "struggling"
            description = "Low engagement, needs intervention"
            
        return {
            "status": status,
            "score": int(total_score),
            "description": description,
            "active_rate": (active_streaks / total_users) * 100,
            "avg_streak": round(avg_streak, 1)
        }

    def get_milestone_predictions(self) -> Dict:
        """Predict when users will hit major milestones"""
        predictions = {
            "seedling_3day": [],
            "warrior_7day": [], 
            "flame_14day": [],
            "legend_30day": []
        }
        
        for user, data in self.streak_data.items():
            current = data["current"]
            
            # Calculate days to each milestone
            days_to_3 = max(0, 3 - current)
            days_to_7 = max(0, 7 - current) 
            days_to_14 = max(0, 14 - current)
            days_to_30 = max(0, 30 - current)
            
            if current < 3:
                predictions["seedling_3day"].append({"user": user, "days": days_to_3})
            if current < 7:
                predictions["warrior_7day"].append({"user": user, "days": days_to_7})
            if current < 14:
                predictions["flame_14day"].append({"user": user, "days": days_to_14})
            if current < 30:
                predictions["legend_30day"].append({"user": user, "days": days_to_30})
                
        return predictions

    def generate_analytics_report(self) -> Dict:
        """Generate comprehensive analytics report"""
        distribution = self.calculate_streak_distribution()
        patterns = self.identify_patterns()
        health = self.calculate_engagement_health()
        predictions = self.get_milestone_predictions()
        
        # Calculate trend data for visualization
        trend_data = self.calculate_trend_data()
        
        report = {
            "timestamp": datetime.datetime.now().isoformat(),
            "summary": {
                "total_users": len(self.streak_data),
                "active_streaks": sum(1 for data in self.streak_data.values() if data["current"] > 0),
                "avg_streak": round(sum(data["current"] for data in self.streak_data.values()) / max(len(self.streak_data), 1), 1),
                "longest_current": max([data["current"] for data in self.streak_data.values()], default=0),
                "total_achievements": len(self.achievement_data.get("achievement_log", []))
            },
            "distribution": distribution,
            "patterns": patterns,
            "health": health,
            "predictions": predictions,
            "trends": trend_data,
            "users": self.streak_data
        }
        
        return report

    def calculate_trend_data(self) -> Dict:
        """Calculate trend data for charts"""
        # For now, simulate trend data - in production would track historical data
        return {
            "daily_activity": [0, 2, 2, 2, 2],  # Last 5 days
            "milestone_achievements": [0, 2, 0, 0, 0],  # Achievements per day
            "retention_rate": [0, 100, 100, 100, 100],  # % users active each day
            "labels": ["4 days ago", "3 days ago", "2 days ago", "Yesterday", "Today"]
        }

def main():
    """Generate and display analytics report"""
    analytics = StreakAnalytics()
    report = analytics.generate_analytics_report()
    
    print("🔥 STREAK ANALYTICS REPORT")
    print("=" * 50)
    
    # Summary
    summary = report["summary"]
    print(f"👥 Total Users: {summary['total_users']}")
    print(f"⚡ Active Streaks: {summary['active_streaks']}")
    print(f"📊 Average Streak: {summary['avg_streak']} days")
    print(f"🏆 Longest Current: {summary['longest_current']} days")
    print(f"🎖️ Total Achievements: {summary['total_achievements']}")
    
    # Health Status
    health = report["health"]
    print(f"\n💫 Community Health: {health['status'].upper()}")
    print(f"   Score: {health['score']}/100")
    print(f"   {health['description']}")
    print(f"   Active Rate: {health['active_rate']:.1f}%")
    
    # Key Patterns
    print("\n🧠 Key Insights:")
    for pattern in report["patterns"]:
        print(f"   {pattern['icon']} {pattern['message']}")
    
    # Distribution
    print("\n📈 Streak Distribution:")
    for category, count in report["distribution"].items():
        if count > 0:
            print(f"   {category}: {count} users")
    
    # Upcoming Milestones
    print("\n🎯 Upcoming Milestones:")
    predictions = report["predictions"]
    
    if predictions["seedling_3day"]:
        for pred in predictions["seedling_3day"][:3]:  # Show top 3
            print(f"   🌱 {pred['user']} → Seedling in {pred['days']} days")
            
    if predictions["warrior_7day"]:
        for pred in predictions["warrior_7day"][:3]:
            print(f"   💪 {pred['user']} → Week Warrior in {pred['days']} days")
    
    # Save report for dashboard
    with open('streak_analytics_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Full report saved to: streak_analytics_report.json")
    print(f"🕐 Generated at: {report['timestamp']}")

if __name__ == "__main__":
    main()