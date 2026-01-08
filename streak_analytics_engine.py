#!/usr/bin/env python3
"""
Advanced streak analytics engine for /vibe workshop
Provides insights, patterns, and motivation analytics
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import statistics

@dataclass
class StreakSnapshot:
    """Single point-in-time streak data"""
    user: str
    streak_days: int
    best_streak: int
    timestamp: datetime
    active_today: bool

@dataclass
class StreakInsight:
    """Analytical insight about streak patterns"""
    type: str  # 'trend', 'milestone', 'pattern', 'achievement'
    title: str
    description: str
    value: float
    confidence: float  # 0-1
    actionable: bool

class StreakAnalyticsEngine:
    def __init__(self):
        self.snapshots = []
        self.insights_cache = []
        self.load_historical_data()
    
    def load_historical_data(self):
        """Load historical streak data if available"""
        try:
            if os.path.exists('streak_history.json'):
                with open('streak_history.json', 'r') as f:
                    data = json.load(f)
                    for snapshot_data in data:
                        snapshot = StreakSnapshot(
                            user=snapshot_data['user'],
                            streak_days=snapshot_data['streak_days'],
                            best_streak=snapshot_data['best_streak'],
                            timestamp=datetime.fromisoformat(snapshot_data['timestamp']),
                            active_today=snapshot_data['active_today']
                        )
                        self.snapshots.append(snapshot)
        except Exception as e:
            print(f"Note: Could not load historical data: {e}")
    
    def save_historical_data(self):
        """Save streak snapshots to file"""
        data = []
        for snapshot in self.snapshots:
            data.append({
                'user': snapshot.user,
                'streak_days': snapshot.streak_days,
                'best_streak': snapshot.best_streak,
                'timestamp': snapshot.timestamp.isoformat(),
                'active_today': snapshot.active_today
            })
        
        with open('streak_history.json', 'w') as f:
            json.dump(data, f, indent=2)
    
    def record_snapshot(self, user: str, streak_days: int, best_streak: int, active_today: bool = True):
        """Record a streak snapshot"""
        snapshot = StreakSnapshot(
            user=user,
            streak_days=streak_days,
            best_streak=best_streak,
            timestamp=datetime.now(),
            active_today=active_today
        )
        
        self.snapshots.append(snapshot)
        self.save_historical_data()
        
        # Generate new insights
        self._generate_insights()
    
    def get_current_stats(self) -> Dict:
        """Get current streak statistics"""
        current_users = {}
        
        # Get latest snapshot for each user
        for snapshot in reversed(self.snapshots):
            if snapshot.user not in current_users:
                current_users[snapshot.user] = snapshot
        
        # Calculate aggregate stats
        if not current_users:
            return {
                'total_users': 0,
                'average_streak': 0,
                'longest_current_streak': 0,
                'total_active_days': 0,
                'users': []
            }
        
        streaks = [user_data.streak_days for user_data in current_users.values()]
        
        return {
            'total_users': len(current_users),
            'average_streak': round(statistics.mean(streaks), 1),
            'longest_current_streak': max(streaks),
            'total_active_days': sum(streaks),
            'active_today': sum(1 for user_data in current_users.values() if user_data.active_today),
            'users': [
                {
                    'handle': snapshot.user,
                    'current_streak': snapshot.streak_days,
                    'best_streak': snapshot.best_streak,
                    'last_seen': snapshot.timestamp.isoformat(),
                    'active_today': snapshot.active_today
                }
                for snapshot in current_users.values()
            ]
        }
    
    def get_trend_data(self, days_back: int = 7) -> Dict:
        """Get streak trend data for the past N days"""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days_back - 1)
        
        trend_data = {
            'labels': [],
            'average_streaks': [],
            'total_active_users': [],
            'new_personal_bests': []
        }
        
        for i in range(days_back):
            day = start_date + timedelta(days=i)
            trend_data['labels'].append(day.strftime('%b %d'))
            
            # Find snapshots for this day
            day_snapshots = [
                s for s in self.snapshots 
                if s.timestamp.date() == day
            ]
            
            if day_snapshots:
                streaks = [s.streak_days for s in day_snapshots]
                avg_streak = statistics.mean(streaks) if streaks else 0
                active_users = len(set(s.user for s in day_snapshots if s.active_today))
                
                # Count personal bests achieved on this day
                personal_bests = sum(1 for s in day_snapshots if s.streak_days == s.best_streak and s.streak_days > 1)
            else:
                avg_streak = 0
                active_users = 0
                personal_bests = 0
            
            trend_data['average_streaks'].append(round(avg_streak, 1))
            trend_data['total_active_users'].append(active_users)
            trend_data['new_personal_bests'].append(personal_bests)
        
        return trend_data
    
    def _generate_insights(self):
        """Generate analytical insights from streak data"""
        self.insights_cache = []
        
        # Current stats
        stats = self.get_current_stats()
        
        if stats['total_users'] == 0:
            return
        
        # Insight: Streak momentum
        if stats['average_streak'] >= 3:
            self.insights_cache.append(StreakInsight(
                type='trend',
                title='Strong Momentum',
                description=f"Average streak of {stats['average_streak']} days shows excellent consistency!",
                value=stats['average_streak'],
                confidence=0.9,
                actionable=False
            ))
        elif stats['average_streak'] >= 1:
            self.insights_cache.append(StreakInsight(
                type='trend',
                title='Building Momentum',
                description=f"Users are getting started! Average {stats['average_streak']} day streaks.",
                value=stats['average_streak'],
                confidence=0.8,
                actionable=True
            ))
        
        # Insight: Milestone proximity
        next_milestones = []
        for user in stats['users']:
            days_to_week = 7 - user['current_streak']
            if 0 < days_to_week <= 3:
                next_milestones.append((user['handle'], days_to_week))
        
        if next_milestones:
            closest_user, days_left = min(next_milestones, key=lambda x: x[1])
            self.insights_cache.append(StreakInsight(
                type='milestone',
                title='Milestone Alert!',
                description=f"{closest_user} is {days_left} days away from their Week Warrior badge! 💪",
                value=days_left,
                confidence=1.0,
                actionable=True
            ))
        
        # Insight: Engagement pattern
        trend = self.get_trend_data(3)  # Last 3 days
        if len(trend['average_streaks']) >= 3:
            recent_avg = statistics.mean(trend['average_streaks'][-3:])
            if recent_avg > trend['average_streaks'][0]:
                self.insights_cache.append(StreakInsight(
                    type='pattern',
                    title='Growing Engagement',
                    description="Streak engagement is trending upward over the past 3 days! 📈",
                    value=recent_avg,
                    confidence=0.7,
                    actionable=False
                ))
    
    def get_insights(self) -> List[Dict]:
        """Get current analytical insights"""
        return [asdict(insight) for insight in self.insights_cache]
    
    def get_motivation_message(self) -> str:
        """Generate personalized motivation message"""
        stats = self.get_current_stats()
        insights = self.get_insights()
        
        if not stats['users']:
            return "🌱 Start your streak journey today! Every expert was once a beginner."
        
        # Check for actionable insights
        actionable_insights = [i for i in insights if i['actionable']]
        if actionable_insights:
            insight = actionable_insights[0]
            if insight['type'] == 'milestone':
                return f"✨ {insight['description']} Keep the momentum going!"
        
        # General motivation based on current state
        avg_streak = stats['average_streak']
        if avg_streak < 3:
            return "🔥 You're building something amazing! Each day you show up, you're proving your commitment to growth."
        elif avg_streak < 7:
            return "💪 Incredible consistency! You're in the zone. Keep this energy - you're approaching week warrior status!"
        else:
            return "👑 You're setting the standard for consistency! Your dedication is inspiring others to level up."
    
    def generate_weekly_report(self) -> Dict:
        """Generate comprehensive weekly streak report"""
        stats = self.get_current_stats()
        trend = self.get_trend_data(7)
        insights = self.get_insights()
        
        return {
            'report_date': datetime.now().isoformat(),
            'current_stats': stats,
            'trend_analysis': trend,
            'insights': insights,
            'motivation_message': self.get_motivation_message(),
            'next_milestones': self._get_next_milestones(),
            'streak_health_score': self._calculate_health_score()
        }
    
    def _get_next_milestones(self) -> List[Dict]:
        """Get upcoming milestones for all users"""
        milestones = []
        thresholds = [3, 7, 14, 30, 100]
        
        stats = self.get_current_stats()
        for user in stats['users']:
            current_streak = user['current_streak']
            
            for threshold in thresholds:
                if current_streak < threshold:
                    days_to_milestone = threshold - current_streak
                    milestone_name = self._get_milestone_name(threshold)
                    milestones.append({
                        'user': user['handle'],
                        'milestone': milestone_name,
                        'days_remaining': days_to_milestone,
                        'threshold': threshold
                    })
                    break  # Only next milestone
        
        return sorted(milestones, key=lambda x: x['days_remaining'])
    
    def _get_milestone_name(self, threshold: int) -> str:
        """Get milestone name for threshold"""
        milestone_map = {
            3: "Early Bird 🌅",
            7: "Week Warrior 💪", 
            14: "Consistency King 🔥",
            30: "Monthly Legend 🏆",
            100: "Century Club 👑"
        }
        return milestone_map.get(threshold, f"{threshold}-Day Streak")
    
    def _calculate_health_score(self) -> float:
        """Calculate overall streak ecosystem health score (0-100)"""
        stats = self.get_current_stats()
        
        if stats['total_users'] == 0:
            return 0.0
        
        # Base score from participation
        participation_score = min(stats['active_today'] / max(stats['total_users'], 1) * 40, 40)
        
        # Score from average streak length
        streak_score = min(stats['average_streak'] * 10, 40)
        
        # Score from streak distribution (bonus for multiple long streaks)
        user_streaks = [user['current_streak'] for user in stats['users']]
        long_streaks = sum(1 for streak in user_streaks if streak >= 7)
        distribution_score = min(long_streaks * 5, 20)
        
        return round(participation_score + streak_score + distribution_score, 1)

# Usage example and test
if __name__ == "__main__":
    engine = StreakAnalyticsEngine()
    
    # Record some sample data
    engine.record_snapshot('demo_user', 1, 1, True)
    engine.record_snapshot('vibe_champion', 1, 1, True)
    
    # Generate report
    report = engine.generate_weekly_report()
    
    print("🔥 Streak Analytics Report")
    print("=" * 50)
    print(f"Total Users: {report['current_stats']['total_users']}")
    print(f"Average Streak: {report['current_stats']['average_streak']} days")
    print(f"Health Score: {report['streak_health_score']}/100")
    print(f"\n💭 Motivation: {report['motivation_message']}")
    
    if report['insights']:
        print("\n🔍 Key Insights:")
        for insight in report['insights']:
            print(f"  • {insight['title']}: {insight['description']}")
    
    if report['next_milestones']:
        print("\n🎯 Next Milestones:")
        for milestone in report['next_milestones'][:3]:  # Top 3
            print(f"  • {milestone['user']}: {milestone['milestone']} in {milestone['days_remaining']} days")