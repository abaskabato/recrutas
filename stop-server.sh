#!/bin/bash

# Stop Server Script for Recrutas

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/logs/server.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No server PID file found. Server may not be running."
    exit 0
fi

PID=$(cat "$PID_FILE")

if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "Server process (PID: $PID) is not running."
    rm -f "$PID_FILE"
    exit 0
fi

echo "Stopping server (PID: $PID)..."
kill "$PID" 2>/dev/null || true

# Wait for graceful shutdown
for i in {1..5}; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo "Server stopped successfully."
        rm -f "$PID_FILE"
        exit 0
    fi
    sleep 1
done

# Force kill if still running
if ps -p "$PID" > /dev/null 2>&1; then
    echo "Force killing server..."
    kill -9 "$PID" 2>/dev/null || true
    sleep 1
fi

rm -f "$PID_FILE"
echo "Server stopped."
