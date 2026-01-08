#!/usr/bin/env python3
"""
🔥 Beautiful Streak Analytics Dashboard Server
Real-time streak analytics with beautiful visualizations
"""

import json
import http.server
import socketserver
import os
from datetime import datetime
from urllib.parse import urlparse, parse_qs

class StreakAnalyticsServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='.', **kwargs)
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/streak-data':
            self.serve_streak_data()
        elif parsed_path.path == '/':
            self.serve_dashboard()
        else:
            super().do_GET()
    
    def serve_dashboard(self):
        """Serve the main dashboard"""
        try:
            with open('streak_analytics_dashboard_beautiful.html', 'r') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(content.encode())
        except FileNotFoundError:
            self.send_error(404, "Dashboard not found")
    
    def serve_streak_data(self):
        """Serve real-time streak analytics data"""
        try:
            # Get current streak data (simulated from memory)
            streak_data = {
                "demo_user": {"current_streak": 1, "best_streak": 1},
                "vibe_champion": {"current_streak": 1, "best_streak": 1}
            }
            
            # Load achievements data
            achievements_data = {}
            try:
                with open('achievements.json', 'r') as f:
                    achievements_data = json.load(f)
            except FileNotFoundError:
                pass
            
            # Calculate analytics
            analytics = self.calculate_analytics(streak_data, achievements_data)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps(analytics, indent=2)
            self.wfile.write(response.encode())
            
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")
    
    def calculate_analytics(self, streak_data, achievements_data):
        """Calculate comprehensive streak analytics"""
        
        # Basic metrics
        total_users = len(streak_data)
        active_streaks = sum(1 for data in streak_data.values() if data['current_streak'] > 0)
        total_current_days = sum(data['current_streak'] for data in streak_data.values())
        avg_streak = total_current_days / total_users if total_users > 0 else 0
        longest_current = max((data['current_streak'] for data in streak_data.values()), default=0)
        longest_best = max((data['best_streak'] for data in streak_data.values()), default=0)
        
        # User rankings
        user_rankings = []
        for handle, data in streak_data.items():
            badge_emoji = "🌱"  # Default
            if data['current_streak'] >= 100:
                badge_emoji = "👑"
            elif data['current_streak'] >= 30:
                badge_emoji = "🏆"
            elif data['current_streak'] >= 7:
                badge_emoji = "💪"
            elif data['current_streak'] >= 3:
                badge_emoji = "🔥"
            
            user_rankings.append({
                "handle": handle,
                "current_streak": data['current_streak'],
                "best_streak": data['best_streak'],
                "badge_emoji": badge_emoji,
                "css_class": self.get_streak_class(data['current_streak'])
            })
        
        # Sort by current streak, then by best streak
        user_rankings.sort(key=lambda x: (x['current_streak'], x['best_streak']), reverse=True)
        
        # Milestone progress
        milestones = [
            {"name": "Week Streak", "threshold": 7, "emoji": "💪"},
            {"name": "Consistency King", "threshold": 14, "emoji": "🔥"},
            {"name": "Monthly Legend", "threshold": 30, "emoji": "🏆"},
            {"name": "Century Club", "threshold": 100, "emoji": "👑"}
        ]
        
        milestone_progress = []
        for milestone in milestones:
            best_progress = max((data['current_streak'] for data in streak_data.values()), default=0)
            progress_percentage = min((best_progress / milestone['threshold']) * 100, 100)
            
            milestone_progress.append({
                "name": milestone['name'],
                "threshold": milestone['threshold'],
                "emoji": milestone['emoji'],
                "best_progress": best_progress,
                "progress_percentage": progress_percentage,
                "days_remaining": max(milestone['threshold'] - best_progress, 0)
            })
        
        # Engagement trend (last 7 days)
        trend_data = self.generate_trend_data(streak_data)
        
        # Recent achievements
        recent_achievements = []
        if 'achievement_history' in achievements_data:
            recent_achievements = achievements_data['achievement_history'][-5:]  # Last 5
        
        # Predictions
        predictions = self.generate_predictions(streak_data)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "metrics": {
                "total_users": total_users,
                "active_streaks": active_streaks,
                "avg_streak": round(avg_streak, 1),
                "longest_current": longest_current,
                "longest_best": longest_best,
                "active_rate": round((active_streaks / total_users * 100) if total_users > 0 else 0, 1)
            },
            "user_rankings": user_rankings,
            "milestone_progress": milestone_progress,
            "trend_data": trend_data,
            "recent_achievements": recent_achievements,
            "predictions": predictions
        }
    
    def get_streak_class(self, streak_days):
        """Get CSS class for streak level"""
        if streak_days >= 100:
            return "century"
        elif streak_days >= 30:
            return "month-streak"
        elif streak_days >= 7:
            return "week-streak"
        else:
            return ""
    
    def generate_trend_data(self, streak_data):
        """Generate trend data for charts"""
        # For now, return simulated data
        # In real implementation, this would query historical data
        return {
            "labels": ["Jan 6", "Jan 7", "Jan 8"],
            "active_users": [0, 0, 2],
            "avg_streaks": [0, 0, 1.0],
            "total_streak_days": [0, 0, 2]
        }
    
    def generate_predictions(self, streak_data):
        """Generate streak predictions"""
        predictions = {
            "momentum": "Strong start! Both users are active.",
            "next_milestone": "Week streaks possible in 6 days",
            "risk_factor": "Low - early stages are critical"
        }
        
        # Calculate risk based on current patterns
        current_streaks = [data['current_streak'] for data in streak_data.values()]
        if all(s >= 7 for s in current_streaks):
            predictions["risk_factor"] = "Very Low - strong momentum"
        elif all(s >= 3 for s in current_streaks):
            predictions["risk_factor"] = "Low - good momentum"
        elif any(s == 0 for s in current_streaks):
            predictions["risk_factor"] = "Medium - some users at risk"
        
        return predictions

def main():
    port = 8080
    
    print("🔥 BEAUTIFUL STREAK ANALYTICS DASHBOARD")
    print("=" * 50)
    print(f"🚀 Starting server on port {port}")
    print(f"📊 Dashboard URL: http://localhost:{port}")
    print(f"🔗 API endpoint: http://localhost:{port}/api/streak-data")
    print("=" * 50)
    
    with socketserver.TCPServer(("", port), StreakAnalyticsServer) as httpd:
        print(f"✅ Server running! Open http://localhost:{port} to view dashboard")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")

if __name__ == "__main__":
    main()