#!/usr/bin/env python3
"""
Enhanced Streak Analytics Dashboard
Provides deeper insights and pattern recognition for /vibe workshop streaks
"""

import json
from datetime import datetime, timedelta
import statistics

class EnhancedStreakAnalytics:
    def __init__(self, data_file="streak_data.json"):
        self.data_file = data_file
        self.load_data()
    
    def load_data(self):
        """Load streak data from JSON file"""
        try:
            with open(self.data_file, 'r') as f:
                self.data = json.load(f)
        except FileNotFoundError:
            self.data = {"streaks": {}, "analysis": {}, "insights": []}
    
    def analyze_retention_patterns(self):
        """Analyze user retention patterns and predict churn risk"""
        streaks = self.data.get("streaks", {})
        
        # Calculate retention signals
        retention_analysis = {
            "total_users": len(streaks),
            "active_streaks": sum(1 for s in streaks.values() if s["current"] > 0),
            "retention_rate": 0,
            "churn_risk": [],
            "momentum_users": [],
            "critical_period": []
        }
        
        if retention_analysis["total_users"] > 0:
            retention_analysis["retention_rate"] = (
                retention_analysis["active_streaks"] / retention_analysis["total_users"] * 100
            )
        
        # Identify users by streak stage
        for user, streak_data in streaks.items():
            current = streak_data["current"]
            
            if current == 0:
                retention_analysis["churn_risk"].append(user)
            elif current >= 3 and current < 7:
                retention_analysis["momentum_users"].append(user)
            elif current == 1 or current == 2:
                retention_analysis["critical_period"].append(user)
        
        return retention_analysis
    
    def predict_milestone_achievements(self):
        """Predict upcoming milestone achievements"""
        streaks = self.data.get("streaks", {})
        milestones = [3, 7, 14, 30, 100]
        
        predictions = {}
        for milestone in milestones:
            predictions[f"{milestone}_days"] = []
            
            for user, streak_data in streaks.items():
                current = streak_data["current"]
                days_to_milestone = milestone - current
                
                if 0 < days_to_milestone <= 3:  # Within 3 days of milestone
                    predictions[f"{milestone}_days"].append({
                        "user": user,
                        "current_streak": current,
                        "days_until": days_to_milestone,
                        "probability": self.calculate_achievement_probability(current, milestone)
                    })
        
        return predictions
    
    def calculate_achievement_probability(self, current_streak, target_milestone):
        """Calculate probability of reaching milestone based on current streak"""
        # Base probability on historical patterns (simplified model)
        if current_streak >= target_milestone * 0.8:
            return 0.9
        elif current_streak >= target_milestone * 0.6:
            return 0.7
        elif current_streak >= target_milestone * 0.4:
            return 0.5
        else:
            return 0.3
    
    def identify_engagement_patterns(self):
        """Identify patterns in user engagement"""
        streaks = self.data.get("streaks", {})
        
        patterns = {
            "consistency_champions": [],
            "comeback_candidates": [],
            "new_joiners": [],
            "streak_diversity": {}
        }
        
        # Group users by streak characteristics
        for user, streak_data in streaks.items():
            current = streak_data["current"]
            best = streak_data["best"]
            
            if current > 0 and current == best:
                patterns["new_joiners"].append(user)
            elif current > best * 0.8:
                patterns["consistency_champions"].append(user)
            elif current == 0 and best > 3:
                patterns["comeback_candidates"].append(user)
        
        # Calculate streak diversity
        all_streaks = [s["current"] for s in streaks.values()]
        if all_streaks:
            patterns["streak_diversity"] = {
                "range": max(all_streaks) - min(all_streaks),
                "std_dev": statistics.stdev(all_streaks) if len(all_streaks) > 1 else 0,
                "median": statistics.median(all_streaks)
            }
        
        return patterns
    
    def generate_coaching_insights(self):
        """Generate actionable coaching insights for the community"""
        retention = self.analyze_retention_patterns()
        milestones = self.predict_milestone_achievements()
        patterns = self.identify_engagement_patterns()
        
        insights = []
        
        # Retention insights
        if retention["retention_rate"] > 80:
            insights.append({
                "type": "success",
                "icon": "🎉",
                "title": "High Retention",
                "message": f"{retention['retention_rate']:.1f}% retention rate - excellent community health!"
            })
        
        # Critical period alerts
        if retention["critical_period"]:
            insights.append({
                "type": "alert",
                "icon": "⚠️",
                "title": "Critical Period",
                "message": f"{len(retention['critical_period'])} users in days 1-2 - highest churn risk period"
            })
        
        # Milestone opportunities
        upcoming_3_day = milestones.get("3_days", [])
        if upcoming_3_day:
            insights.append({
                "type": "opportunity", 
                "icon": "🌱",
                "title": "Milestone Alert",
                "message": f"{len(upcoming_3_day)} users approaching 3-day milestone - prepare celebrations!"
            })
        
        # Pattern insights
        if patterns["new_joiners"]:
            insights.append({
                "type": "pattern",
                "icon": "🚀", 
                "title": "New Member Energy",
                "message": f"{len(patterns['new_joiners'])} users starting fresh - perfect time for encouragement"
            })
        
        return insights
    
    def export_coaching_dashboard_data(self):
        """Export data for coaching dashboard visualization"""
        return {
            "timestamp": datetime.now().isoformat(),
            "retention_analysis": self.analyze_retention_patterns(),
            "milestone_predictions": self.predict_milestone_achievements(),
            "engagement_patterns": self.identify_engagement_patterns(),
            "coaching_insights": self.generate_coaching_insights(),
            "raw_data": self.data
        }

if __name__ == "__main__":
    analytics = EnhancedStreakAnalytics()
    dashboard_data = analytics.export_coaching_dashboard_data()
    
    print("🔥 Enhanced Streak Analytics Report")
    print("=" * 50)
    
    # Print coaching insights
    insights = dashboard_data["coaching_insights"]
    for insight in insights:
        print(f"{insight['icon']} {insight['title']}: {insight['message']}")
    
    # Print retention overview
    retention = dashboard_data["retention_analysis"]
    print(f"\n📊 Retention Overview:")
    print(f"   Active Users: {retention['active_streaks']}/{retention['total_users']}")
    print(f"   Retention Rate: {retention['retention_rate']:.1f}%")
    print(f"   Critical Period: {len(retention['critical_period'])} users")
    
    # Save enhanced data
    with open("enhanced_dashboard_data.json", "w") as f:
        json.dump(dashboard_data, f, indent=2)
    
    print(f"\n✅ Enhanced analytics data exported to enhanced_dashboard_data.json")