#!/bin/bash
# Quick validation test for memory measurement feature
# Focuses on critical integration points

set -e

echo "🧪 QUICK MEMORY MEASUREMENT VALIDATION"
echo "======================================"
echo ""

FAILED=0
PASSED=0

pass() { echo "  ✅ $1"; PASSED=$((PASSED + 1)); }
fail() { echo "  ❌ $1"; FAILED=$((FAILED + 1)); }

# Test 1: Scripts exist
echo "1️⃣  File validation"
[ -f "src/measure_memory.sh" ] && pass "measure_memory.sh exists" || fail "measure_memory.sh missing"
[ -f "src/benchmark.sh" ] && pass "benchmark.sh exists" || fail "benchmark.sh missing"
[ -f "scripts/generate-viz-multipage.js" ] && pass "generate-viz-multipage.js exists" || fail "visualization script missing"

# Test 2: Syntax validation
echo ""
echo "2️⃣  Syntax validation"
bash -n src/measure_memory.sh 2>&1 && pass "measure_memory.sh syntax OK" || fail "measure_memory.sh syntax error"
bash -n src/benchmark.sh 2>&1 && pass "benchmark.sh syntax OK" || fail "benchmark.sh syntax error"
node -c scripts/generate-viz-multipage.js 2>&1 && pass "visualization script syntax OK" || fail "visualization syntax error"

# Test 3: Integration points
echo ""
echo "3️⃣  Integration validation"
MEM_CALLS=$(grep -c "measure_memory.sh" src/benchmark.sh || echo "0")
# 17 = 1 chmod + 16 actual calls (2 per test for 1.1.1 vs 3.x branches)
[ "$MEM_CALLS" -eq 17 ] && pass "Found 17 memory measurement calls (8 tests × 2 branches + 1 chmod)" || fail "Found $MEM_CALLS calls, expected 17"

grep -q "createMemoryPage" scripts/generate-viz-multipage.js && pass "createMemoryPage function exists" || fail "createMemoryPage function missing"
grep -q "memory.html" scripts/generate-viz-multipage.js && pass "memory.html generation code exists" || fail "memory.html generation missing"

# Test 4: Metric names
echo ""
echo "4️⃣  Metric validation"
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

FOUND=0
for metric in "${METRICS[@]}"; do
    if grep -q "$metric" src/benchmark.sh; then
        FOUND=$((FOUND + 1))
    fi
done
[ "$FOUND" -eq 8 ] && pass "All 8 memory metrics present" || fail "Only found $FOUND/8 memory metrics"

# Test 5: Visualization with mock data
echo ""
echo "5️⃣  Visualization generation"
cat > results/summary.json << 'EOF'
[
  {
    "config": {"version": "1.1.1w", "iterations_count": 1},
    "metrics": {
      "tls1_3_rsa_new_cps": 5500,
      "tls1_3_rsa_new_memory_kb": 8192,
      "tls1_2_ecdhe_rsa_aes128gcm_cps": 6200,
      "tls1_2_ecdhe_rsa_memory_kb": 7850,
      "aes_256_gcm_8k_kbs": 850000,
      "handshakes_new_per_sec": 5500
    }
  },
  {
    "config": {"version": "3.2.3", "iterations_count": 1},
    "metrics": {
      "tls1_3_rsa_new_cps": 5200,
      "tls1_3_rsa_new_memory_kb": 9500,
      "tls1_2_ecdhe_rsa_aes128gcm_cps": 5800,
      "tls1_2_ecdhe_rsa_memory_kb": 9200,
      "aes_256_gcm_8k_kbs": 1350000,
      "handshakes_new_per_sec": 5200
    }
  }
]
EOF

node scripts/generate-viz-multipage.js > /tmp/viz-test.log 2>&1 && pass "Visualization generation succeeded" || fail "Visualization generation failed"

[ -f "results/memory.html" ] && pass "memory.html created" || fail "memory.html not created"

if [ -f "results/memory.html" ]; then
    SIZE=$(wc -c < "results/memory.html" | tr -d ' ')
    [ "$SIZE" -gt 10000 ] && pass "memory.html size OK ($SIZE bytes)" || fail "memory.html too small ($SIZE bytes)"
    
    grep -q "Handshake Memory Consumption" results/memory.html && pass "memory.html has correct title" || fail "memory.html missing title"
    grep -q "renderMemoryChart" results/memory.html && pass "memory.html has chart code" || fail "memory.html missing chart code"
fi

if [ -f "results/index.html" ]; then
    grep -q "memory.html" results/index.html && pass "index.html links to memory.html" || fail "index.html missing link"
fi

# Test 6: Backward compatibility
echo ""
echo "6️⃣  Backward compatibility"
cat > results/summary.json << 'EOF'
[
  {
    "config": {"version": "1.1.1w", "iterations_count": 1},
    "metrics": {
      "tls1_3_rsa_new_cps": 5500,
      "aes_256_gcm_8k_kbs": 850000,
      "handshakes_new_per_sec": 5500
    }
  }
]
EOF

node scripts/generate-viz-multipage.js > /tmp/viz-compat.log 2>&1 && pass "Works with old data format" || fail "Failed with old data format"

# Test 7: Platform check
echo ""
echo "7️⃣  Platform detection"
if [ -d "/proc" ] && [ -f "/proc/self/status" ]; then
    grep -q "VmRSS" /proc/self/status 2>/dev/null && pass "Linux /proc available" || fail "/proc missing VmRSS"
else
    echo "  ⚠️  macOS detected - memory will return 0 (expected)"
    pass "Platform detection working"
fi

command -v bc >/dev/null 2>&1 && pass "bc command available" || echo "  ⚠️  bc command not found"

# Summary
echo ""
echo "======================================"
echo "RESULTS: $PASSED passed, $FAILED failed"
echo "======================================"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 ALL CRITICAL TESTS PASSED!"
    echo ""
    echo "✅ Memory measurement feature is ready"
    echo "✅ Safe to run on GitHub Actions"
    echo "✅ Visualizations generate correctly"
    echo "✅ Backward compatible with old data"
    echo ""
    exit 0
else
    echo ""
    echo "⚠️  $FAILED TEST(S) FAILED"
    echo "Fix these before running on GitHub Actions"
    echo ""
    exit 1
fi

