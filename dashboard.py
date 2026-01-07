#!/usr/bin/env python3
"""
Streak Analytics Dashboard - Main Interface
Comprehensive streak tracking and analytics system
"""

from streak_analytics import StreakAnalytics
from streak_visualizer import StreakVisualizer
import json
import os
from datetime import datetime

class StreakDashboard:
    def __init__(self):
        self.analytics = StreakAnalytics()
        self.visualizer = StreakVisualizer()
        
    def initialize_with_current_data(self):
        """Initialize dashboard with current /vibe streak data"""
        # Current known users from the system
        current_users = {
            '@demo_user': {'current': 1, 'best': 1},
            '@vibe_champion': {'current': 1, 'best': 1}
        }
        
        # Record activity for current users
        for user, data in current_users.items():
            self.analytics.record_activity(user)
            # Manually set streak data to match current state
            user_data = self.analytics.streak_data['users'][user]
            user_data['current_streak'] = data['current']
            user_data['best_streak'] = data['best']
        
        self.analytics.save_data()
        print(f"✅ Initialized dashboard with {len(current_users)} users")
    
    def get_quick_stats(self):
        """Get quick overview statistics"""
        users = self.analytics.streak_data['users']
        
        if not users:
            return "No streak data available yet."
        
        total_users = len(users)
        active_streaks = sum(1 for data in users.values() if data['current_streak'] > 0)
        longest_current = max((data['current_streak'] for data in users.values()), default=0)
        longest_ever = max((data['best_streak'] for data in users.values()), default=0)
        avg_current = sum(data['current_streak'] for data in users.values()) / total_users
        
        return f"""
📊 QUICK STATS
• Total Users Tracked: {total_users}
• Users with Active Streaks: {active_streaks}
• Longest Current Streak: {longest_current} days
• Longest Streak Ever: {longest_ever} days
• Average Current Streak: {avg_current:.1f} days
        """.strip()
    
    def identify_celebrations_needed(self):
        """Check for milestone celebrations needed"""
        users = self.analytics.streak_data['users']
        milestones_announced = self.analytics.streak_data.get('milestones', {})
        celebration_queue = []
        
        milestone_thresholds = {
            3: "Getting started! 🌱",
            7: "One week strong! 💪", 
            14: "Two weeks! You're committed! 🔥",
            30: "Monthly legend! 🏆",
            100: "Century club! 👑"
        }
        
        for user, data in users.items():
            current_streak = data['current_streak']
            
            # Check each milestone
            for threshold, message in milestone_thresholds.items():
                if current_streak >= threshold:
                    milestone_key = f"{user}_{threshold}"
                    if milestone_key not in milestones_announced:
                        celebration_queue.append({
                            'user': user,
                            'streak': current_streak,
                            'milestone': threshold,
                            'message': message
                        })
                        # Mark as announced
                        milestones_announced[milestone_key] = datetime.now().isoformat()
        
        # Save updated milestones
        self.analytics.streak_data['milestones'] = milestones_announced
        self.analytics.save_data()
        
        return celebration_queue
    
    def get_engagement_insights(self):
        """Get actionable engagement insights"""
        patterns = self.analytics.identify_patterns()
        insights = []
        
        # Champions insight
        if patterns['streak_champions']:
            champions = len(patterns['streak_champions'])
            insights.append(f"🔥 {champions} streak champion(s) maintaining 7+ day streaks!")
        
        # Newcomer support
        if patterns['newcomers']:
            newcomers = len(patterns['newcomers'])
            insights.append(f"🌱 {newcomers} newcomer(s) just getting started - encourage them!")
        
        # Comeback opportunities
        if patterns['comeback_candidates']:
            comeback = len(patterns['comeback_candidates'])
            insights.append(f"🎯 {comeback} user(s) could use a comeback nudge")
        
        # Consistency celebration
        if patterns['consistency_leaders']:
            consistent = len(patterns['consistency_leaders'])
            insights.append(f"💪 {consistent} user(s) showing great consistency")
        
        if not insights:
            insights.append("🤔 Not enough activity data yet - keep tracking!")
        
        return insights
    
    def generate_full_dashboard(self, include_charts=True):
        """Generate complete dashboard with all analytics"""
        print("🏆 GENERATING STREAK ANALYTICS DASHBOARD...")
        
        # Get analytics report
        full_report = self.analytics.generate_report()
        
        # Get quick insights
        quick_stats = self.get_quick_stats()
        insights = self.get_engagement_insights()
        celebrations = self.identify_celebrations_needed()
        
        # Generate visualizations if requested
        charts = []
        if include_charts:
            print("📊 Creating visualization charts...")
            try:
                charts = self.visualizer.generate_all_visualizations()
                print(f"✅ Generated {len(charts)} charts")
            except Exception as e:
                print(f"⚠️  Chart generation failed: {e}")
        
        # Combine everything into dashboard
        dashboard = f"""
{quick_stats}

💡 KEY INSIGHTS
{chr(10).join(f"• {insight}" for insight in insights)}

🎉 CELEBRATIONS NEEDED
"""
        
        if celebrations:
            for celebration in celebrations:
                dashboard += f"• {celebration['user']}: {celebration['streak']} days - {celebration['message']}\\n"
        else:
            dashboard += "• No new milestones to celebrate right now\\n"
        
        dashboard += f"""
{full_report}

📈 VISUALIZATIONS
Generated charts: {len(charts)}
{chr(10).join(f"• {chart}" for chart in charts)}

---
Dashboard generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """
        
        return {
            'dashboard': dashboard,
            'celebrations': celebrations,
            'charts': charts,
            'insights': insights
        }
    
    def export_dashboard(self, output_file='streak_dashboard.txt'):
        """Export dashboard to file"""
        result = self.generate_full_dashboard()
        
        with open(output_file, 'w') as f:
            f.write(result['dashboard'])
        
        print(f"✅ Dashboard exported to {output_file}")
        return result

# CLI interface for testing
if __name__ == "__main__":
    dashboard = StreakDashboard()
    
    # Initialize with current data
    dashboard.initialize_with_current_data()
    
    # Generate and export dashboard
    result = dashboard.export_dashboard()
    
    # Print summary
    print("\\n" + "="*50)
    print("DASHBOARD SUMMARY")
    print("="*50)
    print(result['dashboard'][:500] + "...")
    
    if result['celebrations']:
        print(f"\\n🎉 {len(result['celebrations'])} celebrations needed!")
        for cele in result['celebrations']:
            print(f"   • {cele['user']}: {cele['message']}")
    
    print(f"\\n📊 {len(result['charts'])} charts generated")
    print(f"💡 {len(result['insights'])} insights identified")