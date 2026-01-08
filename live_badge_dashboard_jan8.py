#!/usr/bin/env python3
"""
Live Achievement Dashboard for /vibe Workshop
Shows current badge status and progress for all users
Created by @streaks-agent on Jan 8, 2026
"""

from achievements import AchievementTracker
from streak_achievements_integration import streaks_agent_badge_check, get_user_badge_summary
import json
from datetime import datetime

def generate_dashboard():
    """Generate comprehensive badge dashboard"""
    tracker = AchievementTracker()
    
    # Current users from streak data
    users = [
        ("demo_user", 1, 1),
        ("vibe_champion", 1, 1)
    ]
    
    dashboard_html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>/vibe Workshop - Achievement Dashboard</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }}
        
        .dashboard {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        
        h1 {{
            text-align: center;
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }}
        
        .subtitle {{
            text-align: center;
            opacity: 0.9;
            margin-bottom: 30px;
            font-size: 1.1em;
        }}
        
        .user-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }}
        
        .user-card {{
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: transform 0.3s ease;
        }}
        
        .user-card:hover {{
            transform: translateY(-5px);
        }}
        
        .user-header {{
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }}
        
        .user-avatar {{
            width: 50px;
            height: 50px;
            background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5em;
            margin-right: 15px;
        }}
        
        .user-name {{
            font-size: 1.3em;
            font-weight: bold;
        }}
        
        .streak-info {{
            background: rgba(0, 0, 0, 0.2);
            border-radius: 15px;
            padding: 15px;
            margin-bottom: 20px;
        }}
        
        .streak-number {{
            font-size: 2.5em;
            font-weight: bold;
            color: #ffd700;
            text-align: center;
        }}
        
        .streak-label {{
            text-align: center;
            opacity: 0.8;
            margin-top: 5px;
        }}
        
        .badges-section {{
            margin-top: 20px;
        }}
        
        .badge-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }}
        
        .badge {{
            text-align: center;
            padding: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            font-size: 2em;
            transition: transform 0.2s ease;
        }}
        
        .badge:hover {{
            transform: scale(1.1);
        }}
        
        .badge.earned {{
            background: rgba(255, 215, 0, 0.3);
            border: 2px solid #ffd700;
        }}
        
        .badge.locked {{
            opacity: 0.3;
            filter: grayscale(100%);
        }}
        
        .progress-section {{
            margin-top: 20px;
        }}
        
        .progress-bar {{
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            height: 20px;
            overflow: hidden;
            margin: 10px 0;
        }}
        
        .progress-fill {{
            background: linear-gradient(90deg, #00d4ff, #1de9b6);
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
        }}
        
        .leaderboard {{
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }}
        
        .stat-card {{
            background: rgba(0, 0, 0, 0.2);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
        }}
        
        .stat-number {{
            font-size: 2em;
            font-weight: bold;
            color: #ffd700;
        }}
        
        .timestamp {{
            text-align: center;
            opacity: 0.6;
            margin-top: 30px;
            font-size: 0.9em;
        }}
        
        .milestone-preview {{
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 15px;
            margin-top: 15px;
            border-left: 4px solid #ffd700;
        }}
    </style>
</head>
<body>
    <div class="dashboard">
        <h1>🏆 Achievement Dashboard</h1>
        <p class="subtitle">Track progress and celebrate milestones in /vibe workshop</p>
        
        <div class="user-grid">
"""
    
    # Generate user cards
    for handle, current_streak, best_streak in users:
        # Get badge data
        result = streaks_agent_badge_check(handle, current_streak, best_streak)
        user_badges = tracker.get_user_badges(handle)
        
        # Calculate next milestone progress
        next_milestone = result['next_milestone']
        if next_milestone:
            progress_percent = (current_streak / (current_streak + next_milestone['days_needed'])) * 100
        else:
            progress_percent = 100
        
        dashboard_html += f"""
            <div class="user-card">
                <div class="user-header">
                    <div class="user-avatar">
                        {'🏆' if len(user_badges) >= 3 else '🌟' if len(user_badges) >= 1 else '🌱'}
                    </div>
                    <div class="user-name">{handle}</div>
                </div>
                
                <div class="streak-info">
                    <div class="streak-number">{current_streak}</div>
                    <div class="streak-label">day streak</div>
                </div>
                
                <div class="badges-section">
                    <h3>🎖️ Badges ({len(user_badges)}/11)</h3>
                    <div class="badge-grid">
        """
        
        # Show all badge definitions with earned/locked state
        all_badge_ids = ['first_day', 'week_warrior', 'fortnight_hero', 'monthly_legend', 'century_club', 
                        'first_ship', 'prolific_shipper', 'game_master', 'community_builder', 'early_adopter', 'comeback_kid']
        
        earned_badge_ids = [badge['id'] for badge in user_badges] if user_badges else []
        
        for badge_id in all_badge_ids:
            if badge_id in tracker.badge_definitions:
                badge_def = tracker.badge_definitions[badge_id]
                emoji = badge_def['name'].split()[0]  # Extract emoji
                earned_class = "earned" if badge_id in earned_badge_ids else "locked"
                
                dashboard_html += f"""
                        <div class="badge {earned_class}" title="{badge_def['description']}">
                            {emoji}
                        </div>
                """
        
        dashboard_html += """
                    </div>
                </div>
        """
        
        # Add progress section
        if next_milestone:
            dashboard_html += f"""
                <div class="progress-section">
                    <h4>Next Milestone: {next_milestone['badge_name']}</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {progress_percent}%"></div>
                    </div>
                    <p>{next_milestone['days_needed']} more days to go!</p>
                </div>
            """
        
        dashboard_html += """
            </div>
        """
    
    # Add leaderboard and stats
    leaderboard = tracker.get_leaderboard()
    total_badges_awarded = sum(len(data.get('badges', [])) for data in tracker.achievements.values())
    
    dashboard_html += f"""
        </div>
        
        <div class="leaderboard">
            <h2>🏅 Workshop Stats</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">{len(users)}</div>
                    <div>Active Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{total_badges_awarded}</div>
                    <div>Total Badges</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{max(current_streak for _, current_streak, _ in users)}</div>
                    <div>Longest Current Streak</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{max(best_streak for _, _, best_streak in users)}</div>
                    <div>Best Ever Streak</div>
                </div>
            </div>
        </div>
        
        <div class="timestamp">
            Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
        </div>
    </div>
</body>
</html>
"""
    
    return dashboard_html

def main():
    """Generate and save dashboard"""
    print("🏆 Generating Achievement Dashboard...")
    
    dashboard_html = generate_dashboard()
    
    # Save dashboard
    with open('achievement_dashboard_live.html', 'w') as f:
        f.write(dashboard_html)
    
    print("✅ Dashboard saved as 'achievement_dashboard_live.html'")
    print("\n🎯 Current Status:")
    
    # Show current user status
    tracker = AchievementTracker()
    users = [("demo_user", 1, 1), ("vibe_champion", 1, 1)]
    
    for handle, current_streak, best_streak in users:
        badges = tracker.get_user_badges(handle)
        result = streaks_agent_badge_check(handle, current_streak, best_streak)
        print(f"\n👤 {handle}")
        print(f"   📊 Streak: {current_streak} days")
        print(f"   🏆 Badges: {len(badges)} earned")
        if result['next_milestone']:
            print(f"   🎯 Next: {result['next_milestone']['badge_name']} in {result['next_milestone']['days_needed']} days")

if __name__ == "__main__":
    main()