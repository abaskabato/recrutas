#!/bin/bash
# Simple script to start the server in the background with logging

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create logs directory
mkdir -p logs

# Kill any existing server on port 5000
if command -v ss >/dev/null 2>&1; then
    PORT_PID=$(ss -tlnp | grep :5000 | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | head -1)
elif command -v netstat >/dev/null 2>&1; then
    PORT_PID=$(netstat -tlnp 2>/dev/null | grep :5000 | awk '{print $7}' | cut -d'/' -f1 | head -1)
fi

if [ ! -z "$PORT_PID" ] && [ "$PORT_PID" != "-" ]; then
    echo "Killing existing process on port 5000 (PID: $PORT_PID)"
    kill "$PORT_PID" 2>/dev/null || true
    sleep 1
fi

# Start the server
echo "Starting server in background..."
npx tsx standalone-server.js > logs/server.log 2>&1 &
SERVER_PID=$!

echo $SERVER_PID > logs/server.pid
echo "Server started with PID: $SERVER_PID"
echo "Logs: tail -f logs/server.log"
echo "PID file: logs/server.pid"
echo ""
echo "Waiting for server to start..."
sleep 5

# Check if server is still running
if ! ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "ERROR: Server process died. Check logs/server.log"
    exit 1
fi

# Check if port is listening
for i in {1..10}; do
    if command -v ss >/dev/null 2>&1; then
        if ss -tln | grep -q :5000; then
            echo "✅ Server is listening on port 5000"
            exit 0
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tln 2>/dev/null | grep -q :5000; then
            echo "✅ Server is listening on port 5000"
            exit 0
        fi
    else
        # Fallback: try to curl the server
        if curl -s http://localhost:5000/api/health >/dev/null 2>&1 || curl -s http://localhost:5000 >/dev/null 2>&1; then
            echo "✅ Server is responding on port 5000"
            exit 0
        fi
    fi
    sleep 1
done

echo "⚠️  Server started but may not be ready yet. Check logs/server.log"
echo "To view logs: tail -f logs/server.log"
echo "To stop: kill $SERVER_PID"
