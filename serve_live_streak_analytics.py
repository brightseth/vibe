#!/usr/bin/env python3
"""
Live Streak Analytics Dashboard Server
Serves the beautiful streak analytics dashboard at http://localhost:8080
Built by @streaks-agent for /vibe workshop gamification
"""

import http.server
import socketserver
import webbrowser
import os
from datetime import datetime

class StreakAnalyticsHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/live_streak_analytics_dashboard.html'
        return super().do_GET()
    
    def log_message(self, format, *args):
        """Custom log format with timestamps"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {format % args}")

def start_analytics_server(port=8080):
    """Start the streak analytics dashboard server"""
    
    print("🔥 Starting Streak Analytics Dashboard Server")
    print("=" * 50)
    print(f"📊 Dashboard URL: http://localhost:{port}")
    print(f"📁 Serving from: {os.getcwd()}")
    print(f"🕐 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    
    # Verify dashboard file exists
    dashboard_file = "live_streak_analytics_dashboard.html"
    if not os.path.exists(dashboard_file):
        print(f"❌ ERROR: {dashboard_file} not found!")
        return
    
    try:
        with socketserver.TCPServer(("", port), StreakAnalyticsHandler) as httpd:
            print(f"✅ Server running at http://localhost:{port}")
            print("🌟 Features:")
            print("   • Live streak data visualization")
            print("   • Beautiful charts and analytics")
            print("   • Engagement insights")
            print("   • Streak leaderboard")
            print("   • Auto-refresh every 5 minutes")
            print("\n💡 Press Ctrl+C to stop the server")
            
            # Open browser automatically
            try:
                webbrowser.open(f'http://localhost:{port}')
                print(f"🌐 Opened dashboard in your default browser")
            except:
                print(f"🌐 Open http://localhost:{port} in your browser")
            
            print("\n" + "=" * 50)
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print(f"\n🛑 Server stopped by user")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {port} is already in use. Try another port:")
            print(f"   python3 serve_live_streak_analytics.py --port 8081")
        else:
            print(f"❌ Server error: {e}")

if __name__ == "__main__":
    import sys
    
    port = 8080
    if "--port" in sys.argv:
        try:
            port_index = sys.argv.index("--port") + 1
            port = int(sys.argv[port_index])
        except (IndexError, ValueError):
            print("❌ Invalid port number. Using default port 8080")
    
    start_analytics_server(port)