#!/usr/bin/env python3
"""
Live Streak Analytics Dashboard Server
Serves the HTML dashboard with real-time streak data
"""

import json
import os
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse as urlparse

class StreakDashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)
    
    def do_GET(self):
        if self.path == '/api/streak-data':
            self.send_streak_data()
        elif self.path == '/' or self.path == '/dashboard':
            self.send_dashboard()
        else:
            super().do_GET()
    
    def send_dashboard(self):
        """Serve the main dashboard HTML"""
        try:
            with open('streak_analytics_dashboard_live.html', 'r') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(content.encode())
        except FileNotFoundError:
            self.send_error(404, "Dashboard not found")
    
    def send_streak_data(self):
        """Send current streak data as JSON"""
        try:
            # Get streak data
            streak_data = self.get_current_streak_data()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(streak_data).encode())
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
    
    def get_current_streak_data(self):
        """Load and format current streak and achievement data"""
        # Load streak data (would normally come from memory/database)
        streaks = {
            "@demo_user": {"current": 1, "best": 1},
            "@vibe_champion": {"current": 1, "best": 1}
        }
        
        # Load achievements
        achievements = {}
        if os.path.exists('achievements.json'):
            with open('achievements.json', 'r') as f:
                achievements = json.load(f)
        
        # Calculate stats
        users = list(streaks.keys())
        current_streaks = [data["current"] for data in streaks.values()]
        best_streaks = [data["best"] for data in streaks.values()]
        
        # Badge counts
        total_badges = sum(len(badges) for badges in achievements.get('user_achievements', {}).values())
        
        return {
            "summary": {
                "total_users": len(users),
                "average_streak": round(sum(current_streaks) / len(current_streaks), 1) if current_streaks else 0,
                "total_badges": total_badges,
                "longest_streak": max(best_streaks) if best_streaks else 0
            },
            "leaderboard": [
                {
                    "rank": i + 1,
                    "handle": user,
                    "current_streak": streaks[user]["current"],
                    "best_streak": streaks[user]["best"],
                    "badges": len(achievements.get('user_achievements', {}).get(user.replace('@', ''), []))
                }
                for i, user in enumerate(sorted(users, key=lambda x: streaks[x]["current"], reverse=True))
            ],
            "trends": {
                "labels": ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
                "average_streak": [0, 0.5, 1, 1, 1, 1, 1],
                "active_users": [0, 1, 2, 2, 2, 2, 2]
            },
            "badges": {
                "distribution": self.get_badge_distribution(achievements),
                "recent_awards": self.get_recent_badge_awards(achievements)
            },
            "last_updated": datetime.now().isoformat()
        }
    
    def get_badge_distribution(self, achievements):
        """Calculate badge distribution stats"""
        badge_counts = {}
        user_achievements = achievements.get('user_achievements', {})
        
        for user_badges in user_achievements.values():
            for badge in user_badges:
                badge_id = badge.get('id', 'unknown')
                badge_counts[badge_id] = badge_counts.get(badge_id, 0) + 1
        
        return badge_counts
    
    def get_recent_badge_awards(self, achievements):
        """Get recently awarded badges"""
        history = achievements.get('achievement_history', [])
        # Return last 5 awards
        return sorted(history, key=lambda x: x.get('timestamp', ''), reverse=True)[:5]

def start_dashboard_server(port=8000):
    """Start the live streak dashboard server"""
    print(f"\n🔥 Starting Live Streak Analytics Dashboard...")
    print(f"📊 Dashboard URL: http://localhost:{port}")
    print(f"📈 API Endpoint: http://localhost:{port}/api/streak-data")
    print(f"🎯 Press Ctrl+C to stop server\n")
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, StreakDashboardHandler)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Dashboard server stopped.")
        httpd.server_close()

if __name__ == '__main__':
    start_dashboard_server()