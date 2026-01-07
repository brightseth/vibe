#!/usr/bin/env python3
"""
🎯 Streak Coaching System
Advanced analytics and personalized coaching for streak maintenance and growth.
Built by @streaks-agent for /vibe workshop gamification.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class CoachingInsight:
    """Individual coaching recommendation."""
    user: str
    type: str  # 'encouragement', 'strategy', 'warning', 'celebration'
    message: str
    action_priority: int  # 1-5, 5 being most urgent
    timing: str  # 'immediate', 'today', 'tomorrow', 'this_week'

class StreakCoachingSystem:
    """Advanced coaching system for personalized streak guidance."""
    
    def __init__(self, streak_data: Dict[str, Dict]):
        self.streak_data = streak_data
        self.coaching_history = self._load_coaching_history()
        self.milestone_thresholds = [3, 7, 14, 30, 100]
        
    def _load_coaching_history(self) -> Dict:
        """Load previous coaching interactions to avoid spam."""
        try:
            with open('coaching_history.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def _save_coaching_history(self):
        """Save coaching interactions."""
        with open('coaching_history.json', 'w') as f:
            json.dump(self.coaching_history, f, indent=2)
    
    def analyze_streak_patterns(self) -> Dict[str, any]:
        """Analyze patterns across all users for insights."""
        patterns = {
            'risk_factors': [],
            'momentum_indicators': [],
            'community_health': {},
            'coaching_opportunities': []
        }
        
        total_users = len(self.streak_data)
        active_streaks = sum(1 for data in self.streak_data.values() 
                           if data['current'] > 0)
        
        # Community health metrics
        patterns['community_health'] = {
            'engagement_rate': active_streaks / total_users if total_users > 0 else 0,
            'average_streak': sum(data['current'] for data in self.streak_data.values()) / total_users if total_users > 0 else 0,
            'retention_strength': self._calculate_retention_strength(),
            'momentum_phase': self._identify_momentum_phase()
        }
        
        # Risk pattern detection
        for user, data in self.streak_data.items():
            current = data['current']
            best = data['best']
            
            # Pattern analysis
            if current == 0 and best > 3:
                patterns['risk_factors'].append(f"{user}: Experienced user with broken streak")
            elif current > 0 and current == best:
                patterns['momentum_indicators'].append(f"{user}: Building new personal record")
            elif current > 0 and current < best * 0.5:
                patterns['coaching_opportunities'].append(f"{user}: Below 50% of personal best")
        
        return patterns
    
    def generate_personal_coaching(self, user: str) -> List[CoachingInsight]:
        """Generate personalized coaching insights for a user."""
        if user not in self.streak_data:
            return []
        
        data = self.streak_data[user]
        current = data['current']
        best = data['best']
        insights = []
        
        # Milestone proximity coaching
        next_milestone = self._find_next_milestone(current)
        if next_milestone and next_milestone - current <= 2:
            days_away = next_milestone - current
            insights.append(CoachingInsight(
                user=user,
                type='encouragement',
                message=f"You're only {days_away} day{'s' if days_away > 1 else ''} away from your {next_milestone}-day milestone! 🎯",
                action_priority=4,
                timing='immediate'
            ))
        
        # Streak recovery coaching
        if current == 0 and best >= 3:
            insights.append(CoachingInsight(
                user=user,
                type='strategy',
                message=f"You've hit {best} days before - you know you can do it again! Start with just showing up today. 💪",
                action_priority=3,
                timing='immediate'
            ))
        
        # Personal record coaching
        if current > 0 and current == best:
            insights.append(CoachingInsight(
                user=user,
                type='celebration',
                message=f"You're in uncharted territory! Every day now is a new personal record. 🚀",
                action_priority=2,
                timing='today'
            ))
        
        # Consistency challenge
        if current >= 7 and current % 7 == 0:
            weeks = current // 7
            insights.append(CoachingInsight(
                user=user,
                type='celebration',
                message=f"🗓️ Week {weeks} complete! Your consistency is inspiring the community.",
                action_priority=2,
                timing='today'
            ))
        
        # Weekend warning (if we had date data)
        if current >= 3:
            insights.append(CoachingInsight(
                user=user,
                type='strategy',
                message="Weekends can be tricky - consider setting a simple reminder or finding an accountability buddy!",
                action_priority=2,
                timing='tomorrow'
            ))
        
        return insights
    
    def _find_next_milestone(self, current: int) -> Optional[int]:
        """Find the next milestone for a given streak length."""
        for milestone in self.milestone_thresholds:
            if milestone > current:
                return milestone
        return None
    
    def _calculate_retention_strength(self) -> float:
        """Calculate how well users maintain their streaks relative to their best."""
        if not self.streak_data:
            return 0.0
        
        retention_scores = []
        for data in self.streak_data.values():
            if data['best'] > 0:
                retention = data['current'] / data['best']
                retention_scores.append(retention)
        
        return sum(retention_scores) / len(retention_scores) if retention_scores else 0.0
    
    def _identify_momentum_phase(self) -> str:
        """Identify what phase the community is in."""
        total_users = len(self.streak_data)
        if total_users == 0:
            return "dormant"
        
        active_users = sum(1 for data in self.streak_data.values() if data['current'] > 0)
        avg_streak = sum(data['current'] for data in self.streak_data.values()) / total_users
        
        if active_users / total_users > 0.8 and avg_streak > 7:
            return "momentum_peak"
        elif active_users / total_users > 0.6:
            return "building_momentum"
        elif active_users / total_users > 0.3:
            return "mixed_engagement"
        else:
            return "needs_activation"
    
    def generate_community_coaching(self) -> List[CoachingInsight]:
        """Generate community-level coaching insights."""
        patterns = self.analyze_streak_patterns()
        insights = []
        
        health = patterns['community_health']
        phase = health['momentum_phase']
        
        # Phase-specific community coaching
        if phase == "building_momentum":
            insights.append(CoachingInsight(
                user="@everyone",
                type="encouragement",
                message="🔥 The community is building momentum! Let's keep this energy going - every day counts!",
                action_priority=3,
                timing="today"
            ))
        elif phase == "momentum_peak":
            insights.append(CoachingInsight(
                user="@everyone",
                type="celebration",
                message="🚀 Peak momentum! The consistency in this community is incredible. You're all inspiring each other!",
                action_priority=4,
                timing="immediate"
            ))
        elif phase == "needs_activation":
            insights.append(CoachingInsight(
                user="@everyone",
                type="strategy",
                message="💡 Fresh start opportunity! Sometimes the best day to begin is today. Small steps, big results.",
                action_priority=3,
                timing="today"
            ))
        
        return insights
    
    def export_coaching_dashboard(self) -> Dict:
        """Export data for coaching dashboard visualization."""
        patterns = self.analyze_streak_patterns()
        personal_coaching = {}
        
        for user in self.streak_data:
            personal_coaching[user] = self.generate_personal_coaching(user)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'community_patterns': patterns,
            'personal_coaching': {
                user: [
                    {
                        'type': insight.type,
                        'message': insight.message,
                        'priority': insight.action_priority,
                        'timing': insight.timing
                    }
                    for insight in insights
                ]
                for user, insights in personal_coaching.items()
            },
            'community_coaching': [
                {
                    'type': insight.type,
                    'message': insight.message,
                    'priority': insight.action_priority,
                    'timing': insight.timing
                }
                for insight in self.generate_community_coaching()
            ],
            'health_score': patterns['community_health']['engagement_rate'],
            'momentum_phase': patterns['community_health']['momentum_phase']
        }

def main():
    """Demo the coaching system with current streak data."""
    # Current streak data from the workshop
    streak_data = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    coaching_system = StreakCoachingSystem(streak_data)
    dashboard_data = coaching_system.export_coaching_dashboard()
    
    print("🎯 STREAK COACHING DASHBOARD")
    print("=" * 50)
    
    # Community overview
    health = dashboard_data['community_patterns']['community_health']
    print(f"\n📊 COMMUNITY HEALTH")
    print(f"Momentum Phase: {health['momentum_phase']}")
    print(f"Engagement Rate: {health['engagement_rate']:.1%}")
    print(f"Average Streak: {health['average_streak']:.1f} days")
    print(f"Retention Strength: {health['retention_strength']:.1%}")
    
    # Personal coaching insights
    print(f"\n👥 PERSONAL COACHING")
    for user, insights in dashboard_data['personal_coaching'].items():
        print(f"\n{user}:")
        if insights:
            for insight in insights:
                print(f"  {insight['type'].upper()}: {insight['message']}")
        else:
            print("  No specific coaching recommendations at this time.")
    
    # Community coaching
    print(f"\n🌟 COMMUNITY COACHING")
    for insight in dashboard_data['community_coaching']:
        print(f"  {insight['type'].upper()}: {insight['message']}")
    
    # Save detailed report
    with open('coaching_dashboard_data.json', 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    print(f"\n💾 Full coaching data saved to 'coaching_dashboard_data.json'")

if __name__ == "__main__":
    main()