#!/usr/bin/env python3
"""
🎖️ Integrated Streak & Badge System
Built by @streaks-agent for /vibe workshop

Real-time integration between streak tracking and badge awarding.
Automatically detects milestone achievements and celebrates users.
"""

import json
import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict

@dataclass
class StreakData:
    user: str
    current_streak: int
    best_streak: int
    last_active: str
    total_active_days: int = 0

@dataclass
class Badge:
    id: str
    name: str
    emoji: str
    description: str
    threshold: int
    celebration_message: str
    board_announcement: bool = False

@dataclass
class UserAchievement:
    user: str
    badge_id: str
    earned_at: datetime.datetime
    streak_value: int
    celebrated: bool = False

class IntegratedStreakBadgeSystem:
    """Unified system for tracking streaks and awarding achievements"""
    
    def __init__(self):
        self.streak_data_file = "streak_data.json"
        self.achievements_file = "achievements.json"
        self.badges = self._initialize_badges()
        self.user_achievements: List[UserAchievement] = []
        self.load_existing_data()
    
    def _initialize_badges(self) -> Dict[str, Badge]:
        """Initialize milestone badges with celebration messages"""
        badges = {
            "first_day": Badge(
                id="first_day",
                name="Welcome Aboard",
                emoji="🎉",
                description="Started your streak journey!",
                threshold=1,
                celebration_message="Welcome aboard! 🎉 Day one complete - every expert was once a beginner!",
                board_announcement=False
            ),
            "seedling": Badge(
                id="seedling", 
                name="Seedling",
                emoji="🌱",
                description="3 days of growth!",
                threshold=3,
                celebration_message="Getting started! 🌱 Three days of consistency - you're building something special!",
                board_announcement=False
            ),
            "sprout": Badge(
                id="sprout",
                name="Sprout", 
                emoji="💪",
                description="One week of dedication!",
                threshold=7,
                celebration_message="One week strong! 💪 You've proven you can show up consistently!",
                board_announcement=True
            ),
            "flame": Badge(
                id="flame",
                name="Flame",
                emoji="🔥", 
                description="Two weeks burning bright!",
                threshold=14,
                celebration_message="Two weeks! You're committed! 🔥 This is where magic happens!",
                board_announcement=True
            ),
            "crown": Badge(
                id="crown",
                name="Crown",
                emoji="👑",
                description="30 days of mastery!",
                threshold=30,
                celebration_message="Monthly legend! 👑 30 days of showing up - incredible dedication!",
                board_announcement=True
            ),
            "century": Badge(
                id="century",
                name="Century Club", 
                emoji="🏆",
                description="100 days of excellence!",
                threshold=100,
                celebration_message="Century club! 🏆 100 days! You've transcended streaks - this is mastery!",
                board_announcement=True
            )
        }
        return badges
    
    def load_existing_data(self):
        """Load existing streak and achievement data"""
        # Load achievements from file if it exists
        try:
            with open(self.achievements_file, 'r') as f:
                data = json.load(f)
                if 'achievement_log' in data:
                    for entry in data['achievement_log']:
                        achievement = UserAchievement(
                            user=entry['user'],
                            badge_id=entry['badge_id'], 
                            earned_at=datetime.datetime.fromisoformat(entry['earned_at']),
                            streak_value=entry['streak_value'],
                            celebrated=entry.get('celebrated', False)
                        )
                        self.user_achievements.append(achievement)
        except FileNotFoundError:
            pass
    
    def get_current_streaks(self) -> Dict[str, StreakData]:
        """Load current streak data"""
        try:
            with open(self.streak_data_file, 'r') as f:
                data = json.load(f)
                
            streaks = {}
            for user, streak_info in data.items():
                if isinstance(streak_info, dict):
                    current = streak_info.get('current', 0)
                    best = streak_info.get('best', 0)
                    last_active = streak_info.get('last_active', '')
                else:
                    # Handle simple format
                    current = streak_info
                    best = current
                    last_active = datetime.datetime.now().isoformat()
                
                streaks[user] = StreakData(
                    user=user,
                    current_streak=current,
                    best_streak=best, 
                    last_active=last_active
                )
            
            return streaks
        except FileNotFoundError:
            return {}
    
    def check_new_achievements(self, user: str, current_streak: int) -> List[Badge]:
        """Check what new badges a user has earned"""
        # Get badges user has already earned
        earned_badge_ids = {
            achievement.badge_id for achievement in self.user_achievements 
            if achievement.user == user
        }
        
        new_badges = []
        for badge in self.badges.values():
            if (badge.id not in earned_badge_ids and 
                current_streak >= badge.threshold):
                new_badges.append(badge)
        
        # Sort by threshold to award in order
        return sorted(new_badges, key=lambda b: b.threshold)
    
    def award_achievement(self, user: str, badge: Badge, streak_value: int) -> UserAchievement:
        """Award a badge to a user"""
        achievement = UserAchievement(
            user=user,
            badge_id=badge.id,
            earned_at=datetime.datetime.now(),
            streak_value=streak_value,
            celebrated=False
        )
        
        self.user_achievements.append(achievement)
        self.save_achievements()
        return achievement
    
    def save_achievements(self):
        """Save achievements to file"""
        # Load existing achievements file structure
        try:
            with open(self.achievements_file, 'r') as f:
                data = json.load(f)
        except FileNotFoundError:
            data = {"badges": {}, "user_badges": {}, "achievement_log": []}
        
        # Convert achievements to serializable format
        achievement_log = []
        for achievement in self.user_achievements:
            achievement_log.append({
                'user': achievement.user,
                'badge_id': achievement.badge_id,
                'badge_name': self.badges[achievement.badge_id].name,
                'badge_emoji': self.badges[achievement.badge_id].emoji,
                'earned_at': achievement.earned_at.isoformat(),
                'streak_value': achievement.streak_value,
                'celebrated': achievement.celebrated
            })
        
        data['achievement_log'] = achievement_log
        
        # Update user_badges structure
        user_badges = {}
        for achievement in self.user_achievements:
            user = achievement.user
            if user not in user_badges:
                user_badges[user] = []
            
            user_badges[user].append({
                'badge_id': achievement.badge_id,
                'name': self.badges[achievement.badge_id].name,
                'emoji': self.badges[achievement.badge_id].emoji,
                'earned_at': achievement.earned_at.isoformat(),
                'streak_value': achievement.streak_value
            })
        
        data['user_badges'] = user_badges
        
        # Update badges definition
        data['badges'] = {
            badge_id: {
                'name': badge.name,
                'description': badge.description, 
                'emoji': badge.emoji,
                'threshold': badge.threshold
            } for badge_id, badge in self.badges.items()
        }
        
        with open(self.achievements_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def process_streak_updates(self) -> Dict[str, List[Badge]]:
        """Process all users and check for new achievements"""
        streaks = self.get_current_streaks()
        all_new_achievements = {}
        
        for user, streak_data in streaks.items():
            new_badges = self.check_new_achievements(user, streak_data.current_streak)
            
            if new_badges:
                all_new_achievements[user] = []
                for badge in new_badges:
                    achievement = self.award_achievement(user, badge, streak_data.current_streak)
                    all_new_achievements[user].append(badge)
        
        return all_new_achievements
    
    def get_celebration_messages(self) -> List[Tuple[str, str, bool]]:
        """Get uncelebrated achievements that need celebration"""
        celebrations = []
        
        for achievement in self.user_achievements:
            if not achievement.celebrated:
                badge = self.badges[achievement.badge_id]
                celebrations.append((
                    achievement.user,
                    badge.celebration_message,
                    badge.board_announcement
                ))
                # Mark as celebrated
                achievement.celebrated = True
        
        if celebrations:
            self.save_achievements()
        
        return celebrations
    
    def generate_milestone_report(self) -> Dict:
        """Generate comprehensive milestone achievement report"""
        streaks = self.get_current_streaks()
        
        # Calculate next milestones for each user
        next_milestones = {}
        for user, streak_data in streaks.items():
            earned_thresholds = {
                achievement.badge_id: self.badges[achievement.badge_id].threshold 
                for achievement in self.user_achievements 
                if achievement.user == user
            }
            
            # Find next unearned milestone
            next_milestone = None
            for badge in sorted(self.badges.values(), key=lambda b: b.threshold):
                if badge.id not in earned_thresholds:
                    days_needed = badge.threshold - streak_data.current_streak
                    if days_needed > 0:
                        next_milestone = {
                            'badge': badge,
                            'days_needed': days_needed,
                            'progress': (streak_data.current_streak / badge.threshold) * 100
                        }
                        break
            
            next_milestones[user] = next_milestone
        
        # Generate summary stats
        total_achievements = len(self.user_achievements)
        unique_achievers = len(set(achievement.user for achievement in self.user_achievements))
        
        # Recent achievements (last 5)
        recent_achievements = sorted(
            self.user_achievements, 
            key=lambda a: a.earned_at, 
            reverse=True
        )[:5]
        
        return {
            'timestamp': datetime.datetime.now().isoformat(),
            'summary': {
                'total_users': len(streaks),
                'total_achievements': total_achievements,
                'unique_achievers': unique_achievers,
                'active_streaks': len([s for s in streaks.values() if s.current_streak > 0])
            },
            'next_milestones': {
                user: {
                    'current_streak': streak_data.current_streak,
                    'next_badge': milestone['badge'].name if milestone else None,
                    'next_emoji': milestone['badge'].emoji if milestone else None,
                    'days_needed': milestone['days_needed'] if milestone else 0,
                    'progress_percent': round(milestone['progress'], 1) if milestone else 100
                } for user, (streak_data, milestone) in 
                zip(streaks.items(), [(streaks[u], next_milestones[u]) for u in streaks.keys()])
            },
            'recent_achievements': [
                {
                    'user': achievement.user,
                    'badge_name': self.badges[achievement.badge_id].name,
                    'badge_emoji': self.badges[achievement.badge_id].emoji,
                    'earned_at': achievement.earned_at.isoformat(),
                    'streak_value': achievement.streak_value
                } for achievement in recent_achievements
            ]
        }

def main():
    """Demo the integrated system"""
    system = IntegratedStreakBadgeSystem()
    
    print("🎖️ Integrated Streak & Badge System")
    print("=" * 50)
    
    # Check for new achievements
    new_achievements = system.process_streak_updates()
    
    if new_achievements:
        print("🎉 New Achievements Detected:")
        for user, badges in new_achievements.items():
            for badge in badges:
                print(f"  {badge.emoji} {user} earned '{badge.name}' badge!")
    else:
        print("✅ No new achievements (all users caught up)")
    
    # Get celebrations needed
    celebrations = system.get_celebration_messages()
    
    if celebrations:
        print("\n🎊 Celebrations Needed:")
        for user, message, board in celebrations:
            print(f"  DM {user}: {message}")
            if board:
                print(f"    📢 Also announce on board!")
    else:
        print("\n✅ No pending celebrations")
    
    # Generate milestone report
    report = system.generate_milestone_report()
    
    print(f"\n📊 Milestone Report:")
    print(f"  Active Users: {report['summary']['total_users']}")
    print(f"  Total Achievements: {report['summary']['total_achievements']}")
    print(f"  Active Streaks: {report['summary']['active_streaks']}")
    
    print(f"\n🎯 Next Milestones:")
    for user, milestone in report['next_milestones'].items():
        if milestone['next_badge']:
            print(f"  {user}: {milestone['days_needed']} days to {milestone['next_emoji']} {milestone['next_badge']} ({milestone['progress_percent']}%)")
        else:
            print(f"  {user}: All major milestones achieved! 🏆")

if __name__ == "__main__":
    main()