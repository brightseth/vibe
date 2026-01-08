#!/usr/bin/env python3
"""
🔮 Streak Prediction Engine - by @streaks-agent

Analyzes streak patterns and predicts sustainability
Provides proactive intervention suggestions to maintain engagement
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any
import statistics

class StreakPredictor:
    """Predicts streak sustainability and suggests interventions"""
    
    def __init__(self):
        self.users_data = self.load_streak_data()
        self.risk_factors = {
            'weekend_drop': 0.3,     # Higher risk on weekends
            'new_user': 0.4,         # New users have higher dropout
            'plateau_risk': 0.2,     # Risk increases after achieving milestone
            'competition_boost': -0.1 # Friendly competition reduces risk
        }
    
    def load_streak_data(self) -> Dict:
        """Load current streak data"""
        # Mock current data - in real system would load from memory/db
        return {
            "@demo_user": {
                "current_streak": 1,
                "best_streak": 1,
                "total_days": 1,
                "join_date": "2026-01-08",
                "last_active": "2026-01-08",
                "activity_pattern": ["active"]  # Recent 7 days
            },
            "@vibe_champion": {
                "current_streak": 1,
                "best_streak": 1,
                "total_days": 1,
                "join_date": "2026-01-08", 
                "last_active": "2026-01-08",
                "activity_pattern": ["active"]
            }
        }
    
    def calculate_risk_score(self, user_data: Dict) -> float:
        """Calculate risk of streak breaking (0=safe, 1=high risk)"""
        base_risk = 0.1  # Everyone has some base risk
        
        # New user factor
        days_since_join = (datetime.now() - datetime.fromisoformat(user_data["join_date"])).days
        if days_since_join < 7:
            base_risk += self.risk_factors['new_user']
        
        # Weekend factor (higher risk on Fri-Sun)
        today_weekday = datetime.now().weekday()  # 0=Monday, 6=Sunday
        if today_weekday >= 4:  # Friday, Saturday, Sunday
            base_risk += self.risk_factors['weekend_drop']
        
        # Streak length factor (slight plateau risk after milestones)
        if user_data["current_streak"] in [3, 7, 14]:  # Just hit milestone
            base_risk += self.risk_factors['plateau_risk']
        
        # Competition factor (having others reduces risk)
        active_users = len([u for u in self.users_data.values() if u["current_streak"] > 0])
        if active_users > 1:
            base_risk += self.risk_factors['competition_boost']
        
        return min(1.0, max(0.0, base_risk))
    
    def predict_streak_sustainability(self, username: str) -> Dict[str, Any]:
        """Predict how sustainable a user's streak is"""
        if username not in self.users_data:
            return {"error": "User not found"}
        
        user_data = self.users_data[username]
        risk_score = self.calculate_risk_score(user_data)
        
        # Calculate success probability for different timeframes
        predictions = {
            "next_day": max(0.1, 1 - risk_score),
            "next_3_days": max(0.05, (1 - risk_score) ** 3),
            "next_week": max(0.02, (1 - risk_score) ** 7),
            "next_month": max(0.01, (1 - risk_score) ** 30)
        }
        
        # Generate risk level
        if risk_score < 0.3:
            risk_level = "🟢 Low Risk"
        elif risk_score < 0.6:
            risk_level = "🟡 Medium Risk"
        else:
            risk_level = "🔴 High Risk"
        
        return {
            "username": username,
            "current_streak": user_data["current_streak"],
            "risk_score": round(risk_score, 3),
            "risk_level": risk_level,
            "predictions": {
                "tomorrow": f"{predictions['next_day']:.1%}",
                "3_days": f"{predictions['next_3_days']:.1%}",
                "week": f"{predictions['next_week']:.1%}",
                "month": f"{predictions['next_month']:.1%}"
            },
            "interventions": self.suggest_interventions(risk_score, user_data)
        }
    
    def suggest_interventions(self, risk_score: float, user_data: Dict) -> List[str]:
        """Suggest interventions based on risk level"""
        interventions = []
        
        if risk_score > 0.7:  # High risk
            interventions.extend([
                "🎯 Send milestone reminder DM",
                "🏆 Highlight next achievement (Early Bird in 2 days)",
                "👥 Connect with streak buddy for motivation",
                "⚡ Create mini-challenge for tomorrow"
            ])
        elif risk_score > 0.4:  # Medium risk
            interventions.extend([
                "📊 Share progress visualization",
                "🎉 Remind about upcoming celebration",
                "💪 Share community streak leaderboard"
            ])
        else:  # Low risk
            interventions.extend([
                "✨ Celebrate current momentum",
                "📈 Share streak insights",
                "🚀 Encourage bigger goals"
            ])
        
        return interventions
    
    def generate_predictions_report(self) -> str:
        """Generate comprehensive predictions report"""
        report = "🔮 **Streak Prediction Report** - " + datetime.now().strftime("%Y-%m-%d %H:%M") + "\n\n"
        
        all_predictions = []
        for username in self.users_data.keys():
            prediction = self.predict_streak_sustainability(username)
            all_predictions.append(prediction)
        
        # Overall health metrics
        avg_risk = statistics.mean([p["risk_score"] for p in all_predictions])
        high_risk_count = len([p for p in all_predictions if p["risk_score"] > 0.6])
        
        report += f"## 📊 Overall Health\n"
        report += f"- **Average Risk Score**: {avg_risk:.2f}\n"
        report += f"- **High Risk Users**: {high_risk_count}/{len(all_predictions)}\n"
        report += f"- **Community Momentum**: {'🚀 Strong' if avg_risk < 0.4 else '⚠️ Moderate' if avg_risk < 0.6 else '🔴 Needs Attention'}\n\n"
        
        # Individual predictions
        report += "## 👤 Individual Predictions\n\n"
        
        for pred in sorted(all_predictions, key=lambda x: x["risk_score"], reverse=True):
            report += f"### {pred['username']}\n"
            report += f"**Current Streak**: {pred['current_streak']} days\n"
            report += f"**Risk Level**: {pred['risk_level']} ({pred['risk_score']})\n\n"
            
            report += "**Success Probabilities**:\n"
            for timeframe, prob in pred['predictions'].items():
                report += f"- {timeframe.title()}: {prob}\n"
            
            if pred['interventions']:
                report += "\n**Suggested Interventions**:\n"
                for intervention in pred['interventions']:
                    report += f"- {intervention}\n"
            
            report += "\n---\n\n"
        
        # Action priorities
        report += "## 🎯 Action Priorities\n\n"
        
        high_risk_users = [p for p in all_predictions if p["risk_score"] > 0.6]
        medium_risk_users = [p for p in all_predictions if 0.4 <= p["risk_score"] <= 0.6]
        
        if high_risk_users:
            report += "### 🚨 Immediate Action Needed\n"
            for user in high_risk_users:
                report += f"- **{user['username']}**: {user['interventions'][0]}\n"
            report += "\n"
        
        if medium_risk_users:
            report += "### ⚠️ Proactive Support\n"
            for user in medium_risk_users:
                report += f"- **{user['username']}**: {user['interventions'][0]}\n"
            report += "\n"
        
        # Community interventions
        report += "### 🌟 Community Interventions\n"
        report += "- Create daily check-in thread\n"
        report += "- Share streak leaderboard\n"
        report += "- Launch weekend streak challenge\n"
        report += "- Celebrate upcoming milestones\n\n"
        
        report += "---\n*Generated by @streaks-agent 🤖*"
        
        return report

def main():
    """Run streak prediction analysis"""
    predictor = StreakPredictor()
    
    print("🔮 Running Streak Prediction Analysis...")
    print("=" * 50)
    
    # Generate individual predictions
    for username in predictor.users_data.keys():
        prediction = predictor.predict_streak_sustainability(username)
        print(f"\n{prediction['username']} ({prediction['current_streak']}-day streak)")
        print(f"Risk: {prediction['risk_level']} ({prediction['risk_score']})")
        print(f"Tomorrow success: {prediction['predictions']['tomorrow']}")
        
        if prediction['interventions']:
            print(f"Top intervention: {prediction['interventions'][0]}")
    
    print("\n" + "=" * 50)
    print("📊 Full report generated: streak_prediction_report.md")
    
    # Save full report
    report = predictor.generate_predictions_report()
    with open("streak_prediction_report.md", "w") as f:
        f.write(report)
    
    print("✅ Streak prediction analysis complete!")

if __name__ == "__main__":
    main()