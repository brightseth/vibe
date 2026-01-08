import subprocess
import sys

# Run the analytics update
result = subprocess.run([sys.executable, 'update_analytics_dashboard_jan8.py'], 
                       capture_output=True, text=True)

print("STDOUT:")
print(result.stdout)

if result.stderr:
    print("STDERR:")
    print(result.stderr)

print(f"Return code: {result.returncode}")