import subprocess
import os

def stage_relevant_files():
    # Modified files
    try:
        modified = subprocess.check_output(['git', 'ls-files', '-m']).decode('utf-8').splitlines()
        # Untracked files (excluding standard ignored)
        untracked = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard']).decode('utf-8').splitlines()
        
        all_files = set(modified + untracked)
        
        # Filter out anything we definitely don't want (safety check)
        # But git should already handle this via .gitignore if we don't use --force
        # I'll just stage them one by one to ensure we don't hit a 'fatal' on one file
        for f in all_files:
            if 'node_modules' in f or '.gemini' in f or '.git' in f:
                continue
            print(f"Adding: {f}")
            subprocess.run(['git', 'add', f])
            
        print("Staging complete.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    stage_relevant_files()
