#!/usr/bin/env python3
"""
🏆 Live Badge Dashboard for @streaks-agent
Real-time visualization of workshop achievements
"""

import json
import datetime
from streaks_agent_badge_integration import StreaksBadgeIntegration

def generate_badge_dashboard():
    """Generate HTML dashboard for workshop badges"""
    integration = StreaksBadgeIntegration()
    
    # Get current data
    leaderboard = integration.get_leaderboard()
    badge_definitions = integration.data.get("badges", {})
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏆 /vibe Workshop Achievements</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .header {{
            text-align: center;
            margin-bottom: 40px;
        }}
        .header h1 {{
            font-size: 2.5rem;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }}
        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        .stat-card {{
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }}
        .stat-number {{
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        .leaderboard {{
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 40px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }}
        .leaderboard h2 {{
            margin-top: 0;
            font-size: 1.8rem;
            text-align: center;
        }}
        .user-row {{
            display: flex;
            align-items: center;
            padding: 15px;
            margin: 10px 0;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            border-left: 4px solid #ffd700;
        }}
        .user-rank {{
            font-size: 1.2rem;
            font-weight: bold;
            margin-right: 15px;
            min-width: 30px;
        }}
        .user-info {{
            flex: 1;
        }}
        .user-handle {{
            font-weight: bold;
            font-size: 1.1rem;
            margin-bottom: 5px;
        }}
        .user-badges {{
            font-size: 0.9rem;
            opacity: 0.9;
        }}
        .badges-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }}
        .badge-card {{
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }}
        .badge-name {{
            font-size: 1.3rem;
            font-weight: bold;
            margin-bottom: 10px;
        }}
        .badge-description {{
            opacity: 0.9;
            margin-bottom: 15px;
        }}
        .badge-threshold {{
            background: rgba(255,255,255,0.2);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
            display: inline-block;
        }}
        .streak-badge {{ border-left-color: #ff6b6b; }}
        .ship-badge {{ border-left-color: #4ecdc4; }}
        .game-badge {{ border-left-color: #45b7d1; }}
        .footer {{
            text-align: center;
            margin-top: 40px;
            opacity: 0.8;
            font-size: 0.9rem;
        }}
        .timestamp {{
            opacity: 0.7;
            font-size: 0.8rem;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏆 /vibe Workshop Achievements</h1>
            <p class="timestamp">Last updated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">{len(leaderboard)}</div>
                <div>Active Members</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{len(badge_definitions)}</div>
                <div>Available Badges</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{sum(user['badge_count'] for user in leaderboard)}</div>
                <div>Total Badges Earned</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{len([b for b in badge_definitions.values() if b['type'] == 'streak'])}</div>
                <div>Streak Badges</div>
            </div>
        </div>
"""
    
    # Leaderboard section
    if leaderboard:
        html += """
        <div class="leaderboard">
            <h2>🥇 Badge Leaderboard</h2>
"""
        for i, user in enumerate(leaderboard, 1):
            rank_emoji = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "🏅"
            latest_badge = user.get('latest_badge', {})
            latest_name = latest_badge.get('name', 'None') if latest_badge else 'None'
            
            html += f"""
            <div class="user-row">
                <div class="user-rank">{rank_emoji} {i}</div>
                <div class="user-info">
                    <div class="user-handle">{user['handle']}</div>
                    <div class="user-badges">{user['badge_count']} badges • Latest: {latest_name}</div>
                </div>
            </div>
"""
        html += "</div>"
    
    # Badge definitions
    html += """
        <h2 style="text-align: center; margin: 40px 0 20px;">📋 Available Badges</h2>
        <div class="badges-grid">
"""
    
    for badge_id, badge in badge_definitions.items():
        badge_class = f"{badge['type'].replace('_count', '')}-badge"
        threshold_text = f"{badge['threshold']} {badge['type'].replace('_', ' ').replace('count', '').strip()}"
        
        html += f"""
        <div class="badge-card {badge_class}">
            <div class="badge-name">{badge['name']}</div>
            <div class="badge-description">{badge['description']}</div>
            <div class="badge-threshold">Requirement: {threshold_text}</div>
        </div>
"""
    
    html += """
        </div>
        
        <div class="footer">
            <p>Built by @streaks-agent 🤖 • Celebrating consistency and achievement in /vibe workshop</p>
            <p>Keep shipping, keep streaking! 🚀</p>
        </div>
    </div>
</body>
</html>"""
    
    return html

def main():
    """Generate and save the badge dashboard"""
    print("🏆 Generating Live Badge Dashboard")
    print("=" * 40)
    
    dashboard_html = generate_badge_dashboard()
    
    # Save to file
    filename = "live_badge_dashboard.html"
    with open(filename, 'w') as f:
        f.write(dashboard_html)
    
    print(f"✅ Dashboard saved to {filename}")
    print("🌐 Open in browser to view live achievements!")
    
    # Also show current status
    integration = StreaksBadgeIntegration()
    leaderboard = integration.get_leaderboard()
    
    print(f"\n📊 Current Status:")
    print(f"   Users: {len(leaderboard)}")
    print(f"   Total badges earned: {sum(user['badge_count'] for user in leaderboard)}")
    print(f"   Available badges: {len(integration.data.get('badges', {}))}")
    
    if leaderboard:
        print(f"\n🏆 Top Achievers:")
        for i, user in enumerate(leaderboard[:3], 1):
            print(f"   {i}. {user['handle']}: {user['badge_count']} badges")

if __name__ == "__main__":
    main()