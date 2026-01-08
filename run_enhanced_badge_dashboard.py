#!/usr/bin/env python3

import subprocess
import sys

if __name__ == "__main__":
    try:
        result = subprocess.run([sys.executable, "live_badge_dashboard_enhanced.py"], 
                              capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("Errors:", result.stderr)
    except Exception as e:
        print(f"Error running dashboard: {e}")