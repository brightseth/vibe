#!/usr/bin/env python3
"""
Generate fresh streak analytics dashboard data
"""

import subprocess
import sys

def main():
    try:
        # Run the dashboard generator
        result = subprocess.run([sys.executable, "streak_dashboard_generator.py"], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Dashboard data generated successfully!")
            print(result.stdout)
        else:
            print("❌ Error generating dashboard:")
            print(result.stderr)
            
    except Exception as e:
        print(f"❌ Exception running generator: {e}")

if __name__ == "__main__":
    main()