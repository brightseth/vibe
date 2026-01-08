#!/usr/bin/env python3
"""
🔥 Serve Current Streak Analytics Dashboard
Quick server to display the beautiful analytics dashboard
"""

import http.server
import socketserver
import webbrowser
import os
from datetime import datetime

def serve_dashboard():
    PORT = 8080
    Handler = http.server.SimpleHTTPRequestHandler
    
    print(f"🔥 STREAK ANALYTICS DASHBOARD")
    print(f"=" * 40)
    print(f"🚀 Starting server on port {PORT}")
    print(f"📊 Dashboard: http://localhost:{PORT}/analytics.html")
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔄 Auto-refresh: Every 5 minutes")
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"\n✨ Server ready! Opening dashboard...")
        try:
            webbrowser.open(f"http://localhost:{PORT}/analytics.html")
        except:
            print("   (Couldn't auto-open browser - please visit URL manually)")
        
        print(f"🎯 Press Ctrl+C to stop server")
        print(f"📈 Dashboard shows: Current streaks, trends, leaderboard, insights")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n🛑 Server stopped at {datetime.now().strftime('%H:%M:%S')}")
            print(f"📊 Thanks for using Streak Analytics!")

if __name__ == "__main__":
    serve_dashboard()