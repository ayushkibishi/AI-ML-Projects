import os
import sys
import subprocess
import shutil

def run_command(command, cwd=None):
    """
    Executes a shell command with real-time streaming output.
    """
    print(f"Running command: {' '.join(command)} in cwd: {cwd or '.'}")
    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            shell=True,
            text=True
        )
        # Stream stdout line-by-line
        for line in process.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
            
        process.wait()
        if process.returncode != 0:
            print(f"Command failed with exit code: {process.returncode}")
            return False
        return True
    except Exception as e:
        print(f"Failed to execute command {command}: {e}")
        return False

def setup_environment():
    print("=== Minecraft AI Agent Environment Setup ===")
    
    # 1. Create Required Directories
    base_dir = os.path.dirname(os.path.abspath(__file__))
    directories = [
        "datasets/weights",
        "datasets/minerl",
        "datasets/memory",
        "datasets/voice/cache",
        "backend/app/database",
        "minecraft/dist"
    ]
    for directory in directories:
        path = os.path.join(base_dir, directory)
        os.makedirs(path, exist_ok=True)
        print(f"Created folder: {path}")

    # 2. Check and copy Environment file (.env)
    env_path = os.path.join(base_dir, ".env")
    env_example_path = os.path.join(base_dir, ".env.example")
    if not os.path.exists(env_path):
        if os.path.exists(env_example_path):
            shutil.copyfile(env_example_path, env_path)
            print("Successfully initialized .env from .env.example template.")
        else:
            print("Warning: .env.example template not found. Please create .env manually.")
    else:
        print(".env configuration already exists. Skipping initialization.")

    # 3. Install Python Dependencies
    print("\n--- Installing Backend Python Requirements ---")
    python_exec = sys.executable
    requirements_path = os.path.join(base_dir, "backend", "requirements.txt")
    if os.path.exists(requirements_path):
        success = run_command([python_exec, "-m", "pip", "install", "-r", requirements_path])
        if not success:
            print("Warning: Some python packages failed to install. Check errors above.")
    else:
        print("Error: backend/requirements.txt not found.")

    # 4. Install Node Dependencies for Mineflayer Bot
    print("\n--- Installing Minecraft Bot Node Modules ---")
    minecraft_dir = os.path.join(base_dir, "minecraft")
    if os.path.exists(os.path.join(minecraft_dir, "package.json")):
        success = run_command(["npm", "install"], cwd=minecraft_dir)
        if not success:
            print("Warning: Failed to install node packages for minecraft bot client.")
    else:
        print("Error: minecraft/package.json not found.")

    # 5. Install Node Dependencies for Next.js Frontend
    print("\n--- Installing Frontend Next.js Node Modules ---")
    frontend_dir = os.path.join(base_dir, "frontend")
    if os.path.exists(os.path.join(frontend_dir, "package.json")):
        success = run_command(["npm", "install"], cwd=frontend_dir)
        if not success:
            print("Warning: Failed to install node packages for frontend dashboard.")
    else:
        print("Error: frontend/package.json not found.")

    # 6. Run Dataset and YOLO Weights Downloader
    print("\n--- Running Dataset and Model Weight Downloader ---")
    download_script = os.path.join(base_dir, "scripts", "download_datasets.py")
    if os.path.exists(download_script):
        run_command([python_exec, download_script])
    else:
        print("Error: scripts/download_datasets.py not found.")

    print("\n=======================================================")
    print("Setup Complete! Your Minecraft AI Agent environment is ready.")
    print("=======================================================")
    print("To run the project locally:")
    print("1. Set your GEMINI_API_KEY in the .env file.")
    print("2. Launch a local Minecraft Java server on port 25565 (offline/cracked mode).")
    print("3. Start the Backend server:")
    print("     cd backend && uvicorn app.main:app --reload --port 8000")
    print("4. Start the Minecraft bot:")
    print("     cd minecraft && npm run dev")
    print("5. Start the Frontend dashboard:")
    print("     cd frontend && npm run dev")
    print("6. Open http://localhost:3000 in your browser.")
    print("=======================================================\n")

if __name__ == "__main__":
    setup_environment()
