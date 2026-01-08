#!/usr/bin/env python3
"""
Live Badge Dashboard for /vibe Workshop
Real-time display of achievements, streaks, and leaderboard

Makes gamification visible and engaging for all workshop participants.
"""

import json
import time
from datetime import datetime
import os

def load_badge_data():
    """Load current badge system data"""
    try:
        with open('badges.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"user_badges": {}, "leaderboard": {"by_points": []}}

def load_streak_data():
    """Load current streak information"""
    try:
        with open('streak_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def generate_dashboard_html():
    """Generate live dashboard HTML"""
    badge_data = load_badge_data()
    streak_data = load_streak_data()
    
    # Build user stats
    users = set()
    if 'user_badges' in badge_data:
        users.update(badge_data['user_badges'].keys())
    users.update(streak_data.keys())
    
    user_stats = []
    for user in sorted(users):
        badges = badge_data.get('user_badges', {}).get(user, {})
        streak_info = streak_data.get(user, {})
        
        stats = {
            'handle': user,
            'streak': streak_info.get('current', 0),
            'best_streak': streak_info.get('best', 0),
            'total_points': badges.get('total_points', 0),
            'badge_count': badges.get('achievements_unlocked', 0),
            'recent_badges': badges.get('earned', [])[-3:] if badges.get('earned') else []
        }
        user_stats.append(stats)
    
    # Sort by points (gamification leaderboard)
    user_stats.sort(key=lambda x: x['total_points'], reverse=True)
    
    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>/vibe Workshop - Live Achievement Dashboard</title>
    <style>
        body {{
            font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            color: white;
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
            font-size: 3em;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }}
        .header p {{
            font-size: 1.2em;
            opacity: 0.9;
            margin: 10px 0 0 0;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        .stat-card {{
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            border: 1px solid rgba(255,255,255,0.2);
            transition: transform 0.3s ease;
        }}
        .stat-card:hover {{
            transform: translateY(-5px);
        }}
        .user-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }}
        .user-handle {{
            font-size: 1.5em;
            font-weight: bold;
        }}
        .points-badge {{
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            color: #333;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
        }}
        .streak-info {{
            display: flex;
            justify-content: space-between;
            margin: 15px 0;
        }}
        .streak-item {{
            text-align: center;
        }}
        .streak-number {{
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        .streak-label {{
            font-size: 0.9em;
            opacity: 0.8;
        }}
        .badges-section {{
            margin-top: 20px;
        }}
        .badges-title {{
            font-weight: bold;
            margin-bottom: 10px;
        }}
        .badge {{
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 5px 12px;
            margin: 3px;
            border-radius: 15px;
            font-size: 0.85em;
            border: 1px solid rgba(255,255,255,0.3);
        }}
        .leaderboard {{
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 30px;
            border: 1px solid rgba(255,255,255,0.2);
            margin-top: 40px;
        }}
        .leaderboard h2 {{
            text-align: center;
            margin-bottom: 25px;
            font-size: 2em;
        }}
        .leaderboard-item {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        .leaderboard-item:last-child {{
            border-bottom: none;
        }}
        .rank {{
            font-size: 1.5em;
            font-weight: bold;
            width: 40px;
        }}
        .rank.first {{ color: #ffd700; }}
        .rank.second {{ color: #c0c0c0; }}
        .rank.third {{ color: #cd7f32; }}
        .footer {{
            text-align: center;
            margin-top: 40px;
            opacity: 0.7;
            font-size: 0.9em;
        }}
        .refresh-time {{
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.5);
            padding: 10px 15px;
            border-radius: 10px;
            font-size: 0.8em;
        }}
        .milestone-next {{
            background: rgba(255,215,0,0.2);
            border: 1px solid rgba(255,215,0,0.3);
            padding: 10px;
            border-radius: 10px;
            margin-top: 15px;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="refresh-time">
        Last updated: {datetime.now().strftime('%H:%M:%S')}
    </div>
    
    <div class="container">
        <div class="header">
            <h1>🏆 /vibe Workshop Dashboard</h1>
            <p>Live achievements, streaks & community progress</p>
        </div>
        
        <div class="stats-grid">
"""
    
    # Generate user cards
    for user in user_stats:
        recent_badges_html = ""
        if user['recent_badges']:
            for badge in user['recent_badges']:
                badge_info = badge_data['badge_categories']
                # Find badge details by key
                badge_name = "Badge"
                for category in badge_info.values():
                    if badge['badge_key'] in category:
                        badge_name = category[badge['badge_key']]['name']
                        break
                recent_badges_html += f'<span class="badge">{badge_name}</span>'
        
        # Calculate next milestone
        current_streak = user['streak']
        next_milestone = ""
        if current_streak < 7:
            days_needed = 7 - current_streak
            next_milestone = f"🔥 {days_needed} days to Week Streak badge"
        elif current_streak < 30:
            days_needed = 30 - current_streak
            next_milestone = f"👑 {days_needed} days to Monthly Legend badge"
        elif current_streak < 100:
            days_needed = 100 - current_streak
            next_milestone = f"💎 {days_needed} days to Century Club badge"
        else:
            next_milestone = "🌟 Legendary status achieved!"
        
        html += f"""
            <div class="stat-card">
                <div class="user-header">
                    <span class="user-handle">{user['handle']}</span>
                    <span class="points-badge">{user['total_points']} pts</span>
                </div>
                
                <div class="streak-info">
                    <div class="streak-item">
                        <div class="streak-number">{user['streak']}</div>
                        <div class="streak-label">Current Streak</div>
                    </div>
                    <div class="streak-item">
                        <div class="streak-number">{user['best_streak']}</div>
                        <div class="streak-label">Best Streak</div>
                    </div>
                    <div class="streak-item">
                        <div class="streak-number">{user['badge_count']}</div>
                        <div class="streak-label">Badges Earned</div>
                    </div>
                </div>
                
                <div class="milestone-next">
                    {next_milestone}
                </div>
                
                <div class="badges-section">
                    <div class="badges-title">Recent Achievements:</div>
                    {recent_badges_html if recent_badges_html else '<span class="badge">No badges yet - keep going! 💪</span>'}
                </div>
            </div>
"""
    
    html += """
        </div>
        
        <div class="leaderboard">
            <h2>🏅 Achievement Leaderboard</h2>
"""
    
    # Generate leaderboard
    for i, user in enumerate(user_stats[:10], 1):
        rank_class = ""
        if i == 1:
            rank_class = "first"
        elif i == 2:
            rank_class = "second"
        elif i == 3:
            rank_class = "third"
        
        html += f"""
            <div class="leaderboard-item">
                <div style="display: flex; align-items: center;">
                    <span class="rank {rank_class}">#{i}</span>
                    <span>{user['handle']}</span>
                </div>
                <div style="display: flex; gap: 20px; align-items: center;">
                    <span>{user['total_points']} points</span>
                    <span>{user['badge_count']} badges</span>
                    <span>🔥 {user['streak']} days</span>
                </div>
            </div>
"""
    
    html += f"""
        </div>
        
        <div class="footer">
            <p>Built by @streaks-agent • Celebrating consistency & community</p>
            <p>Updated every minute • {len(user_stats)} active participants</p>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 60 seconds
        setTimeout(() => {{
            window.location.reload();
        }}, 60000);
    </script>
</body>
</html>"""
    
    return html

def main():
    """Generate and serve the live dashboard"""
    print("🏆 Generating Live Badge Dashboard...")
    
    html_content = generate_dashboard_html()
    
    # Write to file
    with open('live_badge_dashboard.html', 'w') as f:
        f.write(html_content)
    
    print("✅ Dashboard generated: live_badge_dashboard.html")
    print("🔄 Auto-refreshes every minute to show live progress")
    print("🎯 Making gamification visible and engaging!")
    
    # Also create a simple server version
    try:
        import http.server
        import socketserver
        import webbrowser
        from threading import Thread
        import os
        
        PORT = 8001
        
        class DashboardHandler(http.server.SimpleHTTPRequestHandler):
            def end_headers(self):
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Expires', '0')
                super().end_headers()
            
            def do_GET(self):
                if self.path == '/' or self.path == '/dashboard':
                    self.path = '/live_badge_dashboard.html'
                    # Regenerate dashboard on each request for live updates
                    html_content = generate_dashboard_html()
                    with open('live_badge_dashboard.html', 'w') as f:
                        f.write(html_content)
                return super().do_GET()
        
        print(f"🌐 Starting live server on http://localhost:{PORT}")
        print("📊 Dashboard will auto-regenerate on each visit")
        
        with socketserver.TCPServer(("", PORT), DashboardHandler) as httpd:
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n✅ Dashboard service stopped")
    except Exception as e:
        print(f"💡 Static file generated. To serve live: python -m http.server 8001")

if __name__ == "__main__":
    main()