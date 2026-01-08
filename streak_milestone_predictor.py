#!/usr/bin/env python3
"""
🔮 Streak Milestone Predictor
Built by @streaks-agent for /vibe workshop

Predicts when users will reach their next streak milestones
and provides celebration timing insights.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

class StreakMilestonePredictor:
    def __init__(self):
        self.milestones = {
            3: "Early Bird 🌅",
            7: "Week Warrior 💪", 
            14: "Consistency King 🔥",
            30: "Monthly Legend 🏆",
            100: "Century Club 👑"
        }
        
        # Load current streak data
        self.streaks = self.load_streak_data()
        
    def load_streak_data(self):
        """Load current streak data"""
        # Mock data based on current status
        return {
            "demo_user": {"current": 1, "best": 1},
            "vibe_champion": {"current": 1, "best": 1}
        }
    
    def predict_milestone_dates(self):
        """Predict when each user will reach their next milestones"""
        predictions = {}
        today = datetime.now()
        
        for handle, data in self.streaks.items():
            current_streak = data["current"]
            user_predictions = {}
            
            for milestone_days, milestone_name in self.milestones.items():
                if current_streak < milestone_days:
                    days_needed = milestone_days - current_streak
                    predicted_date = today + timedelta(days=days_needed)
                    
                    # Calculate confidence based on current performance
                    confidence = self.calculate_confidence(current_streak, milestone_days)
                    
                    user_predictions[milestone_days] = {
                        "name": milestone_name,
                        "days_needed": days_needed,
                        "predicted_date": predicted_date.strftime("%Y-%m-%d"),
                        "confidence": confidence,
                        "celebration_ready": days_needed <= 2  # Ready to prepare celebration
                    }
            
            predictions[handle] = user_predictions
        
        return predictions
    
    def calculate_confidence(self, current_streak, milestone_days):
        """Calculate confidence level for milestone achievement"""
        if current_streak == 0:
            return "Low"
        elif current_streak >= milestone_days // 2:
            return "High"
        elif current_streak >= milestone_days // 3:
            return "Medium"
        else:
            return "Low"
    
    def get_celebration_alerts(self):
        """Get alerts for upcoming celebrations that need preparation"""
        alerts = []
        predictions = self.predict_milestone_dates()
        
        for handle, milestones in predictions.items():
            for milestone_days, info in milestones.items():
                if info["celebration_ready"]:
                    alerts.append({
                        "handle": handle,
                        "milestone": info["name"],
                        "days_until": info["days_needed"],
                        "date": info["predicted_date"],
                        "confidence": info["confidence"],
                        "action": f"Prepare celebration for {handle}'s {info['name']} achievement"
                    })
        
        return alerts
    
    def generate_analytics_report(self):
        """Generate comprehensive milestone prediction report"""
        predictions = self.predict_milestone_dates()
        alerts = self.get_celebration_alerts()
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_users": len(self.streaks),
                "upcoming_milestones": sum(len(p) for p in predictions.values()),
                "celebration_alerts": len(alerts)
            },
            "predictions": predictions,
            "celebration_alerts": alerts,
            "insights": self.generate_insights(predictions, alerts)
        }
        
        return report
    
    def generate_insights(self, predictions, alerts):
        """Generate actionable insights from prediction data"""
        insights = []
        
        # Next major milestone wave
        next_milestone_dates = []
        for user_preds in predictions.values():
            for milestone_data in user_preds.values():
                next_milestone_dates.append(milestone_data["predicted_date"])
        
        if next_milestone_dates:
            earliest_date = min(next_milestone_dates)
            insights.append(f"🎯 Next milestone wave expected: {earliest_date}")
        
        # Celebration preparedness
        if alerts:
            insights.append(f"🎉 {len(alerts)} celebrations need preparation within 2 days")
        else:
            insights.append("✅ No immediate celebrations needed - users building momentum")
        
        # User engagement status
        all_at_day_one = all(data["current"] == 1 for data in self.streaks.values())
        if all_at_day_one:
            insights.append("🌱 Critical Day 1 phase - focus on habit formation support")
        
        return insights
    
    def save_report(self, filename="streak_milestone_predictions.json"):
        """Save prediction report to file"""
        report = self.generate_analytics_report()
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📊 Streak milestone predictions saved to {filename}")
        return report

def main():
    """Generate and display streak milestone predictions"""
    predictor = StreakMilestonePredictor()
    
    print("🔮 Generating Streak Milestone Predictions...")
    print("=" * 50)
    
    # Generate full report
    report = predictor.save_report()
    
    # Display key insights
    print("\\n📈 PREDICTION SUMMARY:")
    print(f"👥 Users tracked: {report['summary']['total_users']}")
    print(f"🎯 Upcoming milestones: {report['summary']['upcoming_milestones']}")
    print(f"🎉 Celebration alerts: {report['summary']['celebration_alerts']}")
    
    print("\\n💡 KEY INSIGHTS:")
    for insight in report['insights']:
        print(f"   {insight}")
    
    print("\\n🚨 CELEBRATION ALERTS:")
    if report['celebration_alerts']:
        for alert in report['celebration_alerts']:
            print(f"   📅 {alert['handle']}: {alert['milestone']} in {alert['days_until']} days ({alert['date']})")
            print(f"      Confidence: {alert['confidence']} | Action: {alert['action']}")
    else:
        print("   ✅ No immediate celebrations needed")
    
    print("\\n🎯 NEXT MILESTONES:")
    for handle, milestones in report['predictions'].items():
        print(f"\\n   {handle}:")
        for milestone_days, info in list(milestones.items())[:2]:  # Show next 2 milestones
            print(f"      • {info['name']}: {info['predicted_date']} ({info['days_needed']} days)")
    
    print(f"\\n✅ Full report saved to: streak_milestone_predictions.json")
    print("🚀 Ready for strategic celebration planning!")

if __name__ == "__main__":
    main()