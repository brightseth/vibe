#!/usr/bin/env python3
"""
Advanced Streak Analytics Dashboard
Real-time analytics with trend analysis, predictions, and actionable insights
"""

import json
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import matplotlib.pyplot as plt
import seaborn as sns

class AdvancedStreakAnalytics:
    def __init__(self, streak_data=None):
        self.streak_data = streak_data or self._load_current_data()
        self.milestones = [3, 7, 14, 30, 100]
        
    def _load_current_data(self):
        """Load current streak data from JSON"""
        try:
            with open('streak_data.json', 'r') as f:
                data = json.load(f)
                return data['streaks']
        except FileNotFoundError:
            return {}
    
    def generate_comprehensive_analysis(self):
        """Generate detailed analytics with trends and insights"""
        analysis = {
            'timestamp': datetime.now().isoformat(),
            'basic_stats': self._calculate_basic_stats(),
            'distribution_analysis': self._analyze_distribution(),
            'milestone_tracking': self._track_milestones(),
            'engagement_patterns': self._identify_patterns(),
            'trend_indicators': self._calculate_trends(),
            'actionable_insights': self._generate_insights(),
            'gamification_opportunities': self._find_gamification_ops()
        }
        return analysis
    
    def _calculate_basic_stats(self):
        """Calculate fundamental streak statistics"""
        if not self.streak_data:
            return {'total_users': 0}
            
        current_streaks = [data['current'] for data in self.streak_data.values()]
        best_streaks = [data['best'] for data in self.streak_data.values()]
        
        return {
            'total_users': len(self.streak_data),
            'active_streaks': len([s for s in current_streaks if s > 0]),
            'avg_current_streak': np.mean(current_streaks),
            'median_current_streak': np.median(current_streaks),
            'longest_current_streak': max(current_streaks) if current_streaks else 0,
            'avg_best_streak': np.mean(best_streaks),
            'longest_ever_streak': max(best_streaks) if best_streaks else 0,
            'streak_retention_rate': len([s for s in current_streaks if s > 0]) / len(current_streaks) if current_streaks else 0
        }
    
    def _analyze_distribution(self):
        """Analyze streak length distribution patterns"""
        current_streaks = [data['current'] for data in self.streak_data.values()]
        best_streaks = [data['best'] for data in self.streak_data.values()]
        
        def categorize_streaks(streaks):
            categories = {
                'beginner': len([s for s in streaks if 1 <= s <= 3]),
                'building': len([s for s in streaks if 4 <= s <= 7]), 
                'committed': len([s for s in streaks if 8 <= s <= 14]),
                'dedicated': len([s for s in streaks if 15 <= s <= 30]),
                'legendary': len([s for s in streaks if s > 30])
            }
            return categories
        
        return {
            'current_distribution': categorize_streaks(current_streaks),
            'best_distribution': categorize_streaks(best_streaks),
            'concentration_index': self._calculate_concentration(current_streaks),
            'diversity_score': len(set(current_streaks)) / len(current_streaks) if current_streaks else 0
        }
    
    def _calculate_concentration(self, streaks):
        """Calculate how concentrated streaks are (Gini coefficient style)"""
        if not streaks or len(streaks) == 1:
            return 0
        
        sorted_streaks = sorted(streaks)
        n = len(streaks)
        index = np.arange(1, n + 1)
        return (2 * np.sum(index * sorted_streaks)) / (n * np.sum(sorted_streaks)) - (n + 1) / n
    
    def _track_milestones(self):
        """Track users approaching milestones"""
        milestone_tracking = {}
        
        for milestone in self.milestones:
            approaching = []
            for user, data in self.streak_data.items():
                days_to_milestone = milestone - data['current']
                if 0 < days_to_milestone <= 2:  # Within 2 days of milestone
                    approaching.append({
                        'user': user,
                        'current_streak': data['current'],
                        'days_remaining': days_to_milestone,
                        'milestone': milestone
                    })
            
            milestone_tracking[f'{milestone}_days'] = {
                'users_approaching': approaching,
                'count': len(approaching)
            }
        
        return milestone_tracking
    
    def _identify_patterns(self):
        """Identify user engagement patterns"""
        patterns = {
            'consistent_performers': [],  # Users maintaining high % of best streak
            'comeback_stories': [],       # Users who had streak drops but recovered
            'milestone_achievers': [],    # Users who recently hit milestones
            'streak_builders': [],        # Users with growing streaks
            'at_risk': []                # Users with declining engagement
        }
        
        for user, data in self.streak_data.items():
            current, best = data['current'], data['best']
            
            # Consistent performers (maintaining 70%+ of best streak)
            if best > 0 and current / best >= 0.7 and current >= 5:
                patterns['consistent_performers'].append({
                    'user': user,
                    'consistency_ratio': current / best,
                    'current': current,
                    'best': best
                })
            
            # Streak builders (current equals best, showing growth)
            if current == best and current > 1:
                patterns['streak_builders'].append({
                    'user': user,
                    'streak': current,
                    'growth_potential': 'high'
                })
            
            # At risk (current significantly below best)
            if best >= 5 and current < best * 0.3:
                patterns['at_risk'].append({
                    'user': user,
                    'current': current,
                    'best': best,
                    'risk_level': 'high' if current == 0 else 'medium'
                })
        
        return patterns
    
    def _calculate_trends(self):
        """Calculate trend indicators"""
        # Since we don't have historical data, we'll infer trends from current vs best
        trends = {
            'overall_momentum': 'building',  # Based on current activity
            'engagement_health': 'healthy',   # Active users vs total
            'growth_trajectory': 'positive',  # New user onboarding
            'retention_outlook': 'optimistic' # Based on streak patterns
        }
        
        stats = self._calculate_basic_stats()
        
        # Adjust trends based on data
        if stats['streak_retention_rate'] < 0.5:
            trends['engagement_health'] = 'needs_attention'
        
        if stats['avg_current_streak'] < 2:
            trends['overall_momentum'] = 'early_stage'
        
        return trends
    
    def _generate_insights(self):
        """Generate actionable insights from analytics"""
        insights = []
        stats = self._calculate_basic_stats()
        patterns = self._identify_patterns()
        milestones = self._track_milestones()
        
        # Community health insights
        if stats['total_users'] < 5:
            insights.append({
                'type': 'growth_opportunity',
                'priority': 'high',
                'insight': f"Small community ({stats['total_users']} users) - perfect for personalized engagement",
                'action': 'Focus on individual encouragement and celebration'
            })
        
        # Milestone opportunities
        total_approaching = sum(m['count'] for m in milestones.values())
        if total_approaching > 0:
            insights.append({
                'type': 'milestone_opportunity',
                'priority': 'high',
                'insight': f"{total_approaching} users approaching milestones",
                'action': 'Prepare milestone celebration campaigns'
            })
        
        # Engagement patterns
        if len(patterns['streak_builders']) > 0:
            insights.append({
                'type': 'momentum_building',
                'priority': 'medium',
                'insight': f"{len(patterns['streak_builders'])} users actively building streaks",
                'action': 'Amplify their success to inspire others'
            })
        
        # Early stage specific
        if stats['avg_current_streak'] < 3:
            insights.append({
                'type': 'foundation_building',
                'priority': 'high',
                'insight': 'Community in foundation phase - consistency habits forming',
                'action': 'Focus on daily engagement and habit reinforcement'
            })
        
        return insights
    
    def _find_gamification_ops(self):
        """Identify gamification opportunities"""
        opportunities = []
        stats = self._calculate_basic_stats()
        
        # Badge system opportunities
        opportunities.append({
            'feature': 'achievement_badges',
            'rationale': 'Early users perfect for achievement system launch',
            'implementation': 'First week badge, First milestone badge, Consistency champion'
        })
        
        # Leaderboard opportunities  
        if stats['total_users'] >= 2:
            opportunities.append({
                'feature': 'friendly_leaderboard',
                'rationale': 'Sufficient users for healthy competition',
                'implementation': 'Daily/weekly streak leaders with positive framing'
            })
        
        # Milestone system
        opportunities.append({
            'feature': 'milestone_celebrations',
            'rationale': 'Users approaching first major milestones',
            'implementation': 'Countdown messaging, public celebrations, achievement unlocks'
        })
        
        return opportunities
    
    def generate_dashboard_data(self):
        """Generate data formatted for dashboard consumption"""
        analysis = self.generate_comprehensive_analysis()
        
        dashboard_data = {
            'metadata': {
                'generated_at': analysis['timestamp'],
                'total_users': analysis['basic_stats']['total_users'],
                'analysis_version': '2.0'
            },
            'key_metrics': {
                'active_users': analysis['basic_stats']['active_streaks'],
                'avg_streak': round(analysis['basic_stats']['avg_current_streak'], 1),
                'longest_streak': analysis['basic_stats']['longest_current_streak'],
                'retention_rate': round(analysis['basic_stats']['streak_retention_rate'] * 100, 1)
            },
            'distribution_chart_data': {
                'labels': ['Beginner (1-3)', 'Building (4-7)', 'Committed (8-14)', 'Dedicated (15-30)', 'Legendary (31+)'],
                'current_data': [
                    analysis['distribution_analysis']['current_distribution']['beginner'],
                    analysis['distribution_analysis']['current_distribution']['building'],
                    analysis['distribution_analysis']['current_distribution']['committed'],
                    analysis['distribution_analysis']['current_distribution']['dedicated'],
                    analysis['distribution_analysis']['current_distribution']['legendary']
                ]
            },
            'user_list': [
                {
                    'username': user,
                    'current_streak': data['current'],
                    'best_streak': data['best'],
                    'badge_type': self._get_badge_type(data['current']),
                    'trend': self._get_user_trend(data)
                }
                for user, data in self.streak_data.items()
            ],
            'insights': analysis['actionable_insights'],
            'milestone_alerts': [
                {
                    'milestone': milestone.replace('_days', ' days'),
                    'count': data['count'],
                    'users': [u['user'] for u in data['users_approaching']]
                }
                for milestone, data in analysis['milestone_tracking'].items()
                if data['count'] > 0
            ]
        }
        
        return dashboard_data
    
    def _get_badge_type(self, streak):
        """Get badge type for streak length"""
        if streak >= 30:
            return 'legendary'
        elif streak >= 14:
            return 'dedicated'
        elif streak >= 7:
            return 'committed'
        elif streak >= 3:
            return 'building'
        else:
            return 'beginner'
    
    def _get_user_trend(self, data):
        """Get trend indicator for user"""
        ratio = data['current'] / data['best'] if data['best'] > 0 else 1
        
        if data['current'] == data['best']:
            return 'building'  # At personal best
        elif ratio >= 0.8:
            return 'strong'    # Maintaining strong streak
        elif ratio >= 0.5:
            return 'steady'    # Decent maintenance
        else:
            return 'recovering' # Building back up
    
    def export_analytics_report(self, filename='streak_analytics_report.json'):
        """Export comprehensive analytics to file"""
        analysis = self.generate_comprehensive_analysis()
        
        with open(filename, 'w') as f:
            json.dump(analysis, f, indent=2, default=str)
        
        return filename

# Usage example
if __name__ == "__main__":
    # Initialize with current data
    current_streaks = {
        '@demo_user': {'current': 1, 'best': 1},
        '@vibe_champion': {'current': 1, 'best': 1}
    }
    
    analytics = AdvancedStreakAnalytics(current_streaks)
    dashboard_data = analytics.generate_dashboard_data()
    
    print("🔥 ADVANCED STREAK ANALYTICS DASHBOARD")
    print("=" * 50)
    print(f"Generated: {dashboard_data['metadata']['generated_at']}")
    print(f"Users: {dashboard_data['metadata']['total_users']}")
    print(f"Active Streaks: {dashboard_data['key_metrics']['active_users']}")
    print(f"Average Streak: {dashboard_data['key_metrics']['avg_streak']} days")
    print()
    
    print("📊 INSIGHTS:")
    for insight in dashboard_data['insights']:
        print(f"• {insight['type'].upper()}: {insight['insight']}")
        print(f"  → Action: {insight['action']}")
    print()
    
    print("🎯 USERS:")
    for user in dashboard_data['user_list']:
        badge = user['badge_type']
        trend = user['trend']
        print(f"• {user['username']}: {user['current_streak']} days ({badge}, {trend})")
    
    # Export detailed report
    report_file = analytics.export_analytics_report()
    print(f"\n📋 Detailed report exported to: {report_file}")