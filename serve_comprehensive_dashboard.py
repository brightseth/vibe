#!/usr/bin/env python3
"""
🔥 /vibe Comprehensive Streak Analytics Dashboard Server
Serves the live streak analytics dashboard for the workshop
"""

import http.server
import socketserver
import json
import os
from datetime import datetime

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/live_streak_analytics_comprehensive.html'
        elif self.path == '/api/streaks':
            self.send_json_response(self.get_streak_data())
            return
        elif self.path == '/api/achievements':
            self.send_json_response(self.get_achievements_data())
            return
        
        return super().do_GET()
    
    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def get_streak_data(self):
        """Load current streak data"""
        try:
            # This would normally load from your streak storage
            return {
                "users": {
                    "demo_user": {"current": 1, "best": 1},
                    "vibe_champion": {"current": 1, "best": 1}
                },
                "total_streak_days": 2,
                "active_streakers": 2,
                "longest_streak": 1,
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_achievements_data(self):
        """Load achievements data"""
        try:
            with open('achievements.json', 'r') as f:
                achievements = json.load(f)
            return {
                "total_badges": len(achievements.get('user_achievements', {})),
                "total_users": len(achievements.get('user_achievements', {})),
                "recent_achievements": achievements.get('achievement_history', [])[-5:],
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}

def main():
    PORT = 8080
    
    print(f"""
🔥 /vibe Streak Analytics Dashboard
=====================================
Starting server at http://localhost:{PORT}
    
Dashboard: http://localhost:{PORT}/
API endpoints:
  - /api/streaks (live streak data)
  - /api/achievements (achievement data)
    
Press Ctrl+C to stop
""")
    
    try:
        with socketserver.TCPServer(("", PORT), DashboardHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Dashboard server stopped")

if __name__ == "__main__":
    main()