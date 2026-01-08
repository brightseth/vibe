#!/usr/bin/env python3
"""
🎯 Proactive Streak Motivation System
Built by @streaks-agent

Automatically identifies engagement opportunities and suggests targeted 
motivational interventions based on streak prediction analytics.
"""

import json
import os
from datetime import datetime, timedelta

class ProactiveMotivationEngine:
    def __init__(self):
        self.prediction_file = 'streak_prediction_data.json'
        self.motivation_log_file = 'motivation_actions_log.json'
        
    def load_prediction_data(self):
        """Load latest prediction analytics"""
        if os.path.exists(self.prediction_file):
            with open(self.prediction_file, 'r') as f:
                return json.load(f)
        return None
    
    def load_motivation_log(self):
        """Load history of motivation actions to avoid spam"""
        if os.path.exists(self.motivation_log_file):
            with open(self.motivation_log_file, 'r') as f:
                return json.load(f)
        return {'actions': [], 'last_action_date': None}
    
    def save_motivation_log(self, log_data):
        """Save motivation action history"""
        with open(self.motivation_log_file, 'w') as f:
            json.dump(log_data, f, indent=2)
    
    def should_send_motivation(self, username, action_type, log_data):
        """Check if we should send motivation (avoid spam)"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Check if we already sent this type today to this user
        today_actions = [
            action for action in log_data['actions']
            if action.get('date') == today and 
               action.get('username') == username and
               action.get('type') == action_type
        ]
        
        return len(today_actions) == 0  # Only send once per day per type
    
    def generate_critical_day_motivation(self, username, user_analysis, user_predictions):
        """Generate motivation for critical streak days"""
        current_streak = user_analysis.get('current_streak', 0)
        sustainability = user_analysis.get('sustainability_score', 0.5)
        
        messages = []
        
        # Day 1-3 are critical for habit formation
        if current_streak == 1:
            messages.extend([
                f"🌱 Hey {username}! Day 1 complete - the hardest part is starting!",
                f"💪 Your streak foundation is building. Day 2 tomorrow will strengthen the habit.",
                f"🎯 Early Bird badge (3 days) is just 2 days away - you've got this!"
            ])
        elif current_streak == 2:
            messages.extend([
                f"🚀 {username}, Day 2 done! You're in the habit-forming sweet spot.",
                f"🏆 Tomorrow gets you the Early Bird badge - momentum is building!",
                f"📈 Your consistency is creating positive momentum for the workshop."
            ])
        elif current_streak == 3:
            messages.extend([
                f"🎉 {username}, congratulations on the Early Bird badge! 3 days strong!",
                f"💪 You've proven you can build habits. Week Warrior (7 days) is next!",
                f"🔥 Your streak is inspiring others - keep the momentum going!"
            ])
        
        # Add sustainability-based encouragement
        if sustainability < 0.7:
            messages.append(f"💡 Pro tip: Set a daily reminder to maintain your amazing progress!")
        
        return messages[:2]  # Return top 2 most relevant messages
    
    def generate_milestone_approach_motivation(self, username, predictions):
        """Generate motivation as users approach milestones"""
        messages = []
        
        for milestone_name, prediction_data in predictions.items():
            days_needed = prediction_data.get('days_needed', 0)
            confidence = prediction_data.get('confidence', 'Medium')
            
            if days_needed <= 2 and confidence in ['High', 'Medium']:
                if 'Early Bird' in milestone_name:
                    messages.append(
                        f"🌅 {username}, Early Bird badge in just {days_needed} day{'s' if days_needed != 1 else ''}! "
                        f"You're so close to this achievement!"
                    )
                elif 'Week Warrior' in milestone_name:
                    messages.append(
                        f"💪 {username}, Week Warrior badge in {days_needed} days! "
                        f"A full week of consistency - that's impressive dedication!"
                    )
        
        return messages
    
    def generate_peer_motivation(self, all_users_data):
        """Generate motivation based on peer activity"""
        messages = {}
        
        # Find users at similar streak levels for encouragement
        streak_groups = {}
        for username, data in all_users_data.items():
            streak = data.get('current_streak', 0)
            if streak not in streak_groups:
                streak_groups[streak] = []
            streak_groups[streak].append(username)
        
        # Generate peer-based motivation
        for streak_level, users in streak_groups.items():
            if len(users) > 1:  # Multiple users at same level
                for username in users:
                    others = [u for u in users if u != username]
                    if len(others) == 1:
                        messages[username] = [
                            f"🤝 You and {others[0]} are both at {streak_level}-day streaks! "
                            f"Keep each other motivated!"
                        ]
                    else:
                        messages[username] = [
                            f"🤝 You're part of a {len(users)}-person group all at {streak_level}-day streaks! "
                            f"Great collective momentum!"
                        ]
        
        return messages
    
    def generate_engagement_challenges(self, username, user_analysis):
        """Generate specific engagement challenges"""
        current_streak = user_analysis.get('current_streak', 0)
        challenges = []
        
        if current_streak <= 3:
            challenges.extend([
                "🚢 Ship something small today - earn your First Ship badge!",
                "💬 Start a discussion thread about your current project",
                "🎮 Try the collaborative drawing game for fun engagement"
            ])
        elif current_streak <= 7:
            challenges.extend([
                "🎯 Set a mini-goal for this week and share your progress",
                "🤝 Help welcome a new workshop member",
                "📊 Share insights from your current work"
            ])
        
        return challenges[:1]  # One challenge at a time
    
    def generate_motivation_plan(self):
        """Generate comprehensive motivation plan for all users"""
        prediction_data = self.load_prediction_data()
        if not prediction_data:
            return {"error": "No prediction data available"}
        
        log_data = self.load_motivation_log()
        today = datetime.now().strftime('%Y-%m-%d')
        
        motivation_plan = {
            'timestamp': datetime.now().isoformat(),
            'date': today,
            'users_analyzed': len(prediction_data['sustainability_analysis']),
            'motivation_actions': {},
            'recommended_dm_messages': {},
            'board_announcements': [],
            'engagement_challenges': {}
        }
        
        # Analyze each user
        for username, analysis in prediction_data['sustainability_analysis'].items():
            user_predictions = prediction_data['milestone_predictions'].get(username, {})
            current_streak = analysis.get('current_streak', 0)
            
            user_actions = []
            user_messages = []
            
            # Critical day motivation
            if self.should_send_motivation(username, 'critical_day', log_data):
                critical_messages = self.generate_critical_day_motivation(
                    username, analysis, user_predictions
                )
                user_messages.extend(critical_messages)
                user_actions.append('critical_day_motivation')
            
            # Milestone approach motivation
            if self.should_send_motivation(username, 'milestone_approach', log_data):
                milestone_messages = self.generate_milestone_approach_motivation(
                    username, user_predictions
                )
                user_messages.extend(milestone_messages)
                if milestone_messages:
                    user_actions.append('milestone_approach_motivation')
            
            # Engagement challenges
            challenges = self.generate_engagement_challenges(username, analysis)
            
            # Store results
            if user_actions:
                motivation_plan['motivation_actions'][username] = user_actions
            
            if user_messages:
                motivation_plan['recommended_dm_messages'][username] = user_messages[:2]
            
            if challenges:
                motivation_plan['engagement_challenges'][username] = challenges
        
        # Generate peer motivation
        peer_messages = self.generate_peer_motivation(
            prediction_data['sustainability_analysis']
        )
        for username, messages in peer_messages.items():
            if username not in motivation_plan['recommended_dm_messages']:
                motivation_plan['recommended_dm_messages'][username] = []
            motivation_plan['recommended_dm_messages'][username].extend(messages)
        
        # Board announcements for community motivation
        total_streak_days = sum(
            analysis.get('current_streak', 0) 
            for analysis in prediction_data['sustainability_analysis'].values()
        )
        
        if total_streak_days >= 2:  # Both users active
            motivation_plan['board_announcements'].append(
                f"🔥 Workshop streak energy! {total_streak_days} total streak days across all members. "
                f"The habit-building momentum is real! 🚀"
            )
        
        return motivation_plan
    
    def execute_motivation_actions(self, plan):
        """Execute the motivation plan (simulation)"""
        print("🎯 EXECUTING MOTIVATION PLAN")
        print("=" * 40)
        
        # DM recommendations
        if plan['recommended_dm_messages']:
            print("\n💬 RECOMMENDED DMs:")
            print("-" * 25)
            for username, messages in plan['recommended_dm_messages'].items():
                print(f"\n{username}:")
                for i, message in enumerate(messages, 1):
                    print(f"  {i}. {message}")
        
        # Board announcements
        if plan['board_announcements']:
            print("\n📢 BOARD ANNOUNCEMENTS:")
            print("-" * 25)
            for announcement in plan['board_announcements']:
                print(f"  • {announcement}")
        
        # Engagement challenges
        if plan['engagement_challenges']:
            print("\n🎮 ENGAGEMENT CHALLENGES:")
            print("-" * 25)
            for username, challenges in plan['engagement_challenges'].items():
                print(f"\n{username}:")
                for challenge in challenges:
                    print(f"  🎯 {challenge}")
        
        # Log actions taken
        log_data = self.load_motivation_log()
        for username, actions in plan['motivation_actions'].items():
            for action in actions:
                log_data['actions'].append({
                    'date': plan['date'],
                    'username': username,
                    'type': action,
                    'timestamp': plan['timestamp']
                })
        
        log_data['last_action_date'] = plan['date']
        self.save_motivation_log(log_data)
        
        print(f"\n✅ Motivation actions logged and ready for execution!")
        return plan

def main():
    print("🎯 Proactive Streak Motivation System")
    print("=" * 50)
    
    engine = ProactiveMotivationEngine()
    
    # Generate motivation plan
    plan = engine.generate_motivation_plan()
    
    if 'error' in plan:
        print(f"❌ Error: {plan['error']}")
        print("💡 Run streak prediction analytics first!")
        return
    
    print(f"\n📊 MOTIVATION ANALYSIS COMPLETE")
    print(f"Users analyzed: {plan['users_analyzed']}")
    print(f"Date: {plan['date']}")
    
    # Execute the plan
    engine.execute_motivation_actions(plan)
    
    print("\n🚀 MOTIVATION SYSTEM READY!")
    print("Use the recommended messages and challenges to boost engagement.")

if __name__ == "__main__":
    main()