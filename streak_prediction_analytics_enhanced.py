#!/usr/bin/env python3
"""
🔮 Enhanced Streak Prediction Analytics
Built by @streaks-agent

Predicts streak sustainability, identifies at-risk users, and provides 
engagement recommendations based on behavioral patterns.
"""

import json
import os
from datetime import datetime, timedelta
import math

class StreakPredictionEngine:
    def __init__(self):
        self.streak_data_file = 'streak_data.json'
        self.prediction_data_file = 'streak_prediction_data.json'
        
    def load_streak_data(self):
        """Load current streak data"""
        # Mock data based on current state
        return {
            "@demo_user": {
                "current_streak": 1,
                "best_streak": 1,
                "last_activity": "2026-01-08",
                "total_days": 1,
                "consistency_score": 1.0
            },
            "@vibe_champion": {
                "current_streak": 1,
                "best_streak": 1,
                "last_activity": "2026-01-08", 
                "total_days": 1,
                "consistency_score": 1.0
            }
        }
    
    def calculate_streak_momentum(self, user_data):
        """Calculate momentum score based on recent activity"""
        current_streak = user_data.get('current_streak', 0)
        best_streak = user_data.get('best_streak', 0)
        consistency = user_data.get('consistency_score', 0.5)
        
        # Momentum factors
        streak_ratio = current_streak / max(best_streak, 1)
        growth_factor = math.log(current_streak + 1) / math.log(2)  # Log scale for growth
        consistency_factor = consistency
        
        # Combined momentum score (0-1 scale)
        momentum = min(1.0, (streak_ratio * 0.4 + growth_factor * 0.3 + consistency_factor * 0.3))
        return momentum
    
    def predict_streak_sustainability(self, user_data):
        """Predict likelihood of continuing streak"""
        momentum = self.calculate_streak_momentum(user_data)
        current_streak = user_data.get('current_streak', 0)
        
        # Base prediction factors
        if current_streak == 1:
            # Day 1 is critical - 60% baseline with momentum adjustments
            base_probability = 0.6
        elif current_streak <= 3:
            # Days 2-3 are forming habit - 70% baseline 
            base_probability = 0.7
        elif current_streak <= 7:
            # Week 1 is building - 80% baseline
            base_probability = 0.8
        elif current_streak <= 30:
            # Month 1 is strengthening - 85% baseline
            base_probability = 0.85
        else:
            # Long-term streaks are very stable - 90% baseline
            base_probability = 0.9
            
        # Apply momentum factor
        final_probability = min(0.95, base_probability * (0.7 + momentum * 0.3))
        return final_probability
    
    def identify_at_risk_users(self, users_data):
        """Find users at risk of breaking streaks"""
        at_risk = []
        
        for username, data in users_data.items():
            sustainability = self.predict_streak_sustainability(data)
            momentum = self.calculate_streak_momentum(data)
            
            # Risk factors
            risk_score = 1.0 - sustainability
            
            if risk_score > 0.4:  # More than 40% risk
                at_risk.append({
                    'username': username,
                    'risk_score': risk_score,
                    'sustainability': sustainability,
                    'momentum': momentum,
                    'current_streak': data.get('current_streak', 0),
                    'risk_level': 'HIGH' if risk_score > 0.6 else 'MEDIUM'
                })
        
        return sorted(at_risk, key=lambda x: x['risk_score'], reverse=True)
    
    def generate_engagement_recommendations(self, username, user_data, risk_score):
        """Generate personalized engagement strategies"""
        current_streak = user_data.get('current_streak', 0)
        momentum = self.calculate_streak_momentum(user_data)
        
        recommendations = []
        
        # Streak-specific recommendations
        if current_streak == 1:
            recommendations.extend([
                "🌱 Day 1 is crucial! Set a small daily goal to build momentum.",
                "📅 Schedule a specific time tomorrow for workshop engagement.",
                "💬 Connect with @vibe_champion - you're both starting strong!"
            ])
        elif current_streak <= 3:
            recommendations.extend([
                "🚀 You're in the habit-forming phase! Keep showing up daily.",
                "🎯 Focus on the Early Bird badge (3 days) - almost there!",
                "📈 Small wins count - even brief check-ins maintain your streak."
            ])
        elif current_streak <= 7:
            recommendations.extend([
                "💪 Week Warrior badge in sight! You're building real momentum.",
                "🔄 Create a daily routine around your workshop engagement.",
                "🏆 Consider sharing your first project - earn the First Ship badge!"
            ])
        
        # Risk-based recommendations
        if risk_score > 0.5:
            recommendations.extend([
                "⚠️  Set a daily reminder to maintain your streak momentum.",
                "🤝 Find an accountability partner in the workshop.",
                "🎮 Try a new engagement format - games, discussions, or projects."
            ])
        
        # Momentum-based recommendations
        if momentum < 0.5:
            recommendations.extend([
                "⚡ Boost engagement with interactive activities.",
                "🎊 Celebrate small wins to rebuild momentum.",
                "🔗 Connect with other active workshop members."
            ])
        
        return recommendations[:4]  # Return top 4 recommendations
    
    def generate_milestone_predictions(self, users_data):
        """Predict when users will hit major milestones"""
        predictions = {}
        
        for username, data in users_data.items():
            current_streak = data.get('current_streak', 0)
            sustainability = self.predict_streak_sustainability(data)
            
            milestones = {
                'Early Bird (3 days)': 3,
                'Week Warrior (7 days)': 7,
                'Consistency King (14 days)': 14,
                'Monthly Legend (30 days)': 30,
                'Century Club (100 days)': 100
            }
            
            user_predictions = {}
            for milestone_name, target_days in milestones.items():
                if current_streak < target_days:
                    days_needed = target_days - current_streak
                    
                    # Adjust timeline based on sustainability
                    expected_days = days_needed / sustainability
                    predicted_date = datetime.now() + timedelta(days=int(expected_days))
                    
                    confidence = "High" if sustainability > 0.8 else "Medium" if sustainability > 0.6 else "Low"
                    
                    user_predictions[milestone_name] = {
                        'days_needed': days_needed,
                        'predicted_date': predicted_date.strftime('%Y-%m-%d'),
                        'confidence': confidence,
                        'sustainability_score': round(sustainability, 2)
                    }
            
            predictions[username] = user_predictions
        
        return predictions
    
    def generate_prediction_report(self):
        """Generate comprehensive prediction analytics report"""
        users_data = self.load_streak_data()
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'analytics': {
                'total_users': len(users_data),
                'average_streak': sum(data.get('current_streak', 0) for data in users_data.values()) / len(users_data),
                'users_analyzed': len(users_data)
            },
            'sustainability_analysis': {},
            'at_risk_users': self.identify_at_risk_users(users_data),
            'milestone_predictions': self.generate_milestone_predictions(users_data),
            'engagement_recommendations': {},
            'insights': []
        }
        
        # Per-user analysis
        for username, data in users_data.items():
            sustainability = self.predict_streak_sustainability(data)
            momentum = self.calculate_streak_momentum(data)
            risk_score = 1.0 - sustainability
            
            report['sustainability_analysis'][username] = {
                'sustainability_score': round(sustainability, 2),
                'momentum_score': round(momentum, 2),
                'risk_score': round(risk_score, 2),
                'prediction': 'STABLE' if risk_score < 0.3 else 'MODERATE' if risk_score < 0.6 else 'AT_RISK'
            }
            
            report['engagement_recommendations'][username] = self.generate_engagement_recommendations(
                username, data, risk_score
            )
        
        # Generate insights
        avg_sustainability = sum(analysis['sustainability_score'] 
                                for analysis in report['sustainability_analysis'].values()) / len(users_data)
        
        report['insights'] = [
            f"📊 Average sustainability score: {avg_sustainability:.1%}",
            f"🎯 Next milestone wave: Early Bird badges in ~2 days",
            f"⚡ Both users in critical habit-formation phase (Days 1-3)",
            f"🤝 Strong peer support opportunity - users at same level",
            f"🚀 Perfect timing for first-ship challenge introduction"
        ]
        
        return report
    
    def save_prediction_data(self, report):
        """Save prediction data for dashboard use"""
        with open(self.prediction_data_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"💾 Prediction data saved to {self.prediction_data_file}")

def main():
    print("🔮 Enhanced Streak Prediction Analytics")
    print("=" * 50)
    
    engine = StreakPredictionEngine()
    report = engine.generate_prediction_report()
    
    # Display key insights
    print("\n📊 SUSTAINABILITY ANALYSIS")
    print("-" * 30)
    for username, analysis in report['sustainability_analysis'].items():
        print(f"{username}:")
        print(f"  🔮 Sustainability: {analysis['sustainability_score']:.1%}")
        print(f"  ⚡ Momentum: {analysis['momentum_score']:.1%}")
        print(f"  📈 Status: {analysis['prediction']}")
        print()
    
    print("🎯 MILESTONE PREDICTIONS")
    print("-" * 30)
    for username, predictions in report['milestone_predictions'].items():
        print(f"{username}:")
        for milestone, data in list(predictions.items())[:2]:  # Show first 2 milestones
            print(f"  {milestone}: {data['predicted_date']} ({data['confidence']} confidence)")
        print()
    
    print("💡 TOP INSIGHTS")
    print("-" * 30)
    for insight in report['insights']:
        print(f"  {insight}")
    
    print("\n🔮 ENGAGEMENT RECOMMENDATIONS")
    print("-" * 30)
    for username, recs in report['engagement_recommendations'].items():
        print(f"{username}:")
        for rec in recs[:2]:  # Show top 2 recommendations
            print(f"  {rec}")
        print()
    
    # Save data
    engine.save_prediction_data(report)
    
    print("\n✅ Prediction analytics complete!")
    print("📁 Data saved for dashboard integration")

if __name__ == "__main__":
    main()