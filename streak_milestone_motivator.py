#!/usr/bin/env python3
"""
🎯 Streak Milestone Motivator
Built by @streaks-agent for /vibe workshop

Proactive motivation system that sends encouraging messages at key streak points
to help users push through challenging moments and reach the next milestone.
"""

import json
import datetime
from pathlib import Path

class StreakMilestoneMotivator:
    def __init__(self):
        self.achievements_file = "achievements.json"
        self.motivation_file = "motivation_history.json"
        self.data = self._load_achievements()
        self.motivation_history = self._load_motivation_history()
        
        # Motivational messages for different streak situations
        self.motivation_messages = {
            "approaching_3": [
                "🔥 You're 1 day away from Early Bird status! Tomorrow you join the 3-day club! 🌅",
                "💪 So close to Early Bird! One more day of consistency will unlock your next badge! 🎯",
                "🌱 Day 2 complete! Tomorrow you earn the Early Bird badge - keep the momentum! ✨"
            ],
            "approaching_7": [
                "🎯 4 more days until Week Warrior! You're building incredible momentum! 💪",
                "🔥 Halfway to Week Warrior! Your consistency is impressive - keep going! 🌟",
                "⚡ 5 days strong! Week Warrior badge is getting closer - you've got this! 🏆"
            ],
            "approaching_14": [
                "👑 10+ days strong! Consistency King is within reach - legendary dedication! 🔥",
                "🌟 Double digits! You're approaching Consistency King status - incredible work! 💪",
                "🎖️ Week 2 territory! Consistency King badge awaits those who persist! ⚡"
            ],
            "approaching_30": [
                "🏆 20+ days! Monthly Legend status is approaching - you're in elite territory! 👑",
                "🌟 Almost a month! Monthly Legend badge is reserved for the truly dedicated! 🔥",
                "⚡ 25+ days! Monthly Legend within reach - extraordinary consistency! 🎯"
            ],
            "mid_journey": [
                "🔥 Great consistency! Every day you show up, you're building something special! ✨",
                "💪 Your dedication is noticed! Small daily actions create big transformations! 🌟",
                "⚡ Steady progress! You're proving that consistency beats intensity! 🎯",
                "🌱 Growing stronger! Each day of showing up compounds into something amazing! 🏆"
            ],
            "comeback": [
                "🌟 Welcome back! Every expert was once a beginner who never gave up! 💪",
                "🔥 Fresh start! The best time to build consistency is right now! ⚡",
                "💪 Day 1 again! Every streak starts with a single day - you've got this! 🌱"
            ]
        }
        
        # Special milestone achievements beyond badges
        self.milestone_achievements = {
            5: "🎯 5-Day Focus Master! Building serious momentum!",
            10: "⚡ Double Digits! You're in the consistency elite!",
            15: "🔥 Halfway to Month! Incredible dedication!",
            20: "🌟 20-Day Champion! Elite tier consistency!",
            25: "👑 25-Day Legend! Almost monthly mastery!",
            50: "🏆 50-Day Warrior! Extraordinary achievement!",
            75: "💎 75-Day Diamond! Rare dedication!",
            200: "🌟 200-Day Elite! Legendary status!",
            365: "👑 Year-Long Master! Ultimate achievement!"
        }
    
    def _load_achievements(self):
        """Load achievements data"""
        try:
            with open(self.achievements_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"badges": {}, "user_achievements": {}, "achievement_history": []}
    
    def _load_motivation_history(self):
        """Load motivation message history to avoid repeats"""
        try:
            with open(self.motivation_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"sent_messages": [], "user_last_motivated": {}}
    
    def _save_motivation_history(self):
        """Save motivation history"""
        with open(self.motivation_file, 'w') as f:
            json.dump(self.motivation_history, f, indent=2)
    
    def check_motivation_opportunities(self, current_streaks):
        """Check if any users need motivational messaging"""
        print("🎯 STREAK MILESTONE MOTIVATOR")
        print("=" * 40)
        
        motivation_queue = []
        
        for handle, streak_data in current_streaks.items():
            current = streak_data.get('current', 0)
            best = streak_data.get('best', 0)
            
            print(f"\n👤 {handle}")
            print(f"   Current: {current} days (best: {best})")
            
            motivation = self._analyze_motivation_need(handle, current, best)
            
            if motivation:
                print(f"   💌 Motivation opportunity: {motivation['type']}")
                print(f"   📝 Message: {motivation['message']}")
                motivation_queue.append(motivation)
            else:
                print("   ✅ No motivation needed right now")
        
        return motivation_queue
    
    def _analyze_motivation_need(self, handle, current_streak, best_streak):
        """Analyze if user needs motivation and what type"""
        
        # Don't motivate too frequently (max once per 2 days per user)
        last_motivated = self.motivation_history.get("user_last_motivated", {}).get(handle)
        if last_motivated:
            last_date = datetime.datetime.fromisoformat(last_motivated)
            if (datetime.datetime.now() - last_date).days < 2:
                return None
        
        # Special milestone achievements
        if current_streak in self.milestone_achievements:
            return {
                'handle': handle,
                'type': 'milestone_achievement',
                'message': self.milestone_achievements[current_streak],
                'should_announce': current_streak >= 20  # Announce publicly for big milestones
            }
        
        # Approaching badge milestones
        if current_streak == 2:  # 1 day from Early Bird
            return {
                'handle': handle,
                'type': 'approaching_badge',
                'message': self._random_message("approaching_3"),
                'next_badge': "Early Bird 🌅"
            }
        elif current_streak in [5, 6]:  # Approaching Week Warrior
            return {
                'handle': handle,
                'type': 'approaching_badge',
                'message': self._random_message("approaching_7"),
                'next_badge': "Week Warrior 💪"
            }
        elif current_streak in [10, 11, 12, 13]:  # Approaching Consistency King
            return {
                'handle': handle,
                'type': 'approaching_badge',
                'message': self._random_message("approaching_14"),
                'next_badge': "Consistency King 🔥"
            }
        elif current_streak in [25, 26, 27, 28, 29]:  # Approaching Monthly Legend
            return {
                'handle': handle,
                'type': 'approaching_badge',
                'message': self._random_message("approaching_30"),
                'next_badge': "Monthly Legend 🏆"
            }
        
        # Comeback motivation (streak is 1 and best is higher)
        elif current_streak == 1 and best_streak >= 3:
            return {
                'handle': handle,
                'type': 'comeback',
                'message': self._random_message("comeback"),
                'context': f"Previous best: {best_streak} days"
            }
        
        # Mid-journey encouragement (every 3rd day if no specific milestone)
        elif current_streak > 1 and current_streak % 3 == 0 and current_streak not in [3, 6, 12]:
            return {
                'handle': handle,
                'type': 'mid_journey',
                'message': self._random_message("mid_journey"),
                'context': f"{current_streak} days strong"
            }
        
        return None
    
    def _random_message(self, category):
        """Get a random message from category (would use random in real implementation)"""
        messages = self.motivation_messages.get(category, ["Keep going! 🌟"])
        # For demo, just return the first message
        return messages[0]
    
    def send_motivation(self, motivation):
        """Send motivation message (mock implementation)"""
        handle = motivation['handle']
        message = motivation['message']
        
        print(f"📤 Sending motivation to {handle}:")
        print(f"   {message}")
        
        # Record that we sent this message
        now = datetime.datetime.now().isoformat()
        self.motivation_history["sent_messages"].append({
            "handle": handle,
            "message": message,
            "type": motivation['type'],
            "sent_at": now
        })
        
        # Update last motivated timestamp
        if "user_last_motivated" not in self.motivation_history:
            self.motivation_history["user_last_motivated"] = {}
        self.motivation_history["user_last_motivated"][handle] = now
        
        self._save_motivation_history()
        
        return {
            'dm_message': message,
            'should_announce': motivation.get('should_announce', False),
            'announcement': f"🎉 {handle} hit a major milestone! {message}" if motivation.get('should_announce') else None
        }
    
    def generate_motivation_report(self):
        """Generate report of motivation activity"""
        print("\n" + "="*40)
        print("📊 MOTIVATION SYSTEM REPORT")
        print("="*40)
        
        sent_messages = self.motivation_history.get("sent_messages", [])
        print(f"💌 Total motivations sent: {len(sent_messages)}")
        
        if sent_messages:
            # Recent messages
            recent = sent_messages[-3:]  # Last 3
            print("\n🕐 Recent motivations:")
            for msg in reversed(recent):
                handle = msg["handle"]
                msg_type = msg["type"]
                date = msg["sent_at"][:10]
                print(f"   • {handle} ({msg_type}) on {date}")
            
            # Motivation types
            type_counts = {}
            for msg in sent_messages:
                msg_type = msg["type"]
                type_counts[msg_type] = type_counts.get(msg_type, 0) + 1
            
            print("\n📈 Motivation types:")
            for msg_type, count in type_counts.items():
                print(f"   • {msg_type}: {count} messages")
        
        print(f"\n✅ System ready for next motivation cycle")

def main():
    """Demo the motivation system"""
    motivator = StreakMilestoneMotivator()
    
    # Demo with current streak data
    demo_streaks = {
        "demo_user": {"current": 1, "best": 1},
        "vibe_champion": {"current": 1, "best": 1}
    }
    
    # Check for motivation opportunities
    motivation_queue = motivator.check_motivation_opportunities(demo_streaks)
    
    # Send any motivations found
    for motivation in motivation_queue:
        result = motivator.send_motivation(motivation)
        if result['should_announce']:
            print(f"📢 Would announce: {result['announcement']}")
    
    # Generate report
    motivator.generate_motivation_report()
    
    return motivation_queue

if __name__ == "__main__":
    main()