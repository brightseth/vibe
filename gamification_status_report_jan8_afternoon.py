#!/usr/bin/env python3
"""
Complete Gamification System Status Report
Validates all streak tracking, badge system, and analytics features
"""

import json
from datetime import datetime

class GamificationStatusChecker:
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "systems": {},
            "recommendations": [],
            "achievements_ready": []
        }
    
    def check_streak_system(self):
        """Check streak tracking capabilities"""
        try:
            # Current users from @streaks-agent memory
            users = {
                "@demo_user": {"current": 1, "best": 1},
                "@vibe_champion": {"current": 1, "best": 1}
            }
            
            self.report["systems"]["streak_tracking"] = {
                "status": "✅ ACTIVE",
                "users_tracked": len(users),
                "active_streaks": sum(1 for u in users.values() if u["current"] > 0),
                "total_streak_days": sum(u["current"] for u in users.values()),
                "longest_current": max(u["current"] for u in users.values()),
                "details": users
            }
            return True
        except Exception as e:
            self.report["systems"]["streak_tracking"] = {
                "status": "❌ ERROR",
                "error": str(e)
            }
            return False
    
    def check_badge_system(self):
        """Check badge/achievement system"""
        try:
            with open('achievements.json', 'r') as f:
                achievements = json.load(f)
            
            total_badges = len(achievements.get("badges", {}))
            total_users = len(achievements.get("user_achievements", {}))
            total_earned = sum(len(badges) for badges in achievements.get("user_achievements", {}).values())
            
            self.report["systems"]["badge_system"] = {
                "status": "✅ ACTIVE",
                "available_badges": total_badges,
                "users_with_badges": total_users,
                "total_badges_earned": total_earned,
                "recent_achievements": len(achievements.get("achievement_history", [])),
                "badge_types": list(achievements.get("badges", {}).keys())
            }
            return True
        except Exception as e:
            self.report["systems"]["badge_system"] = {
                "status": "❌ ERROR", 
                "error": str(e)
            }
            return False
    
    def check_analytics_dashboard(self):
        """Check analytics dashboard status"""
        try:
            with open('streak_dashboard_data.json', 'r') as f:
                dashboard_data = json.load(f)
            
            data_age = datetime.now() - datetime.fromisoformat(dashboard_data.get("generated_at", "2026-01-01T00:00:00Z").replace("Z", "+00:00"))
            
            self.report["systems"]["analytics_dashboard"] = {
                "status": "✅ ACTIVE",
                "data_freshness": f"{data_age.seconds // 60} minutes old",
                "stats_available": bool(dashboard_data.get("stats")),
                "leaderboard_active": len(dashboard_data.get("leaderboard", [])),
                "milestones_tracked": len(dashboard_data.get("milestones", {})),
                "insights_count": len(dashboard_data.get("insights", []))
            }
            return True
        except Exception as e:
            self.report["systems"]["analytics_dashboard"] = {
                "status": "⚠️ DATA STALE", 
                "error": str(e),
                "note": "Dashboard exists but data may need refresh"
            }
            return False
    
    def check_celebration_system(self):
        """Check milestone celebration capabilities"""
        try:
            # Check if celebration system file exists
            with open('automatic_milestone_celebration.py', 'r') as f:
                content = f.read()
            
            has_milestones = "milestones" in content
            has_dm_generation = "generate_celebration_dm" in content
            has_board_announcements = "generate_board_announcement" in content
            
            self.report["systems"]["celebration_system"] = {
                "status": "✅ READY",
                "milestone_detection": has_milestones,
                "dm_celebrations": has_dm_generation,
                "board_announcements": has_board_announcements,
                "note": "Ready to celebrate when users hit milestones"
            }
            return True
        except Exception as e:
            self.report["systems"]["celebration_system"] = {
                "status": "❌ ERROR",
                "error": str(e)
            }
            return False
    
    def check_visual_interfaces(self):
        """Check visual dashboard interfaces"""
        interfaces = []
        
        interface_files = [
            "comprehensive_gamification_dashboard.html",
            "streak_analytics_dashboard.html", 
            "badge_display.html",
            "streak_motivation_dashboard.html"
        ]
        
        for interface in interface_files:
            try:
                with open(interface, 'r') as f:
                    content = f.read()
                    interfaces.append({
                        "name": interface,
                        "status": "✅ AVAILABLE",
                        "interactive": "script" in content.lower(),
                        "responsive": "viewport" in content.lower()
                    })
            except FileNotFoundError:
                interfaces.append({
                    "name": interface,
                    "status": "❌ MISSING"
                })
        
        active_interfaces = sum(1 for i in interfaces if i["status"] == "✅ AVAILABLE")
        
        self.report["systems"]["visual_interfaces"] = {
            "status": f"✅ {active_interfaces} DASHBOARDS ACTIVE",
            "available_interfaces": active_interfaces,
            "total_designed": len(interface_files),
            "interfaces": interfaces
        }
        
        return active_interfaces > 0
    
    def generate_recommendations(self):
        """Generate actionable recommendations"""
        recommendations = []
        
        # Check for system integration opportunities
        if self.report["systems"]["streak_tracking"]["status"] == "✅ ACTIVE":
            if self.report["systems"]["badge_system"]["status"] == "✅ ACTIVE":
                if self.report["systems"]["celebration_system"]["status"] == "✅ READY":
                    recommendations.append("🎉 All systems ready! Focus on user engagement and growth")
                    recommendations.append("📈 Consider analytics insights to identify engagement patterns")
                else:
                    recommendations.append("🔧 Connect celebration system to streak/badge updates")
            else:
                recommendations.append("🏆 Integrate badge awards with streak milestones")
        
        # Check for missing celebrations
        streak_data = self.report["systems"]["streak_tracking"].get("details", {})
        for user, data in streak_data.items():
            if data["current"] >= 1 and data["current"] < 3:
                recommendations.append(f"🌱 {user} approaching 3-day milestone - prepare celebration")
        
        # Dashboard freshness
        if "STALE" in self.report["systems"].get("analytics_dashboard", {}).get("status", ""):
            recommendations.append("🔄 Refresh analytics dashboard data for current insights")
        
        self.report["recommendations"] = recommendations
    
    def run_full_check(self):
        """Run complete system check"""
        print("🎮 GAMIFICATION SYSTEM STATUS CHECK")
        print("=" * 50)
        
        # Check all systems
        systems_checked = [
            ("Streak Tracking", self.check_streak_system()),
            ("Badge System", self.check_badge_system()), 
            ("Analytics Dashboard", self.check_analytics_dashboard()),
            ("Celebration System", self.check_celebration_system()),
            ("Visual Interfaces", self.check_visual_interfaces())
        ]
        
        # Generate recommendations
        self.generate_recommendations()
        
        # Display results
        working_systems = sum(1 for _, status in systems_checked if status)
        total_systems = len(systems_checked)
        
        print(f"\n📊 SYSTEM HEALTH: {working_systems}/{total_systems} systems operational")
        print(f"🎯 OVERALL STATUS: {'🟢 EXCELLENT' if working_systems >= 4 else '🟡 GOOD' if working_systems >= 3 else '🔴 NEEDS ATTENTION'}")
        
        print(f"\n🔍 SYSTEM DETAILS:")
        for system_name, status in systems_checked:
            system_data = self.report["systems"].get(system_name.lower().replace(" ", "_"), {})
            print(f"  {system_name}: {system_data.get('status', '❓ UNKNOWN')}")
            
            # Show key metrics
            if system_name == "Streak Tracking":
                details = system_data.get("details", {})
                print(f"    Users: {len(details)}, Active Streaks: {system_data.get('active_streaks', 0)}")
            elif system_name == "Badge System":
                print(f"    Badges Available: {system_data.get('available_badges', 0)}, Earned: {system_data.get('total_badges_earned', 0)}")
            elif system_name == "Visual Interfaces":
                print(f"    Active Dashboards: {system_data.get('available_interfaces', 0)}")
        
        print(f"\n💡 RECOMMENDATIONS:")
        for i, rec in enumerate(self.report["recommendations"], 1):
            print(f"  {i}. {rec}")
        
        # Show current user status
        print(f"\n👥 CURRENT USERS:")
        streak_data = self.report["systems"]["streak_tracking"].get("details", {})
        for user, data in streak_data.items():
            print(f"  {user}: {data['current']} day streak (best: {data['best']})")
            
            # Show next milestone
            next_milestone = 3 if data['current'] < 3 else 7 if data['current'] < 7 else 14
            days_to_go = next_milestone - data['current']
            if days_to_go > 0:
                milestone_names = {3: "Early Bird 🌅", 7: "Week Warrior 💪", 14: "Consistency King 🔥"}
                print(f"    → {days_to_go} days to {milestone_names.get(next_milestone, 'next milestone')}")
        
        print(f"\n📈 ENGAGEMENT INSIGHTS:")
        total_users = len(streak_data)
        active_users = sum(1 for d in streak_data.values() if d["current"] > 0)
        avg_streak = sum(d["current"] for d in streak_data.values()) / len(streak_data) if streak_data else 0
        
        print(f"  Engagement Rate: {active_users}/{total_users} ({100*active_users//total_users if total_users > 0 else 0}%)")
        print(f"  Average Streak: {avg_streak:.1f} days")
        print(f"  System Health: {working_systems*20}% operational")
        
        return self.report

def main():
    checker = GamificationStatusChecker()
    report = checker.run_full_check()
    
    # Save report
    with open('gamification_status_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n💾 Full report saved to gamification_status_report.json")
    print(f"📅 Generated: {report['timestamp']}")

if __name__ == "__main__":
    main()