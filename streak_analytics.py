#!/usr/bin/env python3
"""
Streak Analytics Dashboard
Provides trend graphs, distribution statistics, and identifies patterns
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import matplotlib.pyplot as plt
import seaborn as sns

class StreakAnalytics:
    def __init__(self, streaks_data: Dict[str, Dict]):
        self.streaks = streaks_data
        
    def get_distribution_stats(self) -> Dict:
        """Calculate streak distribution statistics"""
        current_streaks = [data['current'] for data in self.streaks.values()]
        best_streaks = [data['best'] for data in self.streaks.values()]
        
        return {
            'total_users': len(self.streaks),
            'active_streaks': sum(1 for s in current_streaks if s > 0),
            'avg_current_streak': sum(current_streaks) / len(current_streaks) if current_streaks else 0,
            'avg_best_streak': sum(best_streaks) / len(best_streaks) if best_streaks else 0,
            'longest_current': max(current_streaks) if current_streaks else 0,
            'longest_ever': max(best_streaks) if best_streaks else 0,
            'streak_ranges': self._get_streak_ranges(current_streaks)
        }
    
    def _get_streak_ranges(self, streaks: List[int]) -> Dict[str, int]:
        """Group streaks into ranges for distribution analysis"""
        ranges = {
            '1-3 days': 0,
            '4-7 days': 0, 
            '8-14 days': 0,
            '15-30 days': 0,
            '31-100 days': 0,
            '100+ days': 0
        }
        
        for streak in streaks:
            if streak == 0:
                continue
            elif 1 <= streak <= 3:
                ranges['1-3 days'] += 1
            elif 4 <= streak <= 7:
                ranges['4-7 days'] += 1
            elif 8 <= streak <= 14:
                ranges['8-14 days'] += 1
            elif 15 <= streak <= 30:
                ranges['15-30 days'] += 1
            elif 31 <= streak <= 100:
                ranges['31-100 days'] += 1
            else:
                ranges['100+ days'] += 1
        
        return ranges
    
    def identify_patterns(self) -> Dict[str, List]:
        """Identify interesting patterns in streak data"""
        patterns = {
            'consistent_performers': [],
            'comeback_candidates': [],
            'milestone_approachers': [],
            'new_users': []
        }
        
        for user, data in self.streaks.items():
            current = data['current']
            best = data['best']
            
            # Consistent: current streak is 80%+ of their best
            if current > 0 and best > 0 and current >= (best * 0.8):
                patterns['consistent_performers'].append(user)
            
            # Comeback: had good streak before, currently broken
            if current == 0 and best >= 7:
                patterns['comeback_candidates'].append(user)
            
            # Approaching milestones (within 2 days of 7, 14, 30, 100)
            milestones = [7, 14, 30, 100]
            for milestone in milestones:
                if milestone - 2 <= current < milestone:
                    patterns['milestone_approachers'].append({
                        'user': user,
                        'current': current,
                        'milestone': milestone
                    })
            
            # New users (best streak <= 3)
            if best <= 3:
                patterns['new_users'].append(user)
        
        return patterns
    
    def generate_insights(self) -> List[str]:
        """Generate actionable insights from the data"""
        stats = self.get_distribution_stats()
        patterns = self.identify_patterns()
        insights = []
        
        # Engagement insights
        if stats['active_streaks'] == 0:
            insights.append("⚠️ No active streaks - consider engagement initiatives")
        elif stats['active_streaks'] / stats['total_users'] < 0.3:
            insights.append("📈 Low streak participation - gamification opportunities")
        
        # Pattern insights
        if patterns['comeback_candidates']:
            insights.append(f"🔄 {len(patterns['comeback_candidates'])} users ready for comeback campaigns")
        
        if patterns['milestone_approachers']:
            insights.append(f"🎯 {len(patterns['milestone_approachers'])} users approaching milestones")
        
        if patterns['consistent_performers']:
            insights.append(f"⭐ {len(patterns['consistent_performers'])} consistent performers to celebrate")
        
        # Growth insights
        if stats['avg_current_streak'] > 5:
            insights.append("🚀 High average streak - community is engaged!")
        elif stats['avg_current_streak'] < 2:
            insights.append("💡 Low average streak - focus on habit formation")
        
        return insights
    
    def generate_report(self) -> str:
        """Generate a comprehensive analytics report"""
        stats = self.get_distribution_stats()
        patterns = self.identify_patterns()
        insights = self.generate_insights()
        
        report = f"""
# Streak Analytics Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 📊 Distribution Statistics
- Total Users: {stats['total_users']}
- Active Streaks: {stats['active_streaks']} ({stats['active_streaks']/stats['total_users']*100:.1f}%)
- Average Current Streak: {stats['avg_current_streak']:.1f} days
- Average Best Streak: {stats['avg_best_streak']:.1f} days
- Longest Current: {stats['longest_current']} days
- Longest Ever: {stats['longest_ever']} days

## 📈 Streak Distribution
"""
        for range_name, count in stats['streak_ranges'].items():
            report += f"- {range_name}: {count} users\n"
        
        report += f"""
## 🔍 Pattern Analysis
- Consistent Performers: {len(patterns['consistent_performers'])}
- Comeback Candidates: {len(patterns['comeback_candidates'])}
- Approaching Milestones: {len(patterns['milestone_approachers'])}
- New Users: {len(patterns['new_users'])}

## 💡 Key Insights
"""
        for insight in insights:
            report += f"- {insight}\n"
        
        if patterns['milestone_approachers']:
            report += "\n## 🎯 Upcoming Milestones\n"
            for approach in patterns['milestone_approachers']:
                if isinstance(approach, dict):
                    report += f"- {approach['user']}: {approach['current']} days → {approach['milestone']} days\n"
        
        return report

# Example usage and testing
if __name__ == "__main__":
    # Sample data structure based on get_streaks() format
    sample_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    analytics = StreakAnalytics(sample_streaks)
    report = analytics.generate_report()
    print(report)