#!/usr/bin/env python3
"""
🔮 Enhanced Streak Engagement Predictor
Advanced analytics to predict user behavior and optimize engagement strategies.

Built by @streaks-agent for /vibe workshop gamification.
"""

import json
import numpy as np
from datetime import datetime, timedelta
import os

class StreakEngagementPredictor:
    def __init__(self):
        self.load_data()
        self.engagement_thresholds = {
            'critical': 0.3,    # High risk of dropping off
            'moderate': 0.6,    # Needs encouragement 
            'strong': 0.8,      # Likely to continue
            'elite': 0.95       # Highly engaged
        }
        
    def load_data(self):
        """Load current streak and user data"""
        # Load streak data (simulated for MVP)
        self.streak_data = {
            '@demo_user': {'current': 1, 'best': 1, 'history': [1]},
            '@vibe_champion': {'current': 1, 'best': 1, 'history': [1]}
        }
        
        # Load achievements/badges data if exists
        try:
            with open('achievements.json', 'r') as f:
                self.achievements_data = json.load(f)
        except FileNotFoundError:
            self.achievements_data = {}
            
    def calculate_engagement_score(self, user_handle):
        """Calculate comprehensive engagement score for a user"""
        user_data = self.streak_data.get(user_handle, {})
        
        # Base factors
        current_streak = user_data.get('current', 0)
        best_streak = user_data.get('best', 0) 
        history = user_data.get('history', [])
        
        # Streak consistency factor (0-1)
        consistency = min(current_streak / max(best_streak, 1), 1.0)
        
        # Momentum factor - recent activity
        recent_momentum = 1.0 if current_streak > 0 else 0.5
        
        # Achievement factor
        achievement_count = len(self.achievements_data.get(user_handle, []))
        achievement_factor = min(achievement_count * 0.2, 1.0)
        
        # Historical trend
        if len(history) >= 3:
            trend = (history[-1] - history[-3]) / 3
            trend_factor = max(min(trend * 0.1 + 0.5, 1.0), 0.0)
        else:
            trend_factor = 0.5  # Neutral for new users
            
        # Weighted combination
        engagement_score = (
            consistency * 0.3 +
            recent_momentum * 0.3 +
            achievement_factor * 0.2 + 
            trend_factor * 0.2
        )
        
        return min(engagement_score, 1.0)
        
    def predict_next_milestone_likelihood(self, user_handle):
        """Predict likelihood of reaching next milestone"""
        user_data = self.streak_data.get(user_handle, {})
        current_streak = user_data.get('current', 0)
        
        # Define milestone targets
        milestones = [3, 7, 14, 30, 100]
        next_milestone = None
        
        for milestone in milestones:
            if current_streak < milestone:
                next_milestone = milestone
                break
                
        if not next_milestone:
            return {'milestone': None, 'likelihood': 1.0, 'days_needed': 0}
            
        days_needed = next_milestone - current_streak
        engagement_score = self.calculate_engagement_score(user_handle)
        
        # Likelihood decreases with distance and low engagement
        base_likelihood = engagement_score
        distance_penalty = max(0.1, 1 - (days_needed * 0.1))
        
        likelihood = base_likelihood * distance_penalty
        
        return {
            'milestone': next_milestone,
            'likelihood': round(likelihood, 2),
            'days_needed': days_needed,
            'engagement_score': round(engagement_score, 2)
        }
        
    def identify_at_risk_users(self):
        """Identify users who need intervention"""
        at_risk = []
        
        for user_handle in self.streak_data.keys():
            engagement_score = self.calculate_engagement_score(user_handle)
            current_streak = self.streak_data[user_handle].get('current', 0)
            
            risk_level = 'low'
            if engagement_score < self.engagement_thresholds['critical']:
                risk_level = 'critical'
            elif engagement_score < self.engagement_thresholds['moderate']:
                risk_level = 'moderate'
                
            if risk_level in ['critical', 'moderate'] or current_streak == 0:
                at_risk.append({
                    'user': user_handle,
                    'risk_level': risk_level,
                    'engagement_score': round(engagement_score, 2),
                    'current_streak': current_streak,
                    'suggested_action': self._get_intervention_suggestion(risk_level, current_streak)
                })
                
        return at_risk
        
    def _get_intervention_suggestion(self, risk_level, current_streak):
        """Get suggested intervention based on risk level"""
        if current_streak == 0:
            return "🌟 Welcome back message with streak restart encouragement"
        elif risk_level == 'critical':
            return "🆘 Immediate personal check-in and motivational support"
        elif risk_level == 'moderate':
            return "💪 Gentle encouragement and milestone reminder"
        else:
            return "✨ Positive reinforcement and celebration"
            
    def generate_engagement_insights(self):
        """Generate actionable insights for the workshop"""
        insights = []
        
        # Overall workshop health
        total_users = len(self.streak_data)
        active_users = sum(1 for data in self.streak_data.values() if data.get('current', 0) > 0)
        health_score = (active_users / total_users) * 100 if total_users > 0 else 0
        
        insights.append(f"📊 Workshop Health: {health_score:.0f}% active engagement rate")
        
        # Milestone predictions
        milestone_predictions = {}
        for user_handle in self.streak_data.keys():
            pred = self.predict_next_milestone_likelihood(user_handle)
            if pred['milestone']:
                if pred['milestone'] not in milestone_predictions:
                    milestone_predictions[pred['milestone']] = []
                milestone_predictions[pred['milestone']].append({
                    'user': user_handle,
                    'likelihood': pred['likelihood'],
                    'days_needed': pred['days_needed']
                })
                
        # Predict upcoming celebrations
        for milestone, users in milestone_predictions.items():
            high_likelihood_users = [u for u in users if u['likelihood'] > 0.7]
            if high_likelihood_users:
                insights.append(f"🎯 {len(high_likelihood_users)} user(s) likely to reach {milestone}-day milestone soon")
                
        # At-risk identification
        at_risk = self.identify_at_risk_users()
        if at_risk:
            critical_users = [u for u in at_risk if u['risk_level'] == 'critical']
            if critical_users:
                insights.append(f"🚨 {len(critical_users)} user(s) need immediate engagement intervention")
                
        # Engagement optimization suggestions
        avg_engagement = np.mean([self.calculate_engagement_score(u) for u in self.streak_data.keys()])
        if avg_engagement < 0.5:
            insights.append("💡 Consider introducing new engagement mechanics (achievements, challenges)")
        elif avg_engagement > 0.8:
            insights.append("🚀 High engagement! Ready for advanced features (leaderboards, competitions)")
            
        return insights
        
    def generate_personalized_recommendations(self):
        """Generate personalized recommendations for each user"""
        recommendations = {}
        
        for user_handle in self.streak_data.keys():
            user_data = self.streak_data[user_handle]
            engagement_score = self.calculate_engagement_score(user_handle)
            milestone_pred = self.predict_next_milestone_likelihood(user_handle)
            
            recs = []
            
            # Streak-based recommendations
            current_streak = user_data.get('current', 0)
            if current_streak == 0:
                recs.append("🌱 Start your streak today - even small actions count!")
            elif current_streak < 3:
                recs.append("🎯 You're close to your first milestone at 3 days!")
            elif milestone_pred['likelihood'] > 0.8:
                recs.append(f"🔥 You're on track for {milestone_pred['milestone']} days - keep it up!")
                
            # Engagement-based recommendations
            if engagement_score < 0.5:
                recs.append("💪 Try setting a daily reminder to stay consistent")
            elif engagement_score > 0.8:
                recs.append("🏆 You're a streak superstar! Consider mentoring newer users")
                
            recommendations[user_handle] = recs
            
        return recommendations
        
    def export_prediction_report(self):
        """Export comprehensive prediction report"""
        report = {
            'generated_at': datetime.now().isoformat(),
            'workshop_overview': {
                'total_users': len(self.streak_data),
                'active_streaks': sum(1 for data in self.streak_data.values() if data.get('current', 0) > 0),
                'avg_engagement_score': round(np.mean([self.calculate_engagement_score(u) for u in self.streak_data.keys()]), 2)
            },
            'user_predictions': {},
            'at_risk_users': self.identify_at_risk_users(),
            'engagement_insights': self.generate_engagement_insights(),
            'personalized_recommendations': self.generate_personalized_recommendations()
        }
        
        # Generate predictions for each user
        for user_handle in self.streak_data.keys():
            engagement_score = self.calculate_engagement_score(user_handle)
            milestone_pred = self.predict_next_milestone_likelihood(user_handle)
            
            report['user_predictions'][user_handle] = {
                'engagement_score': round(engagement_score, 2),
                'engagement_level': self._get_engagement_level(engagement_score),
                'next_milestone': milestone_pred,
                'current_streak': self.streak_data[user_handle].get('current', 0),
                'best_streak': self.streak_data[user_handle].get('best', 0)
            }
            
        return report
        
    def _get_engagement_level(self, score):
        """Convert engagement score to readable level"""
        if score >= self.engagement_thresholds['elite']:
            return 'Elite 👑'
        elif score >= self.engagement_thresholds['strong']:
            return 'Strong 💪'
        elif score >= self.engagement_thresholds['moderate']:
            return 'Moderate ⚡'
        else:
            return 'Needs Support 🌱'

def main():
    """Generate enhanced engagement prediction report"""
    print("🔮 Generating Enhanced Streak Engagement Predictions...")
    
    predictor = StreakEngagementPredictor()
    report = predictor.export_prediction_report()
    
    # Save report
    with open('streak_engagement_predictions.json', 'w') as f:
        json.dump(report, f, indent=2)
        
    # Print key insights
    print(f"\\n📊 Workshop Overview:")
    print(f"   👥 Total Users: {report['workshop_overview']['total_users']}")
    print(f"   🔥 Active Streaks: {report['workshop_overview']['active_streaks']}")  
    print(f"   📈 Avg Engagement: {report['workshop_overview']['avg_engagement_score']}")
    
    print(f"\\n🧠 Key Insights:")
    for insight in report['engagement_insights']:
        print(f"   {insight}")
        
    if report['at_risk_users']:
        print(f"\\n🚨 Users Needing Attention:")
        for user in report['at_risk_users']:
            print(f"   {user['user']}: {user['risk_level']} risk - {user['suggested_action']}")
    else:
        print("\\n✅ All users are currently engaged!")
        
    print(f"\\n📄 Full report saved to: streak_engagement_predictions.json")
    print("🤖 Built by @streaks-agent for /vibe workshop optimization")

if __name__ == "__main__":
    main()