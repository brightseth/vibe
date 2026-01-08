#!/usr/bin/env python3
"""
🔮 Enhanced Streak Engagement Predictor v2
Analyzes current streak patterns and predicts engagement risks
Built by @streaks-agent for /vibe workshop gamification
"""

import json
from datetime import datetime, timedelta
import os

class StreakEngagementPredictor:
    def __init__(self):
        self.risk_thresholds = {
            'critical': 0.8,    # High risk of dropping
            'moderate': 0.5,    # Some risk 
            'low': 0.2,         # Stable engagement
        }
        
        self.milestone_motivation = {
            1: {'next': 3, 'motivation': 'high', 'message': 'Just getting started! 🌱'},
            2: {'next': 3, 'motivation': 'high', 'message': 'Almost to first milestone! 🔥'},
            3: {'next': 7, 'motivation': 'medium', 'message': 'Great momentum, week goal next! 💪'},
            4: {'next': 7, 'motivation': 'medium', 'message': 'Consistency building! 📈'},
            5: {'next': 7, 'motivation': 'medium', 'message': 'Week milestone almost there! 🎯'},
            6: {'next': 7, 'motivation': 'high', 'message': 'Tomorrow is WEEK WARRIOR! 🏆'},
            7: {'next': 14, 'motivation': 'high', 'message': 'WEEK WARRIOR achieved! Next: 2 weeks! ⚡'},
        }

    def load_streak_data(self):
        """Load current streak data from memory/files"""
        try:
            # Try to read from existing analytics files
            if os.path.exists('streak_data.json'):
                with open('streak_data.json', 'r') as f:
                    return json.load(f)
            else:
                # Default data if no file exists
                return {
                    '@demo_user': {'current': 1, 'best': 1, 'last_active': '2026-01-08'},
                    '@vibe_champion': {'current': 1, 'best': 1, 'last_active': '2026-01-08'}
                }
        except:
            return {}

    def calculate_engagement_risk(self, user, streak_data):
        """Calculate risk score for a user based on streak patterns"""
        if user not in streak_data:
            return {'risk_level': 'unknown', 'score': 0.5, 'factors': ['No data available']}
        
        data = streak_data[user]
        current_streak = data.get('current', 0)
        best_streak = data.get('best', 0)
        
        risk_factors = []
        risk_score = 0.0
        
        # Factor 1: Current streak length (longer = more investment)
        if current_streak <= 1:
            risk_score += 0.3
            risk_factors.append(f'New streak ({current_streak} day)')
        elif current_streak < 7:
            risk_score += 0.2
            risk_factors.append(f'Early streak ({current_streak} days)')
        elif current_streak < 30:
            risk_score += 0.1
            risk_factors.append(f'Building momentum ({current_streak} days)')
        else:
            risk_score += 0.05
            risk_factors.append(f'Strong habit ({current_streak} days)')
        
        # Factor 2: Approaching milestone (higher motivation near goals)
        days_to_next = self._days_to_next_milestone(current_streak)
        if days_to_next == 1:
            risk_score -= 0.2  # Very motivated before milestone
            risk_factors.append('Milestone tomorrow! High motivation')
        elif days_to_next <= 3:
            risk_score -= 0.1  # Approaching milestone
            risk_factors.append(f'Milestone in {days_to_next} days')
        
        # Factor 3: Progress vs personal best
        if current_streak == best_streak:
            risk_score -= 0.1  # Currently at personal best
            risk_factors.append('At personal best streak!')
        elif current_streak < best_streak * 0.5:
            risk_score += 0.2
            risk_factors.append(f'Below half of best streak ({best_streak})')
        
        # Factor 4: Day of week patterns (weekends are riskier)
        today = datetime.now().strftime('%A')
        if today in ['Saturday', 'Sunday']:
            risk_score += 0.1
            risk_factors.append('Weekend - typically lower activity')
        
        # Determine risk level
        if risk_score >= self.risk_thresholds['critical']:
            risk_level = 'critical'
        elif risk_score >= self.risk_thresholds['moderate']:
            risk_level = 'moderate'
        else:
            risk_level = 'low'
        
        return {
            'risk_level': risk_level,
            'score': min(1.0, max(0.0, risk_score)),  # Clamp to 0-1
            'factors': risk_factors,
            'current_streak': current_streak,
            'next_milestone': self._get_next_milestone(current_streak),
            'motivation_message': self.milestone_motivation.get(current_streak, {}).get('message', 'Keep going! 🚀')
        }

    def _days_to_next_milestone(self, current_streak):
        """Calculate days until next milestone"""
        milestones = [3, 7, 14, 30, 100]
        for milestone in milestones:
            if current_streak < milestone:
                return milestone - current_streak
        return 365 - current_streak  # Next year milestone

    def _get_next_milestone(self, current_streak):
        """Get the next milestone target"""
        milestones = [
            (3, "Getting Started 🌱"),
            (7, "Week Warrior 💪"),
            (14, "Two Week Champion 🔥"),
            (30, "Monthly Legend 🏆"),
            (100, "Century Club 👑")
        ]
        
        for days, name in milestones:
            if current_streak < days:
                return {'days': days, 'name': name, 'progress': current_streak / days}
        
        return {'days': 365, 'name': 'Year Legend 🌟', 'progress': current_streak / 365}

    def generate_engagement_report(self):
        """Generate comprehensive engagement risk report"""
        streak_data = self.load_streak_data()
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_users': len(streak_data),
            'risk_analysis': {},
            'high_risk_users': [],
            'celebrations_ready': [],
            'recommendations': [],
            'summary_stats': {
                'critical_risk': 0,
                'moderate_risk': 0, 
                'low_risk': 0,
                'avg_streak': 0,
                'approaching_milestones': 0
            }
        }
        
        total_streak = 0
        for user, data in streak_data.items():
            analysis = self.calculate_engagement_risk(user, streak_data)
            report['risk_analysis'][user] = analysis
            
            # Track summary stats
            report['summary_stats'][f'{analysis["risk_level"]}_risk'] += 1
            total_streak += analysis['current_streak']
            
            # Flag high risk users for intervention
            if analysis['risk_level'] == 'critical':
                report['high_risk_users'].append({
                    'user': user,
                    'streak': analysis['current_streak'],
                    'factors': analysis['factors']
                })
            
            # Check for celebration opportunities
            if analysis['current_streak'] in [3, 7, 14, 30, 100]:
                report['celebrations_ready'].append({
                    'user': user,
                    'milestone': analysis['next_milestone']['name'],
                    'achievement': f"{analysis['current_streak']} days!"
                })
            
            # Check for approaching milestones
            days_to_next = self._days_to_next_milestone(analysis['current_streak'])
            if days_to_next <= 2:
                report['summary_stats']['approaching_milestones'] += 1
        
        # Calculate average
        if len(streak_data) > 0:
            report['summary_stats']['avg_streak'] = total_streak / len(streak_data)
        
        # Generate recommendations
        report['recommendations'] = self._generate_recommendations(report)
        
        return report

    def _generate_recommendations(self, report):
        """Generate actionable recommendations based on analysis"""
        recommendations = []
        
        # High risk interventions
        if report['high_risk_users']:
            recommendations.append({
                'priority': 'high',
                'action': 'Send encouragement DMs to high-risk users',
                'users': [user['user'] for user in report['high_risk_users']],
                'message': 'Personal check-in with motivation message'
            })
        
        # Celebration opportunities
        if report['celebrations_ready']:
            recommendations.append({
                'priority': 'high', 
                'action': 'Celebrate milestone achievements',
                'celebrations': report['celebrations_ready'],
                'message': 'Recognize achievements publicly'
            })
        
        # Approaching milestones
        if report['summary_stats']['approaching_milestones'] > 0:
            recommendations.append({
                'priority': 'medium',
                'action': 'Send milestone reminder encouragement',
                'count': report['summary_stats']['approaching_milestones'],
                'message': 'Build anticipation for upcoming achievements'
            })
        
        # General engagement
        if report['summary_stats']['avg_streak'] < 3:
            recommendations.append({
                'priority': 'medium',
                'action': 'Run engagement challenge or event',
                'reason': 'Low average streak indicates need for motivation boost',
                'suggestion': 'Create weekly challenge or buddy system'
            })
        
        return recommendations

    def save_report(self, report, filename=None):
        """Save report to file"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M')
            filename = f'streak_engagement_report_{timestamp}.json'
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        return filename

def main():
    """Run the engagement predictor and generate report"""
    print("🔮 Streak Engagement Predictor v2")
    print("=" * 40)
    
    predictor = StreakEngagementPredictor()
    report = predictor.generate_engagement_report()
    
    # Display summary
    print(f"\n📊 Analysis Summary ({report['total_users']} users)")
    print(f"Average streak: {report['summary_stats']['avg_streak']:.1f} days")
    print(f"Risk levels:")
    print(f"  🔴 Critical: {report['summary_stats']['critical_risk']} users")
    print(f"  🟡 Moderate: {report['summary_stats']['moderate_risk']} users")
    print(f"  🟢 Low: {report['summary_stats']['low_risk']} users")
    
    # Show detailed analysis
    print(f"\n🎯 User Analysis:")
    for user, analysis in report['risk_analysis'].items():
        risk_emoji = {'critical': '🔴', 'moderate': '🟡', 'low': '🟢'}.get(analysis['risk_level'], '⚪')
        print(f"  {risk_emoji} {user}: {analysis['current_streak']} days ({analysis['risk_level']} risk)")
        print(f"     {analysis['motivation_message']}")
        if analysis['factors']:
            print(f"     Factors: {', '.join(analysis['factors'][:2])}")
    
    # Show recommendations
    if report['recommendations']:
        print(f"\n💡 Recommendations:")
        for i, rec in enumerate(report['recommendations'][:3], 1):
            priority_emoji = {'high': '🚨', 'medium': '📋', 'low': '💭'}.get(rec['priority'], '📝')
            print(f"  {i}. {priority_emoji} {rec['action']}")
    
    # Save detailed report
    filename = predictor.save_report(report)
    print(f"\n📁 Detailed report saved: {filename}")
    
    return report

if __name__ == "__main__":
    main()