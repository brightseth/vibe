#!/usr/bin/env python3
"""
🎖️ Advanced Achievement Badge System
Built by @streaks-agent for /vibe workshop

Creates, tracks, and visualizes achievement badges with progress indicators.
"""

import json
import datetime
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Set
from enum import Enum

class BadgeRarity(Enum):
    COMMON = "common"      # 🌱 Green - Early achievements
    UNCOMMON = "uncommon"  # 💪 Blue - Weekly achievements  
    RARE = "rare"         # 🔥 Orange - Bi-weekly achievements
    EPIC = "epic"         # 🏆 Purple - Monthly achievements
    LEGENDARY = "legendary" # 👑 Gold - Extended achievements
    SPECIAL = "special"    # ⚡ Rainbow - Unique accomplishments

@dataclass
class Badge:
    """Represents an achievement badge"""
    id: str
    name: str
    emoji: str
    description: str
    threshold: Optional[int] = None
    special_condition: Optional[str] = None
    rarity: BadgeRarity = BadgeRarity.COMMON
    is_secret: bool = False
    celebration_message: str = ""
    board_announcement: bool = False

@dataclass
class UserBadge:
    """A badge earned by a specific user"""
    badge_id: str
    user: str
    earned_at: datetime.datetime
    streak_value: int
    celebration_sent: bool = False
    board_announced: bool = False

class AchievementBadgeSystem:
    """Complete achievement and badge management system"""
    
    def __init__(self):
        self.badges: Dict[str, Badge] = {}
        self.user_badges: List[UserBadge] = []
        self._initialize_badges()
    
    def _initialize_badges(self):
        """Initialize all available badges"""
        
        # Streak Milestone Badges
        streak_badges = [
            Badge(
                id="first_steps",
                name="First Steps", 
                emoji="🌱",
                description="Your first 3-day streak! The foundation of all greatness.",
                threshold=3,
                rarity=BadgeRarity.COMMON,
                celebration_message="Getting started! 🌱 Three days of consistency - you're building something special!",
                board_announcement=False
            ),
            Badge(
                id="week_warrior", 
                name="Week Warrior",
                emoji="💪",
                description="One full week of dedication. You're in the groove!",
                threshold=7,
                rarity=BadgeRarity.UNCOMMON, 
                celebration_message="One week strong! 💪 You've proven you can show up consistently!",
                board_announcement=True
            ),
            Badge(
                id="two_week_titan",
                name="Two Week Titan", 
                emoji="🔥",
                description="Two weeks! This is where habits truly form.",
                threshold=14,
                rarity=BadgeRarity.RARE,
                celebration_message="Two weeks! You're committed! 🔥 This is where magic happens!",
                board_announcement=True
            ),
            Badge(
                id="monthly_legend",
                name="Monthly Legend",
                emoji="🏆", 
                description="A full month of dedication. You're in rare company.",
                threshold=30,
                rarity=BadgeRarity.EPIC,
                celebration_message="Monthly legend! 🏆 30 days of showing up - incredible dedication!",
                board_announcement=True
            ),
            Badge(
                id="century_club",
                name="Century Club",
                emoji="👑",
                description="The ultimate achievement. 100 days of consistency.",
                threshold=100,
                rarity=BadgeRarity.LEGENDARY,
                celebration_message="Century club! 👑 100 days! You've transcended streaks - this is mastery!",
                board_announcement=True
            )
        ]
        
        # Special Achievement Badges
        special_badges = [
            Badge(
                id="lightning_start",
                name="Lightning Start",
                emoji="⚡",
                description="Reached 3-day streak within your first week!",
                special_condition="first_week_three_day",
                rarity=BadgeRarity.SPECIAL,
                celebration_message="Lightning Start! ⚡ Hit 3 days in your first week - incredible momentum!",
                board_announcement=True
            ),
            Badge(
                id="comeback_champion",
                name="Comeback Champion", 
                emoji="🔄",
                description="Rebuilt a streak longer than your previous best!",
                special_condition="comeback_streak",
                rarity=BadgeRarity.SPECIAL,
                celebration_message="Comeback Champion! 🔄 You turned setback into comeback - inspiring!",
                board_announcement=True
            ),
            Badge(
                id="perfect_week",
                name="Perfect Week",
                emoji="🎯", 
                description="Seven consecutive days of activity!",
                special_condition="seven_consecutive",
                rarity=BadgeRarity.SPECIAL,
                celebration_message="Perfect Week! 🎯 Seven days straight - flawless execution!",
                board_announcement=False
            ),
            Badge(
                id="streak_breaker",
                name="Streak Breaker",
                emoji="📈",
                description="Broke your personal record 3 times!",
                special_condition="three_records_broken",
                rarity=BadgeRarity.SPECIAL,
                celebration_message="Streak Breaker! 📈 Three personal records broken - unstoppable growth!",
                board_announcement=True
            ),
            Badge(
                id="first_day",
                name="Welcome Aboard",
                emoji="🎉", 
                description="Started your first streak!",
                threshold=1,
                rarity=BadgeRarity.COMMON,
                celebration_message="Welcome aboard! 🎉 Day one complete - every expert was once a beginner!",
                board_announcement=False
            )
        ]
        
        # Seasonal/Event Badges (examples for future)
        seasonal_badges = [
            Badge(
                id="new_year_starter",
                name="New Year Starter",
                emoji="🎊",
                description="Started streak in first week of new year!",
                special_condition="new_year_week_one",
                rarity=BadgeRarity.SPECIAL,
                is_secret=True,
                celebration_message="New Year Starter! 🎊 Perfect timing to build new habits!",
                board_announcement=True
            )
        ]
        
        all_badges = streak_badges + special_badges + seasonal_badges
        
        for badge in all_badges:
            self.badges[badge.id] = badge
    
    def check_earned_badges(self, user: str, current_streak: int, best_streak: int, 
                           streak_history: Optional[List[int]] = None) -> List[Badge]:
        """Check which badges user has earned but not yet received"""
        earned_badges = []
        
        # Get already earned badge IDs for this user
        earned_ids = {ub.badge_id for ub in self.user_badges if ub.user == user}
        
        # Check streak milestone badges
        for badge in self.badges.values():
            if badge.id in earned_ids:
                continue  # Already earned
                
            if badge.threshold and current_streak >= badge.threshold:
                earned_badges.append(badge)
        
        # Check special condition badges
        earned_badges.extend(self._check_special_badges(user, current_streak, best_streak, 
                                                       streak_history, earned_ids))
        
        return earned_badges
    
    def _check_special_badges(self, user: str, current_streak: int, best_streak: int,
                             streak_history: Optional[List[int]], earned_ids: Set[str]) -> List[Badge]:
        """Check special condition badges"""
        special_badges = []
        
        # Lightning Start: 3-day streak in first week (simplified - assume any 3+ is eligible)
        if "lightning_start" not in earned_ids and current_streak >= 3:
            special_badges.append(self.badges["lightning_start"])
        
        # Comeback Champion: current streak > previous best 
        if "comeback_champion" not in earned_ids and current_streak > best_streak and best_streak > 0:
            special_badges.append(self.badges["comeback_champion"])
        
        # Perfect Week: exactly 7 consecutive days (simplified check)
        if "perfect_week" not in earned_ids and current_streak >= 7:
            special_badges.append(self.badges["perfect_week"])
        
        return special_badges
    
    def award_badge(self, user: str, badge: Badge, streak_value: int) -> UserBadge:
        """Award a badge to a user"""
        user_badge = UserBadge(
            badge_id=badge.id,
            user=user,
            earned_at=datetime.datetime.now(),
            streak_value=streak_value
        )
        
        self.user_badges.append(user_badge)
        return user_badge
    
    def get_user_badges(self, user: str) -> List[Dict]:
        """Get all badges earned by a user with full badge info"""
        user_badge_data = []
        
        for user_badge in self.user_badges:
            if user_badge.user == user:
                badge = self.badges[user_badge.badge_id]
                user_badge_data.append({
                    'badge': asdict(badge),
                    'earned_at': user_badge.earned_at.isoformat(),
                    'streak_value': user_badge.streak_value,
                    'celebration_sent': user_badge.celebration_sent,
                    'board_announced': user_badge.board_announced
                })
        
        # Sort by earned date
        return sorted(user_badge_data, key=lambda x: x['earned_at'])
    
    def get_badge_leaderboard(self) -> List[Dict]:
        """Generate leaderboard based on badge achievements"""
        user_stats = {}
        
        for user_badge in self.user_badges:
            user = user_badge.user
            badge = self.badges[user_badge.badge_id]
            
            if user not in user_stats:
                user_stats[user] = {
                    'user': user,
                    'total_badges': 0,
                    'rarity_points': 0,
                    'latest_badge': None,
                    'badges': []
                }
            
            # Rarity points system
            rarity_points = {
                BadgeRarity.COMMON: 1,
                BadgeRarity.UNCOMMON: 3, 
                BadgeRarity.RARE: 5,
                BadgeRarity.EPIC: 10,
                BadgeRarity.LEGENDARY: 20,
                BadgeRarity.SPECIAL: 8
            }
            
            user_stats[user]['total_badges'] += 1
            user_stats[user]['rarity_points'] += rarity_points.get(badge.rarity, 1)
            user_stats[user]['badges'].append({
                'name': badge.name,
                'emoji': badge.emoji,
                'rarity': badge.rarity.value
            })
            
            # Track latest badge
            if (user_stats[user]['latest_badge'] is None or 
                user_badge.earned_at > datetime.datetime.fromisoformat(user_stats[user]['latest_badge']['earned_at'])):
                user_stats[user]['latest_badge'] = {
                    'name': badge.name,
                    'emoji': badge.emoji,
                    'earned_at': user_badge.earned_at.isoformat()
                }
        
        # Sort by rarity points, then by badge count
        return sorted(user_stats.values(), 
                     key=lambda x: (x['rarity_points'], x['total_badges']), 
                     reverse=True)
    
    def get_next_badges(self, user: str, current_streak: int) -> List[Dict]:
        """Get next achievable badges for a user"""
        earned_ids = {ub.badge_id for ub in self.user_badges if ub.user == user}
        next_badges = []
        
        for badge in self.badges.values():
            if badge.id in earned_ids or badge.is_secret:
                continue
                
            if badge.threshold and badge.threshold > current_streak:
                days_needed = badge.threshold - current_streak
                next_badges.append({
                    'badge': asdict(badge),
                    'days_needed': days_needed,
                    'progress_percentage': (current_streak / badge.threshold) * 100
                })
        
        return sorted(next_badges, key=lambda x: x['days_needed'])
    
    def generate_badge_summary(self) -> Dict:
        """Generate comprehensive badge system summary"""
        total_badges = len(self.badges)
        awarded_badges = len(self.user_badges)
        unique_earners = len(set(ub.user for ub in self.user_badges))
        
        # Badge rarity breakdown
        rarity_counts = {}
        for badge in self.badges.values():
            rarity = badge.rarity.value
            rarity_counts[rarity] = rarity_counts.get(rarity, 0) + 1
        
        # Recent achievements
        recent_achievements = sorted(
            self.user_badges,
            key=lambda x: x.earned_at,
            reverse=True
        )[:5]  # Last 5 achievements
        
        return {
            'system_stats': {
                'total_badges_available': total_badges,
                'total_badges_awarded': awarded_badges,
                'unique_badge_earners': unique_earners,
                'badge_categories': len(set(b.rarity.value for b in self.badges.values()))
            },
            'rarity_distribution': rarity_counts,
            'recent_achievements': [
                {
                    'user': ub.user,
                    'badge_name': self.badges[ub.badge_id].name,
                    'badge_emoji': self.badges[ub.badge_id].emoji,
                    'earned_at': ub.earned_at.isoformat(),
                    'streak_value': ub.streak_value
                } for ub in recent_achievements
            ],
            'leaderboard': self.get_badge_leaderboard(),
            'generated_at': datetime.datetime.now().isoformat()
        }

def main():
    """Demo the badge system"""
    badge_system = AchievementBadgeSystem()
    
    # Simulate awarding some badges
    demo_user_badge = badge_system.award_badge("@demo_user", badge_system.badges["first_day"], 1)
    champion_badge = badge_system.award_badge("@vibe_champion", badge_system.badges["first_day"], 1)
    
    # Generate summary
    summary = badge_system.generate_badge_summary()
    
    print("🎖️ Achievement Badge System Summary")
    print("=" * 50)
    print(json.dumps(summary, indent=2))
    
    # Show next badges for users
    print("\n🎯 Next Badges for @demo_user:")
    next_badges = badge_system.get_next_badges("@demo_user", 1)
    for badge_info in next_badges[:3]:  # Top 3 next badges
        badge = badge_info['badge']
        print(f"  {badge['emoji']} {badge['name']} - {badge_info['days_needed']} days ({badge_info['progress_percentage']:.0f}%)")

if __name__ == "__main__":
    main()