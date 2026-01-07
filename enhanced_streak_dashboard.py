#!/usr/bin/env python3
"""
Enhanced Streak Analytics Dashboard
Real-time analytics with trend graphs, distribution statistics, and pattern identification
"""

import json
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime, timedelta
import seaborn as sns
from pathlib import Path

class EnhancedStreakDashboard:
    def __init__(self, data_file='streak_data.json'):
        self.data_file = data_file
        self.data = self.load_streak_data()
        
        # Set up plotting style
        plt.style.use('dark_background')
        sns.set_palette("husl")
        
    def load_streak_data(self):
        """Load current streak data"""
        try:
            with Path(self.data_file).open('r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "streaks": {},
                "analysis": {"total_users": 0},
                "insights": [],
                "milestones": {}
            }
    
    def create_distribution_chart(self):
        """Create streak distribution visualization"""
        distribution = self.data.get('analysis', {}).get('distribution', {})
        
        labels = ['1 Day', '2-3 Days', '4-7 Days', '8+ Days']
        values = [
            distribution.get('1_day', 0),
            distribution.get('2_3_days', 0), 
            distribution.get('4_7_days', 0),
            distribution.get('8_plus', 0)
        ]
        
        fig, ax = plt.subplots(figsize=(10, 6), facecolor='#0f1419')
        ax.set_facecolor('#161b22')
        
        colors = ['#42a5f5', '#66bb6a', '#ffa726', '#ff6b6b']
        bars = ax.bar(labels, values, color=colors, alpha=0.8, edgecolor='white', linewidth=0.5)
        
        # Add value labels on bars
        for bar, value in zip(bars, values):
            height = bar.get_height()
            ax.annotate(f'{value}',
                       xy=(bar.get_x() + bar.get_width() / 2, height),
                       xytext=(0, 3),
                       textcoords="offset points",
                       ha='center', va='bottom',
                       color='white', fontweight='bold')
        
        ax.set_title('🔥 Streak Distribution', fontsize=16, color='#58a6ff', pad=20)
        ax.set_ylabel('Number of Users', color='#c9d1d9')
        ax.tick_params(colors='#c9d1d9')
        
        plt.tight_layout()
        plt.savefig('streak_distribution.png', facecolor='#0f1419', dpi=150, bbox_inches='tight')
        plt.close()
        
        return 'streak_distribution.png'
    
    def create_milestone_progress_chart(self):
        """Create milestone progress visualization"""
        milestones = self.data.get('milestones', {})
        
        milestone_labels = ['3 Days', '7 Days', '14 Days', '30 Days', '100 Days']
        approaching = [
            milestones.get('approaching_3_days', 0),
            milestones.get('approaching_7_days', 0),
            milestones.get('approaching_14_days', 0),
            milestones.get('approaching_30_days', 0),
            milestones.get('approaching_100_days', 0)
        ]
        
        fig, ax = plt.subplots(figsize=(12, 6), facecolor='#0f1419')
        ax.set_facecolor('#161b22')
        
        colors = ['#66bb6a', '#ffa726', '#ff6b6b', '#58a6ff', '#a78bfa']
        bars = ax.bar(milestone_labels, approaching, color=colors, alpha=0.8)
        
        # Add value labels
        for bar, value in zip(bars, approaching):
            height = bar.get_height()
            if height > 0:
                ax.annotate(f'{value}',
                           xy=(bar.get_x() + bar.get_width() / 2, height),
                           xytext=(0, 3),
                           textcoords="offset points",
                           ha='center', va='bottom',
                           color='white', fontweight='bold')
        
        ax.set_title('🎯 Milestone Progress - Users Approaching', fontsize=16, color='#58a6ff', pad=20)
        ax.set_ylabel('Number of Users', color='#c9d1d9')
        ax.tick_params(colors='#c9d1d9')
        
        plt.tight_layout()
        plt.savefig('milestone_progress.png', facecolor='#0f1419', dpi=150, bbox_inches='tight')
        plt.close()
        
        return 'milestone_progress.png'
    
    def create_user_comparison_chart(self):
        """Create user streak comparison"""
        streaks = self.data.get('streaks', {})
        
        if not streaks:
            return None
            
        users = list(streaks.keys())
        current_streaks = [streaks[user]['current'] for user in users]
        best_streaks = [streaks[user]['best'] for user in users]
        
        fig, ax = plt.subplots(figsize=(12, 8), facecolor='#0f1419')
        ax.set_facecolor('#161b22')
        
        x = np.arange(len(users))
        width = 0.35
        
        bars1 = ax.bar(x - width/2, current_streaks, width, label='Current Streak', 
                      color='#58a6ff', alpha=0.8)
        bars2 = ax.bar(x + width/2, best_streaks, width, label='Best Streak',
                      color='#66bb6a', alpha=0.8)
        
        # Add value labels
        for bars in [bars1, bars2]:
            for bar in bars:
                height = bar.get_height()
                ax.annotate(f'{int(height)}',
                           xy=(bar.get_x() + bar.get_width() / 2, height),
                           xytext=(0, 3),
                           textcoords="offset points",
                           ha='center', va='bottom',
                           color='white', fontsize=10)
        
        ax.set_title('👥 User Streak Comparison', fontsize=16, color='#58a6ff', pad=20)
        ax.set_ylabel('Days', color='#c9d1d9')
        ax.set_xlabel('Users', color='#c9d1d9')
        ax.set_xticks(x)
        ax.set_xticklabels([user.replace('@', '') for user in users])
        ax.legend(facecolor='#161b22', edgecolor='#30363d')
        ax.tick_params(colors='#c9d1d9')
        
        plt.tight_layout()
        plt.savefig('user_comparison.png', facecolor='#0f1419', dpi=150, bbox_inches='tight')
        plt.close()
        
        return 'user_comparison.png'
    
    def generate_insights(self):
        """Generate actionable insights from current data"""
        streaks = self.data.get('streaks', {})
        analysis = self.data.get('analysis', {})
        
        insights = []
        total_users = analysis.get('total_users', 0)
        avg_current = analysis.get('avg_current', 0)
        
        # Pattern detection
        if total_users > 0:
            active_users = sum(1 for user_data in streaks.values() if user_data['current'] > 0)
            activity_rate = active_users / total_users
            
            if activity_rate >= 0.8:
                insights.append({
                    'type': 'High Engagement',
                    'icon': '🔥',
                    'message': f'{activity_rate:.0%} of users have active streaks - excellent engagement!',
                    'action': 'Keep momentum with daily encouragement'
                })
            elif activity_rate >= 0.5:
                insights.append({
                    'type': 'Good Momentum',
                    'icon': '📈',
                    'message': f'{activity_rate:.0%} engagement rate - solid foundation',
                    'action': 'Focus on consistency rewards'
                })
            else:
                insights.append({
                    'type': 'Re-engagement Needed',
                    'icon': '⚠️',
                    'message': f'Only {activity_rate:.0%} have active streaks',
                    'action': 'Consider comeback campaigns'
                })
        
        # Milestone opportunities
        milestones = self.data.get('milestones', {})
        approaching_3 = milestones.get('approaching_3_days', 0)
        approaching_7 = milestones.get('approaching_7_days', 0)
        
        if approaching_3 > 0:
            insights.append({
                'type': 'Milestone Alert',
                'icon': '🎯',
                'message': f'{approaching_3} users approaching 3-day milestone',
                'action': 'Prepare celebration messages'
            })
        
        if approaching_7 > 0:
            insights.append({
                'type': 'Week Streak Alert',
                'icon': '💪',
                'message': f'{approaching_7} users nearing one week',
                'action': 'Highlight consistency achievement'
            })
        
        # Distribution insights
        distribution = analysis.get('distribution', {})
        new_users = distribution.get('1_day', 0)
        
        if new_users > 0:
            insights.append({
                'type': 'New User Focus',
                'icon': '🌱',
                'message': f'{new_users} users just starting their journey',
                'action': 'Focus on day 2-3 retention'
            })
        
        return insights
    
    def create_comprehensive_report(self):
        """Generate comprehensive analytics report with visualizations"""
        print("🔥 GENERATING ENHANCED STREAK DASHBOARD 🔥")
        print("=" * 50)
        
        # Generate all visualizations
        dist_chart = self.create_distribution_chart()
        milestone_chart = self.create_milestone_progress_chart()
        comparison_chart = self.create_user_comparison_chart()
        
        # Get current stats
        analysis = self.data.get('analysis', {})
        total_users = analysis.get('total_users', 0)
        avg_current = analysis.get('avg_current', 0)
        longest_current = analysis.get('longest_current', 0)
        
        print(f"📊 DASHBOARD SUMMARY")
        print(f"Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Total Users: {total_users}")
        print(f"Average Current Streak: {avg_current:.1f} days") 
        print(f"Longest Current Streak: {longest_current} days")
        print()
        
        # Display insights
        insights = self.generate_insights()
        print("🧠 ACTIONABLE INSIGHTS:")
        for i, insight in enumerate(insights, 1):
            print(f"{i}. {insight['icon']} {insight['type']}")
            print(f"   {insight['message']}")
            print(f"   → Action: {insight['action']}")
            print()
        
        # Chart information
        charts_created = []
        if dist_chart:
            charts_created.append(f"📊 {dist_chart}")
        if milestone_chart:
            charts_created.append(f"🎯 {milestone_chart}")
        if comparison_chart:
            charts_created.append(f"👥 {comparison_chart}")
        
        if charts_created:
            print("📈 VISUALIZATIONS CREATED:")
            for chart in charts_created:
                print(f"   {chart}")
        
        return {
            'total_users': total_users,
            'avg_current': avg_current,
            'longest_current': longest_current,
            'insights': insights,
            'charts': charts_created
        }

# Main execution
if __name__ == "__main__":
    dashboard = EnhancedStreakDashboard()
    report = dashboard.create_comprehensive_report()