#!/bin/bash
# Memory measurement helper for handshake tests
# Usage: ./measure_memory.sh <server_pid> <duration_seconds>
# Returns: Average RSS memory in KB during the monitoring period

set -e

PID=$1
DURATION=${2:-10}
SAMPLES=20
INTERVAL=$(echo "scale=2; $DURATION / $SAMPLES" | bc)

if [ -z "$PID" ]; then
    echo "0"
    exit 0
fi

# Check if process exists
if ! kill -0 $PID 2>/dev/null; then
    echo "0"
    exit 0
fi

# Collect memory samples
TOTAL_RSS=0
COUNT=0

for i in $(seq 1 $SAMPLES); do
    # Get RSS in KB from /proc/<pid>/status
    if [ -f "/proc/$PID/status" ]; then
        RSS=$(grep "^VmRSS:" /proc/$PID/status | awk '{print $2}')
        if [ ! -z "$RSS" ] && [ "$RSS" -gt 0 ]; then
            TOTAL_RSS=$((TOTAL_RSS + RSS))
            COUNT=$((COUNT + 1))
        fi
    fi
    sleep $INTERVAL
done

# Calculate average
if [ $COUNT -gt 0 ]; then
    AVG=$(echo "scale=0; $TOTAL_RSS / $COUNT" | bc)
    echo "$AVG"
else
    echo "0"
fi

