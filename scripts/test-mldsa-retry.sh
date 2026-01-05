#!/bin/bash
#
# Test ML-DSA (Dilithium) Rejection Sampling Behavior
#
# This script runs the ML-DSA benchmark to analyze the retry mechanism
# in Dilithium signature generation. It can be run:
#   1. Directly on a system with OpenSSL 3.5+ installed
#   2. Inside a Docker container built with this project
#
# Usage:
#   ./scripts/test-mldsa-retry.sh [openssl-version]
#
# Examples:
#   ./scripts/test-mldsa-retry.sh 3.5.3    # Build and test specific version
#   ./scripts/test-mldsa-retry.sh          # Use existing 3.5.3 image or build
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

VERSION="${1:-3.5.3}"
IMAGE_NAME="openssl-bench:${VERSION}"

echo "=============================================="
echo "ML-DSA (Dilithium) Rejection Sampling Test"
echo "=============================================="
echo ""
echo "This test analyzes timing variance in Dilithium"
echo "signature generation to surface the rejection"
echo "sampling retry mechanism."
echo ""
echo "Target Version: OpenSSL ${VERSION}"
echo "Test Duration:  90 seconds (for P99.9/P99.99)"
echo "=============================================="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not found."
    echo "Please install Docker or run this on a system with OpenSSL 3.5+."
    exit 1
fi

# Check if image exists, if not build it
if ! docker image inspect "$IMAGE_NAME" &> /dev/null; then
    echo "Building Docker image for OpenSSL ${VERSION}..."
    
    # Get URL from versions.json
    URL=$(jq -r ".versions[] | select(.version == \"${VERSION}\") | .url" "$PROJECT_ROOT/config/versions.json" 2>/dev/null || echo "")
    
    if [ -z "$URL" ]; then
        # Default URL pattern for OpenSSL 3.5+
        URL="https://github.com/openssl/openssl/releases/download/openssl-${VERSION}/openssl-${VERSION}.tar.gz"
    fi
    
    docker build \
        -t "$IMAGE_NAME" \
        --build-arg OPENSSL_VERSION="${VERSION}" \
        --build-arg OPENSSL_URL="${URL}" \
        -f "$PROJECT_ROOT/docker/Dockerfile" \
        "$PROJECT_ROOT"
    
    echo ""
fi

# Run the ML-DSA benchmark directly
echo "Running ML-DSA rejection sampling analysis..."
echo ""

# Check if mldsa_bench exists in the image
if docker run --rm "$IMAGE_NAME" ls -la ./mldsa_bench 2>/dev/null; then
    echo ""
    echo "========================================"
    echo "  ML-DSA BENCHMARK OUTPUT"
    echo "========================================"
    echo ""
    
    # Run the benchmark - stderr has the detailed analysis, stdout has parseable output
    docker run --rm "$IMAGE_NAME" ./mldsa_bench
    
    echo ""
    echo "========================================"
    echo "  TEST COMPLETE"
    echo "========================================"
    echo ""
    echo "Key metrics to look for:"
    echo "  - CV% (Coefficient of Variation): Higher = more retry variance"
    echo "  - P99.9/P99.99: Extreme tail latencies for SLA planning"
    echo "  - Outliers: Operations taking >2x the mean time"
    echo "  - Max/Min ratio: Large ratio = some signatures had many retries"
    echo ""
    echo "Expected behavior:"
    echo "  - Dilithium averages 4-7 internal retries per signature"
    echo "  - Some timing variance is normal and expected"
    echo "  - CV% > 20% may indicate problematic variance under load"
    echo "  - P99.99 latency reveals worst-case scenarios (1 in 10,000)"
    echo ""
else
    echo "Error: ML-DSA benchmark tool not found in image."
    echo "This test requires OpenSSL 3.5+ with ML-DSA support."
    echo ""
    echo "The image was built but mldsa_bench was not compiled."
    echo "This likely means the OpenSSL version (${VERSION}) does not"
    echo "support ML-DSA (requires OpenSSL 3.5.0 or later)."
    exit 1
fi

