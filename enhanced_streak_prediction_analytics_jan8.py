#!/usr/bin/env python3
"""
Enhanced Streak Analytics with Prediction Features
Built by @streaks-agent - Jan 8, 2026
Adds streak prediction, risk analysis, and engagement forecasting
"""

import json
from datetime import datetime, timedelta
import math

class StreakPredictionAnalytics:
    def __init__(self):
        self.current_streaks = {
            "demo_user": {"current": 1, "best": 1, "joined": "2026-01-07"},
            "vibe_champion": {"current": 1, "best": 1, "joined": "2026-01-07"}
        }
        self.load_achievements()
    
    def load_achievements(self):
        try:
            with open('achievements.json', 'r') as f:
                self.achievements = json.load(f)
        except FileNotFoundError:
            self.achievements = {"user_achievements": {}, "achievement_history": []}
    
    def predict_streak_continuation(self, handle, current_streak):
        """Predict probability of streak continuation"""
        
        # Base prediction factors
        base_probability = 0.7  # Starting probability
        
        # Streak momentum factor (longer streaks have higher continuation probability)
        if current_streak >= 30:
            momentum_factor = 0.9
        elif current_streak >= 14:
            momentum_factor = 0.85
        elif current_streak >= 7:
            momentum_factor = 0.8
        elif current_streak >= 3:
            momentum_factor = 0.75
        else:
            momentum_factor = 0.65  # New users, lower initial probability
        
        # Achievement factor (users with more achievements are more engaged)
        user_badges = self.achievements.get('user_achievements', {}).get(handle.replace('@', ''), [])
        achievement_factor = min(1.0, 0.6 + (len(user_badges) * 0.1))
        
        # Calculate final probability
        probability = base_probability * momentum_factor * achievement_factor
        return min(0.95, max(0.1, probability))  # Clamp between 10% and 95%
    
    def calculate_milestone_eta(self, current_streak, target_milestone):
        """Calculate estimated time to reach milestone"""
        if current_streak >= target_milestone:
            return 0
        
        remaining_days = target_milestone - current_streak
        
        # Assume 80% continuation probability for active users
        continuation_prob = 0.8
        
        # Expected days = remaining / continuation probability
        expected_days = remaining_days / continuation_prob
        
        return int(math.ceil(expected_days))
    
    def analyze_engagement_risk(self, handle, streak_data):
        """Analyze risk of user dropping off"""
        current = streak_data['current']
        best = streak_data['best']
        
        # Risk factors
        risk_score = 0
        risk_factors = []
        
        # New user risk (first few days are critical)
        if current <= 3:
            risk_score += 30
            risk_factors.append("New user - critical period")
        
        # Plateau risk (current streak much lower than best)
        if best > current and (best - current) > 5:
            risk_score += 20
            risk_factors.append("Below personal best")
        
        # No achievements risk
        user_badges = self.achievements.get('user_achievements', {}).get(handle.replace('@', ''), [])
        if len(user_badges) == 0:
            risk_score += 15
            risk_factors.append("No achievements yet")
        
        # Determine risk level
        if risk_score >= 40:
            risk_level = "HIGH"
        elif risk_score >= 25:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        return {
            "level": risk_level,
            "score": risk_score,
            "factors": risk_factors
        }
    
    def generate_predictions(self):
        """Generate comprehensive predictions for all users"""
        predictions = []
        
        milestones = {3: "Getting started! 🌱", 7: "Week Warrior 💪", 14: "Consistency King 🔥", 30: "Monthly Legend 🏆", 100: "Century Club 👑"}
        
        for handle, data in self.current_streaks.items():
            full_handle = f"@{handle}"
            
            # Streak continuation probability
            continuation_prob = self.predict_streak_continuation(handle, data['current'])
            
            # Next milestone and ETA
            next_milestone = None
            next_milestone_name = None
            eta_days = None
            
            for milestone_days, milestone_name in milestones.items():
                if data['current'] < milestone_days:
                    next_milestone = milestone_days
                    next_milestone_name = milestone_name
                    eta_days = self.calculate_milestone_eta(data['current'], milestone_days)
                    break
            
            # Engagement risk analysis
            risk = self.analyze_engagement_risk(handle, data)
            
            predictions.append({
                "handle": full_handle,
                "current_streak": data['current'],
                "continuation_probability": round(continuation_prob * 100),
                "next_milestone": {
                    "days": next_milestone,
                    "name": next_milestone_name,
                    "eta_days": eta_days
                },
                "risk": risk
            })
        
        return predictions
    
    def generate_workshop_forecast(self):
        """Generate overall workshop engagement forecast"""
        predictions = self.generate_predictions()
        
        # Overall engagement metrics
        total_users = len(predictions)
        high_risk_users = len([p for p in predictions if p['risk']['level'] == 'HIGH'])
        avg_continuation_prob = sum([p['continuation_probability'] for p in predictions]) / total_users
        
        # Next week forecast
        expected_active_next_week = sum([p['continuation_probability'] / 100 for p in predictions])
        
        # Milestone forecast (next 7 days)
        likely_milestone_achievers = []
        for p in predictions:
            if p['next_milestone']['eta_days'] and p['next_milestone']['eta_days'] <= 7:
                if p['continuation_probability'] >= 70:
                    likely_milestone_achievers.append({
                        "handle": p['handle'],
                        "milestone": p['next_milestone']['name'],
                        "eta": p['next_milestone']['eta_days']
                    })
        
        return {
            "total_users": total_users,
            "high_risk_users": high_risk_users,
            "avg_continuation_probability": round(avg_continuation_prob),
            "expected_active_next_week": round(expected_active_next_week, 1),
            "milestone_achievers_forecast": likely_milestone_achievers
        }
    
    def generate_insights(self):
        """Generate actionable insights"""
        predictions = self.generate_predictions()
        forecast = self.generate_workshop_forecast()
        
        insights = []
        
        # Risk-based insights
        high_risk = [p for p in predictions if p['risk']['level'] == 'HIGH']
        if high_risk:
            insights.append(f"⚠️ {len(high_risk)} users at high engagement risk - consider outreach")
            for user in high_risk[:2]:  # Show top 2
                insights.append(f"   • {user['handle']}: {', '.join(user['risk']['factors'])}")
        
        # Milestone insights
        if forecast['milestone_achievers_forecast']:
            insights.append(f"🎯 {len(forecast['milestone_achievers_forecast'])} users likely to hit milestones this week")
            for achiever in forecast['milestone_achievers_forecast'][:2]:
                insights.append(f"   • {achiever['handle']} → {achiever['milestone']} in {achiever['eta']} days")
        
        # Overall health insight
        health_score = forecast['avg_continuation_probability']
        if health_score >= 80:
            insights.append(f"💪 Excellent engagement health ({health_score}% continuation probability)")
        elif health_score >= 60:
            insights.append(f"👍 Good engagement health ({health_score}% continuation probability)")
        else:
            insights.append(f"⚠️ Engagement needs attention ({health_score}% continuation probability)")
        
        # Forecast insight
        insights.append(f"📈 Forecast: {forecast['expected_active_next_week']}/{forecast['total_users']} users expected active next week")
        
        return insights
    
    def run_analytics(self):
        """Run complete analytics and return results"""
        print("🔮 ENHANCED STREAK PREDICTION ANALYTICS")
        print("=" * 60)
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Individual predictions
        predictions = self.generate_predictions()
        print("👥 INDIVIDUAL PREDICTIONS:")
        for p in predictions:
            print(f"  {p['handle']} ({p['current_streak']} days)")
            print(f"    📊 Continuation: {p['continuation_probability']}%")
            if p['next_milestone']['name']:
                print(f"    🎯 Next: {p['next_milestone']['name']} in ~{p['next_milestone']['eta_days']} days")
            print(f"    ⚠️  Risk: {p['risk']['level']} ({p['risk']['score']}/100)")
            if p['risk']['factors']:
                print(f"       Factors: {', '.join(p['risk']['factors'])}")
            print()
        
        # Workshop forecast
        forecast = self.generate_workshop_forecast()
        print("🔮 WORKSHOP FORECAST:")
        print(f"  Total Users: {forecast['total_users']}")
        print(f"  High Risk Users: {forecast['high_risk_users']}")
        print(f"  Avg Continuation Probability: {forecast['avg_continuation_probability']}%")
        print(f"  Expected Active Next Week: {forecast['expected_active_next_week']}/{forecast['total_users']}")
        
        if forecast['milestone_achievers_forecast']:
            print(f"  Likely Milestone Achievers (7 days): {len(forecast['milestone_achievers_forecast'])}")
            for achiever in forecast['milestone_achievers_forecast']:
                print(f"    • {achiever['handle']} → {achiever['milestone']} in {achiever['eta']} days")
        print()
        
        # Insights
        insights = self.generate_insights()
        print("💡 ACTIONABLE INSIGHTS:")
        for insight in insights:
            print(f"  {insight}")
        print()
        
        # Save data
        analytics_data = {
            "generated_at": datetime.now().isoformat(),
            "predictions": predictions,
            "forecast": forecast,
            "insights": insights
        }
        
        with open('streak_prediction_analytics_data.json', 'w') as f:
            json.dump(analytics_data, f, indent=2)
        
        print("✅ Prediction analytics complete!")
        print("📂 Data saved to: streak_prediction_analytics_data.json")
        
        return analytics_data

if __name__ == '__main__':
    analytics = StreakPredictionAnalytics()
    analytics.run_analytics()