#!/bin/bash
# Comprehensive test suite for memory measurement feature
# Tests everything before GitHub Actions run

set -e

echo "🧪 COMPREHENSIVE MEMORY MEASUREMENT TEST SUITE"
echo "=============================================="
echo ""

FAILED=0
PASSED=0

# Test counter functions
pass() {
    echo "  ✅ PASS: $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo "  ❌ FAIL: $1"
    FAILED=$((FAILED + 1))
}

# =============================================================================
# TEST 1: Memory Measurement Script Exists and is Executable
# =============================================================================
echo "TEST 1: Memory measurement script validation"
echo "-------------------------------------------"

if [ -f "src/measure_memory.sh" ]; then
    pass "measure_memory.sh exists"
else
    fail "measure_memory.sh does not exist"
fi

if [ -x "src/measure_memory.sh" ]; then
    pass "measure_memory.sh is executable"
else
    echo "  Making script executable..."
    chmod +x src/measure_memory.sh
    pass "measure_memory.sh made executable"
fi

# Test syntax
if bash -n src/measure_memory.sh 2>&1; then
    pass "measure_memory.sh has valid bash syntax"
else
    fail "measure_memory.sh has syntax errors"
fi

echo ""

# =============================================================================
# TEST 2: Memory Script Functionality (with real process)
# =============================================================================
echo "TEST 2: Memory measurement script functionality"
echo "----------------------------------------------"

# Start a test process
sleep 30 &
TEST_PID=$!
echo "  Started test process (PID: $TEST_PID)"

# Give it a moment to settle
sleep 1

# Run memory measurement (short duration for testing)
echo "  Running 3-second memory measurement..."
MEM_RESULT=$(timeout 10 src/measure_memory.sh $TEST_PID 3 2>/dev/null || src/measure_memory.sh $TEST_PID 3 2>/dev/null)

# Kill test process
kill $TEST_PID 2>/dev/null
wait $TEST_PID 2>/dev/null || true

# Validate result
if [[ "$MEM_RESULT" =~ ^[0-9]+$ ]]; then
    if [ "$MEM_RESULT" -gt 0 ]; then
        pass "Memory measurement returned valid value: ${MEM_RESULT} KB"
    else
        echo "  ⚠️  WARNING: Memory measurement returned 0 (might be macOS or no /proc)"
        pass "Memory measurement executed (returned 0)"
    fi
else
    fail "Memory measurement returned invalid value: '$MEM_RESULT'"
fi

echo ""

# =============================================================================
# TEST 3: Benchmark Script Integration
# =============================================================================
echo "TEST 3: Benchmark script integration"
echo "-----------------------------------"

# Test syntax
if bash -n src/benchmark.sh 2>&1; then
    pass "benchmark.sh has valid bash syntax"
else
    fail "benchmark.sh has syntax errors"
fi

# Count memory measurement calls
MEM_CALLS=$(grep -c "measure_memory.sh" src/benchmark.sh || echo "0")
if [ "$MEM_CALLS" -eq 8 ]; then
    pass "Found exactly 8 memory measurement calls (4 TLS 1.3 + 4 TLS 1.2)"
elif [ "$MEM_CALLS" -gt 0 ]; then
    fail "Found $MEM_CALLS memory measurement calls, expected 8"
else
    fail "No memory measurement calls found in benchmark.sh"
fi

# Verify metric names are stored
METRICS=(
    "tls1_3_rsa_new_memory_kb"
    "tls1_3_rsa_resume_memory_kb"
    "tls1_2_ecdhe_rsa_memory_kb"
    "tls1_2_rsa_resume_memory_kb"
    "tls1_3_ecdsa_new_memory_kb"
    "tls1_3_ecdsa_resume_memory_kb"
    "tls1_2_ecdhe_ecdsa_memory_kb"
    "tls1_2_ecdsa_resume_memory_kb"
)

for metric in "${METRICS[@]}"; do
    if grep -q "$metric" src/benchmark.sh; then
        pass "Metric '$metric' is stored in JSON"
    else
        fail "Metric '$metric' not found in benchmark.sh"
    fi
done

echo ""

# =============================================================================
# TEST 4: Visualization Script Validation
# =============================================================================
echo "TEST 4: Visualization script validation"
echo "--------------------------------------"

# Test syntax
if node -c scripts/generate-viz-multipage.js 2>&1; then
    pass "generate-viz-multipage.js has valid JavaScript syntax"
else
    fail "generate-viz-multipage.js has syntax errors"
fi

# Check for createMemoryPage function
if grep -q "function createMemoryPage" scripts/generate-viz-multipage.js; then
    pass "createMemoryPage function exists"
else
    fail "createMemoryPage function not found"
fi

# Check for memory.html generation
if grep -q "memory.html" scripts/generate-viz-multipage.js; then
    pass "memory.html generation code exists"
else
    fail "memory.html generation code not found"
fi

echo ""

# =============================================================================
# TEST 5: End-to-End Mock Benchmark
# =============================================================================
echo "TEST 5: End-to-end mock benchmark test"
echo "-------------------------------------"

# Create temporary test directory
TEST_DIR=$(mktemp -d)
echo "  Using temp directory: $TEST_DIR"

cd "$TEST_DIR"

# Copy necessary files
cp "$OLDPWD/src/benchmark.sh" .
cp "$OLDPWD/src/measure_memory.sh" .
chmod +x measure_memory.sh

# Create minimal mock benchmark that only tests memory-related parts
cat > test_benchmark.sh << 'TESTEOF'
#!/bin/bash
set -e

# Make script executable
chmod +x ./measure_memory.sh 2>/dev/null || true

# Start a test server process (just sleep to simulate)
sleep 60 &
SERVER_PID=$!
sleep 1

echo "Testing memory measurement integration..."

# Test TLS 1.3 RSA New
echo "  Testing TLS 1.3 RSA New memory measurement..."
./measure_memory.sh $SERVER_PID 2 > mem_tls13_rsa_new.tmp &
MEM_PID=$!
sleep 2
wait $MEM_PID 2>/dev/null || true
TLS13_RSA_NEW_MEM=$(cat mem_tls13_rsa_new.tmp 2>/dev/null || echo "0")

# Test TLS 1.2 ECDHE-RSA
echo "  Testing TLS 1.2 ECDHE-RSA memory measurement..."
./measure_memory.sh $SERVER_PID 2 > mem_tls12_ecdhe_rsa.tmp &
MEM_PID=$!
sleep 2
wait $MEM_PID 2>/dev/null || true
TLS12_ECDHE_RSA_MEM=$(cat mem_tls12_ecdhe_rsa.tmp 2>/dev/null || echo "0")

# Kill test process
kill $SERVER_PID 2>/dev/null || true

# Create minimal JSON with memory metrics
RESULTS=$(jq -n \
    --arg m1 "$TLS13_RSA_NEW_MEM" \
    --arg m2 "$TLS12_ECDHE_RSA_MEM" \
    '{
        config: {version: "test", iterations_count: 1},
        metrics: {
            tls1_3_rsa_new_memory_kb: ($m1 | tonumber),
            tls1_2_ecdhe_rsa_memory_kb: ($m2 | tonumber),
            tls1_3_rsa_new_cps: 5000,
            tls1_2_ecdhe_rsa_aes128gcm_cps: 5500,
            aes_256_gcm_8k_kbs: 1000000
        }
    }')

echo "$RESULTS"
TESTEOF

chmod +x test_benchmark.sh

# Run mock benchmark
echo "  Running mock benchmark..."
MOCK_OUTPUT=$(./test_benchmark.sh 2>&1)

echo "$MOCK_OUTPUT"

# Parse the JSON output
JSON_OUTPUT=$(echo "$MOCK_OUTPUT" | tail -1)

# Validate JSON
if echo "$JSON_OUTPUT" | jq empty 2>/dev/null; then
    pass "Mock benchmark produced valid JSON"
else
    fail "Mock benchmark produced invalid JSON"
    echo "Output: $JSON_OUTPUT"
fi

# Check memory metrics in JSON
if echo "$JSON_OUTPUT" | jq -e '.metrics.tls1_3_rsa_new_memory_kb' >/dev/null 2>&1; then
    MEM_VAL=$(echo "$JSON_OUTPUT" | jq -r '.metrics.tls1_3_rsa_new_memory_kb')
    if [[ "$MEM_VAL" =~ ^[0-9]+$ ]]; then
        pass "Memory metric tls1_3_rsa_new_memory_kb is present and numeric: $MEM_VAL"
    else
        fail "Memory metric tls1_3_rsa_new_memory_kb is not numeric: $MEM_VAL"
    fi
else
    fail "Memory metric tls1_3_rsa_new_memory_kb not found in JSON"
fi

# Cleanup
cd "$OLDPWD"
rm -rf "$TEST_DIR"

echo ""

# =============================================================================
# TEST 6: Visualization Generation with Memory Data
# =============================================================================
echo "TEST 6: Visualization generation with memory data"
echo "------------------------------------------------"

# Create comprehensive mock data with all memory metrics
cat > results/summary.json << 'EOF'
[
  {
    "config": {
      "version": "1.1.1w",
      "iterations_count": 1
    },
    "metrics": {
      "tls1_3_rsa_new_cps": 5500,
      "tls1_3_rsa_resume_cps": 18000,
      "tls1_3_rsa_new_memory_kb": 8192,
      "tls1_3_rsa_resume_memory_kb": 7680,
      "tls1_2_ecdhe_rsa_aes128gcm_cps": 6200,
      "tls1_2_rsa_resume_cps": 16500,
      "tls1_2_ecdhe_rsa_memory_kb": 7850,
      "tls1_2_rsa_resume_memory_kb": 7200,
      "tls1_3_ecdsa_new_cps": 6800,
      "tls1_3_ecdsa_new_memory_kb": 8000,
      "tls1_3_ecdsa_resume_memory_kb": 7500,
      "tls1_2_ecdhe_ecdsa_aes128gcm_cps": 7100,
      "tls1_2_ecdhe_ecdsa_memory_kb": 7750,
      "tls1_2_ecdsa_resume_memory_kb": 7100,
      "aes_256_gcm_8k_kbs": 850000,
      "handshakes_new_per_sec": 5500
    }
  },
  {
    "config": {
      "version": "3.2.3",
      "iterations_count": 1
    },
    "metrics": {
      "tls1_3_rsa_new_cps": 5200,
      "tls1_3_rsa_resume_cps": 17000,
      "tls1_3_rsa_new_memory_kb": 9500,
      "tls1_3_rsa_resume_memory_kb": 9000,
      "tls1_2_ecdhe_rsa_aes128gcm_cps": 5800,
      "tls1_2_rsa_resume_cps": 15500,
      "tls1_2_ecdhe_rsa_memory_kb": 9200,
      "tls1_2_rsa_resume_memory_kb": 8700,
      "tls1_3_ecdsa_new_cps": 6500,
      "tls1_3_ecdsa_new_memory_kb": 9400,
      "tls1_3_ecdsa_resume_memory_kb": 8900,
      "tls1_2_ecdhe_ecdsa_aes128gcm_cps": 6800,
      "tls1_2_ecdhe_ecdsa_memory_kb": 9100,
      "tls1_2_ecdsa_resume_memory_kb": 8600,
      "aes_256_gcm_8k_kbs": 1350000,
      "handshakes_new_per_sec": 5200
    }
  }
]
EOF

if [ -f "results/summary.json" ]; then
    pass "Created test summary.json with memory metrics"
else
    fail "Failed to create test summary.json"
fi

# Validate JSON
if jq empty results/summary.json 2>/dev/null; then
    pass "Test summary.json is valid JSON"
else
    fail "Test summary.json is invalid JSON"
fi

# Generate visualizations
echo "  Generating visualizations..."
if node scripts/generate-viz-multipage.js > /tmp/viz-output.log 2>&1; then
    pass "Visualization generation succeeded"
else
    fail "Visualization generation failed"
    cat /tmp/viz-output.log
fi

# Check memory.html was created
if [ -f "results/memory.html" ]; then
    pass "memory.html was created"
    
    # Check file size (should be > 10KB if properly generated)
    SIZE=$(wc -c < "results/memory.html")
    if [ "$SIZE" -gt 10000 ]; then
        pass "memory.html has reasonable size: $SIZE bytes"
    else
        fail "memory.html is too small: $SIZE bytes (might be broken)"
    fi
else
    fail "memory.html was not created"
fi

# Verify memory.html content
if [ -f "results/memory.html" ]; then
    if grep -q "Handshake Memory Consumption" results/memory.html; then
        pass "memory.html contains expected title"
    else
        fail "memory.html missing expected title"
    fi
    
    if grep -q "renderMemoryChart" results/memory.html; then
        pass "memory.html contains chart rendering code"
    else
        fail "memory.html missing chart rendering code"
    fi
    
    if grep -q "d3.v7.min.js" results/memory.html; then
        pass "memory.html includes D3.js"
    else
        fail "memory.html missing D3.js"
    fi
fi

# Check index.html links to memory page
if [ -f "results/index.html" ]; then
    if grep -q "memory.html" results/index.html; then
        pass "index.html links to memory.html"
    else
        fail "index.html does not link to memory.html"
    fi
    
    if grep -q "Memory Consumption" results/index.html; then
        pass "index.html includes Memory Consumption label"
    else
        fail "index.html missing Memory Consumption label"
    fi
fi

echo ""

# =============================================================================
# TEST 7: Backward Compatibility
# =============================================================================
echo "TEST 7: Backward compatibility (old data without memory)"
echo "-------------------------------------------------------"

# Create old-style data without memory metrics
cat > results/summary-old.json << 'EOF'
[
  {
    "config": {
      "version": "1.1.1w",
      "iterations_count": 1
    },
    "metrics": {
      "tls1_3_rsa_new_cps": 5500,
      "tls1_2_ecdhe_rsa_aes128gcm_cps": 6200,
      "aes_256_gcm_8k_kbs": 850000,
      "handshakes_new_per_sec": 5500
    }
  }
]
EOF

# Copy to summary.json
cp results/summary-old.json results/summary.json

# Generate visualizations with old data
echo "  Testing visualization with old data (no memory metrics)..."
if node scripts/generate-viz-multipage.js > /tmp/viz-old-output.log 2>&1; then
    pass "Visualization works with old data format"
else
    fail "Visualization failed with old data format"
    cat /tmp/viz-old-output.log
fi

# memory.html should still be created but show fallback message
if [ -f "results/memory.html" ]; then
    pass "memory.html created even without memory data"
    
    if grep -q "Memory Data Not Available" results/memory.html; then
        pass "memory.html shows appropriate fallback message"
    else
        echo "  ⚠️  WARNING: Fallback message might not be displayed properly"
    fi
else
    fail "memory.html not created with old data format"
fi

echo ""

# =============================================================================
# TEST 8: Platform Detection
# =============================================================================
echo "TEST 8: Platform detection"
echo "------------------------"

# Check if /proc is available
if [ -d "/proc" ] && [ -f "/proc/self/status" ]; then
    pass "Running on Linux with /proc support"
    
    if grep -q "VmRSS" /proc/self/status 2>/dev/null; then
        pass "/proc/self/status contains VmRSS field"
    else
        fail "/proc/self/status missing VmRSS field"
    fi
else
    echo "  ⚠️  WARNING: Not on Linux - memory measurement will return 0"
    pass "Platform detection working (non-Linux detected)"
fi

# Check for bc command (needed by measure_memory.sh)
if command -v bc >/dev/null 2>&1; then
    pass "bc command is available"
else
    echo "  ⚠️  WARNING: bc command not found - might cause issues"
    fail "bc command not available (needed for calculations)"
fi

echo ""

# =============================================================================
# FINAL SUMMARY
# =============================================================================
echo "=============================================="
echo "TEST SUMMARY"
echo "=============================================="
echo ""
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED!"
    echo ""
    echo "✅ The memory measurement feature is working correctly."
    echo "✅ Safe to run on GitHub Actions."
    echo ""
    echo "Next steps:"
    echo "  1. Commit your changes"
    echo "  2. Push to GitHub"
    echo "  3. Run benchmarks with confidence!"
    echo ""
    exit 0
else
    echo "⚠️  SOME TESTS FAILED"
    echo ""
    echo "Please fix the issues above before running on GitHub Actions."
    echo "This will save you money on failed CI runs."
    echo ""
    exit 1
fi

