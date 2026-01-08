#!/usr/bin/env python3
"""
🎯 Critical Day 2 Transition Analytics
Built by @streaks-agent for the most important retention period

Analyzes users at the Day 1 → Day 2 transition and provides
actionable insights for maintaining engagement momentum.
"""

import json
from datetime import datetime, timedelta
import os

class CriticalDay2Analytics:
    def __init__(self):
        self.streaks_file = "data/streaks.json"
        self.achievements_file = "achievements.json"
        self.current_time = datetime.now()
        
    def load_data(self):
        """Load streak and achievement data"""
        try:
            with open(self.streaks_file, 'r') as f:
                self.streaks = json.load(f)
        except FileNotFoundError:
            self.streaks = {}
            
        try:
            with open(self.achievements_file, 'r') as f:
                self.achievements = json.load(f)
        except FileNotFoundError:
            self.achievements = {"user_achievements": {}}
    
    def analyze_day2_risks(self):
        """Identify users at critical Day 2 transition"""
        critical_users = []
        
        for handle, data in self.streaks.items():
            current_streak = data.get('current_streak', 0)
            last_activity = data.get('last_active')
            
            # Users with exactly 1 day streak are at Day 1 → Day 2 transition
            if current_streak == 1:
                risk_level = self.calculate_day2_risk(handle, last_activity)
                critical_users.append({
                    'handle': handle,
                    'current_streak': current_streak,
                    'last_activity': last_activity,
                    'risk_level': risk_level,
                    'has_first_day_badge': self.has_first_day_badge(handle),
                    'hours_since_last_activity': self.hours_since_activity(last_activity),
                    'next_milestone': 'Early Bird 🌅 (3 days)',
                    'days_to_milestone': 2,
                    'encouragement_priority': risk_level
                })
        
        return sorted(critical_users, key=lambda x: x['risk_level'], reverse=True)
    
    def calculate_day2_risk(self, handle, last_activity):
        """Calculate risk score for Day 2 dropout (0-100)"""
        if not last_activity:
            return 100  # No activity data = highest risk
        
        try:
            last_active = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
            hours_inactive = (self.current_time - last_active).total_seconds() / 3600
            
            # Risk increases with time since last activity
            if hours_inactive < 12:
                return 20  # Very low risk - active recently
            elif hours_inactive < 24:
                return 40  # Low risk - within 24h
            elif hours_inactive < 36:
                return 70  # Moderate risk - over 24h
            else:
                return 90  # High risk - over 36h without activity
                
        except Exception:
            return 60  # Default moderate risk if parsing fails
    
    def has_first_day_badge(self, handle):
        """Check if user has earned First Day badge"""
        clean_handle = handle.replace('@', '')
        user_badges = self.achievements.get('user_achievements', {}).get(clean_handle, [])
        return any(badge.get('id') == 'first_day' for badge in user_badges)
    
    def hours_since_activity(self, last_activity):
        """Calculate hours since last activity"""
        if not last_activity:
            return None
        
        try:
            last_active = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
            return round((self.current_time - last_active).total_seconds() / 3600, 1)
        except Exception:
            return None
    
    def generate_engagement_recommendations(self, critical_users):
        """Generate specific recommendations for @streaks-agent"""
        recommendations = []
        
        for user in critical_users:
            handle = user['handle']
            risk = user['risk_level']
            hours_inactive = user['hours_since_last_activity'] or 0
            
            if risk >= 80:
                recommendations.append({
                    'priority': 'HIGH',
                    'handle': handle,
                    'action': 'gentle_check_in',
                    'message': f"Hey {handle}! 🌱 Your Day 1 streak is looking great - just wanted to check how the workshop is feeling for you so far. Early Bird badge is just 2 days away! 🌅",
                    'timing': 'immediate',
                    'reason': f'High risk ({risk}%) - {hours_inactive}h inactive'
                })
            elif risk >= 50:
                recommendations.append({
                    'priority': 'MEDIUM', 
                    'handle': handle,
                    'action': 'milestone_reminder',
                    'message': f"Morning {handle}! 🌅 You're doing great with your Day 1 streak. Early Bird badge unlocks at 3 days - that's tomorrow if you keep it up! 💪",
                    'timing': 'when_online',
                    'reason': f'Moderate risk ({risk}%) - Day 2 critical period'
                })
            else:
                recommendations.append({
                    'priority': 'LOW',
                    'handle': handle, 
                    'action': 'positive_reinforcement',
                    'message': f"Love seeing you active, {handle}! 🔥 Day 1 complete, Early Bird badge incoming in 2 days. You've got this!",
                    'timing': 'natural_interaction',
                    'reason': f'Low risk ({risk}%) - maintain positive momentum'
                })
        
        return recommendations
    
    def calculate_community_day2_health(self, critical_users):
        """Calculate overall Day 2 transition health score"""
        if not critical_users:
            return {'score': 100, 'status': 'excellent', 'message': 'No users at Day 2 risk transition'}
        
        avg_risk = sum(user['risk_level'] for user in critical_users) / len(critical_users)
        users_with_badges = sum(1 for user in critical_users if user['has_first_day_badge'])
        badge_rate = (users_with_badges / len(critical_users)) * 100
        
        # Health score based on inverse of risk + badge completion
        health_score = max(0, min(100, (100 - avg_risk) * 0.7 + badge_rate * 0.3))
        
        if health_score >= 80:
            status = 'excellent'
            message = f'{len(critical_users)} users navigating Day 2 successfully'
        elif health_score >= 60:
            status = 'good'
            message = f'{len(critical_users)} users need gentle Day 2 support'
        elif health_score >= 40:
            status = 'concerning'
            message = f'{len(critical_users)} users at moderate Day 2 risk'
        else:
            status = 'critical'
            message = f'{len(critical_users)} users at high Day 2 dropout risk'
        
        return {
            'score': round(health_score, 1),
            'status': status,
            'message': message,
            'users_at_risk': len(critical_users),
            'avg_risk_level': round(avg_risk, 1),
            'badge_completion_rate': round(badge_rate, 1)
        }
    
    def generate_analytics_report(self):
        """Generate comprehensive Day 2 analytics report"""
        self.load_data()
        critical_users = self.analyze_day2_risks()
        recommendations = self.generate_engagement_recommendations(critical_users)
        community_health = self.calculate_community_day2_health(critical_users)
        
        report = {
            'timestamp': self.current_time.isoformat(),
            'analysis_focus': 'Critical Day 2 Transition Period',
            'users_at_day2_transition': len(critical_users),
            'critical_users': critical_users,
            'engagement_recommendations': recommendations,
            'community_health': community_health,
            'key_insights': self.generate_key_insights(critical_users, community_health),
            'streaks_agent_priorities': self.generate_agent_priorities(recommendations)
        }
        
        return report
    
    def generate_key_insights(self, critical_users, health):
        """Generate actionable insights"""
        insights = []
        
        if not critical_users:
            insights.append("No users currently at Day 2 transition - focus on general engagement")
        else:
            high_risk = [u for u in critical_users if u['risk_level'] >= 70]
            if high_risk:
                insights.append(f"{len(high_risk)} users need immediate Day 2 support")
            
            badges_complete = sum(1 for u in critical_users if u['has_first_day_badge'])
            if badges_complete == len(critical_users):
                insights.append("Perfect First Day badge completion - good foundation")
            else:
                insights.append(f"{len(critical_users) - badges_complete} users missing First Day badges")
            
            avg_inactive = sum(u['hours_since_last_activity'] or 0 for u in critical_users) / len(critical_users)
            if avg_inactive > 24:
                insights.append(f"Average {avg_inactive:.1f}h since activity - engagement window closing")
            else:
                insights.append(f"Recent activity ({avg_inactive:.1f}h avg) - good engagement window")
        
        return insights
    
    def generate_agent_priorities(self, recommendations):
        """Generate prioritized action list for @streaks-agent"""
        high_priority = [r for r in recommendations if r['priority'] == 'HIGH']
        medium_priority = [r for r in recommendations if r['priority'] == 'MEDIUM']
        
        priorities = []
        
        if high_priority:
            priorities.append({
                'action': 'immediate_outreach',
                'users': [r['handle'] for r in high_priority],
                'count': len(high_priority),
                'message': 'Send gentle check-in DMs to high-risk Day 2 users'
            })
        
        if medium_priority:
            priorities.append({
                'action': 'observe_and_encourage',
                'users': [r['handle'] for r in medium_priority],
                'count': len(medium_priority),
                'message': 'Monitor via observe_vibe() and encourage when online'
            })
        
        priorities.append({
            'action': 'prepare_early_bird_celebrations',
            'users': [r['handle'] for r in recommendations],
            'count': len(recommendations),
            'message': 'Prepare Early Bird badge celebrations for Day 3 achievement'
        })
        
        return priorities

def main():
    """Run Day 2 analytics and output report"""
    analytics = CriticalDay2Analytics()
    report = analytics.generate_analytics_report()
    
    # Save detailed report
    with open('day2_transition_report.json', 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    # Print executive summary for @streaks-agent
    print("🎯 CRITICAL DAY 2 TRANSITION ANALYTICS")
    print("=" * 50)
    print(f"⏰ Analysis Time: {report['timestamp']}")
    print(f"👥 Users at Day 2 Transition: {report['users_at_day2_transition']}")
    print(f"📊 Community Health: {report['community_health']['score']}/100 ({report['community_health']['status']})")
    print(f"💡 Status: {report['community_health']['message']}")
    print()
    
    print("🔥 KEY INSIGHTS:")
    for insight in report['key_insights']:
        print(f"  • {insight}")
    print()
    
    print("🎯 IMMEDIATE PRIORITIES FOR @streaks-agent:")
    for i, priority in enumerate(report['streaks_agent_priorities'], 1):
        print(f"  {i}. {priority['message']} ({priority['count']} users)")
    print()
    
    print("📋 DETAILED RECOMMENDATIONS:")
    for rec in report['engagement_recommendations']:
        print(f"  {rec['priority']} - {rec['handle']}: {rec['action']}")
        print(f"    → {rec['reason']}")
    
    print("\n📄 Full report saved to: day2_transition_report.json")

if __name__ == "__main__":
    main()