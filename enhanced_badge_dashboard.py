#!/usr/bin/env python3
"""
Enhanced Badge Dashboard Generator
Reads current achievements and creates dynamic HTML dashboard
"""
import json
import os
from datetime import datetime

def load_achievements():
    """Load current achievements data"""
    if os.path.exists('achievements.json'):
        with open('achievements.json', 'r') as f:
            return json.load(f)
    return {"badges": {}, "user_achievements": {}, "achievement_history": []}

def generate_dashboard_html():
    """Generate updated dashboard HTML with current badge status"""
    data = load_achievements()
    
    # Calculate stats
    total_badges = len(data.get('badges', {}))
    total_earned = sum(len(badges) for badges in data.get('user_achievements', {}).values())
    active_users = len(data.get('user_achievements', {}))
    
    # Generate badge cards
    badge_cards = []
    for badge_id, badge_info in data.get('badges', {}).items():
        rarity = "common"
        points = 10
        
        # Set rarity and points based on badge type
        if badge_info.get('threshold', 0) >= 30:
            rarity = "rare"
            points = 100
        elif badge_info.get('threshold', 0) >= 7:
            rarity = "uncommon"
            points = 25
        elif badge_info.get('threshold', 0) >= 100:
            rarity = "legendary"
            points = 500
            
        badge_cards.append(f"""
        <div class="badge-card">
            <div class="badge-name">{badge_info.get('name', badge_id)}</div>
            <div class="badge-description">{badge_info.get('description', 'No description')}</div>
            <div class="badge-meta">
                <span class="badge-points">{points} pts</span>
                <span class="badge-rarity rarity-{rarity}">{rarity.title()}</span>
            </div>
        </div>
        """)
    
    # Generate leaderboard
    leaderboard_items = []
    for handle, user_badges in data.get('user_achievements', {}).items():
        badge_count = len(user_badges)
        total_points = badge_count * 10  # Simple calculation
        
        avatar = handle[0].upper() if handle else "?"
        
        leaderboard_items.append(f"""
        <div class="leaderboard-item">
            <div class="user-info">
                <div class="user-avatar">{avatar}</div>
                <div>
                    <div style="font-weight: 600;">@{handle}</div>
                    <div style="color: #666; font-size: 0.9em;">{badge_count} badges earned</div>
                </div>
            </div>
            <div>
                <div style="font-weight: 600;">{total_points} points</div>
                <div style="color: #666; font-size: 0.9em;">{', '.join([b['name'][:20] for b in user_badges[:3]])}</div>
            </div>
        </div>
        """)
    
    # Recent achievements
    recent_achievements = []
    for achievement in data.get('achievement_history', [])[-5:]:
        timestamp = achievement.get('timestamp', '')
        if timestamp:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            time_str = dt.strftime('%b %d, %I:%M %p')
        else:
            time_str = "Recent"
            
        recent_achievements.append(f"""
        <div style="padding: 10px; background: #f8f9fa; margin: 5px 0; border-radius: 6px;">
            <strong>@{achievement.get('handle', 'unknown')}</strong> earned 
            <strong>{achievement.get('badge', {}).get('name', 'Unknown Badge')}</strong>
            <div style="font-size: 0.9em; color: #666;">{time_str}</div>
        </div>
        """)
    
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>/vibe Workshop - Achievement Badges</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }}
        
        .header {{
            text-align: center;
            margin-bottom: 40px;
        }}
        
        .title {{
            font-size: 2.5em;
            font-weight: bold;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }}
        
        .subtitle {{
            color: #666;
            font-size: 1.2em;
        }}
        
        .section {{
            margin: 40px 0;
        }}
        
        .section-title {{
            font-size: 1.5em;
            font-weight: 600;
            margin-bottom: 20px;
            color: #333;
        }}
        
        .badge-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }}
        
        .badge-card {{
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }}
        
        .badge-name {{
            font-size: 1.2em;
            font-weight: 600;
            margin-bottom: 8px;
        }}
        
        .badge-description {{
            color: #666;
            margin-bottom: 12px;
        }}
        
        .badge-meta {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9em;
        }}
        
        .badge-points {{
            background: #667eea;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 500;
        }}
        
        .badge-rarity {{
            text-transform: uppercase;
            font-weight: 500;
        }}
        
        .rarity-common {{ color: #28a745; }}
        .rarity-uncommon {{ color: #007bff; }}
        .rarity-rare {{ color: #6f42c1; }}
        .rarity-legendary {{ color: #fd7e14; }}
        
        .leaderboard {{
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }}
        
        .leaderboard-item {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #eee;
        }}
        
        .leaderboard-item:last-child {{
            border-bottom: none;
        }}
        
        .user-info {{
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        
        .user-avatar {{
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(45deg, #667eea, #764ba2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }}
        
        .stat-card {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }}
        
        .stat-number {{
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }}
        
        .stat-label {{
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">🏆 Achievement Badges</div>
            <div class="subtitle">Track your /vibe workshop journey</div>
            <div style="margin-top: 15px; color: #888;">Last updated: {datetime.now().strftime('%b %d, %Y at %I:%M %p')}</div>
        </div>
        
        <div class="section">
            <div class="section-title">📊 Quick Stats</div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">{total_badges}</div>
                    <div class="stat-label">Badge Types</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{total_earned}</div>
                    <div class="stat-label">Badges Earned</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{active_users}</div>
                    <div class="stat-label">Active Users</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">🎯 Available Badges</div>
            <div class="badge-grid">
                {''.join(badge_cards)}
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">🥇 Leaderboard</div>
            <div class="leaderboard">
                {''.join(leaderboard_items) if leaderboard_items else '<div style="text-align: center; color: #666; padding: 20px;">No badges earned yet. Be the first!</div>'}
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">🎉 Recent Achievements</div>
            <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                {''.join(recent_achievements) if recent_achievements else '<div style="text-align: center; color: #666;">No recent achievements. Start your streak to earn your first badge!</div>'}
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 40px; color: #666;">
            <p>🎯 Keep showing up to earn more badges! Your consistency matters in /vibe.</p>
            <p>💡 <strong>Next milestone:</strong> Reach a 3-day streak to earn the "Early Bird 🌅" badge!</p>
        </div>
    </div>
</body>
</html>"""
    
    return html_template

def main():
    """Generate and save the enhanced dashboard"""
    print("🏆 Generating Enhanced Badge Dashboard...")
    
    html = generate_dashboard_html()
    
    with open('live_badge_dashboard.html', 'w') as f:
        f.write(html)
    
    print("✅ Dashboard saved to: live_badge_dashboard.html")
    print("📊 Dashboard shows current achievement data")
    
    # Also update the static dashboard
    with open('badge_dashboard.html', 'w') as f:
        f.write(html)
    print("📊 Updated badge_dashboard.html with live data")

if __name__ == "__main__":
    main()