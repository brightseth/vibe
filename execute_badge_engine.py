#!/usr/bin/env python3
"""
Execute the achievement badge engine right now
"""
import subprocess
import sys
import os

# Set up the environment
os.chdir('/Users/parker/Documents/vibe')

try:
    result = subprocess.run([sys.executable, 'achievement_badge_engine.py'], 
                          capture_output=True, text=True)
    print("STDOUT:", result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    print("Return code:", result.returncode)
except Exception as e:
    print(f"Error running badge engine: {e}")