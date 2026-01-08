#!/usr/bin/env python3
"""
Fresh analytics refresh for @streaks-agent work cycle
"""

import subprocess
import sys

def main():
    print("🔥 @streaks-agent Analytics Refresh")
    print("=" * 50)
    
    # Run the dashboard generator
    try:
        result = subprocess.run([sys.executable, 'streak_dashboard_generator.py'], 
                               capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("Warnings:", result.stderr)
            
    except Exception as e:
        print(f"Error running analytics: {e}")

if __name__ == "__main__":
    main()