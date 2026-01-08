#!/usr/bin/env python3
"""
Streak Risk Predictor for /vibe workshop
Analyzes patterns and predicts who might need encouragement
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

class StreakRiskPredictor:
    def __init__(self):
        self.risk_levels = {
            'low': '🟢',
            'medium': '🟡', 
            'high': '🔴'
        }
    
    def load_streak_data(self) -> Dict:
        """Load current streak data"""
        try:
            with open('streak_dashboard_data.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Return mock data based on what we know
            return {
                "leaderboard": [
                    {
                        "handle": "@demo_user",
                        "current_streak": 1,
                        "best_streak": 1,
                        "last_activity": "2026-01-08"
                    },
                    {
                        "handle": "@vibe_champion", 
                        "current_streak": 1,
                        "best_streak": 1,
                        "last_activity": "2026-01-08"
                    }
                ]
            }
    
    def analyze_streak_risk(self, user_data: Dict) -> Tuple[str, str, List[str]]:
        """
        Analyze risk factors for a user's streak
        Returns: (risk_level, risk_emoji, risk_factors)
        """
        current_streak = user_data.get('current_streak', 0)
        best_streak = user_data.get('best_streak', 0)
        
        risk_factors = []
        risk_score = 0
        
        # Risk factor 1: New user (first few days are critical)
        if current_streak <= 3:
            risk_factors.append("🌱 New streak - critical first days")
            risk_score += 2
        
        # Risk factor 2: Haven't beaten personal best yet
        if current_streak < best_streak and best_streak > 3:
            risk_factors.append("📊 Below personal best - might lose motivation")
            risk_score += 1
            
        # Risk factor 3: Milestone proximity (day before milestone)
        upcoming_milestones = [3, 7, 14, 30, 100]
        for milestone in upcoming_milestones:
            if current_streak == milestone - 1:
                risk_factors.append(f"🎯 One day away from {milestone}-day milestone!")
                risk_score -= 1  # This is actually good motivation
                break
        
        # Risk factor 4: Plateau risk (exactly at certain numbers)
        plateau_points = [7, 14, 30]  # Common drop-off points
        if current_streak in plateau_points:
            risk_factors.append("⚖️ At common plateau point - needs extra motivation")
            risk_score += 1
        
        # Determine risk level
        if risk_score >= 3:
            return 'high', '🔴', risk_factors
        elif risk_score >= 1:
            return 'medium', '🟡', risk_factors
        else:
            return 'low', '🟢', risk_factors
    
    def generate_encouragement(self, user_handle: str, risk_level: str, 
                             current_streak: int, risk_factors: List[str]) -> str:
        """Generate personalized encouragement based on risk"""
        
        base_messages = {
            'high': [
                f"🔥 {user_handle}, your {current_streak}-day streak is precious! Every day builds momentum.",
                f"💪 {user_handle}, you're in the critical zone! Your {current_streak} days show real commitment.",
                f"🌟 {user_handle}, those {current_streak} days weren't built in a day - keep the fire burning!"
            ],
            'medium': [
                f"⚡ {user_handle}, you've got {current_streak} days of momentum - don't let it slip!",
                f"🎯 {user_handle}, your {current_streak}-day streak is building something special!",
                f"🚀 {user_handle}, {current_streak} days strong! You're creating a habit that matters."
            ],
            'low': [
                f"✨ {user_handle}, your {current_streak}-day streak is looking solid! Keep it up!",
                f"🌈 {user_handle}, {current_streak} days of consistency! You're on the right track.",
                f"🎉 {user_handle}, loving the {current_streak}-day momentum you've built!"
            ]
        }
        
        import random
        base_message = random.choice(base_messages[risk_level])
        
        # Add specific factor-based advice
        if "milestone" in str(risk_factors):
            base_message += " 🏆 You're so close to a major milestone - tomorrow could be celebration day!"
        elif "personal best" in str(risk_factors):
            base_message += " 📈 Imagine beating your personal record - you've done it before!"
        elif "New streak" in str(risk_factors):
            base_message += " 🌱 Every streak legend started exactly where you are now!"
            
        return base_message
    
    def predict_risks(self) -> Dict:
        """Main prediction function"""
        data = self.load_streak_data()
        predictions = {
            'high_risk': [],
            'medium_risk': [], 
            'low_risk': [],
            'encouragement_needed': [],
            'insights': []
        }
        
        users = data.get('leaderboard', [])
        
        for user in users:
            handle = user['handle']
            risk_level, risk_emoji, risk_factors = self.analyze_streak_risk(user)
            
            user_prediction = {
                'handle': handle,
                'current_streak': user['current_streak'],
                'risk_level': risk_level,
                'risk_emoji': risk_emoji,
                'risk_factors': risk_factors,
                'encouragement': self.generate_encouragement(
                    handle, risk_level, user['current_streak'], risk_factors
                )
            }
            
            predictions[f'{risk_level}_risk'].append(user_prediction)
            
            # Everyone with medium+ risk needs encouragement
            if risk_level in ['medium', 'high']:
                predictions['encouragement_needed'].append(user_prediction)
        
        # Generate insights
        total_users = len(users)
        high_risk_count = len(predictions['high_risk'])
        medium_risk_count = len(predictions['medium_risk'])
        
        predictions['insights'] = [
            f"📊 Risk Analysis: {high_risk_count} high risk, {medium_risk_count} medium risk out of {total_users} users",
            f"🎯 Focus Area: {'Early streak support' if high_risk_count > 0 else 'Maintaining momentum'}",
            f"💡 Strategy: {'Immediate intervention needed' if high_risk_count > 1 else 'Routine encouragement'}"
        ]
        
        return predictions

def main():
    """Run streak risk prediction analysis"""
    predictor = StreakRiskPredictor()
    results = predictor.predict_risks()
    
    print("🔮 STREAK RISK PREDICTION ANALYSIS")
    print("=" * 50)
    
    # Show insights
    print("\n💡 KEY INSIGHTS:")
    for insight in results['insights']:
        print(f"   {insight}")
    
    # Show high-risk users
    if results['high_risk']:
        print(f"\n🔴 HIGH RISK USERS ({len(results['high_risk'])}):")
        for user in results['high_risk']:
            print(f"   {user['handle']} - {user['current_streak']} days")
            for factor in user['risk_factors']:
                print(f"     • {factor}")
            print(f"     💬 Suggestion: {user['encouragement']}")
    
    # Show medium-risk users  
    if results['medium_risk']:
        print(f"\n🟡 MEDIUM RISK USERS ({len(results['medium_risk'])}):")
        for user in results['medium_risk']:
            print(f"   {user['handle']} - {user['current_streak']} days")
            for factor in user['risk_factors']:
                print(f"     • {factor}")
    
    # Show low-risk users
    if results['low_risk']:
        print(f"\n🟢 LOW RISK USERS ({len(results['low_risk'])}):")
        for user in results['low_risk']:
            print(f"   {user['handle']} - {user['current_streak']} days ✨")
    
    # Encouragement recommendations
    if results['encouragement_needed']:
        print(f"\n📢 ENCOURAGEMENT RECOMMENDATIONS:")
        for user in results['encouragement_needed']:
            print(f"   DM {user['handle']}: {user['encouragement']}")
    else:
        print("\n✨ All users looking stable - routine check-ins sufficient!")
    
    print("\n" + "=" * 50)
    print("🎯 Use these insights to prioritize your encouragement efforts!")

if __name__ == "__main__":
    main()