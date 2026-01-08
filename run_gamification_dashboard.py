#!/usr/bin/env python3
"""Run the gamification dashboard now"""

import subprocess
import sys
import os

def main():
    print("🎮 Running Gamification Status Dashboard...")
    
    # Make the file executable
    os.chmod("current_gamification_status.py", 0o755)
    
    # Run the dashboard
    result = subprocess.run([sys.executable, "current_gamification_status.py"], 
                          capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Errors:", result.stderr)
    
    return result.returncode == 0

if __name__ == "__main__":
    success = main()
    if success:
        print("\n✅ Dashboard executed successfully!")
    else:
        print("\n❌ Dashboard failed")