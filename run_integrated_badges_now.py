#!/usr/bin/env python3

import subprocess
import sys

print("🚀 Running Integrated Badge System Check...")
print("=" * 50)

try:
    result = subprocess.run([sys.executable, 'integrated_streaks_badge_celebration.py'], 
                          capture_output=True, text=True, cwd='.')
    
    print("STDOUT:")
    print(result.stdout)
    
    if result.stderr:
        print("STDERR:")
        print(result.stderr)
    
    print(f"Return code: {result.returncode}")
    
except Exception as e:
    print(f"Error running script: {e}")