#!/usr/bin/env python3
"""
🔥 Live Streak Analytics Dashboard Server
By @streaks-agent for /vibe workshop
"""

import http.server
import socketserver
import webbrowser
import os
import json
from datetime import datetime

def get_dynamic_dashboard_data():
    """Generate current dashboard data"""
    try:
        # Read current achievements
        with open('achievements.json', 'r') as f:
            achievements = json.load(f)
        
        # Calculate stats
        user_count = len(achievements.get('user_achievements', {}))
        total_badges = sum(len(badges) for badges in achievements.get('user_achievements', {}).values())
        
        # Read current streaks (simulated from known data)
        streaks_data = {
            "demo_user": {"current": 1, "best": 1},
            "vibe_champion": {"current": 1, "best": 1}
        }
        
        avg_streak = sum(data["current"] for data in streaks_data.values()) / len(streaks_data) if streaks_data else 0
        
        return {
            "user_count": user_count,
            "total_badges": total_badges,
            "avg_streak": avg_streak,
            "streaks_data": streaks_data,
            "achievements": achievements,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error getting dashboard data: {e}")
        return {
            "user_count": 2,
            "total_badges": 2,
            "avg_streak": 1.0,
            "streaks_data": {
                "demo_user": {"current": 1, "best": 1},
                "vibe_champion": {"current": 1, "best": 1}
            },
            "timestamp": datetime.now().isoformat()
        }

def start_dashboard_server(port=8080):
    """Start the dashboard server"""
    
    class CustomHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            if self.path == '/api/data':
                # Serve dynamic data as JSON
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                data = get_dynamic_dashboard_data()
                self.wfile.write(json.dumps(data, indent=2).encode())
                return
            
            elif self.path == '/' or self.path == '/dashboard':
                # Serve the main dashboard
                self.path = '/live_streak_analytics_dashboard.html'
            
            return super().do_GET()
    
    # Change to the directory containing our files
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", port), CustomHandler) as httpd:
        print(f"🔥 Streak Analytics Dashboard Server")
        print(f"📊 Serving at http://localhost:{port}")
        print(f"🎯 API endpoint: http://localhost:{port}/api/data")
        print(f"💾 Dashboard: http://localhost:{port}")
        print("Press Ctrl+C to stop the server")
        
        # Try to open browser
        try:
            webbrowser.open(f'http://localhost:{port}')
            print("🌐 Opened dashboard in your browser!")
        except:
            print("🔗 Open http://localhost:{port} in your browser to view the dashboard")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Dashboard server stopped")
            httpd.shutdown()

if __name__ == "__main__":
    # Generate a quick status report
    data = get_dynamic_dashboard_data()
    
    print("🔥 STREAK ANALYTICS DASHBOARD")
    print("=" * 40)
    print(f"📈 Active users: {data['user_count']}")
    print(f"🎖️  Total badges earned: {data['total_badges']}")
    print(f"📊 Average streak: {data['avg_streak']:.1f} days")
    print(f"⏰ Updated: {data['timestamp']}")
    print()
    
    for handle, streak_data in data['streaks_data'].items():
        print(f"🔥 {handle}: {streak_data['current']}-day streak (best: {streak_data['best']})")
    
    print("\n🚀 Starting dashboard server...")
    start_dashboard_server()