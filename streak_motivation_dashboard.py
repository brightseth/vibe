#!/usr/bin/env python3
"""
Streak Motivation Dashboard for @streaks-agent
Makes progress visible and encouraging, even for small streaks.
"""

import json
from datetime import datetime
from streak_milestone_celebration_system import StreakMilestoneCelebrator

class StreakMotivationDashboard:
    def __init__(self):
        self.celebrator = StreakMilestoneCelebrator()
        
    def parse_streak_data(self, streak_data):
        """Parse streak data into structured format"""
        parsed = {}
        for user, streak_str in streak_data.items():
            if "days" in streak_str:
                # Parse "X days (best: Y)" format
                parts = streak_str.split(" days")
                current = int(parts[0])
                if "(best:" in streak_str:
                    best = int(streak_str.split("(best: ")[1].split(")")[0])
                else:
                    best = current
                parsed[user] = {"current": current, "best": best}
        return parsed
    
    def generate_motivation_message(self, user, streak_data):
        """Generate encouraging message for current progress"""
        current = streak_data["current"]
        best = streak_data["best"]
        
        # Get next milestone info
        next_milestone = self.celebrator.get_next_milestone(current)
        
        messages = []
        
        # Current streak acknowledgment
        if current == 1:
            messages.append(f"🌱 {user}: Starting fresh! Day 1 is the hardest - you did it!")
        elif current < 3:
            messages.append(f"💫 {user}: {current} days and building momentum!")
        elif current < 7:
            messages.append(f"🔥 {user}: {current} days strong! The habit is forming!")
        elif current < 14:
            messages.append(f"💪 {user}: {current} days of consistency! You're locked in!")
        else:
            messages.append(f"🏆 {user}: {current} days! You're a workshop legend!")
        
        # Next milestone motivation
        if next_milestone:
            days_left = next_milestone["days_to_milestone"]
            if days_left == 1:
                messages.append(f"    ⚡ Just 1 more day to hit {next_milestone['title']}! {next_milestone['emoji']}")
            elif days_left <= 3:
                messages.append(f"    🎯 Only {days_left} days until {next_milestone['title']} {next_milestone['emoji']}")
            else:
                messages.append(f"    🌟 {days_left} days to {next_milestone['title']} {next_milestone['emoji']}")
        
        # Personal best context
        if current == best:
            messages.append(f"    🚀 Personal best! You're blazing new territory!")
        elif current == best - 1:
            messages.append(f"    💎 One day away from tying your best ({best} days)!")
        elif current < best:
            messages.append(f"    📈 Working back toward your best of {best} days")
            
        return "\n".join(messages)
    
    def create_dashboard_summary(self, streak_data):
        """Create a motivational dashboard summary"""
        parsed = self.parse_streak_data(streak_data)
        
        summary = ["🎯 Workshop Streak Dashboard", "=" * 35, ""]
        
        if not parsed:
            summary.append("No active streaks yet. Time to start building!")
            return "\n".join(summary)
        
        # Individual progress
        for user, data in parsed.items():
            motivation = self.generate_motivation_message(user, data)
            summary.append(motivation)
            summary.append("")
        
        # Community stats
        total_days = sum(data["current"] for data in parsed.values())
        avg_streak = total_days / len(parsed) if parsed else 0
        longest_current = max(data["current"] for data in parsed.values()) if parsed else 0
        
        summary.extend([
            "📊 Community Stats:",
            f"    Active streakers: {len(parsed)}",
            f"    Total active days: {total_days}",
            f"    Average streak: {avg_streak:.1f} days",
            f"    Longest current: {longest_current} days",
            ""
        ])
        
        # Upcoming milestones
        upcoming = []
        for user, data in parsed.items():
            next_milestone = self.celebrator.get_next_milestone(data["current"])
            if next_milestone:
                upcoming.append((user, next_milestone["days_to_milestone"], next_milestone["title"], next_milestone["emoji"]))
        
        if upcoming:
            upcoming.sort(key=lambda x: x[1])  # Sort by days until milestone
            summary.append("🎯 Next Milestones:")
            for user, days, title, emoji in upcoming:
                summary.append(f"    {user}: {days} days to {title} {emoji}")
        
        return "\n".join(summary)
    
    def create_encouragement_for_low_streaks(self, streak_data):
        """Special encouragement for users with low streaks"""
        parsed = self.parse_streak_data(streak_data)
        
        encouragements = []
        
        for user, data in parsed.items():
            current = data["current"]
            
            if current == 1:
                encouragements.append(
                    f"💫 {user}: Day 1 is special! You broke inertia and showed up. "
                    f"That's the hardest part. Tomorrow makes it a pattern! 🌱"
                )
            elif current == 2:
                encouragements.append(
                    f"🔥 {user}: Day 2! You're not just visiting - you're building a habit. "
                    f"One more day hits your first milestone! 🎯"
                )
        
        return encouragements
    
    def get_streak_insights(self, streak_data):
        """Generate insights about streak patterns"""
        parsed = self.parse_streak_data(streak_data)
        
        insights = []
        
        # Pattern recognition
        all_current = [data["current"] for data in parsed.values()]
        all_best = [data["best"] for data in parsed.values()]
        
        if all_current:
            if all(s == 1 for s in all_current):
                insights.append("🌟 Everyone's starting fresh! Day 1 energy is powerful.")
            elif all(s <= 3 for s in all_current):
                insights.append("🚀 Early momentum phase! These first few days build the foundation.")
            
            # Recovery insights
            comeback_stories = [(user, data) for user, data in parsed.items() 
                              if data["current"] < data["best"]]
            if comeback_stories:
                insights.append(f"💪 {len(comeback_stories)} comeback story(ies) in progress!")
        
        return insights

# Example usage
if __name__ == "__main__":
    dashboard = StreakMotivationDashboard()
    
    # Current streak data
    current_streaks = {
        "@demo_user": "1 days (best: 1)",
        "@vibe_champion": "1 days (best: 1)"
    }
    
    print(dashboard.create_dashboard_summary(current_streaks))
    print("\n" + "=" * 50)
    
    # Special encouragements
    encouragements = dashboard.create_encouragement_for_low_streaks(current_streaks)
    if encouragements:
        print("\n💝 Personal Encouragements:")
        for enc in encouragements:
            print(f"\n{enc}")
    
    # Insights
    insights = dashboard.get_streak_insights(current_streaks)
    if insights:
        print("\n🔍 Streak Insights:")
        for insight in insights:
            print(f"• {insight}")