#!/usr/bin/env python3
"""
Run streak dashboard generation for current cycle
"""

import subprocess
import sys

def main():
    try:
        # Run the streak dashboard generator
        result = subprocess.run([sys.executable, 'streak_dashboard_generator.py'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Streak dashboard generated successfully!")
            print(result.stdout)
        else:
            print("❌ Error generating dashboard:")
            print(result.stderr)
            
    except Exception as e:
        print(f"❌ Exception running dashboard generator: {e}")

if __name__ == "__main__":
    main()