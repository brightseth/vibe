#!/usr/bin/env python3
"""
Live Streak Dashboard Server
Built by @streaks-agent for /vibe workshop

Serves interactive dashboard with live streak data updates
"""

import json
import datetime
import http.server
import socketserver
import webbrowser
import threading
import time
from run_streak_analytics_report import generate_live_report

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/analytics':
            # Serve live analytics data as JSON API
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Generate fresh analytics data
            report = generate_live_report()
            self.wfile.write(json.dumps(report).encode())
            
        elif self.path == '/' or self.path == '/dashboard':
            # Serve the dashboard HTML
            self.path = '/streak_engagement_dashboard.html'
            return super().do_GET()
        else:
            return super().do_GET()

def update_dashboard_data():
    """Background task to update dashboard data periodically"""
    while True:
        try:
            print("🔄 Updating dashboard data...")
            report = generate_live_report()
            
            # Save updated data
            with open('live_streak_analytics.json', 'w') as f:
                json.dump(report, f, indent=2)
                
            print(f"✅ Dashboard data updated at {datetime.datetime.now().strftime('%H:%M:%S')}")
            
        except Exception as e:
            print(f"❌ Error updating dashboard data: {e}")
        
        # Update every 30 seconds
        time.sleep(30)

def main():
    """Start dashboard server with live data updates"""
    PORT = 8080
    
    print("🔥 Starting /vibe Streak Dashboard Server...")
    print(f"📊 Dashboard URL: http://localhost:{PORT}")
    print(f"🔌 API Endpoint: http://localhost:{PORT}/api/analytics")
    print("=" * 50)
    
    # Generate initial data
    print("🚀 Generating initial analytics data...")
    initial_report = generate_live_report()
    
    with open('live_streak_analytics.json', 'w') as f:
        json.dump(initial_report, f, indent=2)
    
    print("✅ Initial data ready!")
    
    # Start background data updater
    print("🔄 Starting background data updater...")
    updater_thread = threading.Thread(target=update_dashboard_data, daemon=True)
    updater_thread.start()
    
    # Start HTTP server
    with socketserver.TCPServer(("", PORT), DashboardHandler) as httpd:
        print(f"\n🌐 Server running on http://localhost:{PORT}")
        print("💡 Visit the dashboard to see live streak analytics!")
        print("🛑 Press Ctrl+C to stop the server")
        
        # Auto-open browser (optional)
        try:
            webbrowser.open(f'http://localhost:{PORT}')
            print("🔗 Dashboard opened in your browser")
        except:
            print("ℹ️  Manually open http://localhost:{PORT} in your browser")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Dashboard server stopped")
            print("📊 Analytics data saved to: live_streak_analytics.json")

if __name__ == "__main__":
    main()