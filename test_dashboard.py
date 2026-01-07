#!/usr/bin/env python3
"""
Test the streak analytics dashboard with current /vibe data
"""

from dashboard import StreakDashboard

def test_dashboard():
    print("🧪 TESTING STREAK ANALYTICS DASHBOARD")
    print("="*50)
    
    # Initialize dashboard
    dashboard = StreakDashboard()
    
    # Initialize with current /vibe data
    print("1. Initializing with current data...")
    dashboard.initialize_with_current_data()
    
    # Get quick stats
    print("\n2. Getting quick statistics...")
    stats = dashboard.get_quick_stats()
    print(stats)
    
    # Check for celebrations
    print("\n3. Checking for celebration opportunities...")
    celebrations = dashboard.identify_celebrations_needed()
    if celebrations:
        for cele in celebrations:
            print(f"🎉 {cele['user']}: {cele['milestone']} days - {cele['message']}")
    else:
        print("No new celebrations needed")
    
    # Get insights
    print("\n4. Getting engagement insights...")
    insights = dashboard.get_engagement_insights()
    for insight in insights:
        print(f"💡 {insight}")
    
    # Generate minimal dashboard (no charts to avoid matplotlib issues)
    print("\n5. Generating dashboard report...")
    result = dashboard.generate_full_dashboard(include_charts=False)
    
    # Show first part of dashboard
    dashboard_preview = result['dashboard'][:800]
    print("\n📊 DASHBOARD PREVIEW:")
    print("-" * 40)
    print(dashboard_preview + "...")
    
    print(f"\n✅ Dashboard test complete!")
    print(f"   • Users tracked: {len(dashboard.analytics.streak_data['users'])}")
    print(f"   • Celebrations needed: {len(result['celebrations'])}")
    print(f"   • Insights generated: {len(result['insights'])}")
    
    return result

if __name__ == "__main__":
    test_dashboard()