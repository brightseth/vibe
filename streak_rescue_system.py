#!/usr/bin/env python3
"""
🛟 Streak Rescue System
Built by @streaks-agent for /vibe workshop

Proactive system that identifies users at risk of breaking streaks
and provides targeted intervention suggestions.
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any

class StreakRescueSystem:
    def __init__(self):
        self.risk_factors = {
            'low_streak': 0.3,      # Users with 1-3 day streaks are more fragile
            'plateau': 0.2,         # Users stuck at same streak for multiple cycles  
            'declining_engagement': 0.4,  # Users with decreasing activity
            'isolation': 0.1        # Users without peer connections
        }
        
        self.intervention_strategies = {
            'encouragement': {
                'trigger': 'low_confidence',
                'message_template': "You've got this! Just {days_to_next} more days to {next_milestone}! 🌟",
                'dm_required': True
            },
            'peer_challenge': {
                'trigger': 'matched_streak_levels',
                'message_template': "Challenge @{peer} to see who hits {milestone} first! 🏁",
                'dm_required': False,
                'board_post': True
            },
            'milestone_focus': {
                'trigger': 'approaching_milestone', 
                'message_template': "Only {days_left} days until your {milestone} badge! You can do it! 💪",
                'dm_required': True
            },
            'comeback_bonus': {
                'trigger': 'broken_streak',
                'message_template': "Restart your streak today and get a 2x progress bonus for your first 3 days! 🔥",
                'dm_required': True
            }
        }

    def load_streak_data(self) -> Dict[str, Any]:
        """Load current streak data from JSON files"""
        data = {}
        
        # Load basic streak data
        if os.path.exists('streak_dashboard_data.json'):
            with open('streak_dashboard_data.json', 'r') as f:
                data['streaks'] = json.load(f)
        
        # Load achievements data
        if os.path.exists('achievements.json'):
            with open('achievements.json', 'r') as f:
                data['achievements'] = json.load(f)
                
        return data

    def calculate_risk_score(self, user: Dict[str, Any]) -> float:
        """Calculate risk score for a user (0.0 = safe, 1.0 = high risk)"""
        risk_score = 0.0
        factors_triggered = []
        
        current_streak = user.get('current_streak', 0)
        best_streak = user.get('best_streak', 0)
        
        # Low streak risk (1-3 days are fragile)
        if 1 <= current_streak <= 3:
            risk_score += self.risk_factors['low_streak']
            factors_triggered.append('low_streak')
        
        # Plateau risk (streak not improving)
        if current_streak == best_streak and current_streak > 0:
            risk_score += self.risk_factors['plateau']
            factors_triggered.append('plateau')
            
        # Zero streak = high risk of giving up
        if current_streak == 0:
            risk_score += self.risk_factors['declining_engagement']
            factors_triggered.append('broken_streak')
        
        return min(risk_score, 1.0), factors_triggered

    def identify_at_risk_users(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify users who need intervention"""
        at_risk = []
        leaderboard = data.get('streaks', {}).get('leaderboard', [])
        
        for user in leaderboard:
            risk_score, factors = self.calculate_risk_score(user)
            
            if risk_score > 0.2:  # Threshold for intervention
                risk_assessment = {
                    'user': user,
                    'risk_score': risk_score,
                    'risk_level': self.get_risk_level(risk_score),
                    'factors': factors,
                    'interventions': self.suggest_interventions(user, factors)
                }
                at_risk.append(risk_assessment)
                
        return at_risk

    def get_risk_level(self, risk_score: float) -> str:
        """Convert risk score to human-readable level"""
        if risk_score >= 0.7:
            return "HIGH"
        elif risk_score >= 0.4:
            return "MEDIUM"  
        else:
            return "LOW"

    def suggest_interventions(self, user: Dict[str, Any], factors: List[str]) -> List[Dict[str, Any]]:
        """Suggest specific interventions for a user"""
        interventions = []
        current_streak = user.get('current_streak', 0)
        
        # Encouragement for low streaks
        if 'low_streak' in factors or 'plateau' in factors:
            interventions.append({
                'type': 'encouragement',
                'priority': 'high',
                'message': f"You've got this! Just keep showing up each day! 💪",
                'action': 'dm_user',
                'timing': 'immediate'
            })
        
        # Milestone focus for approaching achievements
        if current_streak >= 1:
            days_to_next = 3 - current_streak  # Next milestone at 3 days
            if days_to_next <= 2:
                interventions.append({
                    'type': 'milestone_focus',
                    'priority': 'high', 
                    'message': f"Only {days_to_next} more days until your Getting Started badge! 🌱",
                    'action': 'dm_user',
                    'timing': 'immediate'
                })
        
        # Comeback bonus for broken streaks
        if 'broken_streak' in factors:
            interventions.append({
                'type': 'comeback_bonus',
                'priority': 'medium',
                'message': "Ready to restart? Your next 3 days count double toward milestones! 🔥",
                'action': 'dm_user',
                'timing': 'immediate'
            })
            
        return interventions

    def generate_peer_challenges(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify opportunities for peer challenges"""
        challenges = []
        leaderboard = data.get('streaks', {}).get('leaderboard', [])
        
        # Group users by similar streak levels
        by_streak = {}
        for user in leaderboard:
            streak = user.get('current_streak', 0)
            if streak not in by_streak:
                by_streak[streak] = []
            by_streak[streak].append(user)
        
        # Create challenges for matched groups
        for streak, users in by_streak.items():
            if len(users) >= 2 and streak > 0:  # At least 2 users at same level
                challenges.append({
                    'type': 'peer_challenge',
                    'users': [u['handle'] for u in users],
                    'current_level': streak,
                    'next_milestone': self.get_next_milestone(streak),
                    'message': f"Who will be first to reach {self.get_next_milestone(streak)}? Challenge accepted! 🏁",
                    'action': 'announce_ship'
                })
                
        return challenges

    def get_next_milestone(self, current_streak: int) -> str:
        """Get the next milestone name for a given streak"""
        milestones = {
            3: "Getting Started 🌱",
            7: "Week Warrior 💪", 
            14: "Consistency King 🔥",
            30: "Monthly Legend 🏆",
            100: "Century Club 👑"
        }
        
        for threshold, name in sorted(milestones.items()):
            if current_streak < threshold:
                return name
        return "Legendary Status 👑"

    def generate_rescue_report(self) -> Dict[str, Any]:
        """Generate comprehensive rescue system report"""
        data = self.load_streak_data()
        at_risk_users = self.identify_at_risk_users(data)
        peer_challenges = self.generate_peer_challenges(data)
        
        # Summary statistics
        total_users = len(data.get('streaks', {}).get('leaderboard', []))
        high_risk = len([u for u in at_risk_users if u['risk_level'] == 'HIGH'])
        medium_risk = len([u for u in at_risk_users if u['risk_level'] == 'MEDIUM'])
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_users': total_users,
                'at_risk_count': len(at_risk_users),
                'high_risk': high_risk,
                'medium_risk': medium_risk,
                'intervention_opportunities': len(peer_challenges)
            },
            'at_risk_users': at_risk_users,
            'peer_challenges': peer_challenges,
            'recommendations': self.generate_strategic_recommendations(at_risk_users, peer_challenges),
            'next_check': (datetime.now() + timedelta(hours=6)).isoformat()
        }
        
        return report

    def generate_strategic_recommendations(self, at_risk: List[Dict], challenges: List[Dict]) -> List[str]:
        """Generate high-level strategic recommendations"""
        recommendations = []
        
        if len(at_risk) == 0:
            recommendations.append("✅ All users have healthy streak patterns!")
        else:
            high_risk_count = len([u for u in at_risk if u['risk_level'] == 'HIGH'])
            if high_risk_count > 0:
                recommendations.append(f"🚨 {high_risk_count} users need immediate intervention")
        
        if len(challenges) > 0:
            recommendations.append(f"🏁 {len(challenges)} peer challenge opportunities identified")
        
        # Always include engagement tips
        recommendations.append("💡 Day 1-3 users need extra encouragement")
        recommendations.append("⚡ Consider celebration for upcoming milestones")
        
        return recommendations

    def save_rescue_report(self, report: Dict[str, Any]) -> str:
        """Save rescue report to file"""
        filename = f"streak_rescue_report_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        return filename

def main():
    """Run streak rescue analysis"""
    print("🛟 Streak Rescue System - Analyzing user engagement...")
    
    rescue_system = StreakRescueSystem()
    report = rescue_system.generate_rescue_report()
    filename = rescue_system.save_rescue_report(report)
    
    # Print summary
    print(f"\n📊 Rescue Analysis Complete!")
    print(f"📁 Report saved: {filename}")
    print(f"👥 Total users analyzed: {report['summary']['total_users']}")
    print(f"⚠️  At-risk users: {report['summary']['at_risk_count']}")
    print(f"🏁 Challenge opportunities: {report['summary']['intervention_opportunities']}")
    
    # Print immediate actions needed
    if report['at_risk_users']:
        print(f"\n🚨 Immediate Actions Needed:")
        for user_risk in report['at_risk_users']:
            user_name = user_risk['user']['handle']
            risk_level = user_risk['risk_level']
            intervention_count = len(user_risk['interventions'])
            print(f"   {user_name}: {risk_level} risk, {intervention_count} interventions suggested")
    
    # Print strategic recommendations
    print(f"\n💡 Strategic Recommendations:")
    for rec in report['recommendations']:
        print(f"   {rec}")
        
    print(f"\n⏰ Next check scheduled: {report['next_check']}")
    
    return report

if __name__ == '__main__':
    main()