#!/usr/bin/env python3
"""
Badge Dashboard Server for /vibe Workshop
Built by @streaks-agent - Making consistency irresistible!

Serves the interactive badge dashboard with live achievement data.
"""

import json
import os
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import time

class BadgeDashboardHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/achievements':
            self.serve_achievement_data()
        elif parsed_path.path == '/' or parsed_path.path == '/dashboard':
            self.serve_dashboard()
        else:
            super().do_GET()
    
    def serve_achievement_data(self):
        """Serve live achievement data as JSON"""
        try:
            # Load current streak data
            streak_data = self.load_streak_data()
            
            # Load achievement data
            achievement_data = self.load_achievement_data()
            
            # Combine into dashboard format
            dashboard_data = self.create_dashboard_data(streak_data, achievement_data)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps(dashboard_data, indent=2)
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Error loading achievement data: {str(e)}")
    
    def serve_dashboard(self):
        """Serve the dashboard HTML"""
        try:
            with open('badge_dashboard.html', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Update the dashboard to use live API data
            updated_content = content.replace(
                'const sampleData = {',
                '''// Load live data from API
        async function loadLiveData() {
            try {
                const response = await fetch('/api/achievements');
                return await response.json();
            } catch (error) {
                console.error('Failed to load live data:', error);
                return sampleData; // Fallback to sample data
            }
        }

        const sampleData = {'''
            )
            
            # Update the loadDashboard function to use live data
            updated_content = updated_content.replace(
                'function loadDashboard() {',
                '''async function loadDashboard() {
            const data = await loadLiveData();
            renderDashboardWithData(data);
        }

        function renderDashboardWithData(data) {
            sampleData.users = data.users;
            sampleData.badges = data.badges;
        
        function loadDashboardOld() {'''
            )
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(updated_content.encode('utf-8'))
            
        except FileNotFoundError:
            self.send_error(404, "Dashboard file not found")
        except Exception as e:
            self.send_error(500, f"Error serving dashboard: {str(e)}")
    
    def load_streak_data(self):
        """Load current streak data"""
        try:
            with open('streak_data.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Default data if file doesn't exist
            return {
                "@demo_user": {"current": 1, "best": 1},
                "@vibe_champion": {"current": 1, "best": 1}
            }
    
    def load_achievement_data(self):
        """Load achievement data"""
        try:
            with open('enhanced_achievements.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Initialize with empty achievement data
            return {
                "badges": self.get_default_badges(),
                "user_achievements": {},
                "milestone_history": [],
                "celebration_log": []
            }
    
    def get_default_badges(self):
        """Get default badge definitions"""
        return {
            "first_day": {
                "name": "First Day",
                "description": "Started your /vibe journey",
                "emoji": "🎉",
                "type": "streak",
                "threshold": 1,
                "rarity": "common"
            },
            "seedling": {
                "name": "Seedling",
                "description": "Growing your consistency habit",
                "emoji": "🌱",
                "type": "streak", 
                "threshold": 3,
                "rarity": "common"
            },
            "week_warrior": {
                "name": "Week Warrior", 
                "description": "One week of dedication",
                "emoji": "💪",
                "type": "streak",
                "threshold": 7,
                "rarity": "uncommon"
            },
            "fortnight_force": {
                "name": "Fortnight Force",
                "description": "Two weeks of unwavering commitment", 
                "emoji": "🔥",
                "type": "streak",
                "threshold": 14,
                "rarity": "rare"
            },
            "monthly_legend": {
                "name": "Monthly Legend",
                "description": "A full month of consistency",
                "emoji": "🏆", 
                "type": "streak",
                "threshold": 30,
                "rarity": "epic"
            },
            "century_club": {
                "name": "Century Club",
                "description": "100 days of dedication",
                "emoji": "👑",
                "type": "streak", 
                "threshold": 100,
                "rarity": "legendary"
            }
        }
    
    def create_dashboard_data(self, streak_data, achievement_data):
        """Create dashboard data from streak and achievement data"""
        users = []
        badges = achievement_data.get("badges", self.get_default_badges())
        
        for handle, streak_info in streak_data.items():
            current_streak = streak_info.get("current", 0)
            best_streak = streak_info.get("best", 0)
            
            # Get user achievements
            user_achievements = achievement_data.get("user_achievements", {}).get(handle, {})
            earned_badges = user_achievements.get("badges", [])
            
            # Calculate next milestone
            next_milestone = self.get_next_milestone(handle, current_streak, badges, earned_badges)
            
            users.append({
                "handle": handle,
                "current_streak": current_streak,
                "best_streak": best_streak,
                "total_badges": len(earned_badges),
                "badges": earned_badges,
                "next_milestone": next_milestone
            })
        
        return {
            "users": users,
            "badges": badges,
            "last_updated": datetime.now().isoformat()
        }
    
    def get_next_milestone(self, handle, current_streak, badges, earned_badges):
        """Calculate next milestone for a user"""
        streak_badges = [(bid, badge) for bid, badge in badges.items() 
                        if badge.get("type") == "streak" and bid not in earned_badges]
        
        if not streak_badges:
            return None
        
        # Find the next unearned milestone
        next_badges = [(bid, badge) for bid, badge in streak_badges 
                      if badge["threshold"] > current_streak]
        
        if not next_badges:
            return None
        
        # Get the closest milestone
        next_badge_id, next_badge = min(next_badges, key=lambda x: x[1]["threshold"])
        
        threshold = next_badge["threshold"]
        days_remaining = threshold - current_streak
        progress = round((current_streak / threshold) * 100, 1)
        
        return {
            "name": next_badge["name"],
            "emoji": next_badge["emoji"], 
            "days_remaining": days_remaining,
            "progress": progress,
            "threshold": threshold
        }

def update_data_continuously():
    """Background thread to update achievement data"""
    while True:
        try:
            # Import and run the enhanced achievement system
            from enhanced_achievement_system import EnhancedAchievementSystem
            
            system = EnhancedAchievementSystem()
            
            # Load current streaks
            try:
                with open('streak_data.json', 'r') as f:
                    streak_data = json.load(f)
                
                # Check achievements for each user
                for handle, streak_info in streak_data.items():
                    current_streak = streak_info.get("current", 0)
                    best_streak = streak_info.get("best", 0)
                    
                    # Check for new achievements
                    new_achievements = system.check_user_achievements(
                        handle, current_streak, best_streak
                    )
                    
                    if new_achievements:
                        print(f"🎉 New achievements for {handle}:")
                        for achievement in new_achievements:
                            badge = achievement["badge"]
                            print(f"  {badge['emoji']} {badge['name']}")
            
            except FileNotFoundError:
                print("No streak data found, skipping achievement updates")
            
        except Exception as e:
            print(f"Error updating achievements: {e}")
        
        # Wait 30 seconds before next update
        time.sleep(30)

def main():
    """Run the badge dashboard server"""
    port = 8083
    
    print(f"🎖️ Starting Badge Dashboard Server...")
    print(f"📊 Dashboard: http://localhost:{port}/")
    print(f"🔗 API: http://localhost:{port}/api/achievements")
    print(f"🎯 Built by @streaks-agent - Making consistency irresistible!")
    
    # Start background data update thread
    update_thread = threading.Thread(target=update_data_continuously, daemon=True)
    update_thread.start()
    
    # Start HTTP server
    try:
        httpd = HTTPServer(('localhost', port), BadgeDashboardHandler)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down server...")
    except Exception as e:
        print(f"❌ Server error: {e}")

if __name__ == "__main__":
    main()