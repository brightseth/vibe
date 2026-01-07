#!/usr/bin/env python3
"""
Streak Visualization Components
Creates charts and graphs for streak analytics
"""

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime, timedelta
import numpy as np
from streak_analytics import StreakAnalytics
import seaborn as sns

class StreakVisualizer:
    def __init__(self):
        self.analytics = StreakAnalytics()
        # Set style
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
        
    def create_trend_chart(self, days=30):
        """Create trend chart showing daily activity"""
        trends = self.analytics.get_trend_data(days)
        
        dates = []
        active_users = []
        total_streaks = []
        
        # Fill in data for each day
        end_date = datetime.now()
        for i in range(days):
            date = (end_date - timedelta(days=days-1-i)).date()
            date_key = date.isoformat()
            
            dates.append(date)
            active_users.append(trends[date_key]['active_users'])
            total_streaks.append(trends[date_key]['total_streak_days'])
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), sharex=True)
        
        # Active users chart
        ax1.plot(dates, active_users, marker='o', linewidth=2, markersize=4)
        ax1.set_ylabel('Active Users')
        ax1.set_title(f'Daily Activity Trends - Last {days} Days', fontsize=14, fontweight='bold')
        ax1.grid(True, alpha=0.3)
        
        # Total streak days chart
        ax2.bar(dates, total_streaks, alpha=0.7, width=0.8)
        ax2.set_ylabel('Total Streak Days')
        ax2.set_xlabel('Date')
        ax2.grid(True, alpha=0.3)
        
        # Format x-axis
        ax2.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
        ax2.xaxis.set_major_locator(mdates.DayLocator(interval=max(1, days//10)))
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        plt.savefig('streak_trends.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        return 'streak_trends.png'
    
    def create_distribution_chart(self):
        """Create distribution charts for current and best streaks"""
        distribution = self.analytics.get_distribution_stats()
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Current streaks distribution
        current_dist = distribution['current_streaks']['distribution']
        buckets = list(current_dist.keys())
        values = list(current_dist.values())
        
        colors = plt.cm.viridis(np.linspace(0, 1, len(buckets)))
        bars1 = ax1.bar(buckets, values, color=colors, alpha=0.8)
        ax1.set_title('Current Streak Distribution', fontsize=14, fontweight='bold')
        ax1.set_xlabel('Streak Length')
        ax1.set_ylabel('Number of Users')
        ax1.tick_params(axis='x', rotation=45)
        
        # Add value labels on bars
        for bar in bars1:
            height = bar.get_height()
            if height > 0:
                ax1.text(bar.get_x() + bar.get_width()/2., height,
                        f'{int(height)}', ha='center', va='bottom', fontweight='bold')
        
        # Best streaks distribution
        best_dist = distribution['best_streaks']['distribution']
        best_values = list(best_dist.values())
        
        bars2 = ax2.bar(buckets, best_values, color=colors, alpha=0.8)
        ax2.set_title('Best Streak Distribution', fontsize=14, fontweight='bold')
        ax2.set_xlabel('Streak Length')
        ax2.set_ylabel('Number of Users')
        ax2.tick_params(axis='x', rotation=45)
        
        # Add value labels on bars
        for bar in bars2:
            height = bar.get_height()
            if height > 0:
                ax2.text(bar.get_x() + bar.get_width()/2., height,
                        f'{int(height)}', ha='center', va='bottom', fontweight='bold')
        
        plt.tight_layout()
        plt.savefig('streak_distribution.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        return 'streak_distribution.png'
    
    def create_user_comparison_chart(self):
        """Create chart comparing all users' streaks"""
        users = self.analytics.streak_data['users']
        
        if not users:
            return None
        
        usernames = list(users.keys())
        current_streaks = [data['current_streak'] for data in users.values()]
        best_streaks = [data['best_streak'] for data in users.values()]
        
        x = np.arange(len(usernames))
        width = 0.35
        
        fig, ax = plt.subplots(figsize=(max(8, len(usernames) * 1.5), 6))
        
        bars1 = ax.bar(x - width/2, current_streaks, width, label='Current Streak', alpha=0.8)
        bars2 = ax.bar(x + width/2, best_streaks, width, label='Best Streak', alpha=0.8)
        
        ax.set_xlabel('Users')
        ax.set_ylabel('Streak Length (days)')
        ax.set_title('User Streak Comparison', fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(usernames, rotation=45, ha='right')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Add value labels on bars
        for bars in [bars1, bars2]:
            for bar in bars:
                height = bar.get_height()
                if height > 0:
                    ax.text(bar.get_x() + bar.get_width()/2., height,
                           f'{int(height)}', ha='center', va='bottom', fontsize=9, fontweight='bold')
        
        plt.tight_layout()
        plt.savefig('user_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        return 'user_comparison.png'
    
    def create_milestone_progress_chart(self):
        """Create chart showing progress toward milestones"""
        users = self.analytics.streak_data['users']
        milestones = [3, 7, 14, 30, 100]
        milestone_labels = ['3d', '7d', '2w', '1m', '100d']
        
        if not users:
            return None
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        for i, (user, data) in enumerate(users.items()):
            current = data['current_streak']
            y_pos = i
            
            # Draw progress bars for each milestone
            for j, milestone in enumerate(milestones):
                progress = min(current / milestone, 1.0) * 100
                color = 'green' if progress >= 100 else 'orange' if progress >= 50 else 'lightcoral'
                
                # Create stacked progress bar
                ax.barh(y_pos, 100, left=j*120, height=0.6, color='lightgray', alpha=0.3)
                ax.barh(y_pos, progress, left=j*120, height=0.6, color=color, alpha=0.8)
                
                # Add milestone labels
                if i == 0:  # Only on first user row
                    ax.text(j*120 + 50, len(users), milestone_labels[j], 
                           ha='center', va='bottom', fontweight='bold')
                
                # Add progress percentage
                if progress > 20:  # Only show if bar is wide enough
                    ax.text(j*120 + progress/2, y_pos, f'{progress:.0f}%', 
                           ha='center', va='center', fontsize=8, color='white', fontweight='bold')
        
        ax.set_yticks(range(len(users)))
        ax.set_yticklabels(users.keys())
        ax.set_xlim(0, len(milestones) * 120)
        ax.set_xlabel('Milestone Progress')
        ax.set_title('Progress Toward Streak Milestones', fontsize=14, fontweight='bold')
        
        # Remove x-axis ticks as we have custom labels
        ax.set_xticks([])
        
        plt.tight_layout()
        plt.savefig('milestone_progress.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        return 'milestone_progress.png'
    
    def generate_all_visualizations(self):
        """Generate all visualization charts"""
        charts = []
        
        try:
            trend_chart = self.create_trend_chart()
            if trend_chart:
                charts.append(trend_chart)
        except Exception as e:
            print(f"Error creating trend chart: {e}")
        
        try:
            dist_chart = self.create_distribution_chart()
            if dist_chart:
                charts.append(dist_chart)
        except Exception as e:
            print(f"Error creating distribution chart: {e}")
        
        try:
            user_chart = self.create_user_comparison_chart()
            if user_chart:
                charts.append(user_chart)
        except Exception as e:
            print(f"Error creating user comparison chart: {e}")
        
        try:
            milestone_chart = self.create_milestone_progress_chart()
            if milestone_chart:
                charts.append(milestone_chart)
        except Exception as e:
            print(f"Error creating milestone chart: {e}")
        
        return charts

# Example usage
if __name__ == "__main__":
    visualizer = StreakVisualizer()
    charts = visualizer.generate_all_visualizations()
    print(f"Generated {len(charts)} visualization charts: {charts}")