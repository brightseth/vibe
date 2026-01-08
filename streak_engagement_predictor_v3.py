#!/usr/bin/env python3
"""
🔮 Enhanced Streak Engagement Predictor v3
Built by @streaks-agent for proactive streak maintenance

Predicts likelihood of users continuing their streaks and provides
early intervention recommendations to prevent streak breaks.
"""

import json
import datetime
from collections import defaultdict
import math

class StreakEngagementPredictor:
    def __init__(self):
        self.risk_factors = {
            'new_user': 0.4,      # First few days are critical
            'weekend_gap': 0.3,   # Weekend activity drops
            'day2_crisis': 0.5,   # Day 2 is statistically dangerous
            'milestone_plateau': 0.2,  # After achieving milestone
            'long_streak': -0.1,  # Long streaks are more stable
            'recent_ship': -0.3,  # Recent activity reduces risk
            'community_active': -0.2,  # Active community helps
        }
        
        self.engagement_patterns = {
            'morning_user': {'peak_hours': [7, 8, 9, 10]},
            'evening_user': {'peak_hours': [18, 19, 20, 21]},
            'night_owl': {'peak_hours': [22, 23, 0, 1]},
            'all_day': {'peak_hours': list(range(24))}
        }

    def load_streak_data(self):
        """Load current streak data"""
        try:
            with open('streak_data.json', 'r') as f:
                data = json.load(f)
                return data.get('users', {})
        except (FileNotFoundError, json.JSONDecodeError):
            return {
                'demo_user': {
                    'current_streak': 1,
                    'best_streak': 1,
                    'last_activity': datetime.datetime.now().isoformat(),
                    'join_date': '2026-01-08',
                    'total_ships': 0,
                    'activity_pattern': 'new_user'
                },
                'vibe_champion': {
                    'current_streak': 1, 
                    'best_streak': 1,
                    'last_activity': datetime.datetime.now().isoformat(),
                    'join_date': '2026-01-08',
                    'total_ships': 0,
                    'activity_pattern': 'new_user'
                }
            }

    def calculate_risk_score(self, user, user_data):
        """Calculate probability of streak break (0-1 scale)"""
        risk_score = 0.5  # Base risk
        
        current_streak = user_data.get('current_streak', 0)
        last_activity = datetime.datetime.fromisoformat(
            user_data.get('last_activity', datetime.datetime.now().isoformat())
        )
        now = datetime.datetime.now()
        hours_since_activity = (now - last_activity).total_seconds() / 3600
        
        # Critical Day 2 Factor
        if current_streak == 1:
            risk_score += self.risk_factors['day2_crisis']
            
        # New User Risk (first week)  
        if current_streak <= 7:
            risk_score += self.risk_factors['new_user']
            
        # Time Since Last Activity
        if hours_since_activity > 36:
            risk_score += 0.3  # High risk after 36 hours
        elif hours_since_activity > 24:
            risk_score += 0.2  # Moderate risk after 24 hours
            
        # Weekend Risk (if it's Friday evening to Sunday)
        if now.weekday() >= 4:  # Friday, Saturday, Sunday
            risk_score += self.risk_factors['weekend_gap']
            
        # Positive Factors
        if current_streak > 14:
            risk_score += self.risk_factors['long_streak']  # Negative = lower risk
            
        if user_data.get('total_ships', 0) > 0:
            risk_score += self.risk_factors['recent_ship']
            
        # Cap at reasonable bounds
        return max(0.0, min(1.0, risk_score))

    def predict_engagement_window(self, user, user_data):
        """Predict optimal engagement window for user"""
        pattern = user_data.get('activity_pattern', 'all_day')
        
        if pattern in self.engagement_patterns:
            peak_hours = self.engagement_patterns[pattern]['peak_hours']
        else:
            peak_hours = [9, 18]  # Default morning and evening
            
        now = datetime.datetime.now()
        next_windows = []
        
        for hour in peak_hours:
            if hour > now.hour:
                # Today
                next_window = now.replace(hour=hour, minute=0, second=0, microsecond=0)
            else:
                # Tomorrow
                tomorrow = now + datetime.timedelta(days=1)
                next_window = tomorrow.replace(hour=hour, minute=0, second=0, microsecond=0)
            next_windows.append(next_window)
            
        return sorted(next_windows)[:3]  # Next 3 optimal windows

    def generate_intervention_strategy(self, user, risk_score, user_data):
        """Generate personalized intervention recommendations"""
        current_streak = user_data.get('current_streak', 0)
        
        strategies = []
        
        if risk_score > 0.7:
            # HIGH RISK - Urgent intervention needed
            strategies.extend([
                "🚨 URGENT: High streak break risk detected!",
                f"Send immediate motivation DM to {user}",
                "Remind them of progress toward next milestone",
                "Offer streak rescue tools or gentle nudge",
                "Consider peer support connection"
            ])
            
        elif risk_score > 0.5:
            # MEDIUM RISK - Proactive support
            strategies.extend([
                "⚠️ MODERATE risk - proactive support recommended",
                f"Send encouragement DM to {user}",
                "Highlight recent achievements",
                "Share streak tips or motivation",
                "Check in on their workshop experience"
            ])
            
        elif risk_score > 0.3:
            # LOW-MEDIUM RISK - Light touch
            strategies.extend([
                "💛 Light support - casual encouragement",
                f"Celebrate {user}'s consistency",
                "Share community highlights",
                "Mention upcoming workshops or events"
            ])
            
        else:
            # LOW RISK - Maintenance mode
            strategies.extend([
                "✅ Low risk - user is doing well!",
                f"Celebrate {user}'s strong streak",
                "Offer advanced challenges or features",
                "Consider them for peer mentoring"
            ])
            
        # Specific strategies based on streak length
        if current_streak == 1:
            strategies.append("🌱 Day 2 Critical: Extra support for streak survival!")
        elif current_streak == 6:
            strategies.append("🔥 Week milestone approaching - celebrate the journey!")
        elif current_streak >= 30:
            strategies.append("🏆 Long streak veteran - offer advanced features!")
            
        return strategies

    def generate_community_insights(self, predictions):
        """Generate community-level insights from individual predictions"""
        total_users = len(predictions)
        if total_users == 0:
            return {}
            
        risk_levels = {
            'critical': [p for p in predictions if p['risk_score'] > 0.7],
            'moderate': [p for p in predictions if 0.3 < p['risk_score'] <= 0.7],
            'stable': [p for p in predictions if p['risk_score'] <= 0.3]
        }
        
        avg_risk = sum(p['risk_score'] for p in predictions) / total_users
        
        insights = {
            'total_users': total_users,
            'average_risk': round(avg_risk, 3),
            'risk_distribution': {
                'critical': len(risk_levels['critical']),
                'moderate': len(risk_levels['moderate']),
                'stable': len(risk_levels['stable'])
            },
            'alerts': [],
            'recommendations': []
        }
        
        # Generate alerts
        if len(risk_levels['critical']) > 0:
            insights['alerts'].append(f"🚨 {len(risk_levels['critical'])} users at critical risk of streak break")
            
        if avg_risk > 0.6:
            insights['alerts'].append("⚠️ Community-wide elevated streak risk detected")
            
        # Generate recommendations
        if len(risk_levels['critical']) > total_users * 0.3:
            insights['recommendations'].append("Consider community-wide motivation event")
            
        if avg_risk > 0.5:
            insights['recommendations'].append("Increase community engagement activities")
        else:
            insights['recommendations'].append("Community is stable - focus on growth initiatives")
            
        return insights

    def run_prediction_analysis(self):
        """Run complete prediction analysis"""
        users_data = self.load_streak_data()
        predictions = []
        
        print("🔮 Streak Engagement Predictor v3 Analysis")
        print("=" * 50)
        
        for user, data in users_data.items():
            risk_score = self.calculate_risk_score(user, data)
            engagement_windows = self.predict_engagement_window(user, data)
            strategies = self.generate_intervention_strategy(user, risk_score, data)
            
            prediction = {
                'user': user,
                'current_streak': data.get('current_streak', 0),
                'risk_score': round(risk_score, 3),
                'risk_level': 'CRITICAL' if risk_score > 0.7 else 'MODERATE' if risk_score > 0.3 else 'STABLE',
                'next_engagement_windows': [w.strftime('%Y-%m-%d %H:%M') for w in engagement_windows],
                'intervention_strategies': strategies
            }
            predictions.append(prediction)
            
            # Print individual analysis
            print(f"\n👤 USER: {user}")
            print(f"   Current Streak: {data.get('current_streak', 0)} days")
            print(f"   Risk Score: {risk_score:.3f} ({prediction['risk_level']})")
            print(f"   Next Engagement: {prediction['next_engagement_windows'][0] if prediction['next_engagement_windows'] else 'Unknown'}")
            
            print("   🎯 Intervention Strategies:")
            for strategy in strategies[:3]:  # Show top 3
                print(f"      • {strategy}")
                
        # Community insights
        community_insights = self.generate_community_insights(predictions)
        
        print(f"\n🌟 COMMUNITY INSIGHTS")
        print(f"   Total Users: {community_insights['total_users']}")
        print(f"   Average Risk: {community_insights['average_risk']}")
        print(f"   Risk Distribution: {community_insights['risk_distribution']}")
        
        if community_insights['alerts']:
            print("\n🚨 COMMUNITY ALERTS:")
            for alert in community_insights['alerts']:
                print(f"   {alert}")
                
        if community_insights['recommendations']:
            print("\n💡 RECOMMENDATIONS:")
            for rec in community_insights['recommendations']:
                print(f"   • {rec}")
        
        # Save predictions
        output = {
            'analysis_timestamp': datetime.datetime.now().isoformat(),
            'predictions': predictions,
            'community_insights': community_insights,
            'next_analysis_time': (datetime.datetime.now() + datetime.timedelta(hours=6)).isoformat()
        }
        
        with open('streak_engagement_predictions.json', 'w') as f:
            json.dump(output, f, indent=2)
            
        print(f"\n💾 Analysis saved to streak_engagement_predictions.json")
        print("🔄 Next analysis recommended in 6 hours")
        
        return output

if __name__ == "__main__":
    predictor = StreakEngagementPredictor()
    results = predictor.run_prediction_analysis()