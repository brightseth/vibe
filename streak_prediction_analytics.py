#!/usr/bin/env python3
"""
Streak Prediction Analytics for @streaks-agent
Advanced analytics to predict streak continuation probability
"""

import json
from datetime import datetime, timedelta
import math

class StreakPredictionAnalytics:
    def __init__(self):
        self.streaks_data = {
            "@demo_user": {"current": 1, "best": 1},
            "@vibe_champion": {"current": 1, "best": 1}
        }
        
        self.achievements_data = self.load_achievements()
        
        # Critical transition periods based on behavioral research
        self.critical_periods = {
            1: 0.65,  # Day 1→2: 65% retention (novelty wears off)
            2: 0.75,  # Day 2→3: 75% retention (commitment forming)
            3: 0.85,  # Day 3→4: 85% retention (early habit)
            7: 0.90,  # Week mark: 90% retention (established pattern)
            14: 0.92, # Two weeks: 92% retention (strong habit)
            21: 0.95, # Three weeks: 95% retention (habit locked in)
            30: 0.97  # Month: 97% retention (lifestyle change)
        }
    
    def load_achievements(self):
        """Load current achievements data"""
        try:
            with open('achievements.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"user_achievements": {}}
    
    def calculate_continuation_probability(self, handle):
        """Calculate probability user will continue their streak"""
        user_data = self.streaks_data.get(handle, {})
        current_streak = user_data.get("current", 0)
        best_streak = user_data.get("best", 0)
        
        if current_streak == 0:
            return 0.0
        
        # Base probability from research data
        base_prob = self.get_base_probability(current_streak)
        
        # Modifiers based on user patterns
        modifiers = self.calculate_probability_modifiers(handle, current_streak, best_streak)
        
        # Calculate final probability
        final_prob = base_prob * modifiers["achievement_boost"] * modifiers["personal_best_factor"]
        
        return min(0.98, final_prob)  # Cap at 98% (never 100% certain)
    
    def get_base_probability(self, current_streak):
        """Get base continuation probability based on current streak length"""
        # Find the closest critical period
        for days in sorted(self.critical_periods.keys(), reverse=True):
            if current_streak >= days:
                return self.critical_periods[days]
        
        return 0.5  # Default for new users
    
    def calculate_probability_modifiers(self, handle, current_streak, best_streak):
        """Calculate probability modifiers based on user behavior"""
        modifiers = {
            "achievement_boost": 1.0,
            "personal_best_factor": 1.0,
            "consistency_factor": 1.0
        }
        
        # Achievement boost - badges increase commitment
        user_badges = self.achievements_data.get("user_achievements", {}).get(handle.replace("@", ""), [])
        badge_count = len(user_badges)
        
        if badge_count > 0:
            modifiers["achievement_boost"] = 1.0 + (badge_count * 0.05)  # 5% boost per badge
        
        # Personal best factor - exceeding previous best is motivating
        if current_streak >= best_streak:
            modifiers["personal_best_factor"] = 1.1  # 10% boost for personal record
        elif current_streak > (best_streak * 0.8):
            modifiers["personal_best_factor"] = 1.05  # 5% boost for approaching record
        
        return modifiers
    
    def predict_next_milestones(self, handle):
        """Predict when user will likely reach next milestones"""
        user_data = self.streaks_data.get(handle, {})
        current_streak = user_data.get("current", 0)
        continuation_prob = self.calculate_continuation_probability(handle)
        
        milestones = [3, 7, 14, 21, 30, 60, 100]
        predictions = []
        
        for milestone in milestones:
            if current_streak >= milestone:
                continue  # Already achieved
            
            days_needed = milestone - current_streak
            
            # Calculate probability of reaching this milestone
            milestone_prob = continuation_prob ** days_needed
            
            # Estimate date if they maintain the streak
            estimated_date = datetime.now() + timedelta(days=days_needed)
            
            # Risk assessment
            risk_level = "low" if milestone_prob > 0.8 else "medium" if milestone_prob > 0.6 else "high"
            
            predictions.append({
                "milestone": milestone,
                "milestone_name": self.get_milestone_name(milestone),
                "days_needed": days_needed,
                "probability": round(milestone_prob, 3),
                "estimated_date": estimated_date.strftime("%Y-%m-%d"),
                "risk_level": risk_level
            })
        
        return predictions
    
    def get_milestone_name(self, days):
        """Get milestone name for given day count"""
        milestone_names = {
            3: "Early Bird 🌅",
            7: "Week Warrior 💪",
            14: "Consistency King 🔥", 
            21: "Three Week Champion 🎯",
            30: "Monthly Legend 🏆",
            60: "Two Month Hero 💎",
            100: "Century Club 👑"
        }
        return milestone_names.get(days, f"{days}-Day Milestone")
    
    def generate_engagement_recommendations(self, handle):
        """Generate personalized engagement recommendations"""
        user_data = self.streaks_data.get(handle, {})
        current_streak = user_data.get("current", 0)
        continuation_prob = self.calculate_continuation_probability(handle)
        next_milestones = self.predict_next_milestones(handle)
        
        recommendations = []
        
        # Critical period warnings
        if current_streak in [1, 2]:
            recommendations.append({
                "type": "critical_support",
                "message": f"Day {current_streak} is crucial! Small consistent action today builds tomorrow's habit.",
                "urgency": "high"
            })
        
        # Milestone proximity encouragement
        next_milestone = next_milestones[0] if next_milestones else None
        if next_milestone and next_milestone["days_needed"] <= 3:
            recommendations.append({
                "type": "milestone_proximity",
                "message": f"Only {next_milestone['days_needed']} days until {next_milestone['milestone_name']}! You're so close!",
                "urgency": "medium"
            })
        
        # Low probability support
        if continuation_prob < 0.7:
            recommendations.append({
                "type": "motivation_boost",
                "message": "Remember: progress, not perfection. Every day builds your streak foundation.",
                "urgency": "medium"
            })
        
        # Achievement celebration prep
        if next_milestone and next_milestone["days_needed"] == 1:
            recommendations.append({
                "type": "achievement_prep",
                "message": f"Tomorrow's the day! {next_milestone['milestone_name']} achievement within reach!",
                "urgency": "high"
            })
        
        return recommendations
    
    def analyze_community_retention(self):
        """Analyze community-wide retention patterns"""
        if not self.streaks_data:
            return {"health_score": 0, "insights": []}
        
        total_users = len(self.streaks_data)
        active_users = len([user for user, data in self.streaks_data.items() if data["current"] > 0])
        
        # Calculate average continuation probability
        total_prob = sum(self.calculate_continuation_probability(handle) for handle in self.streaks_data.keys())
        avg_continuation = total_prob / total_users if total_users > 0 else 0
        
        # Community health score (0-100)
        health_score = int(avg_continuation * 100)
        
        # Generate insights
        insights = []
        
        if health_score < 50:
            insights.append("🚨 Community engagement at risk - intensive support needed")
        elif health_score < 70:
            insights.append("⚠️ Community needs encouragement - target critical period users")
        elif health_score < 85:
            insights.append("✅ Community doing well - maintain momentum")
        else:
            insights.append("🚀 Community thriving - excellent retention patterns")
        
        # Identify at-risk users
        at_risk_users = []
        for handle in self.streaks_data.keys():
            prob = self.calculate_continuation_probability(handle)
            if prob < 0.7:
                at_risk_users.append(handle)
        
        if at_risk_users:
            insights.append(f"🎯 Focus support on: {', '.join(at_risk_users)}")
        
        return {
            "health_score": health_score,
            "avg_continuation_probability": round(avg_continuation, 3),
            "active_retention_rate": round((active_users / total_users) * 100) if total_users > 0 else 0,
            "at_risk_users": at_risk_users,
            "insights": insights
        }
    
    def export_prediction_data(self):
        """Export comprehensive prediction analytics"""
        community_analysis = self.analyze_community_retention()
        
        user_predictions = {}
        for handle in self.streaks_data.keys():
            user_predictions[handle] = {
                "continuation_probability": self.calculate_continuation_probability(handle),
                "next_milestones": self.predict_next_milestones(handle),
                "recommendations": self.generate_engagement_recommendations(handle),
                "current_streak": self.streaks_data[handle]["current"],
                "best_streak": self.streaks_data[handle]["best"]
            }
        
        return {
            "community_analysis": community_analysis,
            "user_predictions": user_predictions,
            "generated_at": datetime.now().isoformat(),
            "prediction_accuracy_note": "Probabilities based on behavioral research and achievement patterns"
        }

def main():
    """Generate streak prediction analytics"""
    print("🔮 Generating Streak Prediction Analytics")
    print("=" * 50)
    
    predictor = StreakPredictionAnalytics()
    predictions = predictor.export_prediction_data()
    
    # Save prediction data
    with open('streak_prediction_data.json', 'w') as f:
        json.dump(predictions, f, indent=2)
    
    # Display community analysis
    community = predictions["community_analysis"]
    print(f"🏥 Community Health Score: {community['health_score']}/100")
    print(f"📈 Average Continuation Probability: {community['avg_continuation_probability']*100:.1f}%")
    print(f"💪 Active Retention Rate: {community['active_retention_rate']}%")
    
    print(f"\n💡 Community Insights:")
    for insight in community["insights"]:
        print(f"   {insight}")
    
    # Display user predictions
    print(f"\n👤 Individual User Predictions:")
    for handle, data in predictions["user_predictions"].items():
        print(f"\n   {handle} (Current: {data['current_streak']} days)")
        print(f"   🎯 Continuation Probability: {data['continuation_probability']*100:.1f}%")
        
        if data['recommendations']:
            print(f"   💌 Recommendations:")
            for rec in data['recommendations']:
                print(f"     - {rec['message']}")
        
        if data['next_milestones'][:2]:  # Show next 2 milestones
            print(f"   🏆 Upcoming Milestones:")
            for milestone in data['next_milestones'][:2]:
                print(f"     - {milestone['milestone_name']}: {milestone['days_needed']} days ({milestone['probability']*100:.1f}% likely)")
    
    print(f"\n✅ Prediction data saved to: streak_prediction_data.json")

if __name__ == "__main__":
    main()