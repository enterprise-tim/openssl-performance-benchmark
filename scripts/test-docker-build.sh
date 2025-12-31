#!/bin/bash
set -e

# Docker Build & Smoke Test Script
# Tests that Docker containers can build and run basic benchmarks
# Run this BEFORE pushing to GitHub Actions to save CI minutes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/config/versions.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test mode: quick (default) or full
TEST_MODE="${1:-quick}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🐳 Docker Build & Smoke Test"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Parse versions from config
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Config file not found: $CONFIG_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Reading configuration...${NC}"
VERSIONS=$(jq -r '.versions[].version' "$CONFIG_FILE")
VERSION_COUNT=$(echo "$VERSIONS" | wc -l | tr -d ' ')
echo -e "${GREEN}✓ Found $VERSION_COUNT OpenSSL versions${NC}"
echo ""

# Function to test a single version
test_version() {
    local VERSION=$1
    local URL=$2
    local MODE=$3
    
    echo ""
    echo "─────────────────────────────────────────────────────────"
    echo -e "${BLUE}Testing OpenSSL $VERSION${NC}"
    echo "─────────────────────────────────────────────────────────"
    
    local IMAGE_TAG="openssl-bench-test:$VERSION"
    local BUILD_START=$(date +%s)
    
    # Step 1: Build Docker image
    echo -e "${YELLOW}⚙️  Building Docker image...${NC}"
    if docker build \
        -t "$IMAGE_TAG" \
        --build-arg OPENSSL_VERSION="$VERSION" \
        --build-arg OPENSSL_URL="$URL" \
        -f "$PROJECT_ROOT/docker/Dockerfile" \
        "$PROJECT_ROOT" > /tmp/docker-build-$VERSION.log 2>&1; then
        
        local BUILD_END=$(date +%s)
        local BUILD_TIME=$((BUILD_END - BUILD_START))
        echo -e "${GREEN}✓ Docker build successful (${BUILD_TIME}s)${NC}"
    else
        echo -e "${RED}❌ Docker build FAILED${NC}"
        echo "Build log:"
        tail -50 /tmp/docker-build-$VERSION.log
        return 1
    fi
    
    # Step 2: Run smoke test
    echo -e "${YELLOW}🧪 Running smoke test...${NC}"
    local TEST_START=$(date +%s)
    
    if [ "$MODE" = "quick" ]; then
        # Quick mode: Just verify OpenSSL works and basic commands
        if docker run --rm "$IMAGE_TAG" bash -c '
            set -e
            echo "Testing OpenSSL binary..."
            openssl version
            
            echo "Testing certificate generation..."
            openssl req -x509 -newkey rsa:2048 -keyout test_key.pem -out test_cert.pem \
                -days 1 -nodes -subj "/CN=test" 2>/dev/null
            
            echo "Testing speed command (1 second test)..."
            openssl speed -seconds 1 -evp aes-256-gcm 2>&1 | grep -i aes-256-gcm | head -1
            
            echo "✓ All smoke tests passed"
        ' > /tmp/docker-test-$VERSION.log 2>&1; then
            local TEST_END=$(date +%s)
            local TEST_TIME=$((TEST_END - TEST_START))
            echo -e "${GREEN}✓ Smoke test passed (${TEST_TIME}s)${NC}"
            
            # Show OpenSSL version from container
            OPENSSL_VER=$(docker run --rm "$IMAGE_TAG" openssl version)
            echo -e "${GREEN}  → $OPENSSL_VER${NC}"
        else
            echo -e "${RED}❌ Smoke test FAILED${NC}"
            echo "Test log:"
            cat /tmp/docker-test-$VERSION.log
            return 1
        fi
    else
        # Full mode: Run actual benchmark script (but shorter)
        echo -e "${BLUE}  Running full benchmark script (shortened)...${NC}"
        if docker run --rm "$IMAGE_TAG" > /tmp/docker-benchmark-$VERSION.json 2>&1; then
            local TEST_END=$(date +%s)
            local TEST_TIME=$((TEST_END - TEST_START))
            
            # Validate JSON output
            if jq -e . /tmp/docker-benchmark-$VERSION.json > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Benchmark completed and produced valid JSON (${TEST_TIME}s)${NC}"
                
                # Show sample metrics
                AES_VALUE=$(jq -r '.metrics.aes_256_gcm_8k_kbs' /tmp/docker-benchmark-$VERSION.json)
                HS_VALUE=$(jq -r '.metrics.handshakes_new_per_sec' /tmp/docker-benchmark-$VERSION.json)
                echo -e "${GREEN}  → AES-256-GCM: $(printf "%'d" $AES_VALUE) KB/s${NC}"
                echo -e "${GREEN}  → Handshakes: $(printf "%'d" $HS_VALUE) conn/sec${NC}"
            else
                echo -e "${RED}❌ Benchmark produced invalid JSON${NC}"
                head -20 /tmp/docker-benchmark-$VERSION.json
                return 1
            fi
        else
            echo -e "${RED}❌ Benchmark FAILED${NC}"
            tail -50 /tmp/docker-benchmark-$VERSION.json
            return 1
        fi
    fi
    
    # Step 3: Cleanup
    echo -e "${YELLOW}🧹 Cleaning up test image...${NC}"
    docker rmi "$IMAGE_TAG" > /dev/null 2>&1 || true
    
    local TOTAL_END=$(date +%s)
    local TOTAL_TIME=$((TOTAL_END - BUILD_START))
    echo -e "${GREEN}✅ $VERSION PASSED (total: ${TOTAL_TIME}s)${NC}"
    
    return 0
}

# Main test loop
FAILED_VERSIONS=()
PASSED_COUNT=0
TOTAL_START=$(date +%s)

echo -e "${BLUE}Test mode: $TEST_MODE${NC}"
if [ "$TEST_MODE" = "quick" ]; then
    echo "  • Smoke test only (fast)"
    echo "  • Use './scripts/test-docker-build.sh full' for complete validation"
else
    echo "  • Full benchmark test (slower, more thorough)"
fi
echo ""

# Option to test specific version
if [ -n "$2" ]; then
    TEST_VERSION="$2"
    echo -e "${BLUE}Testing specific version: $TEST_VERSION${NC}"
    
    URL=$(jq -r ".versions[] | select(.version == \"$TEST_VERSION\") | .url" "$CONFIG_FILE")
    if [ -z "$URL" ] || [ "$URL" = "null" ]; then
        echo -e "${RED}❌ Version $TEST_VERSION not found in config${NC}"
        exit 1
    fi
    
    if test_version "$TEST_VERSION" "$URL" "$TEST_MODE"; then
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ Test passed for $TEST_VERSION${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${RED}❌ Test failed for $TEST_VERSION${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
        exit 1
    fi
fi

# Test all versions
echo -e "${BLUE}Testing all $VERSION_COUNT versions...${NC}"
echo ""

while IFS= read -r VERSION; do
    URL=$(jq -r ".versions[] | select(.version == \"$VERSION\") | .url" "$CONFIG_FILE")
    
    if test_version "$VERSION" "$URL" "$TEST_MODE"; then
        PASSED_COUNT=$((PASSED_COUNT + 1))
    else
        FAILED_VERSIONS+=("$VERSION")
    fi
done <<< "$VERSIONS"

TOTAL_END=$(date +%s)
TOTAL_TIME=$((TOTAL_END - TOTAL_START))
TOTAL_MINUTES=$((TOTAL_TIME / 60))
TOTAL_SECONDS=$((TOTAL_TIME % 60))

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 Test Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "Passed: ${GREEN}$PASSED_COUNT${NC} / $VERSION_COUNT"
echo -e "Failed: ${RED}${#FAILED_VERSIONS[@]}${NC}"
echo ""
echo "Total time: ${TOTAL_MINUTES}m ${TOTAL_SECONDS}s"
echo ""

if [ ${#FAILED_VERSIONS[@]} -gt 0 ]; then
    echo -e "${RED}❌ FAILED VERSIONS:${NC}"
    for v in "${FAILED_VERSIONS[@]}"; do
        echo -e "${RED}  • $v${NC}"
        echo "    Log: /tmp/docker-build-$v.log"
    done
    echo ""
    echo -e "${RED}⚠️  DO NOT DEPLOY TO GITHUB ACTIONS${NC}"
    echo "Fix these issues before pushing to save CI minutes!"
    exit 1
else
    echo -e "${GREEN}✅ ALL VERSIONS PASSED${NC}"
    echo ""
    echo "Safe to deploy to GitHub Actions! 🚀"
    echo ""
    echo "Estimated CI cost if deployed:"
    echo "  • Versions: $VERSION_COUNT"
    echo "  • Iterations: $(jq -r '.iterations // 3' "$CONFIG_FILE")"
    echo "  • Total jobs: $((VERSION_COUNT * $(jq -r '.iterations // 3' "$CONFIG_FILE")))"
    echo "  • Est. CI minutes: ~$((VERSION_COUNT * $(jq -r '.iterations // 3' "$CONFIG_FILE") * 30))"
    echo ""
    exit 0
fi

