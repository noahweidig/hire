import subprocess
import time

def run():
    print("Running tests...")
    subprocess.run(["python3", "-m", "pytest", "tests/test_scroll_behavior.py", "-v"])

run()
