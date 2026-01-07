#!/usr/bin/env python3
"""
Quick Dashboard Runner
Generates enhanced streak analytics with one command
"""

import sys
import subprocess
import importlib.util
from pathlib import Path

def check_dependencies():
    """Check if required packages are installed"""
    required = ['matplotlib', 'seaborn', 'numpy']
    missing = []
    
    for package in required:
        spec = importlib.util.find_spec(package)
        if spec is None:
            missing.append(package)
    
    if missing:
        print(f"⚠️  Missing packages: {', '.join(missing)}")
        print("💡 Install with: pip install matplotlib seaborn numpy")
        return False
    return True

def run_dashboard():
    """Run the enhanced streak dashboard"""
    try:
        from enhanced_streak_dashboard import EnhancedStreakDashboard
        
        print("🚀 Starting Enhanced Streak Dashboard...")
        dashboard = EnhancedStreakDashboard()
        report = dashboard.create_comprehensive_report()
        
        print("\n✅ Dashboard generated successfully!")
        print(f"📈 Created {len(report.get('charts', []))} visualization(s)")
        print(f"🧠 Generated {len(report.get('insights', []))} actionable insight(s)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error running dashboard: {e}")
        return False

def main():
    """Main execution"""
    print("🔥 STREAK ANALYTICS DASHBOARD RUNNER")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Run dashboard
    if run_dashboard():
        print("\n🎉 Dashboard ready! Check generated PNG files for visualizations.")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()