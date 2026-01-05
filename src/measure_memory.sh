#!/bin/bash
# Memory measurement helper for handshake tests
# Usage: ./measure_memory.sh <server_pid> <duration_seconds>
# Returns: Average RSS memory in KB during the monitoring period

# Don't use set -e as we want to handle errors gracefully

PID=$1
DURATION=${2:-10}
SAMPLES=20

# Check for bc command - use bash arithmetic if not available
if command -v bc &> /dev/null; then
    INTERVAL=$(echo "scale=2; $DURATION / $SAMPLES" | bc 2>/dev/null || echo "0.5")
else
    # Fallback: approximate interval using bash integer division
    INTERVAL=$(( DURATION / SAMPLES ))
    [ "$INTERVAL" -eq 0 ] && INTERVAL=1
fi

if [ -z "$PID" ]; then
    echo "0"
    exit 0
fi

# Check if process exists
if ! kill -0 $PID 2>/dev/null; then
    echo "0"
    exit 0
fi

# Check if /proc filesystem is available
if [ ! -d "/proc" ]; then
    echo "0"
    exit 0
fi

# Collect memory samples
TOTAL_RSS=0
COUNT=0

for i in $(seq 1 $SAMPLES); do
    # Get RSS in KB from /proc/<pid>/status
    if [ -f "/proc/$PID/status" ]; then
        RSS=$(grep "^VmRSS:" /proc/$PID/status 2>/dev/null | awk '{print $2}')
        if [ ! -z "$RSS" ] && [ "$RSS" -gt 0 ] 2>/dev/null; then
            TOTAL_RSS=$((TOTAL_RSS + RSS))
            COUNT=$((COUNT + 1))
        fi
    else
        # Process may have terminated
        break
    fi
    sleep $INTERVAL 2>/dev/null || sleep 1
done

# Calculate average
if [ $COUNT -gt 0 ]; then
    if command -v bc &> /dev/null; then
        AVG=$(echo "scale=0; $TOTAL_RSS / $COUNT" | bc 2>/dev/null)
    else
        # Fallback to bash integer division
        AVG=$((TOTAL_RSS / COUNT))
    fi
    echo "${AVG:-0}"
else
    echo "0"
fi
