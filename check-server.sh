#!/bin/bash

# Check Server Status Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/logs/server.pid"
PORT=${PORT:-5000}

echo "=== Server Status Check ==="
echo ""

# Check PID file
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "✅ Server process is running (PID: $PID)"
    else
        echo "❌ Server PID file exists but process is not running"
        echo "   Cleaning up stale PID file..."
        rm -f "$PID_FILE"
    fi
else
    echo "❌ No server PID file found"
fi

# Check port
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    PORT_PID=$(lsof -ti:$PORT)
    echo "✅ Port $PORT is in use (PID: $PORT_PID)"
    
    # Check if it matches our PID
    if [ -f "$PID_FILE" ]; then
        EXPECTED_PID=$(cat "$PID_FILE")
        if [ "$PORT_PID" = "$EXPECTED_PID" ]; then
            echo "✅ Port PID matches server PID"
        else
            echo "⚠️  Port PID ($PORT_PID) does not match server PID ($EXPECTED_PID)"
        fi
    fi
else
    echo "❌ Port $PORT is not in use"
fi

# Check if server responds
echo ""
echo "Testing server response..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/health > /dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/health)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Server is responding (HTTP $HTTP_CODE)"
    else
        echo "⚠️  Server responded with HTTP $HTTP_CODE"
    fi
else
    echo "❌ Server is not responding to HTTP requests"
fi

# Show recent logs
echo ""
echo "=== Recent Logs (last 10 lines) ==="
if [ -f "$SCRIPT_DIR/logs/server.log" ]; then
    tail -10 "$SCRIPT_DIR/logs/server.log"
else
    echo "No log file found"
fi

echo ""
echo "=== Recent Errors (last 10 lines) ==="
if [ -f "$SCRIPT_DIR/logs/server-error.log" ]; then
    tail -10 "$SCRIPT_DIR/logs/server-error.log"
else
    echo "No error log file found"
fi
