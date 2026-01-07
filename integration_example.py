#!/usr/bin/env python3
"""
Integration Example: How to use the analytics dashboard with @streaks-agent
"""

from dashboard import StreakDashboard

class StreaksAgentIntegration:
    def __init__(self):
        self.dashboard = StreakDashboard()
    
    def daily_streak_cycle(self, online_users=[]):
        """
        Example of how @streaks-agent would use the analytics dashboard
        in its daily work cycle
        """
        print("🔄 Starting streak tracking cycle with analytics...")
        
        # 1. Update streaks for online users
        active_users = []
        for user in online_users:
            streak = self.dashboard.analytics.record_activity(user)
            active_users.append({'user': user, 'streak': streak})
            print(f"✅ Updated {user}: {streak} days")
        
        # 2. Check for celebration opportunities
        celebrations = self.dashboard.identify_celebrations_needed()
        celebration_messages = []
        
        for cele in celebrations:
            message = f"🎉 {cele['user']} hit {cele['milestone']} days! {cele['message']}"
            celebration_messages.append(message)
            # This is where you'd call celebrate_milestone() or dm_user()
            print(f"CELEBRATE: {message}")
        
        # 3. Get engagement insights for the board
        insights = self.dashboard.get_engagement_insights()
        board_insights = []
        
        for insight in insights:
            board_insights.append(insight)
            # This is where you'd call announce_ship() with the insight
            print(f"INSIGHT: {insight}")
        
        # 4. Generate quick analytics summary
        stats = self.dashboard.get_quick_stats()
        
        # 5. Return actionable data for the agent
        return {
            'updated_users': active_users,
            'celebrations_sent': celebration_messages,
            'insights_shared': board_insights,
            'quick_stats': stats,
            'total_tracked': len(self.dashboard.analytics.streak_data['users'])
        }
    
    def weekly_analytics_report(self):
        """Generate comprehensive weekly report"""
        print("📊 Generating weekly analytics report...")
        
        result = self.dashboard.generate_full_dashboard(include_charts=False)
        
        # Extract key metrics for reporting
        patterns = self.dashboard.analytics.identify_patterns()
        
        weekly_summary = {
            'total_users': len(self.dashboard.analytics.streak_data['users']),
            'champions': len(patterns['streak_champions']),
            'newcomers': len(patterns['newcomers']),
            'comeback_candidates': len(patterns['comeback_candidates']),
            'consistency_leaders': len(patterns['consistency_leaders']),
            'full_report': result['dashboard']
        }
        
        return weekly_summary
    
    def get_user_specific_encouragement(self, username):
        """Get personalized encouragement message for a user"""
        users = self.dashboard.analytics.streak_data['users']
        
        if username not in users:
            return f"Welcome to /vibe, {username}! Ready to start your streak? 🌱"
        
        user_data = users[username]
        current = user_data['current_streak']
        best = user_data['best_streak']
        
        if current == 0:
            return f"Ready for a comeback, {username}? Your best was {best} days! 🔥"
        elif current >= 7:
            return f"Streak champion {username}! {current} days strong! 👑"
        elif current >= 3:
            return f"Building momentum, {username}! {current} days and climbing! 💪"
        else:
            return f"Getting started, {username}! {current} day(s) down, many more to go! 🌱"

# Example usage showing how @streaks-agent would use this
def example_streaks_agent_workflow():
    """
    Example of how @streaks-agent workflow would look with analytics integration
    """
    print("🤖 EXAMPLE: @streaks-agent daily workflow with analytics")
    print("="*60)
    
    integration = StreaksAgentIntegration()
    
    # Simulate some online users (this would come from observe_vibe())
    online_users = ['@demo_user', '@vibe_champion']
    
    # Run daily cycle
    print("\n1. Running daily streak cycle...")
    daily_result = integration.daily_streak_cycle(online_users)
    
    print(f"\n📈 DAILY RESULTS:")
    print(f"   • Users updated: {len(daily_result['updated_users'])}")
    print(f"   • Celebrations sent: {len(daily_result['celebrations_sent'])}")  
    print(f"   • Insights shared: {len(daily_result['insights_shared'])}")
    print(f"   • Total users tracked: {daily_result['total_tracked']}")
    
    # Show user-specific encouragement
    print(f"\n2. Personalized encouragement examples:")
    for user in online_users:
        encouragement = integration.get_user_specific_encouragement(user)
        print(f"   • {user}: {encouragement}")
    
    # Weekly report (would run once per week)
    print(f"\n3. Weekly analytics summary:")
    weekly = integration.weekly_analytics_report()
    print(f"   • Total users: {weekly['total_users']}")
    print(f"   • Champions: {weekly['champions']}")
    print(f"   • Newcomers: {weekly['newcomers']}")
    print(f"   • Need comeback nudge: {weekly['comeback_candidates']}")
    
    print(f"\n✅ Analytics integration working perfectly!")
    
    return daily_result, weekly

if __name__ == "__main__":
    example_streaks_agent_workflow()