#!/usr/bin/env python3
"""
🎯 Enhanced Streak Motivation System for @streaks-agent
Create more engaging motivation messages and achievement previews
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

class StreakMotivationEngine:
    def __init__(self):
        self.milestone_messages = {
            1: {
                "celebration": "🌱 Welcome to your streak journey!",
                "motivation": "Every expert was once a beginner. You've taken the first step!",
                "next_goal": "Keep coming back tomorrow to build momentum!"
            },
            2: {
                "celebration": "🌿 Two days running!",
                "motivation": "Consistency is forming! You're building a powerful habit.",
                "next_goal": "One more day to unlock your first milestone badge!"
            },
            3: {
                "celebration": "🌱 Three days strong! Milestone unlocked!",
                "motivation": "You're proving that small daily actions create big results.",
                "next_goal": "Keep going - the Week Warrior badge awaits at 7 days!"
            },
            7: {
                "celebration": "💪 Week Warrior achieved! Seven days of dedication!",
                "motivation": "You've built a real habit now. This is how excellence is created.",
                "next_goal": "Two weeks would put you in elite territory!"
            },
            14: {
                "celebration": "🔥 Two weeks of commitment! You're unstoppable!",
                "motivation": "Most people quit by now. You're in the top 10% of workshop members.",
                "next_goal": "A monthly streak would make you legendary!"
            },
            30: {
                "celebration": "🏆 Monthly Legend status achieved!",
                "motivation": "30 days of showing up. You've demonstrated true mastery of consistency.",
                "next_goal": "The Century Club (100 days) beckons..."
            },
            100: {
                "celebration": "👑 CENTURY CLUB! 100 days of unwavering commitment!",
                "motivation": "You are now among the workshop elite. This level of dedication is extraordinary.",
                "next_goal": "You've transcended milestones. Keep inspiring others!"
            }
        }
        
        self.comeback_messages = [
            "🎯 Ready to restart your streak? Every champion has comeback stories!",
            "🚀 Today is perfect for a fresh start. Your best streak is still ahead!",
            "💎 Diamonds are formed under pressure. Time to shine again!",
            "🌅 Every sunrise is a chance to begin anew. Let's build that streak!",
            "🔥 The fire isn't out, just dimmed. Time to blaze again!"
        ]
        
        self.daily_motivations = [
            "🎨 What will you create today?",
            "🚀 Your consistency is building something amazing.",
            "⭐ Small actions, big impact. You're proof of that.",
            "🌟 Every day you show up, you inspire others.",
            "💪 Strength isn't about never falling, it's about always getting back up.",
            "🎯 Focus on today. Tomorrow's streak starts with today's action.",
            "🌱 Growth happens in small daily doses. You're growing!"
        ]

    def get_milestone_message(self, days: int) -> Dict[str, str]:
        """Get celebration message for a specific milestone"""
        # Find the appropriate milestone
        milestone_day = max([m for m in self.milestone_messages.keys() if days >= m], default=1)
        return self.milestone_messages[milestone_day]

    def get_progress_to_next_milestone(self, current_days: int) -> Dict[str, Any]:
        """Calculate progress to next milestone"""
        milestones = sorted(self.milestone_messages.keys())
        next_milestone = None
        
        for milestone in milestones:
            if current_days < milestone:
                next_milestone = milestone
                break
        
        if not next_milestone:
            return {
                "next_milestone": None,
                "days_remaining": 0,
                "progress_percentage": 100,
                "message": "🏆 You've achieved all current milestones! Legend status!"
            }
        
        days_remaining = next_milestone - current_days
        progress_percentage = (current_days / next_milestone) * 100
        
        return {
            "next_milestone": next_milestone,
            "days_remaining": days_remaining,
            "progress_percentage": progress_percentage,
            "milestone_name": self.get_milestone_name(next_milestone),
            "message": f"🎯 {days_remaining} days to unlock {self.get_milestone_name(next_milestone)}!"
        }

    def get_milestone_name(self, days: int) -> str:
        """Get the name of a milestone"""
        milestone_names = {
            1: "First Day 🌱",
            3: "Early Bird 🌅", 
            7: "Week Warrior 💪",
            14: "Consistency King 🔥",
            30: "Monthly Legend 🏆",
            100: "Century Club 👑"
        }
        return milestone_names.get(days, f"{days}-Day Milestone")

    def generate_personalized_motivation(self, handle: str, current_streak: int, best_streak: int) -> Dict[str, Any]:
        """Generate a personalized motivation package"""
        import random
        
        # Base motivation
        motivation_package = {
            "handle": handle,
            "current_streak": current_streak,
            "best_streak": best_streak,
            "timestamp": datetime.now().isoformat()
        }
        
        if current_streak == 0:
            # Comeback motivation
            motivation_package.update({
                "type": "comeback",
                "message": random.choice(self.comeback_messages),
                "action": "Start fresh today! Every master was once a disaster.",
                "inspiration": f"Your best streak was {best_streak} days. You can beat that!"
            })
        else:
            # Active streak motivation
            milestone_info = self.get_milestone_message(current_streak)
            progress_info = self.get_progress_to_next_milestone(current_streak)
            
            motivation_package.update({
                "type": "active_streak",
                "milestone": milestone_info,
                "progress": progress_info,
                "daily_motivation": random.choice(self.daily_motivations),
                "streak_comparison": self.get_streak_comparison(current_streak, best_streak)
            })
        
        return motivation_package

    def get_streak_comparison(self, current: int, best: int) -> Dict[str, Any]:
        """Compare current streak to personal best"""
        if current > best:
            return {
                "status": "personal_record",
                "message": f"🎉 NEW PERSONAL RECORD! You're at {current} days - your best ever!",
                "encouragement": "You're in uncharted territory now!"
            }
        elif current == best:
            return {
                "status": "matching_best",
                "message": f"🔥 Matching your personal best of {best} days!",
                "encouragement": "One more day and you'll set a new record!"
            }
        else:
            remaining = best - current
            return {
                "status": "chasing_record",
                "message": f"💪 {remaining} days away from your personal best of {best}!",
                "encouragement": "You've done this before - you can do it again!"
            }

def generate_dashboard_data() -> Dict[str, Any]:
    """Generate comprehensive dashboard data"""
    engine = StreakMotivationEngine()
    
    # Load current streak data
    streak_data = {
        "demo_user": {"current_streak": 1, "best_streak": 1},
        "vibe_champion": {"current_streak": 1, "best_streak": 1}
    }
    
    # Generate motivation packages for each user
    user_motivations = {}
    for handle, data in streak_data.items():
        user_motivations[handle] = engine.generate_personalized_motivation(
            handle, data["current_streak"], data["best_streak"]
        )
    
    # Calculate community stats
    active_streaks = [data["current_streak"] for data in streak_data.values() if data["current_streak"] > 0]
    
    dashboard_data = {
        "community_stats": {
            "total_users": len(streak_data),
            "active_streaks": len(active_streaks),
            "average_streak": sum(active_streaks) / len(active_streaks) if active_streaks else 0,
            "longest_current_streak": max(active_streaks) if active_streaks else 0,
            "total_streak_days": sum(active_streaks)
        },
        "user_motivations": user_motivations,
        "leaderboard": sorted(
            [{"handle": h, **d} for h, d in streak_data.items()],
            key=lambda x: x["current_streak"],
            reverse=True
        ),
        "generated_at": datetime.now().isoformat()
    }
    
    return dashboard_data

def main():
    """Generate and save enhanced motivation data"""
    print("🎯 Enhanced Streak Motivation System")
    print("=" * 50)
    
    # Generate dashboard data
    dashboard_data = generate_dashboard_data()
    
    # Save to file
    with open("streak_motivation_data.json", "w") as f:
        json.dump(dashboard_data, f, indent=2)
    
    print(f"✅ Generated motivation data for {dashboard_data['community_stats']['total_users']} users")
    
    # Display motivation messages
    print(f"\\n🌟 Current Motivations:")
    for handle, motivation in dashboard_data["user_motivations"].items():
        print(f"\\n{handle}:")
        if motivation["type"] == "comeback":
            print(f"  📞 {motivation['message']}")
            print(f"  🎯 {motivation['action']}")
        else:
            print(f"  🔥 Streak: {motivation['current_streak']} days")
            print(f"  🎊 {motivation['milestone']['celebration']}")
            print(f"  💭 {motivation['daily_motivation']}")
            
            if motivation['progress']['next_milestone']:
                print(f"  🎯 {motivation['progress']['message']}")
    
    print(f"\\n📊 Community Overview:")
    stats = dashboard_data["community_stats"]
    print(f"  👥 {stats['total_users']} users tracked")
    print(f"  🔥 {stats['active_streaks']} active streaks")
    print(f"  📈 {stats['average_streak']:.1f} average streak length")
    print(f"  👑 {stats['longest_current_streak']} longest current streak")

if __name__ == "__main__":
    main()