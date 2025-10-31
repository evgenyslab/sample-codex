#!/usr/bin/env python3
"""
Unified entry point for Sample Codex application.

This script provides a single entry point to run the application in different modes:
- Development: Runs backend and frontend dev servers concurrently
- Production: Serves the production build via the backend server
- Backend only: Runs just the backend server

Usage:
    python start.py              # Development mode (both servers)
    python start.py --prod       # Production mode (built frontend served by backend)
    python start.py --backend    # Backend only mode
    python start.py --frontend   # Frontend only mode (dev)
"""

import argparse
import os
import subprocess
import sys
import signal
import time
from pathlib import Path

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(message):
    """Print a formatted header message."""
    print(f"\n{Colors.BOLD}{Colors.OKCYAN}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.OKCYAN}{message:^60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.OKCYAN}{'='*60}{Colors.ENDC}\n")

def print_info(message):
    """Print an info message."""
    print(f"{Colors.OKBLUE}[INFO]{Colors.ENDC} {message}")

def print_success(message):
    """Print a success message."""
    print(f"{Colors.OKGREEN}[SUCCESS]{Colors.ENDC} {message}")

def print_error(message):
    """Print an error message."""
    print(f"{Colors.FAIL}[ERROR]{Colors.ENDC} {message}")

def print_warning(message):
    """Print a warning message."""
    print(f"{Colors.WARNING}[WARNING]{Colors.ENDC} {message}")

def check_dependencies():
    """Check if required dependencies are installed."""
    print_info("Checking dependencies...")

    # Check Python dependencies
    try:
        import fastapi
        import uvicorn
        print_success("Python dependencies found")
    except ImportError:
        print_warning("Python dependencies missing. Run: pip install -e backend/")
        return False

    # Check Node dependencies
    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        print_warning("Node dependencies missing. Run: npm install --prefix frontend")
        return False
    else:
        print_success("Node dependencies found")

    return True

def run_backend():
    """Run the backend server."""
    print_info("Starting backend server...")
    os.chdir(BACKEND_DIR)

    # Use the backend's run.py script
    process = subprocess.Popen(
        [sys.executable, "run.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Print backend output with prefix
    for line in iter(process.stdout.readline, ''):
        if line:
            print(f"{Colors.OKGREEN}[BACKEND]{Colors.ENDC} {line.rstrip()}")

    return process

def run_frontend():
    """Run the frontend dev server."""
    print_info("Starting frontend dev server...")
    os.chdir(FRONTEND_DIR)

    process = subprocess.Popen(
        ["npm", "run", "dev"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Print frontend output with prefix
    for line in iter(process.stdout.readline, ''):
        if line:
            print(f"{Colors.OKCYAN}[FRONTEND]{Colors.ENDC} {line.rstrip()}")

    return process

def build_frontend():
    """Build the frontend for production."""
    print_info("Building frontend for production...")
    os.chdir(FRONTEND_DIR)

    result = subprocess.run(
        ["npm", "run", "build"],
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        print_success("Frontend build completed successfully")
        return True
    else:
        print_error("Frontend build failed")
        print(result.stderr)
        return False

def run_dev_mode():
    """Run both backend and frontend in development mode."""
    print_header("Starting Sample Codex in DEVELOPMENT mode")

    if not check_dependencies():
        print_error("Please install dependencies first")
        sys.exit(1)

    processes = []

    try:
        # Start backend in a subprocess
        backend_process = subprocess.Popen(
            [sys.executable, str(BACKEND_DIR / "run.py")],
            cwd=str(BACKEND_DIR)
        )
        processes.append(("backend", backend_process))
        print_success("Backend server started (PID: {})".format(backend_process.pid))

        time.sleep(2)  # Give backend time to start

        # Start frontend in a subprocess
        frontend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=str(FRONTEND_DIR)
        )
        processes.append(("frontend", frontend_process))
        print_success("Frontend dev server started (PID: {})".format(frontend_process.pid))

        print_header("Both servers are running!")
        print_info("Backend: http://127.0.0.1:8000")
        print_info("Frontend: http://localhost:5173")
        print_info("\nPress Ctrl+C to stop both servers")

        # Wait for processes
        for name, process in processes:
            process.wait()

    except KeyboardInterrupt:
        print_info("\nShutting down servers...")
        for name, process in processes:
            print_info(f"Stopping {name}...")
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        print_success("All servers stopped")

    except Exception as e:
        print_error(f"Error: {e}")
        for name, process in processes:
            process.terminate()
        sys.exit(1)

def run_prod_mode():
    """Run in production mode (serve built frontend from backend)."""
    print_header("Starting Sample Codex in PRODUCTION mode")

    # Check if frontend is built
    dist_dir = FRONTEND_DIR / "dist"
    if not dist_dir.exists():
        print_warning("Frontend not built. Building now...")
        if not build_frontend():
            sys.exit(1)

    print_info("Starting backend server (serving frontend)...")

    try:
        os.chdir(BACKEND_DIR)
        subprocess.run([sys.executable, "run.py"])
    except KeyboardInterrupt:
        print_info("\nShutting down server...")
        print_success("Server stopped")

def run_backend_only():
    """Run backend server only."""
    print_header("Starting Backend Server Only")

    try:
        os.chdir(BACKEND_DIR)
        subprocess.run([sys.executable, "run.py"])
    except KeyboardInterrupt:
        print_info("\nShutting down backend...")
        print_success("Backend stopped")

def run_frontend_only():
    """Run frontend dev server only."""
    print_header("Starting Frontend Dev Server Only")

    try:
        os.chdir(FRONTEND_DIR)
        subprocess.run(["npm", "run", "dev"])
    except KeyboardInterrupt:
        print_info("\nShutting down frontend...")
        print_success("Frontend stopped")

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Sample Codex - Unified Application Launcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python start.py              Run in development mode (both servers)
  python start.py --prod       Run in production mode
  python start.py --backend    Run backend only
  python start.py --frontend   Run frontend only
  python start.py --build      Build frontend only
        """
    )

    parser.add_argument(
        "--prod",
        action="store_true",
        help="Run in production mode (serve built frontend)"
    )

    parser.add_argument(
        "--backend",
        action="store_true",
        help="Run backend server only"
    )

    parser.add_argument(
        "--frontend",
        action="store_true",
        help="Run frontend dev server only"
    )

    parser.add_argument(
        "--build",
        action="store_true",
        help="Build frontend for production"
    )

    args = parser.parse_args()

    # Validate mutually exclusive options
    mode_count = sum([args.prod, args.backend, args.frontend, args.build])
    if mode_count > 1:
        print_error("Only one mode can be specified at a time")
        parser.print_help()
        sys.exit(1)

    # Route to appropriate mode
    if args.build:
        print_header("Building Frontend")
        if build_frontend():
            sys.exit(0)
        else:
            sys.exit(1)
    elif args.prod:
        run_prod_mode()
    elif args.backend:
        run_backend_only()
    elif args.frontend:
        run_frontend_only()
    else:
        # Default to dev mode
        run_dev_mode()

if __name__ == "__main__":
    main()
