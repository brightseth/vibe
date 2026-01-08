#!/usr/bin/env python3
"""
🔮 Streak Risk Predictor for @streaks-agent

Analyzes user patterns to predict streak break risk and suggest interventions.
Built to enhance the existing analytics dashboard with proactive engagement.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

class StreakRiskPredictor:
    """Predicts streak break risk and suggests interventions"""
    
    def __init__(self):
        self.risk_factors = {
            'new_user': 0.4,  # First week users have higher drop risk
            'weekend_gap': 0.3,  # Friday -> Monday gaps are risky
            'milestone_plateau': 0.25,  # Users may relax after achievements
            'no_community': 0.35,  # Users without social connections drop more
            'single_activity': 0.2   # Users with varied activities stay longer
        }
        
        self.interventions = {
            'high_risk': [
                "🌟 Quick check-in message from @streaks-agent",
                "🎯 Suggest easy wins (ship something small)",
                "👥 Connect them with similar-streak users",
                "🏆 Highlight next milestone proximity"
            ],
            'medium_risk': [
                "📊 Share their progress visualization", 
                "🎉 Celebrate recent achievements",
                "💡 Suggest new workshop activities",
                "🤝 Introduce to community members"
            ],
            'low_risk': [
                "⭐ Acknowledge consistency",
                "📈 Share community impact of their participation",
                "🚀 Challenge them with next-level activities"
            ]
        }
    
    def load_streak_data(self) -> Dict:
        """Load current streak data"""
        try:
            with open('streak_dashboard_data.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"leaderboard": []}
    
    def load_achievements(self) -> Dict:
        """Load achievement data"""
        try:
            with open('achievements.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"user_achievements": {}}
    
    def calculate_risk_score(self, user_data: Dict, achievements: Dict) -> float:
        """Calculate streak break risk score (0-1, higher = more risk)"""
        risk_score = 0.0
        
        handle = user_data['handle'].replace('@', '')
        current_streak = user_data['current_streak']
        best_streak = user_data['best_streak']
        
        # New user risk (first week)
        if current_streak <= 7:
            risk_score += self.risk_factors['new_user'] * (8 - current_streak) / 7
        
        # Milestone plateau risk (just achieved something)
        user_achievements = achievements.get('user_achievements', {}).get(handle, [])
        recent_achievement = any(
            self._is_recent_achievement(ach) for ach in user_achievements
        )
        if recent_achievement:
            risk_score += self.risk_factors['milestone_plateau']
        
        # Weekend gap risk (would need activity tracking for this)
        # For now, we'll use current day of week as a proxy
        current_day = datetime.now().weekday()  # 0=Monday, 6=Sunday
        if current_day in [5, 6]:  # Weekend
            risk_score += self.risk_factors['weekend_gap'] * 0.5
        
        # Activity diversity risk (only one type of engagement)
        badge_count = user_data.get('badge_count', 0)
        if badge_count <= 1:
            risk_score += self.risk_factors['single_activity']
        
        # Cap risk score at 1.0
        return min(risk_score, 1.0)
    
    def _is_recent_achievement(self, achievement: Dict) -> bool:
        """Check if achievement was earned recently (within 2 days)"""
        try:
            earned_at = datetime.fromisoformat(achievement['earned_at'].replace('Z', '+00:00'))
            time_since = datetime.now() - earned_at.replace(tzinfo=None)
            return time_since.days <= 2
        except (KeyError, ValueError):
            return False
    
    def categorize_risk(self, risk_score: float) -> str:
        """Categorize risk level"""
        if risk_score >= 0.6:
            return 'high_risk'
        elif risk_score >= 0.3:
            return 'medium_risk'
        else:
            return 'low_risk'
    
    def suggest_interventions(self, risk_level: str) -> List[str]:
        """Get intervention suggestions for risk level"""
        return self.interventions.get(risk_level, [])
    
    def analyze_all_users(self) -> Dict:
        """Analyze risk for all users and generate action plan"""
        streak_data = self.load_streak_data()
        achievements = self.load_achievements()
        
        analysis = {
            'users': [],
            'summary': {
                'high_risk': 0,
                'medium_risk': 0,
                'low_risk': 0,
                'total_users': 0
            },
            'recommended_actions': [],
            'generated_at': datetime.now().isoformat()
        }
        
        for user in streak_data.get('leaderboard', []):
            risk_score = self.calculate_risk_score(user, achievements)
            risk_level = self.categorize_risk(risk_score)
            interventions = self.suggest_interventions(risk_level)
            
            user_analysis = {
                'handle': user['handle'],
                'current_streak': user['current_streak'],
                'risk_score': round(risk_score, 3),
                'risk_level': risk_level,
                'suggested_interventions': interventions[:2],  # Top 2 suggestions
                'next_milestone': self._get_next_milestone(user['current_streak']),
                'days_to_milestone': self._days_to_next_milestone(user['current_streak'])
            }
            
            analysis['users'].append(user_analysis)
            analysis['summary'][risk_level] += 1
            analysis['summary']['total_users'] += 1
            
            # Add to recommended actions if high/medium risk
            if risk_level in ['high_risk', 'medium_risk']:
                action = f"{risk_level.replace('_', ' ').title()}: {user['handle']} - {interventions[0]}"
                analysis['recommended_actions'].append(action)
        
        return analysis
    
    def _get_next_milestone(self, current_streak: int) -> str:
        """Get next milestone name for current streak"""
        milestones = {
            3: "Early Bird 🌅",
            7: "Week Warrior 💪", 
            14: "Consistency King 🔥",
            30: "Monthly Legend 🏆",
            100: "Century Club 👑"
        }
        
        for threshold, name in milestones.items():
            if current_streak < threshold:
                return name
        return "Legendary Status 🌟"
    
    def _days_to_next_milestone(self, current_streak: int) -> int:
        """Calculate days to next milestone"""
        milestones = [3, 7, 14, 30, 100]
        
        for milestone in milestones:
            if current_streak < milestone:
                return milestone - current_streak
        return 0
    
    def generate_report(self) -> str:
        """Generate a formatted risk analysis report"""
        analysis = self.analyze_all_users()
        
        report = f"""
🔮 STREAK RISK ANALYSIS REPORT
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}

📊 RISK SUMMARY:
• 🔴 High Risk: {analysis['summary']['high_risk']} users
• 🟡 Medium Risk: {analysis['summary']['medium_risk']} users  
• 🟢 Low Risk: {analysis['summary']['low_risk']} users
• 👥 Total Users: {analysis['summary']['total_users']}

👤 USER ANALYSIS:
"""
        
        for user in analysis['users']:
            risk_emoji = {'high_risk': '🔴', 'medium_risk': '🟡', 'low_risk': '🟢'}[user['risk_level']]
            
            report += f"""
{risk_emoji} {user['handle']} (Streak: {user['current_streak']} days)
   • Risk Score: {user['risk_score']}/1.0 ({user['risk_level'].replace('_', ' ')})
   • Next: {user['next_milestone']} in {user['days_to_milestone']} days
   • Actions: {user['suggested_interventions'][0]}
"""
        
        if analysis['recommended_actions']:
            report += f"\n🎯 PRIORITY ACTIONS:\n"
            for action in analysis['recommended_actions'][:3]:  # Top 3 priorities
                report += f"   • {action}\n"
        
        report += f"\n🤖 Built by @streaks-agent for proactive community engagement"
        
        return report

def main():
    """Run streak risk analysis"""
    predictor = StreakRiskPredictor()
    
    # Generate analysis
    analysis = predictor.analyze_all_users()
    
    # Save detailed analysis
    with open('streak_risk_analysis.json', 'w') as f:
        json.dump(analysis, f, indent=2)
    
    # Print summary report
    report = predictor.generate_report()
    print(report)
    
    # Save report
    with open('streak_risk_report.md', 'w') as f:
        f.write(f"# Streak Risk Analysis\n\n{report}")
    
    print(f"\n📁 Detailed analysis saved to: streak_risk_analysis.json")
    print(f"📄 Report saved to: streak_risk_report.md")

if __name__ == "__main__":
    main()