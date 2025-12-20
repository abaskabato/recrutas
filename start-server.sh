#!/bin/bash

# Robust Server Startup Script for Recrutas
# This script ensures the server starts reliably and logs all output

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/server.log"
ERROR_LOG="$LOG_DIR/server-error.log"
PID_FILE="$LOG_DIR/server.pid"
PORT=${PORT:-5000}

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to cleanup on exit
cleanup() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "[$(date +'%Y-%m-%d %H:%M:%S')] Stopping server (PID: $PID)..." | tee -a "$LOG_FILE"
            kill "$PID" 2>/dev/null || true
            sleep 2
            # Force kill if still running
            if ps -p "$PID" > /dev/null 2>&1; then
                kill -9 "$PID" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
}

# Trap signals for cleanup
trap cleanup EXIT INT TERM

# Check if server is already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Server already running with PID $OLD_PID" | tee -a "$LOG_FILE"
        echo "To stop it, run: kill $OLD_PID"
        exit 1
    else
        rm -f "$PID_FILE"
    fi
fi

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Port $PORT is already in use!" | tee -a "$LOG_FILE"
    echo "Killing process on port $PORT..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: .env file not found!" | tee -a "$ERROR_LOG"
    echo "Please create a .env file with required environment variables." | tee -a "$ERROR_LOG"
    exit 1
fi

# Check for required environment variables
source .env 2>/dev/null || true
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: DATABASE_URL or POSTGRES_URL not set in .env!" | tee -a "$ERROR_LOG"
    exit 1
fi

# Start the server
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting server on port $PORT..." | tee -a "$LOG_FILE"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Logs will be written to: $LOG_FILE" | tee -a "$LOG_FILE"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Errors will be written to: $ERROR_LOG" | tee -a "$LOG_FILE"
echo "----------------------------------------" | tee -a "$LOG_FILE"

# Start server with proper output redirection
# Using unbuffered output for real-time logs
NODE_ENV=${NODE_ENV:-development} \
tsx standalone-server.js \
    > >(tee -a "$LOG_FILE") \
    2> >(tee -a "$ERROR_LOG" >&2) &

SERVER_PID=$!

# Save PID
echo $SERVER_PID > "$PID_FILE"

# Wait a moment to see if server starts successfully
sleep 3

# Check if process is still running
if ! ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: Server process died immediately!" | tee -a "$ERROR_LOG"
    echo "Check the error log: $ERROR_LOG" | tee -a "$ERROR_LOG"
    rm -f "$PID_FILE"
    exit 1
fi

# Check if port is listening
if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: Server started but port $PORT is not listening yet..." | tee -a "$LOG_FILE"
    echo "Waiting up to 10 seconds for server to bind to port..." | tee -a "$LOG_FILE"
    
    for i in {1..10}; do
        sleep 1
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "[$(date +'%Y-%m-%d %H:%M:%S')] Server is now listening on port $PORT!" | tee -a "$LOG_FILE"
            break
        fi
        if ! ps -p $SERVER_PID > /dev/null 2>&1; then
            echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: Server process died while waiting!" | tee -a "$ERROR_LOG"
            echo "Check the error log: $ERROR_LOG" | tee -a "$ERROR_LOG"
            rm -f "$PID_FILE"
            exit 1
        fi
    done
fi

# Final check
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ Server is running successfully!" | tee -a "$LOG_FILE"
    echo "  PID: $SERVER_PID" | tee -a "$LOG_FILE"
    echo "  Port: $PORT" | tee -a "$LOG_FILE"
    echo "  Logs: $LOG_FILE" | tee -a "$LOG_FILE"
    echo "  Errors: $ERROR_LOG" | tee -a "$LOG_FILE"
    echo "  To stop: kill $SERVER_PID or run ./stop-server.sh" | tee -a "$LOG_FILE"
    echo ""
    echo "Server is ready at http://localhost:$PORT"
    echo "View logs in real-time: tail -f $LOG_FILE"
    echo "View errors: tail -f $ERROR_LOG"
else
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: Server failed to start on port $PORT!" | tee -a "$ERROR_LOG"
    echo "Check the error log: $ERROR_LOG" | tee -a "$ERROR_LOG"
    rm -f "$PID_FILE"
    exit 1
fi

# Keep script running to maintain the process
wait $SERVER_PID
