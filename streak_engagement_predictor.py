#!/usr/bin/env python3
"""
Streak Engagement Predictor for /vibe workshop
Analyzes user patterns to predict engagement and suggest interventions.
Built by @streaks-agent for better streak retention.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import os

class StreakEngagementPredictor:
    def __init__(self):
        self.streak_data_file = 'streak_data.json'
        self.achievements_file = 'achievements.json'
        self.celebration_log_file = 'celebration_log.json'
        
    def load_data(self) -> Dict:
        """Load current streak and achievement data"""
        data = {
            'streaks': {},
            'achievements': {},
            'celebrations': {}
        }
        
        # Load streak data
        if os.path.exists(self.streak_data_file):
            try:
                with open(self.streak_data_file, 'r') as f:
                    streaks = json.load(f)
                    data['streaks'] = streaks
            except:
                pass
        
        # Load achievements
        if os.path.exists(self.achievements_file):
            try:
                with open(self.achievements_file, 'r') as f:
                    achievements = json.load(f)
                    data['achievements'] = achievements.get('user_achievements', {})
            except:
                pass
                
        # Load celebration log
        if os.path.exists(self.celebration_log_file):
            try:
                with open(self.celebration_log_file, 'r') as f:
                    celebrations = json.load(f)
                    data['celebrations'] = celebrations.get('celebrated_milestones', {})
            except:
                pass
                
        return data
    
    def predict_engagement_risk(self, user_handle: str, current_streak: int) -> Dict:
        """Predict engagement risk for a user"""
        risk_score = 0
        risk_factors = []
        recommendations = []
        
        # Day 2-3 is critical dropout period
        if current_streak == 1:
            risk_score += 40
            risk_factors.append("Day 2 vulnerability (highest dropout risk)")
            recommendations.append("Send encouraging DM about Day 2 being crucial")
            
        elif current_streak == 2:
            risk_score += 30
            risk_factors.append("Day 3 consolidation period")
            recommendations.append("Celebrate making it past Day 1!")
            
        elif current_streak == 3:
            risk_score += 20
            risk_factors.append("Early momentum building")
            recommendations.append("Acknowledge their growing consistency")
        
        # Week transition is another critical point
        elif current_streak in [6, 7]:
            risk_score += 25
            risk_factors.append("Week milestone transition")
            recommendations.append("Prepare Week Warrior celebration")
            
        # Long streak maintenance risk
        elif current_streak > 30:
            risk_score += 15
            risk_factors.append("Long streak maintenance fatigue")
            recommendations.append("Celebrate consistency, not just milestones")
        
        # Determine risk level
        if risk_score >= 35:
            risk_level = "HIGH"
        elif risk_score >= 20:
            risk_level = "MEDIUM" 
        else:
            risk_level = "LOW"
            
        return {
            'user': user_handle,
            'current_streak': current_streak,
            'risk_level': risk_level,
            'risk_score': risk_score,
            'risk_factors': risk_factors,
            'recommendations': recommendations,
            'next_milestone': self._get_next_milestone(current_streak)
        }
    
    def _get_next_milestone(self, current_streak: int) -> Dict:
        """Get the next milestone for a user"""
        milestones = [
            (3, "Getting started! 🌱"),
            (7, "One week strong! 💪"), 
            (14, "Two weeks! You're committed! 🔥"),
            (30, "Monthly legend! 🏆"),
            (100, "Century club! 👑")
        ]
        
        for days, message in milestones:
            if current_streak < days:
                return {
                    'days': days,
                    'message': message,
                    'days_to_go': days - current_streak
                }
        
        return {
            'days': current_streak + 30,
            'message': f"{current_streak + 30} day legend! 🌟",
            'days_to_go': 30
        }
    
    def generate_engagement_insights(self) -> Dict:
        """Generate insights about overall engagement"""
        data = self.load_data()
        streaks = data['streaks']
        
        if not streaks:
            return {
                'total_users': 0,
                'insights': ["No active users to analyze"],
                'recommendations': ["Focus on user acquisition"]
            }
        
        insights = []
        recommendations = []
        high_risk_users = []
        predictions = []
        
        # Analyze each user
        for handle, streak_info in streaks.items():
            if isinstance(streak_info, dict):
                current_streak = streak_info.get('current', 0)
                best_streak = streak_info.get('best', 0)
            else:
                current_streak = streak_info
                best_streak = streak_info
                
            prediction = self.predict_engagement_risk(handle, current_streak)
            predictions.append(prediction)
            
            if prediction['risk_level'] == 'HIGH':
                high_risk_users.append(handle)
        
        # Generate insights
        total_users = len(streaks)
        avg_streak = sum(
            s.get('current', s) if isinstance(s, dict) else s 
            for s in streaks.values()
        ) / total_users if total_users > 0 else 0
        
        insights.append(f"Total active users: {total_users}")
        insights.append(f"Average streak: {avg_streak:.1f} days")
        
        if high_risk_users:
            insights.append(f"High risk users: {len(high_risk_users)} ({', '.join(high_risk_users)})")
            recommendations.append("Send proactive encouragement to high-risk users")
        
        # Day 2 crisis intervention
        day_1_users = [
            h for h, s in streaks.items() 
            if (s.get('current', s) if isinstance(s, dict) else s) == 1
        ]
        
        if day_1_users:
            recommendations.append(f"Day 2 intervention needed for: {', '.join(day_1_users)}")
            
        return {
            'total_users': total_users,
            'average_streak': round(avg_streak, 1),
            'high_risk_users': len(high_risk_users),
            'insights': insights,
            'recommendations': recommendations,
            'user_predictions': predictions,
            'timestamp': datetime.now().isoformat()
        }
    
    def save_predictions(self, predictions: Dict):
        """Save predictions for dashboard display"""
        with open('streak_engagement_predictions.json', 'w') as f:
            json.dump(predictions, f, indent=2)
            
    def run_analysis(self):
        """Run full engagement analysis"""
        print("🔍 Running Streak Engagement Analysis...")
        
        insights = self.generate_engagement_insights()
        
        print(f"\n📊 ENGAGEMENT INSIGHTS:")
        print(f"Total Users: {insights['total_users']}")
        print(f"Average Streak: {insights['average_streak']} days")
        print(f"High Risk Users: {insights['high_risk_users']}")
        
        print(f"\n💡 KEY INSIGHTS:")
        for insight in insights['insights']:
            print(f"  • {insight}")
            
        print(f"\n🎯 RECOMMENDATIONS:")
        for rec in insights['recommendations']:
            print(f"  • {rec}")
            
        print(f"\n👥 USER PREDICTIONS:")
        for pred in insights['user_predictions']:
            print(f"  @{pred['user']}: {pred['current_streak']} days - {pred['risk_level']} RISK")
            print(f"    Next: {pred['next_milestone']['message']} in {pred['next_milestone']['days_to_go']} days")
            
        # Save for dashboard
        self.save_predictions(insights)
        print(f"\n💾 Predictions saved to streak_engagement_predictions.json")
        
        return insights

if __name__ == "__main__":
    predictor = StreakEngagementPredictor()
    predictor.run_analysis()