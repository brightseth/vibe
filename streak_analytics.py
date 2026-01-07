#!/usr/bin/env python3
"""
Streak Analytics Dashboard
Tracks trends, distributions, and engagement patterns
"""

import json
from datetime import datetime, timedelta
from collections import defaultdict
import matplotlib.pyplot as plt
import numpy as np

class StreakAnalytics:
    def __init__(self, streak_data_file='streaks.json'):
        self.data_file = streak_data_file
        self.streak_data = self.load_data()
        
    def load_data(self):
        """Load streak data with historical tracking"""
        try:
            with open(self.data_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                'users': {},
                'history': [],
                'milestones': {}
            }
    
    def save_data(self):
        """Save updated streak data"""
        with open(self.data_file, 'w') as f:
            json.dump(self.streak_data, f, indent=2)
    
    def record_activity(self, user, timestamp=None):
        """Record user activity and update streaks"""
        if timestamp is None:
            timestamp = datetime.now().isoformat()
            
        users = self.streak_data['users']
        history = self.streak_data['history']
        
        if user not in users:
            users[user] = {
                'current_streak': 0,
                'best_streak': 0,
                'last_seen': None,
                'total_days': 0,
                'join_date': timestamp
            }
        
        # Update streak logic
        user_data = users[user]
        today = datetime.now().date()
        
        if user_data['last_seen']:
            last_date = datetime.fromisoformat(user_data['last_seen']).date()
            days_diff = (today - last_date).days
            
            if days_diff == 1:  # Consecutive day
                user_data['current_streak'] += 1
            elif days_diff > 1:  # Streak broken
                user_data['current_streak'] = 1
        else:
            user_data['current_streak'] = 1
        
        # Update best streak
        if user_data['current_streak'] > user_data['best_streak']:
            user_data['best_streak'] = user_data['current_streak']
        
        user_data['last_seen'] = timestamp
        user_data['total_days'] += 1
        
        # Record in history
        history.append({
            'user': user,
            'timestamp': timestamp,
            'streak': user_data['current_streak'],
            'type': 'activity'
        })
        
        self.save_data()
        return user_data['current_streak']
    
    def get_trend_data(self, days=30):
        """Get streak trends over time"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        daily_stats = defaultdict(lambda: {'active_users': 0, 'total_streak_days': 0})
        
        for entry in self.streak_data['history']:
            entry_date = datetime.fromisoformat(entry['timestamp']).date()
            if start_date.date() <= entry_date <= end_date.date():
                day_key = entry_date.isoformat()
                daily_stats[day_key]['active_users'] += 1
                daily_stats[day_key]['total_streak_days'] += entry['streak']
        
        return daily_stats
    
    def get_distribution_stats(self):
        """Get streak length distribution"""
        users = self.streak_data['users']
        
        current_streaks = [data['current_streak'] for data in users.values()]
        best_streaks = [data['best_streak'] for data in users.values()]
        
        return {
            'current_streaks': {
                'data': current_streaks,
                'mean': np.mean(current_streaks) if current_streaks else 0,
                'median': np.median(current_streaks) if current_streaks else 0,
                'max': max(current_streaks) if current_streaks else 0,
                'distribution': self._get_streak_buckets(current_streaks)
            },
            'best_streaks': {
                'data': best_streaks,
                'mean': np.mean(best_streaks) if best_streaks else 0,
                'median': np.median(best_streaks) if best_streaks else 0,
                'max': max(best_streaks) if best_streaks else 0,
                'distribution': self._get_streak_buckets(best_streaks)
            }
        }
    
    def _get_streak_buckets(self, streaks):
        """Categorize streaks into buckets"""
        buckets = {
            '1-3 days': 0,
            '4-7 days': 0,
            '8-14 days': 0,
            '15-30 days': 0,
            '31+ days': 0
        }
        
        for streak in streaks:
            if 1 <= streak <= 3:
                buckets['1-3 days'] += 1
            elif 4 <= streak <= 7:
                buckets['4-7 days'] += 1
            elif 8 <= streak <= 14:
                buckets['8-14 days'] += 1
            elif 15 <= streak <= 30:
                buckets['15-30 days'] += 1
            elif streak >= 31:
                buckets['31+ days'] += 1
        
        return buckets
    
    def identify_patterns(self):
        """Identify engagement patterns"""
        users = self.streak_data['users']
        patterns = {
            'streak_champions': [],      # Users with 7+ day streaks
            'newcomers': [],            # Users with <3 days total
            'comeback_candidates': [],  # Users who haven't been seen recently
            'consistency_leaders': []   # High best_streak to current_streak ratio
        }
        
        today = datetime.now().date()
        
        for user, data in users.items():
            # Streak champions
            if data['current_streak'] >= 7:
                patterns['streak_champions'].append({
                    'user': user,
                    'streak': data['current_streak']
                })
            
            # Newcomers
            if data['total_days'] <= 3:
                patterns['newcomers'].append({
                    'user': user,
                    'total_days': data['total_days']
                })
            
            # Comeback candidates (inactive for 2+ days)
            if data['last_seen']:
                last_date = datetime.fromisoformat(data['last_seen']).date()
                days_inactive = (today - last_date).days
                if days_inactive >= 2 and data['best_streak'] >= 3:
                    patterns['comeback_candidates'].append({
                        'user': user,
                        'days_inactive': days_inactive,
                        'best_streak': data['best_streak']
                    })
            
            # Consistency leaders (maintaining good portion of best streak)
            if data['best_streak'] >= 5:
                ratio = data['current_streak'] / data['best_streak']
                if ratio >= 0.6:
                    patterns['consistency_leaders'].append({
                        'user': user,
                        'ratio': ratio,
                        'current': data['current_streak'],
                        'best': data['best_streak']
                    })
        
        return patterns
    
    def generate_report(self):
        """Generate comprehensive analytics report"""
        users = self.streak_data['users']
        trends = self.get_trend_data()
        distribution = self.get_distribution_stats()
        patterns = self.identify_patterns()
        
        total_users = len(users)
        active_streaks = sum(1 for data in users.values() if data['current_streak'] > 0)
        avg_current_streak = distribution['current_streaks']['mean']
        
        report = f"""
🏆 STREAK ANALYTICS DASHBOARD 🏆
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}

📊 OVERVIEW
• Total Users: {total_users}
• Active Streaks: {active_streaks}
• Average Current Streak: {avg_current_streak:.1f} days
• Longest Current Streak: {distribution['current_streaks']['max']} days

📈 DISTRIBUTION
Current Streaks:
{self._format_distribution(distribution['current_streaks']['distribution'])}

Best Streaks Ever:
{self._format_distribution(distribution['best_streaks']['distribution'])}

🔥 PATTERNS IDENTIFIED
Champions (7+ day streaks): {len(patterns['streak_champions'])}
{self._format_users(patterns['streak_champions'], 'streak')}

Newcomers (<3 total days): {len(patterns['newcomers'])}
{self._format_users(patterns['newcomers'], 'total_days')}

Comeback Candidates: {len(patterns['comeback_candidates'])}
{self._format_users(patterns['comeback_candidates'], 'days_inactive')}

Consistency Leaders: {len(patterns['consistency_leaders'])}
{self._format_users(patterns['consistency_leaders'], 'ratio')}

📋 INDIVIDUAL STATS
"""
        
        for user, data in users.items():
            report += f"• {user}: {data['current_streak']} days (best: {data['best_streak']})\n"
        
        return report
    
    def _format_distribution(self, dist):
        """Format distribution data for display"""
        return '\n'.join([f"  {bucket}: {count}" for bucket, count in dist.items()])
    
    def _format_users(self, user_list, metric):
        """Format user list with metric for display"""
        if not user_list:
            return "  None"
        
        formatted = []
        for item in user_list[:5]:  # Show top 5
            if metric == 'ratio':
                formatted.append(f"  {item['user']}: {item[metric]:.1%}")
            else:
                formatted.append(f"  {item['user']}: {item[metric]}")
        
        return '\n' + '\n'.join(formatted)

# Example usage and testing
if __name__ == "__main__":
    analytics = StreakAnalytics()
    
    # Initialize with current known data
    analytics.record_activity('@demo_user')
    analytics.record_activity('@vibe_champion')
    
    # Generate report
    print(analytics.generate_report())