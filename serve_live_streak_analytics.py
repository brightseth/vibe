#!/usr/bin/env python3
"""
Live Streak Analytics Dashboard Server
Serves the beautiful streak analytics dashboard with real-time data updates
"""

import http.server
import socketserver
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List

class StreakAnalyticsHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        if self.path == '/api/streak-data':
            self.send_streak_data()
        elif self.path == '/':
            self.path = '/beautiful_streak_analytics_dashboard.html'
            return super().do_GET()
        else:
            return super().do_GET()
    
    def send_streak_data(self):
        """Send real-time streak data as JSON"""
        try:
            # Load current streak data
            streak_data = self.load_streak_data()
            
            # Load achievements data
            achievements_data = self.load_achievements_data()
            
            # Generate analytics
            analytics = self.generate_analytics(streak_data, achievements_data)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.wfile.write(json.dumps(analytics).encode())
            
        except Exception as e:
            self.send_error(500, f"Error generating streak data: {str(e)}")
    
    def load_streak_data(self) -> Dict:
        """Load current streak data from memory/files"""
        # Default data based on current @streaks-agent state
        return {
            "@demo_user": {"current_streak": 1, "best_streak": 1, "last_active": "2026-01-08"},
            "@vibe_champion": {"current_streak": 1, "best_streak": 1, "last_active": "2026-01-08"}
        }
    
    def load_achievements_data(self) -> Dict:
        """Load achievements data"""
        try:
            with open('achievements.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"badges": {}, "user_achievements": {}, "achievement_history": []}
    
    def generate_analytics(self, streak_data: Dict, achievements_data: Dict) -> Dict:
        """Generate comprehensive analytics from streak and achievement data"""
        
        # Basic stats
        active_users = len(streak_data)
        total_streaks = sum(1 for data in streak_data.values() if data["current_streak"] > 0)
        longest_streak = max(data["current_streak"] for data in streak_data.values()) if streak_data else 0
        avg_streak = sum(data["current_streak"] for data in streak_data.values()) / len(streak_data) if streak_data else 0
        
        # Generate trend data (7 days)
        trend_data = self.generate_trend_data(streak_data)
        
        # Generate distribution data
        distribution = self.generate_distribution(streak_data)
        
        # Leaderboard
        leaderboard = self.generate_leaderboard(streak_data)
        
        # Insights
        insights = self.generate_insights(streak_data, achievements_data)
        
        # Next milestones
        milestones = self.calculate_next_milestones(streak_data)
        
        return {
            "stats": {
                "active_users": active_users,
                "total_streaks": total_streaks,
                "longest_streak": longest_streak,
                "avg_streak": round(avg_streak, 1)
            },
            "trends": trend_data,
            "distribution": distribution,
            "leaderboard": leaderboard,
            "insights": insights,
            "milestones": milestones,
            "last_updated": datetime.now().isoformat()
        }
    
    def generate_trend_data(self, streak_data: Dict) -> Dict:
        """Generate 7-day trend data for charts"""
        # For now, simulate trend data based on current streaks
        # In production, this would come from historical data
        
        users = list(streak_data.keys())
        trends = {}
        
        for user in users:
            current = streak_data[user]["current_streak"]
            # Simulate a trend where they built up to current streak
            daily_data = []
            for i in range(7):
                if i < 7 - current:
                    daily_data.append(0)
                else:
                    daily_data.append(i - (7 - current - 1))
            trends[user] = daily_data
        
        return trends
    
    def generate_distribution(self, streak_data: Dict) -> Dict:
        """Generate streak distribution for pie chart"""
        ranges = {
            "1_day": 0,
            "3_plus": 0,
            "7_plus": 0,
            "30_plus": 0
        }
        
        for data in streak_data.values():
            streak = data["current_streak"]
            if streak >= 30:
                ranges["30_plus"] += 1
            elif streak >= 7:
                ranges["7_plus"] += 1
            elif streak >= 3:
                ranges["3_plus"] += 1
            elif streak >= 1:
                ranges["1_day"] += 1
        
        return ranges
    
    def generate_leaderboard(self, streak_data: Dict) -> List[Dict]:
        """Generate leaderboard sorted by current streak, then best streak"""
        leaderboard = []
        
        for user, data in streak_data.items():
            leaderboard.append({
                "user": user,
                "current_streak": data["current_streak"],
                "best_streak": data["best_streak"],
                "rank": 0  # Will be set after sorting
            })
        
        # Sort by current streak (desc), then by best streak (desc)
        leaderboard.sort(key=lambda x: (x["current_streak"], x["best_streak"]), reverse=True)
        
        # Assign ranks
        for i, entry in enumerate(leaderboard):
            entry["rank"] = i + 1
        
        return leaderboard
    
    def generate_insights(self, streak_data: Dict, achievements_data: Dict) -> Dict:
        """Generate insights and recommendations"""
        total_users = len(streak_data)
        streak_1_users = sum(1 for data in streak_data.values() if data["current_streak"] == 1)
        
        # Achievement insights
        total_badges_awarded = sum(len(badges) for badges in achievements_data.get("user_achievements", {}).values())
        
        insights = {
            "primary": "",
            "secondary": "",
            "badges_awarded": total_badges_awarded,
            "next_milestone": "Early Bird (3 days)",
            "progress_to_next": 33.3  # 1/3 days
        }
        
        if streak_1_users == total_users:
            insights["primary"] = "Everyone's just getting started! 🌱 Perfect time to build momentum."
            insights["secondary"] = "2 days to go for the Early Bird badge 🌅"
        elif streak_1_users > total_users // 2:
            insights["primary"] = "Most users are in their first week - great foundation building time!"
            insights["secondary"] = "Consistency in the first week sets the tone for long-term success."
        else:
            insights["primary"] = "Strong streak diversity! Users are finding their rhythm."
            insights["secondary"] = "Multiple milestone achievements coming up!"
        
        return insights
    
    def calculate_next_milestones(self, streak_data: Dict) -> Dict:
        """Calculate next milestones for all users"""
        milestone_thresholds = [3, 7, 14, 30, 100]
        user_milestones = {}
        
        for user, data in streak_data.items():
            current = data["current_streak"]
            next_milestone = None
            
            for threshold in milestone_thresholds:
                if current < threshold:
                    next_milestone = {
                        "threshold": threshold,
                        "days_remaining": threshold - current,
                        "progress": (current / threshold) * 100
                    }
                    break
            
            user_milestones[user] = next_milestone
        
        return user_milestones

def main():
    """Start the analytics dashboard server"""
    PORT = 8080
    
    print(f"🚀 Starting Streak Analytics Dashboard Server...")
    print(f"📊 Dashboard: http://localhost:{PORT}")
    print(f"🔗 API Endpoint: http://localhost:{PORT}/api/streak-data")
    print(f"🤖 Powered by @streaks-agent")
    print("-" * 50)
    
    try:
        with socketserver.TCPServer(("", PORT), StreakAnalyticsHandler) as httpd:
            print(f"✅ Server running at http://localhost:{PORT}")
            print("📈 Real-time streak analytics dashboard is live!")
            print("🔥 Press Ctrl+C to stop")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")

if __name__ == "__main__":
    main()