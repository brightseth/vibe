#!/usr/bin/env python3
"""
🔮 Streak Engagement Predictor
Advanced analytics to predict streak success and identify users who need encouragement
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import statistics
import math

class StreakEngagementPredictor:
    def __init__(self):
        self.risk_factors = {
            "new_user_risk": 0.3,      # First few days are critical
            "weekend_gap_risk": 0.2,    # Weekend activity drops
            "plateau_risk": 0.25,       # Stagnation at certain milestones
            "comeback_difficulty": 0.4, # Coming back after a break
            "milestone_pressure": 0.15  # Pressure before big milestones
        }
        
        self.success_indicators = {
            "consistent_timing": 0.2,   # Regular activity patterns
            "milestone_momentum": 0.25, # Accelerating before milestones
            "badge_motivation": 0.2,    # Recent badge achievements
            "peer_influence": 0.15,     # Active community engagement
            "streak_velocity": 0.2      # Improving streak performance
        }
        
    def analyze_streak_pattern(self, user_data: Dict) -> Dict:
        """Analyze a user's streak pattern for prediction insights"""
        current_streak = user_data.get("current_streak", 0)
        best_streak = user_data.get("best_streak", 0)
        handle = user_data.get("handle", "unknown")
        
        # Basic metrics
        streak_efficiency = (current_streak / best_streak) if best_streak > 0 else 1.0
        is_personal_best = current_streak == best_streak
        
        # Risk assessment
        risk_score = self.calculate_risk_score(current_streak, best_streak)
        
        # Success probability
        success_score = self.calculate_success_probability(current_streak, streak_efficiency)
        
        # Next milestone analysis
        next_milestone = self.get_next_milestone(current_streak)
        
        return {
            "handle": handle,
            "current_streak": current_streak,
            "best_streak": best_streak,
            "streak_efficiency": streak_efficiency,
            "is_personal_best": is_personal_best,
            "risk_score": risk_score,
            "success_probability": success_score,
            "next_milestone": next_milestone,
            "recommendation": self.generate_recommendation(risk_score, success_score, current_streak),
            "engagement_strategy": self.suggest_engagement_strategy(risk_score, current_streak)
        }
    
    def calculate_risk_score(self, current_streak: int, best_streak: int) -> float:
        """Calculate risk of streak breaking (0.0 = low risk, 1.0 = high risk)"""
        risk_components = []
        
        # New user risk - first few days are critical
        if current_streak <= 3:
            risk_components.append(self.risk_factors["new_user_risk"] * (1 - current_streak/3))
        
        # Plateau risk - certain streak lengths have higher drop-off
        plateau_points = [7, 14, 30]  # Common drop-off points
        for plateau in plateau_points:
            if abs(current_streak - plateau) <= 1:
                risk_components.append(self.risk_factors["plateau_risk"])
                break
        
        # Performance gap risk - if far from personal best
        if best_streak > current_streak:
            performance_gap = (best_streak - current_streak) / best_streak
            risk_components.append(self.risk_factors["comeback_difficulty"] * performance_gap)
        
        # Milestone pressure - approaching significant milestones
        next_milestone_days = self.days_to_next_milestone(current_streak)
        if next_milestone_days <= 2:
            risk_components.append(self.risk_factors["milestone_pressure"])
        
        return min(sum(risk_components), 1.0)  # Cap at 1.0
    
    def calculate_success_probability(self, current_streak: int, streak_efficiency: float) -> float:
        """Calculate probability of streak continuation (0.0 = unlikely, 1.0 = very likely)"""
        success_components = []
        
        # Streak momentum - longer streaks tend to continue
        momentum_score = min(current_streak / 30, 1.0)  # Caps at 30 days
        success_components.append(self.success_indicators["streak_velocity"] * momentum_score)
        
        # Efficiency bonus - performing close to personal best
        success_components.append(self.success_indicators["consistent_timing"] * streak_efficiency)
        
        # Milestone approach momentum - users often push through to milestones
        next_milestone_days = self.days_to_next_milestone(current_streak)
        if 0 < next_milestone_days <= 5:
            milestone_momentum = (6 - next_milestone_days) / 5
            success_components.append(self.success_indicators["milestone_momentum"] * milestone_momentum)
        
        # Base probability - everyone has some chance
        base_probability = 0.2
        
        return min(base_probability + sum(success_components), 1.0)
    
    def get_next_milestone(self, current_streak: int) -> Optional[Dict]:
        """Get next milestone information"""
        milestones = {
            3: "Getting started! 🌱",
            7: "Week Warrior 💪", 
            14: "Consistency King 🔥",
            30: "Monthly Legend 🏆",
            100: "Century Club 👑"
        }
        
        for threshold, name in milestones.items():
            if current_streak < threshold:
                return {
                    "threshold": threshold,
                    "name": name,
                    "days_remaining": threshold - current_streak,
                    "progress": (current_streak / threshold) * 100
                }
        
        return None
    
    def days_to_next_milestone(self, current_streak: int) -> int:
        """Calculate days until next milestone"""
        next_milestone = self.get_next_milestone(current_streak)
        return next_milestone["days_remaining"] if next_milestone else 999
    
    def generate_recommendation(self, risk_score: float, success_score: float, current_streak: int) -> str:
        """Generate recommendation based on risk and success scores"""
        if risk_score > 0.6:
            if current_streak <= 3:
                return "🚨 HIGH RISK: New user needs immediate encouragement and support"
            else:
                return "⚠️ HIGH RISK: User showing signs of potential streak break - needs intervention"
        elif risk_score > 0.4:
            return "🔶 MODERATE RISK: Monitor closely and provide gentle encouragement"
        elif success_score > 0.7:
            return "🚀 HIGH SUCCESS: User is thriving - celebrate their momentum!"
        elif success_score > 0.5:
            return "✅ STABLE: User is doing well - continue regular support"
        else:
            return "🎯 OPPORTUNITY: User has potential - targeted motivation could help"
    
    def suggest_engagement_strategy(self, risk_score: float, current_streak: int) -> List[str]:
        """Suggest specific engagement strategies"""
        strategies = []
        
        if risk_score > 0.6:
            strategies.extend([
                "Send immediate encouragement DM",
                "Share next milestone progress",
                "Highlight community achievements",
                "Offer streak recovery tips"
            ])
        elif risk_score > 0.4:
            strategies.extend([
                "Check in with gentle reminder",
                "Share motivational milestone info",
                "Highlight peer achievements"
            ])
        elif current_streak >= 7:
            strategies.extend([
                "Celebrate consistency achievement",
                "Share streak leaderboard position",
                "Encourage milestone push"
            ])
        else:
            strategies.extend([
                "Continue regular monitoring",
                "Celebrate small wins",
                "Share community updates"
            ])
        
        return strategies
    
    def predict_cohort_engagement(self, users_data: List[Dict]) -> Dict:
        """Analyze entire user cohort for engagement predictions"""
        predictions = []
        
        for user_data in users_data:
            prediction = self.analyze_streak_pattern(user_data)
            predictions.append(prediction)
        
        # Cohort insights
        risk_scores = [p["risk_score"] for p in predictions]
        success_scores = [p["success_probability"] for p in predictions]
        
        cohort_analysis = {
            "total_users": len(predictions),
            "high_risk_users": len([p for p in predictions if p["risk_score"] > 0.6]),
            "stable_users": len([p for p in predictions if 0.3 <= p["risk_score"] <= 0.6]),
            "thriving_users": len([p for p in predictions if p["success_probability"] > 0.7]),
            "avg_risk_score": statistics.mean(risk_scores) if risk_scores else 0,
            "avg_success_probability": statistics.mean(success_scores) if success_scores else 0,
            "predictions": predictions,
            "immediate_action_needed": [p for p in predictions if p["risk_score"] > 0.6],
            "celebration_opportunities": [p for p in predictions if p["success_probability"] > 0.7],
        }
        
        return cohort_analysis
    
    def generate_engagement_report(self, cohort_analysis: Dict) -> str:
        """Generate human-readable engagement report"""
        total = cohort_analysis["total_users"]
        high_risk = cohort_analysis["high_risk_users"]
        thriving = cohort_analysis["thriving_users"]
        stable = cohort_analysis["stable_users"]
        
        report = f"""
🔮 STREAK ENGAGEMENT PREDICTION REPORT
{'=' * 45}

📊 COHORT OVERVIEW
   Total Users: {total}
   High Risk: {high_risk} users ({(high_risk/total)*100:.1f}%)
   Stable: {stable} users ({(stable/total)*100:.1f}%)
   Thriving: {thriving} users ({(thriving/total)*100:.1f}%)

📈 ENGAGEMENT HEALTH
   Average Risk Score: {cohort_analysis['avg_risk_score']:.2f}/1.0
   Average Success Probability: {cohort_analysis['avg_success_probability']:.2f}/1.0

🚨 IMMEDIATE ACTION NEEDED
"""
        
        immediate_actions = cohort_analysis["immediate_action_needed"]
        if immediate_actions:
            for user in immediate_actions:
                report += f"   {user['handle']}: {user['recommendation']}\n"
        else:
            report += "   ✅ No users require immediate intervention\n"
        
        report += "\n🎉 CELEBRATION OPPORTUNITIES\n"
        celebrations = cohort_analysis["celebration_opportunities"]
        if celebrations:
            for user in celebrations:
                report += f"   {user['handle']}: {user['recommendation']}\n"
        else:
            report += "   📈 Focus on building momentum for current users\n"
        
        report += "\n🎯 DETAILED PREDICTIONS\n"
        for prediction in cohort_analysis["predictions"]:
            report += f"""
   {prediction['handle']}:
     Current Streak: {prediction['current_streak']} days
     Risk Score: {prediction['risk_score']:.2f}/1.0
     Success Probability: {prediction['success_probability']:.2f}/1.0
     Next Milestone: {prediction['next_milestone']['name'] if prediction['next_milestone'] else 'All achieved!'}
     Recommendation: {prediction['recommendation']}
"""
        
        return report

def main():
    """Test the engagement predictor with current data"""
    predictor = StreakEngagementPredictor()
    
    # Current /vibe workshop users
    test_users = [
        {
            "handle": "@demo_user",
            "current_streak": 1,
            "best_streak": 1
        },
        {
            "handle": "@vibe_champion",
            "current_streak": 1,
            "best_streak": 1
        }
    ]
    
    print("🔮 STREAK ENGAGEMENT PREDICTOR")
    print("=" * 45)
    
    # Analyze cohort
    cohort_analysis = predictor.predict_cohort_engagement(test_users)
    
    # Generate and print report
    report = predictor.generate_engagement_report(cohort_analysis)
    print(report)
    
    # Export analysis for @streaks-agent
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"engagement_prediction_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "predictor_version": "1.0",
            "cohort_analysis": cohort_analysis,
            "summary": {
                "total_users": cohort_analysis["total_users"],
                "immediate_actions": len(cohort_analysis["immediate_action_needed"]),
                "celebration_opportunities": len(cohort_analysis["celebration_opportunities"]),
                "avg_risk": cohort_analysis["avg_risk_score"],
                "avg_success": cohort_analysis["avg_success_probability"]
            }
        }, f, indent=2)
    
    print(f"\n💾 Analysis exported to: {filename}")
    print(f"🚀 Engagement predictor ready for @streaks-agent integration!")

if __name__ == "__main__":
    main()