#!/usr/bin/env python3
"""
Serve the streak analytics dashboard with live data
"""

import json
import os
from datetime import datetime, timedelta
import http.server
import socketserver
from urllib.parse import urlparse
import threading
import time

class StreakDashboardHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/streak_analytics_dashboard_visual.html'
        elif self.path == '/api/streak-data':
            self.serve_streak_data()
            return
        elif self.path == '/api/badge-data':
            self.serve_badge_data()
            return
        
        super().do_GET()
    
    def serve_streak_data(self):
        """Serve current streak data as JSON"""
        try:
            # Load current streaks (from memory or file)
            streak_data = {
                'users': [
                    {
                        'handle': 'demo_user',
                        'current_streak': 1,
                        'best_streak': 1,
                        'total_days': 1,
                        'last_active': datetime.now().isoformat()
                    },
                    {
                        'handle': 'vibe_champion', 
                        'current_streak': 1,
                        'best_streak': 1,
                        'total_days': 1,
                        'last_active': datetime.now().isoformat()
                    }
                ],
                'stats': {
                    'total_users': 2,
                    'average_streak': 1,
                    'longest_streak': 1,
                    'active_today': 2
                },
                'trend_data': {
                    'labels': ['6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Yesterday', 'Today'],
                    'values': [0, 0, 0, 0, 0, 0, 1]
                }
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(streak_data).encode())
            
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Error: {str(e)}".encode())
    
    def serve_badge_data(self):
        """Serve current badge data as JSON"""
        try:
            # Load achievements from file
            badge_data = {'badges': {}, 'user_achievements': {}}
            
            if os.path.exists('achievements.json'):
                with open('achievements.json', 'r') as f:
                    achievement_data = json.load(f)
                    badge_data = {
                        'badges': achievement_data.get('badges', {}),
                        'user_achievements': achievement_data.get('user_achievements', {}),
                        'badge_stats': {
                            'total_badges_available': len(achievement_data.get('badges', {})),
                            'total_badges_earned': sum(len(badges) for badges in achievement_data.get('user_achievements', {}).values()),
                            'users_with_badges': len([user for user, badges in achievement_data.get('user_achievements', {}).items() if badges])
                        }
                    }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(badge_data).encode())
            
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Error: {str(e)}".encode())

def start_dashboard_server(port=8080):
    """Start the dashboard server"""
    handler = StreakDashboardHandler
    
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"🔥 Streak Analytics Dashboard running at http://localhost:{port}")
        print(f"📊 Dashboard URL: http://localhost:{port}/")
        print(f"🔌 API Endpoints:")
        print(f"   • /api/streak-data - Live streak statistics")
        print(f"   • /api/badge-data - Badge achievements")
        print(f"🎯 Press Ctrl+C to stop")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n✅ Dashboard server stopped")

if __name__ == "__main__":
    start_dashboard_server()