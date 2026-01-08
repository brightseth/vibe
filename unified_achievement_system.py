#!/usr/bin/env python3
"""
🏆 Unified Achievement System
Integrates badges, streaks, and celebrations into one cohesive experience.
Built by @streaks-agent for /vibe workshop gamification.
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

class UnifiedAchievementSystem:
    def __init__(self):
        self.badges_file = "badges.json"
        self.achievements_file = "achievements.json"
        self.streaks_file = "streak_data.json"
        self.dashboard_file = "streak_dashboard_data.json"
        
        # Load all data
        self.badges_data = self.load_json(self.badges_file, {
            "achievement_badges": {},
            "user_badges": {},
            "badge_tiers": {}
        })
        
        self.achievements_data = self.load_json(self.achievements_file, {
            "badges": {},
            "user_achievements": {},
            "achievement_history": []
        })
        
        self.streaks_data = self.load_json(self.streaks_file, {})
        
        # Achievement rules
        self.milestone_thresholds = {
            1: {"name": "First Day 🌱", "message": "Welcome to your streak journey!"},
            3: {"name": "Getting Started 🌟", "message": "Three days strong! Building consistency!"},
            7: {"name": "Week Warrior 💪", "message": "One week streak! You're committed!"},
            14: {"name": "Consistency Champion 🔥", "message": "Two weeks! You're on fire!"},
            30: {"name": "Monthly Legend 🏆", "message": "30 days! You're a workshop legend!"},
            100: {"name": "Century Club 👑", "message": "100 days! Welcome to elite status!"}
        }

    def load_json(self, filepath: str, default: dict) -> dict:
        """Load JSON file with fallback to default"""
        try:
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
        return default

    def save_json(self, filepath: str, data: dict):
        """Save data to JSON file"""
        try:
            if filepath.startswith('data/'):
                os.makedirs('data', exist_ok=True)
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving {filepath}: {e}")

    def check_streak_achievements(self) -> List[Dict]:
        """Check for new streak-based achievements"""
        new_achievements = []
        
        for handle, streak_info in self.streaks_data.items():
            if not isinstance(streak_info, dict):
                continue
                
            current_streak = streak_info.get('current', 0)
            
            # Check each milestone threshold
            for threshold, info in self.milestone_thresholds.items():
                if current_streak >= threshold:
                    # Check if user already has this achievement
                    user_achievements = self.achievements_data.get('user_achievements', {}).get(handle, [])
                    achievement_ids = [a.get('id', '') for a in user_achievements]
                    
                    achievement_id = f"streak_{threshold}_days"
                    
                    if achievement_id not in achievement_ids:
                        # Award new achievement
                        achievement = {
                            "id": achievement_id,
                            "name": info["name"],
                            "description": f"Maintained {threshold} day streak",
                            "earned_at": datetime.now(timezone.utc).isoformat(),
                            "criteria": f"streak_days >= {threshold}",
                            "milestone_days": threshold,
                            "celebration_message": info["message"]
                        }
                        
                        # Add to user achievements
                        if handle not in self.achievements_data['user_achievements']:
                            self.achievements_data['user_achievements'][handle] = []
                        
                        self.achievements_data['user_achievements'][handle].append(achievement)
                        
                        # Add to history
                        self.achievements_data['achievement_history'].append({
                            "handle": handle,
                            "badge": achievement,
                            "timestamp": achievement["earned_at"]
                        })
                        
                        new_achievements.append({
                            "handle": handle,
                            "achievement": achievement
                        })
                        
                        print(f"🏆 NEW ACHIEVEMENT: {handle} earned {info['name']}")
        
        # Save updated achievements
        if new_achievements:
            self.save_json(self.achievements_file, self.achievements_data)
            
        return new_achievements

    def sync_badges_with_achievements(self) -> List[Dict]:
        """Sync badge system with achievement data"""
        new_badges = []
        
        # Initialize user_badges if not exists
        if "user_badges" not in self.badges_data:
            self.badges_data["user_badges"] = {}
        
        for handle, achievements in self.achievements_data.get('user_achievements', {}).items():
            if handle not in self.badges_data['user_badges']:
                self.badges_data['user_badges'][handle] = []
            
            user_badges = [b.get('id', '') for b in self.badges_data['user_badges'][handle]]
            
            for achievement in achievements:
                achievement_id = achievement.get('id', '')
                badge_id = self.map_achievement_to_badge(achievement_id)
                
                if badge_id and badge_id not in user_badges:
                    # Award badge
                    badge = {
                        "id": badge_id,
                        "name": achievement.get('name', ''),
                        "earned_at": achievement.get('earned_at'),
                        "description": achievement.get('description', ''),
                        "tier": self.get_badge_tier(achievement_id)
                    }
                    
                    self.badges_data['user_badges'][handle].append(badge)
                    new_badges.append({
                        "handle": handle,
                        "badge": badge
                    })
                    
                    print(f"🏅 NEW BADGE: {handle} earned badge {badge['name']}")
        
        if new_badges:
            self.save_json(self.badges_file, self.badges_data)
            
        return new_badges

    def map_achievement_to_badge(self, achievement_id: str) -> Optional[str]:
        """Map achievement ID to badge ID"""
        mapping = {
            "first_day": "first_day",
            "streak_1_days": "first_day",
            "streak_3_days": "early_bird", 
            "streak_7_days": "week_streak",
            "streak_14_days": "consistency_king",
            "streak_30_days": "month_streak",
            "streak_100_days": "century_club"
        }
        return mapping.get(achievement_id)

    def get_badge_tier(self, achievement_id: str) -> str:
        """Get badge tier based on achievement"""
        tier_mapping = {
            "first_day": "bronze",
            "streak_1_days": "bronze",
            "streak_3_days": "bronze",
            "streak_7_days": "silver", 
            "streak_14_days": "silver",
            "streak_30_days": "gold",
            "streak_100_days": "diamond"
        }
        return tier_mapping.get(achievement_id, "bronze")

    def generate_celebration_messages(self, achievements: List[Dict]) -> List[Dict]:
        """Generate celebration messages for new achievements"""
        celebrations = []
        
        for item in achievements:
            handle = item['handle']
            achievement = item['achievement']
            
            celebration = {
                "handle": handle,
                "milestone": achievement.get('name', ''),
                "message": f"🎉 Congratulations {handle}! You've earned: {achievement.get('name', '')}\\n\\n{achievement.get('celebration_message', '')}\\n\\nKeep up the amazing consistency! 🚀",
                "achievement_id": achievement.get('id'),
                "days": achievement.get('milestone_days', 0)
            }
            
            celebrations.append(celebration)
            
        return celebrations

    def get_user_progress_summary(self, handle: str) -> Dict:
        """Get comprehensive progress summary for a user"""
        # Get streak data
        streak_info = self.streaks_data.get(handle, {})
        current_streak = streak_info.get('current', 0) if isinstance(streak_info, dict) else 0
        best_streak = streak_info.get('best', 0) if isinstance(streak_info, dict) else 0
        
        # Get achievements
        achievements = self.achievements_data.get('user_achievements', {}).get(handle, [])
        
        # Get badges
        badges = self.badges_data.get('user_badges', {}).get(handle, [])
        
        # Calculate next milestone
        next_milestone = None
        for threshold in sorted(self.milestone_thresholds.keys()):
            if current_streak < threshold:
                next_milestone = {
                    "days": threshold,
                    "name": self.milestone_thresholds[threshold]["name"],
                    "days_needed": threshold - current_streak,
                    "progress_percent": round((current_streak / threshold) * 100)
                }
                break
        
        return {
            "handle": handle,
            "current_streak": current_streak,
            "best_streak": best_streak,
            "total_achievements": len(achievements),
            "total_badges": len(badges),
            "achievements": achievements,
            "badges": badges,
            "next_milestone": next_milestone,
            "recent_achievements": achievements[-3:] if achievements else []
        }

    def get_workshop_overview(self) -> Dict:
        """Get overall workshop gamification stats"""
        total_users = len(self.streaks_data)
        active_streaks = sum(1 for info in self.streaks_data.values() 
                           if isinstance(info, dict) and info.get('current', 0) > 0)
        
        total_achievements = sum(len(achs) for achs in self.achievements_data.get('user_achievements', {}).values())
        total_badges = sum(len(badges) for badges in self.badges_data.get('user_badges', {}).values())
        
        # Recent activity
        recent_achievements = sorted(
            self.achievements_data.get('achievement_history', []),
            key=lambda x: x.get('timestamp', ''),
            reverse=True
        )[:5]
        
        return {
            "total_users": total_users,
            "active_streaks": active_streaks,
            "total_achievements": total_achievements,
            "total_badges": total_badges,
            "recent_achievements": recent_achievements,
            "engagement_health": round((active_streaks / max(total_users, 1)) * 100)
        }

    def run_full_update(self) -> Dict:
        """Run complete achievement and badge update"""
        print("🔄 Running unified achievement system update...")
        
        # Check for new achievements
        new_achievements = self.check_streak_achievements()
        
        # Sync badges with achievements
        new_badges = self.sync_badges_with_achievements()
        
        # Generate celebrations
        celebrations = self.generate_celebration_messages(new_achievements)
        
        # Get overview
        overview = self.get_workshop_overview()
        
        result = {
            "new_achievements": new_achievements,
            "new_badges": new_badges,
            "celebrations_needed": celebrations,
            "overview": overview,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        print(f"✅ Update complete: {len(new_achievements)} achievements, {len(new_badges)} badges, {len(celebrations)} celebrations")
        
        return result

def main():
    """Main execution"""
    system = UnifiedAchievementSystem()
    result = system.run_full_update()
    
    print("\\n🏆 UNIFIED ACHIEVEMENT SYSTEM REPORT")
    print("=" * 50)
    print(f"New Achievements: {len(result['new_achievements'])}")
    print(f"New Badges: {len(result['new_badges'])}")
    print(f"Celebrations Needed: {len(result['celebrations_needed'])}")
    print(f"Workshop Health: {result['overview']['engagement_health']}%")
    print(f"Active Users: {result['overview']['active_streaks']}/{result['overview']['total_users']}")
    
    if result['celebrations_needed']:
        print("\\n🎉 CELEBRATIONS TO SEND:")
        for celebration in result['celebrations_needed']:
            print(f"  {celebration['handle']}: {celebration['milestone']}")
    
    # Save comprehensive report
    with open('unified_achievement_report.json', 'w') as f:
        json.dump(result, f, indent=2)
    
    return result

if __name__ == "__main__":
    main()