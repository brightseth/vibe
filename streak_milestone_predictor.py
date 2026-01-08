#!/usr/bin/env python3
"""
🔮 Streak Milestone Predictor for @streaks-agent
Predicts when users will hit their next major milestones and helps with motivation.
Built for /vibe workshop gamification.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import os

class StreakMilestonePredictor:
    def __init__(self):
        self.milestones = {
            3: "Early Bird 🌅",
            7: "Week Warrior 💪", 
            14: "Consistency King 🔥",
            30: "Monthly Legend 🏆",
            100: "Century Club 👑"
        }
        
    def load_streak_data(self) -> Dict:
        """Load current streak data from @streaks-agent memory"""
        # In real implementation, this would query the streak system
        # For now, using known data from context
        return {
            "@demo_user": {"current": 1, "best": 1},
            "@vibe_champion": {"current": 1, "best": 1}
        }
    
    def predict_next_milestone(self, current_streak: int) -> Tuple[Optional[int], Optional[str], Optional[datetime]]:
        """Predict user's next milestone target"""
        next_milestone = None
        for milestone_days in sorted(self.milestones.keys()):
            if milestone_days > current_streak:
                next_milestone = milestone_days
                break
                
        if next_milestone is None:
            return None, None, None
            
        milestone_name = self.milestones[next_milestone]
        days_to_go = next_milestone - current_streak
        target_date = datetime.now() + timedelta(days=days_to_go)
        
        return next_milestone, milestone_name, target_date
    
    def calculate_milestone_momentum(self, current_streak: int, best_streak: int) -> Dict:
        """Calculate momentum indicators for motivation"""
        momentum = {
            "is_personal_best": current_streak == best_streak and current_streak > 0,
            "days_from_pb": best_streak - current_streak if best_streak > current_streak else 0,
            "motivation_level": "high" if current_streak >= 3 else "building",
            "streak_phase": self._get_streak_phase(current_streak)
        }
        return momentum
    
    def _get_streak_phase(self, streak: int) -> str:
        """Determine what phase of streak building user is in"""
        if streak == 0:
            return "fresh_start"
        elif streak <= 2:
            return "foundation_building" 
        elif streak <= 6:
            return "habit_forming"
        elif streak <= 13:
            return "momentum_building"
        elif streak <= 29:
            return "consistency_mastery"
        else:
            return "legendary_status"
    
    def generate_motivation_message(self, handle: str, current_streak: int, best_streak: int) -> str:
        """Generate personalized motivation message"""
        next_milestone, milestone_name, target_date = self.predict_next_milestone(current_streak)
        momentum = self.calculate_milestone_momentum(current_streak, best_streak)
        
        if not next_milestone:
            return f"🏆 {handle}, you're already a legend! Keep the streak alive!"
        
        days_to_go = next_milestone - current_streak
        date_str = target_date.strftime("%b %d") if target_date else ""
        
        phase_messages = {
            "fresh_start": "Every expert was once a beginner! 🌱",
            "foundation_building": "You're building the foundation of greatness! 💪", 
            "habit_forming": "The habit is taking root! 🌿",
            "momentum_building": "You're in the flow zone! 🚀",
            "consistency_mastery": "Master level consistency! 🎯",
            "legendary_status": "Living legend! 👑"
        }
        
        phase_msg = phase_messages.get(momentum["streak_phase"], "Keep going!")
        
        if momentum["is_personal_best"]:
            return f"🔥 {handle}, you're on a personal best streak! {days_to_go} more days to {milestone_name} by {date_str}. {phase_msg}"
        else:
            pb_note = f" (your best was {best_streak} days)" if best_streak > current_streak else ""
            return f"🎯 {handle}, {days_to_go} days until {milestone_name} on {date_str}! {phase_msg}{pb_note}"
    
    def generate_predictions_report(self) -> Dict:
        """Generate full predictions report for all users"""
        streak_data = self.load_streak_data()
        report = {
            "generated_at": datetime.now().isoformat(),
            "total_users": len(streak_data),
            "predictions": {},
            "upcoming_milestones": [],
            "motivation_summary": {}
        }
        
        for handle, data in streak_data.items():
            current = data["current"]
            best = data["best"]
            
            next_milestone, milestone_name, target_date = self.predict_next_milestone(current)
            momentum = self.calculate_milestone_momentum(current, best)
            
            prediction = {
                "current_streak": current,
                "best_streak": best,
                "next_milestone": {
                    "days": next_milestone,
                    "name": milestone_name,
                    "target_date": target_date.isoformat() if target_date else None,
                    "days_to_go": next_milestone - current if next_milestone else 0
                },
                "momentum": momentum,
                "motivation_message": self.generate_motivation_message(handle, current, best)
            }
            
            report["predictions"][handle] = prediction
            
            if target_date:
                report["upcoming_milestones"].append({
                    "user": handle,
                    "milestone": milestone_name,
                    "date": target_date.isoformat(),
                    "days_away": next_milestone - current
                })
        
        # Sort upcoming milestones by date
        report["upcoming_milestones"].sort(key=lambda x: x["date"])
        
        # Generate summary stats
        active_users = len([u for u in streak_data.values() if u["current"] > 0])
        avg_streak = sum(u["current"] for u in streak_data.values()) / len(streak_data) if streak_data else 0
        
        report["motivation_summary"] = {
            "active_users": active_users,
            "average_streak": round(avg_streak, 1),
            "next_celebration": report["upcoming_milestones"][0]["date"] if report["upcoming_milestones"] else None,
            "momentum_distribution": self._analyze_momentum_distribution(streak_data)
        }
        
        return report
    
    def _analyze_momentum_distribution(self, streak_data: Dict) -> Dict:
        """Analyze the distribution of users across momentum phases"""
        distribution = {}
        for data in streak_data.values():
            phase = self._get_streak_phase(data["current"])
            distribution[phase] = distribution.get(phase, 0) + 1
        return distribution
    
    def save_predictions(self, filename: str = "streak_predictions.json"):
        """Save predictions to file"""
        report = self.generate_predictions_report()
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        return filename

def main():
    """Run streak milestone predictions and display results"""
    predictor = StreakMilestonePredictor()
    
    print("🔮 Streak Milestone Predictor")
    print("=" * 50)
    
    # Generate full report
    report = predictor.generate_predictions_report()
    
    print(f"\n📊 Current Status ({report['total_users']} users)")
    print(f"Average streak: {report['motivation_summary']['average_streak']} days")
    print(f"Active users: {report['motivation_summary']['active_users']}")
    
    print("\n🎯 Individual Predictions:")
    for handle, prediction in report["predictions"].items():
        current = prediction["current_streak"]
        milestone = prediction["next_milestone"]
        print(f"\n{handle}:")
        print(f"  Current: {current} days (best: {prediction['best_streak']})")
        if milestone["name"]:
            print(f"  Next: {milestone['name']} in {milestone['days_to_go']} days")
            print(f"  Target: {milestone['target_date'][:10]}")
        print(f"  💬 {prediction['motivation_message']}")
    
    print(f"\n🗓️ Upcoming Milestones ({len(report['upcoming_milestones'])} scheduled):")
    for milestone in report["upcoming_milestones"][:5]:  # Show next 5
        date_str = milestone["date"][:10]
        print(f"  • {milestone['user']}: {milestone['milestone']} on {date_str} ({milestone['days_away']} days)")
    
    print("\n📈 Momentum Distribution:")
    for phase, count in report["motivation_summary"]["momentum_distribution"].items():
        print(f"  {phase.replace('_', ' ').title()}: {count} users")
    
    # Save detailed report
    filename = predictor.save_predictions()
    print(f"\n💾 Detailed report saved to: {filename}")
    
    print("\n" + "=" * 50)
    print("Built by @streaks-agent for /vibe workshop gamification 🚀")

if __name__ == "__main__":
    main()