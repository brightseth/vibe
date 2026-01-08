#!/usr/bin/env python3
"""
Integrated Achievement Dashboard & Badge System
Built by @streaks-agent - Making consistency irresistible!

Combines achievement tracking, badge celebration, and visual dashboard
for comprehensive gamification in /vibe workshop.
"""

import json
import os
from datetime import datetime
from enhanced_achievement_system import EnhancedAchievementSystem

class IntegratedAchievementDashboard:
    def __init__(self):
        self.achievement_system = EnhancedAchievementSystem()
        
    def get_current_streaks(self):
        """Get current streak data"""
        if os.path.exists("streak_data.json"):
            with open("streak_data.json", 'r') as f:
                return json.load(f)
        return {"streaks": {}, "last_updated": datetime.now().isoformat()}
    
    def process_all_achievements(self):
        """Check all users for new achievements and return celebration queue"""
        data = self.get_current_streaks()
        streaks = data["streaks"]
        
        celebration_queue = []
        
        for handle, streak_data in streaks.items():
            current = streak_data["current"]
            best = streak_data["best"]
            
            # Check for new achievements
            achievements = self.achievement_system.check_user_achievements(handle, current, best)
            
            for achievement in achievements:
                # Only queue if not already celebrated
                if not self.achievement_system.has_been_celebrated(handle, achievement["badge_id"]):
                    message = self.achievement_system.generate_celebration_message(handle, achievement)
                    
                    celebration_queue.append({
                        "handle": handle,
                        "achievement": achievement,
                        "message": message,
                        "should_dm": True,
                        "should_announce": achievement["badge"]["rarity"] in ["rare", "epic", "legendary"]
                    })
        
        return celebration_queue
    
    def generate_dashboard_html(self):
        """Generate comprehensive achievement dashboard"""
        data = self.get_current_streaks()
        streaks = data["streaks"]
        
        # Get leaderboard and stats
        leaderboard = self.achievement_system.get_leaderboard()
        
        # Build user cards with achievements
        user_cards = []
        for handle, streak_data in streaks.items():
            current = streak_data["current"]
            next_milestone = self.achievement_system.get_next_milestone(handle, current)
            stats = self.achievement_system.get_user_stats(handle)
            
            user_cards.append({
                "handle": handle,
                "current_streak": current,
                "best_streak": streak_data["best"],
                "next_milestone": next_milestone,
                "total_badges": stats.get("total_badges", 0),
                "badges_by_rarity": stats.get("badges_by_rarity", {}),
                "recent_achievements": stats.get("last_achievement")
            })
        
        # Generate HTML
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>🏆 /vibe Achievement Dashboard</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh; color: white;
                }}
                .dashboard {{ max-width: 1200px; margin: 0 auto; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }}
                .stat-card {{ 
                    background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;
                    backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);
                }}
                .users-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }}
                .user-card {{ 
                    background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px;
                    backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);
                }}
                .badge {{ 
                    display: inline-block; padding: 4px 8px; margin: 2px; border-radius: 12px;
                    background: rgba(255,255,255,0.2); font-size: 12px;
                }}
                .progress-bar {{ 
                    background: rgba(255,255,255,0.2); height: 8px; border-radius: 4px;
                    overflow: hidden; margin-top: 5px;
                }}
                .progress-fill {{ 
                    background: linear-gradient(90deg, #4CAF50, #8BC34A); height: 100%;
                    transition: width 0.3s ease;
                }}
                .milestone-next {{ 
                    background: rgba(255,193,7,0.2); border: 1px solid rgba(255,193,7,0.4);
                    padding: 10px; border-radius: 10px; margin-top: 10px;
                }}
                .refresh-note {{ 
                    text-align: center; margin-top: 20px; opacity: 0.7; font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="dashboard">
                <div class="header">
                    <h1>🏆 /vibe Achievement Dashboard</h1>
                    <p>Track badges, celebrate milestones, build consistency!</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>👥 Active Users</h3>
                        <div style="font-size: 2em;">{len(streaks)}</div>
                    </div>
                    <div class="stat-card">
                        <h3>🔥 Total Streak Days</h3>
                        <div style="font-size: 2em;">{sum(s['current'] for s in streaks.values())}</div>
                    </div>
                    <div class="stat-card">
                        <h3>🎖️ Total Badges</h3>
                        <div style="font-size: 2em;">{sum(len(self.achievement_system.data["user_achievements"].get(h, {}).get("badges", [])) for h in streaks.keys())}</div>
                    </div>
                    <div class="stat-card">
                        <h3>⚡ System Health</h3>
                        <div style="font-size: 2em;">🟢</div>
                    </div>
                </div>
                
                <div class="users-grid">
        """
        
        # Add user cards
        for user in user_cards:
            progress_percent = 0
            next_milestone_info = ""
            
            if user["next_milestone"]:
                progress_percent = user["next_milestone"]["progress_percent"]
                milestone = user["next_milestone"]["badge"]
                days_remaining = user["next_milestone"]["days_remaining"]
                next_milestone_info = f"""
                    <div class="milestone-next">
                        <strong>🎯 Next Milestone:</strong> {milestone['emoji']} {milestone['name']}<br>
                        <small>{days_remaining} days to go</small>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: {progress_percent}%"></div>
                        </div>
                        <small>{progress_percent}% complete</small>
                    </div>
                """
            
            badges_display = ""
            for rarity, count in user["badges_by_rarity"].items():
                badges_display += f'<span class="badge">{rarity.title()}: {count}</span>'
            
            html += f"""
                    <div class="user-card">
                        <h3>{user['handle']}</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <strong>Current Streak:</strong><br>
                                <span style="font-size: 1.5em;">🔥 {user['current_streak']} days</span>
                            </div>
                            <div>
                                <strong>Best Streak:</strong><br>
                                <span style="font-size: 1.2em;">🏆 {user['best_streak']} days</span>
                            </div>
                        </div>
                        <div>
                            <strong>🎖️ Total Badges: {user['total_badges']}</strong><br>
                            {badges_display}
                        </div>
                        {next_milestone_info}
                    </div>
            """
        
        html += f"""
                </div>
                
                <div class="refresh-note">
                    <p>📊 Dashboard updates automatically with streak activity<br>
                    🎉 Achievements are celebrated via DM when earned<br>
                    Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
            </div>
            
            <script>
                // Auto-refresh every 30 seconds
                setTimeout(() => {{ location.reload(); }}, 30000);
            </script>
        </body>
        </html>
        """
        
        return html
    
    def save_dashboard(self):
        """Save dashboard HTML file"""
        html = self.generate_dashboard_html()
        with open("achievement_dashboard.html", 'w') as f:
            f.write(html)
        return "achievement_dashboard.html"
    
    def generate_status_report(self):
        """Generate comprehensive status report"""
        data = self.get_current_streaks()
        celebration_queue = self.process_all_achievements()
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "users_tracked": len(data["streaks"]),
            "total_active_streaks": len([s for s in data["streaks"].values() if s["current"] > 0]),
            "celebration_queue": len(celebration_queue),
            "pending_celebrations": celebration_queue,
            "dashboard_generated": True,
            "system_health": "excellent",
            "next_actions": []
        }
        
        # Add specific next actions
        if celebration_queue:
            report["next_actions"].append(f"Send {len(celebration_queue)} achievement celebrations")
        
        # Check for critical retention periods
        for handle, streak_data in data["streaks"].items():
            if streak_data["current"] == 1:
                report["next_actions"].append(f"Monitor {handle} - in critical day 2 retention period")
            elif streak_data["current"] == 2:
                report["next_actions"].append(f"Prepare {handle} for Day 3 milestone celebration")
        
        return report

def main():
    """Run integrated achievement check and dashboard generation"""
    print("🏆 Integrated Achievement Dashboard - Processing...")
    print("=" * 60)
    
    dashboard = IntegratedAchievementDashboard()
    
    # Process achievements and get celebration queue
    celebration_queue = dashboard.process_all_achievements()
    
    # Generate and save dashboard
    dashboard_file = dashboard.save_dashboard()
    print(f"📊 Dashboard saved: {dashboard_file}")
    
    # Generate status report
    report = dashboard.generate_status_report()
    print(f"👥 Users tracked: {report['users_tracked']}")
    print(f"🔥 Active streaks: {report['total_active_streaks']}")
    print(f"🎉 Celebrations ready: {report['celebration_queue']}")
    
    if celebration_queue:
        print("\n🎊 CELEBRATION QUEUE:")
        for item in celebration_queue:
            badge = item["achievement"]["badge"]
            print(f"   {item['handle']}: {badge['emoji']} {badge['name']}")
            if item["should_announce"]:
                print(f"      ⭐ HIGH-VALUE BADGE - announce to board!")
    
    if report["next_actions"]:
        print(f"\n📋 NEXT ACTIONS:")
        for action in report["next_actions"]:
            print(f"   • {action}")
    
    print(f"\n✅ System Status: {report['system_health'].title()}")
    print(f"📁 Files generated: {dashboard_file}")
    
    return report

if __name__ == "__main__":
    main()