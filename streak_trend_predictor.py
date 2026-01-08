#!/usr/bin/env python3
"""
🔮 Streak Trend Predictor
Advanced analytics for predicting streak patterns and engagement drops.
Built by @streaks-agent for /vibe workshop gamification.
"""

import json
from datetime import datetime, timedelta
import math

class StreakTrendPredictor:
    def __init__(self):
        self.critical_days = [2, 7, 14, 30]  # Days where users typically drop off
        self.load_data()
    
    def load_data(self):
        """Load current streak and achievement data"""
        try:
            # Load streak data (simulated from memory state)
            self.users = {
                "@demo_user": {"current": 1, "best": 1, "badges": ["First Day"]},
                "@vibe_champion": {"current": 1, "best": 1, "badges": ["First Day"]}
            }
            
            # Load achievement milestones
            self.milestones = {
                3: {"name": "Early Bird 🌅", "difficulty": "easy"},
                7: {"name": "Week Warrior 💪", "difficulty": "medium"},
                14: {"name": "Consistency King 🔥", "difficulty": "hard"},
                30: {"name": "Monthly Legend 🏆", "difficulty": "expert"},
                100: {"name": "Century Club 👑", "difficulty": "legendary"}
            }
            
        except Exception as e:
            print(f"Data loading error: {e}")
            self.users = {}
    
    def calculate_dropout_risk(self, user_handle):
        """Calculate risk of user dropping their streak"""
        user = self.users.get(user_handle, {})
        current_streak = user.get("current", 0)
        
        if current_streak == 0:
            return {"risk": "inactive", "score": 100, "reason": "Already dropped"}
        
        # Risk factors
        risk_score = 0
        risk_reasons = []
        
        # Day 2 is highest risk
        if current_streak == 1:
            risk_score += 60
            risk_reasons.append("Critical Day 1→2 transition")
        
        # Approaching critical days
        for critical_day in self.critical_days:
            days_to_critical = critical_day - current_streak
            if 0 < days_to_critical <= 2:
                risk_score += 30 - (days_to_critical * 10)
                risk_reasons.append(f"Approaching Day {critical_day} barrier")
        
        # First week is vulnerable
        if 1 <= current_streak <= 7:
            risk_score += 20
            risk_reasons.append("Building initial habit")
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = "high"
        elif risk_score >= 40:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        return {
            "risk": risk_level,
            "score": min(risk_score, 100),
            "reasons": risk_reasons,
            "current_streak": current_streak
        }
    
    def predict_next_milestone(self, user_handle):
        """Predict when user will reach next milestone"""
        user = self.users.get(user_handle, {})
        current_streak = user.get("current", 0)
        
        # Find next milestone
        next_milestone = None
        for days, info in self.milestones.items():
            if days > current_streak:
                next_milestone = {"days": days, **info}
                break
        
        if not next_milestone:
            return {"message": "All major milestones achieved! 🎉"}
        
        days_needed = next_milestone["days"] - current_streak
        
        # Predict probability based on current pattern
        success_probability = self.calculate_success_probability(current_streak, days_needed)
        
        # Calculate target date (assuming daily engagement)
        target_date = datetime.now() + timedelta(days=days_needed)
        
        return {
            "milestone": next_milestone["name"],
            "days_needed": days_needed,
            "current_progress": f"{current_streak}/{next_milestone['days']}",
            "progress_percent": round((current_streak / next_milestone['days']) * 100),
            "success_probability": success_probability,
            "difficulty": next_milestone["difficulty"],
            "target_date": target_date.strftime("%B %d"),
            "encouragement": self.get_encouragement_message(days_needed, success_probability)
        }
    
    def calculate_success_probability(self, current_streak, days_needed):
        """Calculate probability of reaching next milestone"""
        # Base probability starts at 50%
        base_prob = 50
        
        # Existing streak momentum (longer streaks have higher success rates)
        momentum_bonus = min(current_streak * 5, 30)
        
        # Days needed penalty (longer waits = lower probability)
        distance_penalty = min(days_needed * 2, 40)
        
        # Critical day penalties
        critical_penalties = 0
        for critical_day in self.critical_days:
            if current_streak < critical_day <= current_streak + days_needed:
                critical_penalties += 15
        
        probability = base_prob + momentum_bonus - distance_penalty - critical_penalties
        return max(5, min(95, probability))  # Keep between 5-95%
    
    def get_encouragement_message(self, days_needed, success_probability):
        """Get personalized encouragement based on prediction"""
        if days_needed <= 2:
            return f"So close! Just {days_needed} more day{'s' if days_needed > 1 else ''}! 🎯"
        elif success_probability >= 70:
            return "You've got great momentum! Keep it up! 🚀"
        elif success_probability >= 40:
            return "Building habits takes time. You're doing great! 💪"
        else:
            return "Focus on today. One day at a time! 🌱"
    
    def generate_community_insights(self):
        """Generate insights about overall community trends"""
        active_users = [u for u, data in self.users.items() if data.get("current", 0) > 0]
        total_users = len(self.users)
        
        # Risk distribution
        risk_distribution = {"high": 0, "medium": 0, "low": 0, "inactive": 0}
        critical_transitions = []
        
        for user in self.users:
            risk = self.calculate_dropout_risk(user)
            risk_distribution[risk["risk"]] += 1
            
            if risk["risk"] == "high" and risk["score"] >= 60:
                critical_transitions.append({
                    "user": user,
                    "current_streak": risk["current_streak"],
                    "reasons": risk["reasons"]
                })
        
        # Community health score
        health_components = {
            "active_users": (len(active_users) / total_users) * 30,
            "low_risk_users": (risk_distribution["low"] / total_users) * 25,
            "streak_momentum": min(sum(data.get("current", 0) for data in self.users.values()) * 2, 20),
            "milestone_proximity": self.calculate_milestone_proximity_bonus()
        }
        
        community_health = sum(health_components.values())
        
        return {
            "community_health": round(community_health),
            "health_components": {k: round(v) for k, v in health_components.items()},
            "active_users": len(active_users),
            "total_users": total_users,
            "risk_distribution": risk_distribution,
            "critical_transitions": critical_transitions,
            "recommendations": self.generate_recommendations(risk_distribution, critical_transitions)
        }
    
    def calculate_milestone_proximity_bonus(self):
        """Bonus points for users close to milestones"""
        bonus = 0
        for user, data in self.users.items():
            current = data.get("current", 0)
            for milestone_day in self.milestones.keys():
                if milestone_day - current <= 2:
                    bonus += 5
        return min(bonus, 25)
    
    def generate_recommendations(self, risk_dist, critical_transitions):
        """Generate actionable recommendations for @streaks-agent"""
        recommendations = []
        
        if critical_transitions:
            recommendations.append({
                "priority": "HIGH",
                "action": "Send encouraging DMs to users in critical transitions",
                "users": [t["user"] for t in critical_transitions],
                "reason": "Day 2 transition is highest dropout risk period"
            })
        
        if risk_dist["high"] > 0:
            recommendations.append({
                "priority": "MEDIUM", 
                "action": "Increase celebration frequency for high-risk users",
                "reason": "Extra recognition can prevent dropouts"
            })
        
        if risk_dist["inactive"] > risk_dist["low"]:
            recommendations.append({
                "priority": "MEDIUM",
                "action": "Design comeback campaigns for inactive users",
                "reason": "More inactive than active users indicates engagement issues"
            })
        
        return recommendations
    
    def generate_analytics_report(self):
        """Generate comprehensive analytics report"""
        report = {
            "generated_at": datetime.now().isoformat(),
            "users": {},
            "community": self.generate_community_insights(),
            "predictions": {}
        }
        
        # Per-user analysis
        for user in self.users:
            risk = self.calculate_dropout_risk(user)
            milestone = self.predict_next_milestone(user)
            
            report["users"][user] = {
                "current_streak": self.users[user].get("current", 0),
                "dropout_risk": risk,
                "next_milestone": milestone
            }
        
        # Community predictions
        report["predictions"] = {
            "next_24h_dropouts": len([u for u in self.users if self.calculate_dropout_risk(u)["score"] >= 60]),
            "next_milestone_achievements": len([u for u in self.users if self.predict_next_milestone(u).get("days_needed", 99) <= 2]),
            "week_outlook": self.predict_week_outlook()
        }
        
        return report
    
    def predict_week_outlook(self):
        """Predict next week's engagement trends"""
        current_active = len([u for u, d in self.users.items() if d.get("current", 0) > 0])
        
        # Simple prediction based on current risk levels
        high_risk = len([u for u in self.users if self.calculate_dropout_risk(u)["risk"] == "high"])
        
        predicted_active = max(1, current_active - (high_risk * 0.6))  # 60% of high-risk users may drop
        
        if predicted_active >= current_active:
            outlook = "stable"
        elif predicted_active >= current_active * 0.8:
            outlook = "slight_decline"  
        else:
            outlook = "significant_decline"
        
        return {
            "current_active": current_active,
            "predicted_active": round(predicted_active),
            "outlook": outlook,
            "confidence": "medium"
        }

def main():
    """Generate and display trend prediction analytics"""
    predictor = StreakTrendPredictor()
    
    print("🔮 STREAK TREND PREDICTOR")
    print("=" * 50)
    
    # Generate full report
    report = predictor.generate_analytics_report()
    
    print(f"\n📊 COMMUNITY HEALTH: {report['community']['community_health']}/100")
    
    print(f"\n⚠️ CRITICAL USERS (High Dropout Risk):")
    for user, data in report["users"].items():
        if data["dropout_risk"]["risk"] == "high":
            risk = data["dropout_risk"]
            print(f"  {user}: {risk['score']}% risk - {', '.join(risk['reasons'])}")
    
    print(f"\n🎯 NEXT MILESTONES:")
    for user, data in report["users"].items():
        if "days_needed" in data["next_milestone"]:
            milestone = data["next_milestone"]
            print(f"  {user}: {milestone['milestone']} in {milestone['days_needed']} days ({milestone['success_probability']}% chance)")
    
    print(f"\n🔮 PREDICTIONS:")
    preds = report["predictions"]
    print(f"  Next 24h dropouts: {preds['next_24h_dropouts']} users")
    print(f"  Next milestone achievements: {preds['next_milestone_achievements']} users")
    print(f"  Week outlook: {preds['week_outlook']['outlook']} ({preds['week_outlook']['confidence']} confidence)")
    
    print(f"\n💡 RECOMMENDATIONS:")
    for rec in report["community"]["recommendations"]:
        print(f"  [{rec['priority']}] {rec['action']}")
        print(f"    Reason: {rec['reason']}")
    
    # Save report
    with open("streak_trend_predictions.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n📁 Full report saved to: streak_trend_predictions.json")

if __name__ == "__main__":
    main()