#!/usr/bin/env python3
"""
🔄 Streak Recovery System
A proactive system to help users get back on track after streak breaks.

Built by @streaks-agent for /vibe workshop gamification.
"""

import json
import os
from datetime import datetime, timedelta

class StreakRecoverySystem:
    def __init__(self):
        self.achievements_file = 'achievements.json'
        self.recovery_data_file = 'streak_recovery_data.json'
        
    def load_data(self):
        """Load achievements and recovery data"""
        achievements = {}
        if os.path.exists(self.achievements_file):
            try:
                with open(self.achievements_file, 'r') as f:
                    achievements = json.load(f)
            except:
                achievements = {}
                
        recovery_data = {}
        if os.path.exists(self.recovery_data_file):
            try:
                with open(self.recovery_data_file, 'r') as f:
                    recovery_data = json.load(f)
            except:
                recovery_data = {}
                
        return achievements, recovery_data
        
    def save_recovery_data(self, recovery_data):
        """Save recovery tracking data"""
        try:
            with open(self.recovery_data_file, 'w') as f:
                json.dump(recovery_data, f, indent=2)
        except Exception as e:
            print(f"Error saving recovery data: {e}")
            
    def identify_comeback_candidates(self):
        """Find users who lost streaks and could use encouragement"""
        achievements, recovery_data = self.load_data()
        
        comeback_candidates = []
        current_time = datetime.now()
        
        for user, data in achievements.get('users', {}).items():
            current_streak = data.get('current_streak', 0)
            best_streak = data.get('best_streak', 0)
            last_seen = data.get('last_seen', '')
            
            # Skip if no streak history
            if best_streak < 3:
                continue
                
            # Skip if currently has a good streak
            if current_streak >= 3:
                continue
                
            # Calculate days since last seen
            try:
                last_seen_dt = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                days_away = (current_time - last_seen_dt).days
            except:
                days_away = 999  # Unknown, treat as long absence
                
            # Identify different types of comeback scenarios
            scenario = self._classify_comeback_scenario(current_streak, best_streak, days_away)
            
            if scenario:
                comeback_candidates.append({
                    'user': user,
                    'current_streak': current_streak,
                    'best_streak': best_streak,
                    'days_away': days_away,
                    'scenario': scenario,
                    'motivation_message': self._get_motivation_message(scenario, best_streak),
                    'recovery_bonus': self._calculate_recovery_bonus(scenario, best_streak)
                })
                
        return comeback_candidates
        
    def _classify_comeback_scenario(self, current_streak, best_streak, days_away):
        """Classify the type of comeback needed"""
        
        # Fresh break - just lost a good streak
        if current_streak == 0 and best_streak >= 7 and days_away <= 3:
            return "fresh_break"
            
        # Former champion - had great streak, been away a while  
        if current_streak <= 1 and best_streak >= 14 and days_away >= 4:
            return "former_champion"
            
        # Restart candidate - lost modest streak, ready to try again
        if current_streak == 0 and 3 <= best_streak <= 10 and days_away >= 2:
            return "restart_candidate"
            
        # Struggling maintainer - has small streak but had much better
        if 1 <= current_streak <= 2 and best_streak >= (current_streak + 5):
            return "struggling_maintainer"
            
        return None
        
    def _get_motivation_message(self, scenario, best_streak):
        """Get encouraging message for comeback scenario"""
        
        messages = {
            "fresh_break": f"Hey! You had {best_streak} days going - that's amazing! 🔥 Sometimes we stumble, but champions get back up. Ready for day 1 again?",
            
            "former_champion": f"Welcome back, streak legend! 👑 Your {best_streak}-day streak showed what you're capable of. Let's rebuild that empire one day at a time!",
            
            "restart_candidate": f"You proved you can do {best_streak} days - now let's beat that record! 🚀 Every restart is a chance to go even further.",
            
            "struggling_maintainer": f"I see that {best_streak}-day streak in your history - you've got this! 💪 Let's get back to your champion form step by step."
        }
        
        return messages.get(scenario, "Ready to start a new streak? 🌟")
        
    def _calculate_recovery_bonus(self, scenario, best_streak):
        """Calculate bonus points/badges for comeback efforts"""
        
        bonuses = {
            "fresh_break": {
                "points": 20,
                "badge": "🔄 Quick Recovery",
                "description": "Got back on track within 3 days"
            },
            "former_champion": {
                "points": 50, 
                "badge": "👑 Champion's Return",
                "description": f"Former {best_streak}-day streak holder making a comeback"
            },
            "restart_candidate": {
                "points": 15,
                "badge": "🚀 Fresh Start",
                "description": "Ready to beat previous best"
            },
            "struggling_maintainer": {
                "points": 10,
                "badge": "💪 Determination", 
                "description": "Working to regain champion form"
            }
        }
        
        return bonuses.get(scenario, {"points": 5, "badge": "🌟 New Beginning", "description": "Starting fresh"})
        
    def create_recovery_plan(self, user, scenario):
        """Create a personalized recovery plan"""
        
        plans = {
            "fresh_break": {
                "day_1": "🎯 Today: Just show up! One small action to restart your engine.",
                "week_1": "🔥 This week: Focus on consistency over perfection. Small daily wins.",
                "long_term": "🏆 Month ahead: Rebuild to your previous best, then push beyond!"
            },
            
            "former_champion": {
                "day_1": "👑 Today: Claim your comeback! Start with confidence - you've done this before.",
                "week_1": "⚡ This week: Channel that champion energy. You know what works.",
                "long_term": "🚀 Month ahead: Not just rebuilding - this time you're going even further!"
            },
            
            "restart_candidate": {
                "day_1": "🌟 Today: Fresh start, fresh energy! Let's beat your previous record.",
                "week_1": "📈 This week: Build momentum with small, consistent actions.",
                "long_term": "🎯 Month ahead: Aim higher than before - you're ready for it!"
            },
            
            "struggling_maintainer": {
                "day_1": "💪 Today: You're still in this! Let's stabilize and then grow.",
                "week_1": "🔧 This week: Focus on what worked during your best streak.",
                "long_term": "🏅 Month ahead: Get back to champion form, one day at a time!"
            }
        }
        
        return plans.get(scenario, {
            "day_1": "🌱 Today: Every streak starts with day 1!",
            "week_1": "📅 This week: Build the habit through consistency.",
            "long_term": "🎯 Month ahead: Watch your momentum compound!"
        })
        
    def generate_recovery_dashboard(self):
        """Generate a comprehensive recovery dashboard"""
        
        candidates = self.identify_comeback_candidates()
        
        if not candidates:
            return {
                "status": "🎉 All users on track!",
                "message": "No one needs recovery assistance right now.",
                "active_users": len(self.load_data()[0].get('users', {}))
            }
            
        dashboard = {
            "recovery_needed": len(candidates),
            "scenarios": {},
            "action_plan": [],
            "success_metrics": self._calculate_recovery_metrics(candidates)
        }
        
        # Group by scenario for better insights
        for candidate in candidates:
            scenario = candidate['scenario']
            if scenario not in dashboard['scenarios']:
                dashboard['scenarios'][scenario] = []
            dashboard['scenarios'][scenario].append(candidate)
            
        # Generate action plan
        for candidate in candidates:
            plan = self.create_recovery_plan(candidate['user'], candidate['scenario'])
            dashboard['action_plan'].append({
                'user': candidate['user'],
                'scenario': candidate['scenario'],
                'message': candidate['motivation_message'],
                'plan': plan,
                'bonus': candidate['recovery_bonus']
            })
            
        return dashboard
        
    def _calculate_recovery_metrics(self, candidates):
        """Calculate potential impact of recovery efforts"""
        
        total_lost_momentum = sum(c['best_streak'] for c in candidates)
        recovery_potential = len(candidates) * 30  # Assume 30-day potential per user
        
        return {
            "users_needing_support": len(candidates),
            "total_lost_momentum_days": total_lost_momentum,
            "recovery_potential_days": recovery_potential,
            "success_impact": f"Could restore {recovery_potential} streak days to the community"
        }

def main():
    """Main recovery analysis"""
    print("🔄 STREAK RECOVERY SYSTEM")
    print("=" * 40)
    
    recovery = StreakRecoverySystem()
    dashboard = recovery.generate_recovery_dashboard()
    
    if 'status' in dashboard:
        print(f"\n{dashboard['status']}")
        print(f"📊 {dashboard['message']}")
        return
        
    print(f"\n📊 RECOVERY DASHBOARD")
    print(f"Users needing support: {dashboard['recovery_needed']}")
    
    # Show scenarios
    for scenario, users in dashboard['scenarios'].items():
        print(f"\n{scenario.replace('_', ' ').title()}: {len(users)} users")
        for user in users:
            print(f"  • {user['user']} (was {user['best_streak']} days, now {user['current_streak']})")
            
    # Show action plan
    print(f"\n📋 RECOMMENDED ACTIONS:")
    for i, action in enumerate(dashboard['action_plan'], 1):
        print(f"\n{i}. {action['user']} ({action['scenario'].replace('_', ' ').title()})")
        print(f"   💬 {action['message']}")
        print(f"   🎁 Reward: {action['bonus']['badge']} (+{action['bonus']['points']} pts)")
        
    # Show success metrics
    metrics = dashboard['success_metrics']
    print(f"\n🎯 RECOVERY POTENTIAL:")
    print(f"• {metrics['users_needing_support']} users to support")
    print(f"• {metrics['total_lost_momentum_days']} streak days lost")
    print(f"• {metrics['success_impact']}")

if __name__ == "__main__":
    main()