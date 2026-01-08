#!/usr/bin/env python3
"""
🔥 Advanced Streak Trend Analytics Engine
Built by @streaks-agent for /vibe workshop

Analyzes streak patterns, predicts milestones, and identifies engagement trends.
"""

import json
import datetime
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import math

@dataclass
class StreakSnapshot:
    """Single point-in-time streak data"""
    timestamp: datetime.datetime
    user: str
    current_streak: int
    best_streak: int
    is_active: bool
    milestone_achieved: Optional[str] = None

@dataclass
class TrendInsight:
    """Analytical insight about streak patterns"""
    type: str  # "growth", "retention", "milestone", "pattern"
    severity: str  # "info", "warning", "critical", "celebration"
    title: str
    description: str
    action_needed: bool
    confidence: float  # 0.0 to 1.0

class StreakTrendAnalyzer:
    """Advanced analytics engine for streak patterns"""
    
    def __init__(self):
        self.snapshots: List[StreakSnapshot] = []
        self.milestones = {
            3: "🌱 First Steps",
            7: "💪 Week Warrior", 
            14: "🔥 Two Week Titan",
            30: "🏆 Monthly Legend",
            100: "👑 Century Club"
        }
    
    def add_snapshot(self, users_data: Dict[str, Dict]):
        """Add current streak data as a snapshot"""
        timestamp = datetime.datetime.now()
        
        for username, data in users_data.items():
            if not username.startswith('@'):
                username = f"@{username}"
            
            snapshot = StreakSnapshot(
                timestamp=timestamp,
                user=username,
                current_streak=data.get('current', 0),
                best_streak=data.get('best', 0),
                is_active=data.get('current', 0) > 0
            )
            
            # Check if this represents a new milestone
            current = data.get('current', 0)
            for threshold, name in self.milestones.items():
                if current == threshold:
                    snapshot.milestone_achieved = name
                    break
            
            self.snapshots.append(snapshot)
    
    def calculate_retention_rate(self, days_back: int = 7) -> float:
        """Calculate user retention rate over specified period"""
        if not self.snapshots:
            return 0.0
        
        cutoff = datetime.datetime.now() - datetime.timedelta(days=days_back)
        recent_snapshots = [s for s in self.snapshots if s.timestamp >= cutoff]
        
        if not recent_snapshots:
            return 0.0
        
        active_users = len(set(s.user for s in recent_snapshots if s.is_active))
        total_users = len(set(s.user for s in recent_snapshots))
        
        return (active_users / total_users) * 100 if total_users > 0 else 0.0
    
    def predict_next_milestones(self) -> List[Dict]:
        """Predict when users will hit their next milestones"""
        predictions = []
        
        # Get latest snapshot for each user
        latest_by_user = {}
        for snapshot in self.snapshots:
            if snapshot.user not in latest_by_user or snapshot.timestamp > latest_by_user[snapshot.user].timestamp:
                latest_by_user[snapshot.user] = snapshot
        
        for user, snapshot in latest_by_user.items():
            if not snapshot.is_active:
                continue
                
            current = snapshot.current_streak
            next_milestone = None
            days_to_milestone = None
            
            for threshold in sorted(self.milestones.keys()):
                if current < threshold:
                    next_milestone = self.milestones[threshold]
                    days_to_milestone = threshold - current
                    break
            
            if next_milestone:
                eta = datetime.datetime.now() + datetime.timedelta(days=days_to_milestone)
                predictions.append({
                    'user': user,
                    'current_streak': current,
                    'next_milestone': next_milestone,
                    'days_remaining': days_to_milestone,
                    'estimated_date': eta.strftime('%Y-%m-%d'),
                    'probability': self._calculate_success_probability(current, days_to_milestone)
                })
        
        return sorted(predictions, key=lambda x: x['days_remaining'])
    
    def _calculate_success_probability(self, current_streak: int, days_needed: int) -> float:
        """Estimate probability of reaching milestone based on current streak"""
        # Simple model: longer current streaks have higher success rates
        # This could be enhanced with historical data
        base_rate = 0.7  # 70% base success rate
        streak_bonus = min(current_streak * 0.05, 0.2)  # Up to 20% bonus for longer streaks
        difficulty_penalty = min(days_needed * 0.02, 0.3)  # Up to 30% penalty for distant milestones
        
        probability = base_rate + streak_bonus - difficulty_penalty
        return max(0.1, min(0.95, probability))  # Clamp between 10% and 95%
    
    def generate_insights(self) -> List[TrendInsight]:
        """Generate actionable insights from streak data"""
        insights = []
        
        if not self.snapshots:
            return [TrendInsight(
                type="info",
                severity="info", 
                title="No Data Available",
                description="Start tracking streaks to see insights here.",
                action_needed=False,
                confidence=1.0
            )]
        
        # Retention analysis
        retention = self.calculate_retention_rate()
        if retention >= 90:
            insights.append(TrendInsight(
                type="retention",
                severity="celebration",
                title="🚀 Exceptional Retention",
                description=f"{retention:.0f}% of users are maintaining active streaks. Outstanding engagement!",
                action_needed=False,
                confidence=0.95
            ))
        elif retention >= 70:
            insights.append(TrendInsight(
                type="retention", 
                severity="info",
                title="💪 Strong Retention",
                description=f"{retention:.0f}% retention rate indicates healthy community engagement.",
                action_needed=False,
                confidence=0.85
            ))
        else:
            insights.append(TrendInsight(
                type="retention",
                severity="warning",
                title="⚠️ Retention Challenge", 
                description=f"Only {retention:.0f}% retention. Consider engagement strategies.",
                action_needed=True,
                confidence=0.8
            ))
        
        # Milestone readiness
        predictions = self.predict_next_milestones()
        upcoming_milestones = [p for p in predictions if p['days_remaining'] <= 3]
        
        if upcoming_milestones:
            user_list = ", ".join([p['user'] for p in upcoming_milestones])
            insights.append(TrendInsight(
                type="milestone",
                severity="celebration",
                title="🎯 Milestone Alert", 
                description=f"Upcoming achievements for {user_list} in the next 3 days!",
                action_needed=True,
                confidence=0.9
            ))
        
        # Pattern analysis  
        active_users = len(set(s.user for s in self.snapshots if s.is_active))
        if active_users >= 2:
            insights.append(TrendInsight(
                type="pattern",
                severity="info",
                title="🌟 Community Building",
                description=f"{active_users} users actively building habits together. Social proof effect in action!",
                action_needed=False,
                confidence=0.8
            ))
        
        return insights
    
    def generate_dashboard_data(self) -> Dict:
        """Generate comprehensive data for dashboard visualization"""
        insights = self.generate_insights()
        predictions = self.predict_next_milestones()
        retention = self.calculate_retention_rate()
        
        # Calculate streaks distribution
        latest_by_user = {}
        for snapshot in self.snapshots:
            if snapshot.user not in latest_by_user or snapshot.timestamp > latest_by_user[snapshot.user].timestamp:
                latest_by_user[snapshot.user] = snapshot
        
        distribution = {'1-3 days': 0, '4-7 days': 0, '8-14 days': 0, '15+ days': 0}
        for snapshot in latest_by_user.values():
            if snapshot.is_active:
                streak = snapshot.current_streak
                if streak <= 3:
                    distribution['1-3 days'] += 1
                elif streak <= 7:
                    distribution['4-7 days'] += 1
                elif streak <= 14:
                    distribution['8-14 days'] += 1
                else:
                    distribution['15+ days'] += 1
        
        return {
            'insights': [
                {
                    'type': i.type,
                    'severity': i.severity,
                    'title': i.title, 
                    'description': i.description,
                    'action_needed': i.action_needed,
                    'confidence': i.confidence
                } for i in insights
            ],
            'predictions': predictions,
            'retention_rate': retention,
            'distribution': distribution,
            'total_active': len([s for s in latest_by_user.values() if s.is_active]),
            'total_users': len(latest_by_user),
            'generated_at': datetime.datetime.now().isoformat()
        }

def main():
    """Demo of the analytics engine"""
    analyzer = StreakTrendAnalyzer()
    
    # Simulate current streak data
    demo_data = {
        'demo_user': {'current': 1, 'best': 1},
        'vibe_champion': {'current': 1, 'best': 1}
    }
    
    analyzer.add_snapshot(demo_data)
    dashboard_data = analyzer.generate_dashboard_data()
    
    print("🔥 Streak Trend Analytics Dashboard Data")
    print("=" * 50)
    print(json.dumps(dashboard_data, indent=2))

if __name__ == "__main__":
    main()