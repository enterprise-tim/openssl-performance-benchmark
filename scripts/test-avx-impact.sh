#!/bin/bash

# =============================================================================
# Hardware Acceleration Impact Test Script
# =============================================================================
# This script tests the performance impact of hardware acceleration on OpenSSL
# operations, particularly ML-KEM (Kyber) post-quantum algorithms.
#
# On x86_64: Tests AVX/AVX2 (Advanced Vector Extensions)
# On aarch64: Tests NEON/Crypto extensions
#
# Usage:
#   ./test-avx-impact.sh [openssl-version]
#
# Example:
#   ./test-avx-impact.sh 3.5.4
#
# =============================================================================

set -e

# Configuration
OPENSSL_VERSION="${1:-3.5.4}"
WORK_DIR="/tmp/avx-impact-test"
ITERATIONS=3
TEST_DURATION=5
CPU_ARCH=$(uname -m)

echo "=============================================="
echo "Hardware Acceleration Impact Test"
echo "OpenSSL ${OPENSSL_VERSION}"
echo "=============================================="
echo ""

# Check CPU capabilities
echo "🔍 CPU Information"
echo "=============================================="
echo ""

# Get CPU model based on architecture
if [ -f /proc/cpuinfo ]; then
    if [ "$CPU_ARCH" = "x86_64" ]; then
        CPU_MODEL=$(grep -m1 "model name" /proc/cpuinfo | cut -d: -f2 | xargs || echo "Unknown x86_64 CPU")
        CPU_FLAGS=$(grep -m1 "^flags" /proc/cpuinfo | cut -d: -f2 || echo "")
        
        # Check for specific features
        HAS_AES=$(echo "$CPU_FLAGS" | grep -qw "aes" && echo "Yes" || echo "No")
        HAS_AVX=$(echo "$CPU_FLAGS" | grep -qw "avx" && echo "Yes" || echo "No")
        HAS_AVX2=$(echo "$CPU_FLAGS" | grep -qw "avx2" && echo "Yes" || echo "No")
        HAS_AVX512=$(echo "$CPU_FLAGS" | grep -q "avx512" && echo "Yes" || echo "No")
        HAS_SHA=$(echo "$CPU_FLAGS" | grep -qw "sha_ni" && echo "Yes" || echo "No")
        
        echo "Architecture:  ${CPU_ARCH}"
        echo "CPU Model:     ${CPU_MODEL}"
        echo ""
        echo "Hardware Acceleration Features:"
        echo "  AES-NI:      ${HAS_AES}"
        echo "  AVX:         ${HAS_AVX}"
        echo "  AVX2:        ${HAS_AVX2}"
        echo "  AVX-512:     ${HAS_AVX512}"
        echo "  SHA-NI:      ${HAS_SHA}"
        echo ""
        
        ACCEL_TYPE="AVX"
        CAP_ENV="OPENSSL_ia32cap"
        DISABLE_MASK="~0x200000200000000:~0x20"
        
        if [ "$HAS_AVX" = "No" ]; then
            echo "⚠️  WARNING: No AVX support detected on this CPU."
            echo "   Hardware acceleration comparison will show minimal difference."
            echo ""
        fi
        
    elif [ "$CPU_ARCH" = "aarch64" ]; then
        # ARM processor
        CPU_FLAGS=$(grep -m1 "^Features" /proc/cpuinfo | cut -d: -f2 || echo "")
        
        # Try to get model from lscpu
        if command -v lscpu >/dev/null 2>&1; then
            CPU_MODEL=$(lscpu | grep "Model name" | cut -d: -f2 | xargs || echo "ARM64 Processor")
        else
            CPU_MODEL="ARM64 Processor"
        fi
        
        # Check for ARM crypto features
        HAS_AES=$(echo "$CPU_FLAGS" | grep -qE "aes|pmull" && echo "Yes" || echo "No")
        HAS_SHA=$(echo "$CPU_FLAGS" | grep -qE "sha1|sha2|sha3" && echo "Yes" || echo "No")
        HAS_NEON=$(echo "$CPU_FLAGS" | grep -qE "asimd|neon" && echo "Yes" || echo "No")
        HAS_SVE=$(echo "$CPU_FLAGS" | grep -qw "sve" && echo "Yes" || echo "No")
        
        echo "Architecture:  ${CPU_ARCH}"
        echo "CPU Model:     ${CPU_MODEL}"
        echo ""
        echo "Hardware Acceleration Features (ARM):"
        echo "  NEON/ASIMD:  ${HAS_NEON}"
        echo "  AES:         ${HAS_AES}"
        echo "  SHA:         ${HAS_SHA}"
        echo "  SVE:         ${HAS_SVE}"
        echo ""
        
        ACCEL_TYPE="NEON/Crypto"
        CAP_ENV="OPENSSL_armcap"
        DISABLE_MASK="0"
    else
        echo "Architecture:  ${CPU_ARCH}"
        echo "CPU Model:     Unknown"
        echo ""
        echo "⚠️  Unknown architecture - hardware acceleration tests may not work"
        echo ""
        ACCEL_TYPE="Unknown"
        CAP_ENV=""
        DISABLE_MASK=""
    fi
else
    echo "Unable to detect CPU features (not on Linux)"
    CPU_MODEL="Unknown"
    ACCEL_TYPE="Unknown"
fi

# Get number of cores
CPU_CORES=$(nproc 2>/dev/null || echo "?")
echo "CPU Cores:     ${CPU_CORES}"
echo ""

# OPENSSL_ia32cap explanation:
# This environment variable controls which CPU capabilities OpenSSL uses.
# It's a 64-bit hexadecimal value (or two values separated by :).
# The leading ~ means "AND NOT" - it clears the specified bits.
#
# Key bits:
# - Bit 57 (0x200000000000000): AVX
# - Bit 60 (0x1000000000000000): AVX2  
# - The second word controls extended features
#
# OPENSSL_ia32cap=:~0x200000200 disables AVX and AVX2 in the extended word

# Common masks:
# Disable AVX only:     ~0x10000000000000000 (bit 60 in word 2)
# Disable AVX2:         Use :~0x20 in second word
# Disable both:         ~0x10000000000000000:~0x20

# Actually, after testing, the simplest way is:
# OPENSSL_ia32cap=0x80000000 - forces legacy mode (no AVX/AES-NI)
# For more surgical control, we use specific masks

echo "=============================================="
echo "Test Configuration"
echo "=============================================="
echo ""
echo "  OpenSSL Version: ${OPENSSL_VERSION}"
echo "  Test Duration: ${TEST_DURATION}s per test"
echo "  Iterations: ${ITERATIONS}"
echo ""

# Function to run OpenSSL speed test
run_speed_test() {
    local label="$1"
    local ia32cap="$2"
    local algo="$3"
    
    echo "  Testing ${label}..."
    
    local total=0
    for i in $(seq 1 $ITERATIONS); do
        local result
        if [ -n "$ia32cap" ]; then
            result=$(OPENSSL_ia32cap="$ia32cap" openssl speed -seconds $TEST_DURATION -evp "$algo" 2>&1 | grep -i "^${algo}" | awk '{print $6}' | sed 's/k$//')
        else
            result=$(openssl speed -seconds $TEST_DURATION -evp "$algo" 2>&1 | grep -i "^${algo}" | awk '{print $6}' | sed 's/k$//')
        fi
        
        if [ -n "$result" ] && [[ "$result" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
            total=$(echo "$total + $result" | bc)
        fi
    done
    
    if [ "$ITERATIONS" -gt 0 ]; then
        echo "scale=2; $total / $ITERATIONS" | bc
    else
        echo "0"
    fi
}

# Function to run ML-KEM benchmark
run_mlkem_test() {
    local label="$1"
    local ia32cap="$2"
    
    echo "  Testing ${label}..."
    
    # Check if mlkem_bench exists
    if [ ! -f "./mlkem_bench" ]; then
        echo "0"
        return
    fi
    
    local total=0
    for i in $(seq 1 $ITERATIONS); do
        local result
        if [ -n "$ia32cap" ]; then
            result=$(OPENSSL_ia32cap="$ia32cap" ./mlkem_bench 2>&1 | grep "ml-kem-768 average" | awk '{print $(NF-1)}')
        else
            result=$(./mlkem_bench 2>&1 | grep "ml-kem-768 average" | awk '{print $(NF-1)}')
        fi
        
        if [ -n "$result" ] && [[ "$result" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
            total=$(echo "$total + $result" | bc)
        fi
    done
    
    if [ "$ITERATIONS" -gt 0 ]; then
        echo "scale=2; $total / $ITERATIONS" | bc
    else
        echo "0"
    fi
}

# Results storage
declare -A RESULTS

echo "=============================================="
echo "Running AES-256-GCM Tests"
echo "=============================================="
echo ""

# AES with AVX enabled (default)
AES_AVX=$(run_speed_test "AES-256-GCM with AVX" "" "aes-256-gcm")
echo "    Result: ${AES_AVX} KB/s"

# AES with AVX disabled
# The ia32cap mask ~0x200000200000000 disables AVX bits
AES_NO_AVX=$(run_speed_test "AES-256-GCM without AVX" "~0x200000200000000:~0x20" "aes-256-gcm")
echo "    Result: ${AES_NO_AVX} KB/s"

echo ""

echo "=============================================="
echo "Running SHA-256 Tests"
echo "=============================================="
echo ""

# SHA256 with AVX enabled (default)
SHA_AVX=$(run_speed_test "SHA-256 with AVX" "" "sha256")
echo "    Result: ${SHA_AVX} KB/s"

# SHA256 with AVX disabled
SHA_NO_AVX=$(run_speed_test "SHA-256 without AVX" "~0x200000200000000:~0x20" "sha256")
echo "    Result: ${SHA_NO_AVX} KB/s"

echo ""

# ML-KEM tests (only for OpenSSL 3.5+)
echo "=============================================="
echo "Running ML-KEM-768 Tests (if available)"
echo "=============================================="
echo ""

# Check if ML-KEM is supported
if openssl list -public-key-algorithms 2>/dev/null | grep -i "ml-kem" >/dev/null || \
   openssl speed -help 2>&1 | grep -i "ml-kem" >/dev/null; then
    
    echo "ML-KEM support detected!"
    echo ""
    
    if [ -f "./mlkem_bench" ]; then
        # ML-KEM with AVX enabled (default)
        MLKEM_AVX=$(run_mlkem_test "ML-KEM-768 with AVX" "")
        echo "    Result: ${MLKEM_AVX} ops/s"
        
        # ML-KEM with AVX disabled
        MLKEM_NO_AVX=$(run_mlkem_test "ML-KEM-768 without AVX" "~0x200000200000000:~0x20")
        echo "    Result: ${MLKEM_NO_AVX} ops/s"
    else
        echo "⚠️  mlkem_bench tool not found. Skipping custom ML-KEM benchmark."
        MLKEM_AVX="0"
        MLKEM_NO_AVX="0"
    fi
else
    echo "ML-KEM not available in this OpenSSL version."
    MLKEM_AVX="0"
    MLKEM_NO_AVX="0"
fi

echo ""
echo "=============================================="
echo "Results Summary"
echo "=============================================="
echo ""

# Calculate differences
calc_diff() {
    local with_avx="$1"
    local without_avx="$2"
    
    if [ "$without_avx" != "0" ] && [ -n "$without_avx" ]; then
        echo "scale=1; (($with_avx - $without_avx) / $without_avx) * 100" | bc
    else
        echo "N/A"
    fi
}

printf "%-25s %15s %15s %12s\n" "Algorithm" "With AVX" "Without AVX" "Difference"
printf "%-25s %15s %15s %12s\n" "-------------------------" "---------------" "---------------" "------------"

AES_DIFF=$(calc_diff "$AES_AVX" "$AES_NO_AVX")
printf "%-25s %12s KB/s %12s KB/s %10s%%\n" "AES-256-GCM (8K)" "$AES_AVX" "$AES_NO_AVX" "$AES_DIFF"

SHA_DIFF=$(calc_diff "$SHA_AVX" "$SHA_NO_AVX")
printf "%-25s %12s KB/s %12s KB/s %10s%%\n" "SHA-256 (8K)" "$SHA_AVX" "$SHA_NO_AVX" "$SHA_DIFF"

if [ "$MLKEM_AVX" != "0" ]; then
    MLKEM_DIFF=$(calc_diff "$MLKEM_AVX" "$MLKEM_NO_AVX")
    printf "%-25s %11s ops/s %11s ops/s %10s%%\n" "ML-KEM-768" "$MLKEM_AVX" "$MLKEM_NO_AVX" "$MLKEM_DIFF"
fi

echo ""
echo "=============================================="
echo "Analysis"
echo "=============================================="
echo ""

if [ "$AES_DIFF" != "N/A" ]; then
    if (( $(echo "$AES_DIFF > 20" | bc -l) )); then
        echo "✓ AVX provides significant acceleration (>20%) for AES operations"
    elif (( $(echo "$AES_DIFF > 5" | bc -l) )); then
        echo "• AVX provides moderate acceleration (5-20%) for AES operations"
    else
        echo "• AVX provides minimal acceleration (<5%) for AES operations"
        echo "  (This may indicate AES-NI is the primary accelerator, not AVX)"
    fi
fi

if [ "$MLKEM_AVX" != "0" ] && [ "$MLKEM_DIFF" != "N/A" ]; then
    echo ""
    if (( $(echo "$MLKEM_DIFF > 50" | bc -l) )); then
        echo "✓ AVX provides MAJOR acceleration (>50%) for ML-KEM operations!"
        echo "  This is expected - ML-KEM heavily benefits from AVX2 vectorization"
    elif (( $(echo "$MLKEM_DIFF > 20" | bc -l) )); then
        echo "✓ AVX provides significant acceleration (20-50%) for ML-KEM"
    else
        echo "• AVX provides moderate/minimal acceleration for ML-KEM"
    fi
fi

echo ""
echo "=============================================="
echo "Test Complete"
echo "=============================================="
echo ""

# Output JSON results for integration with other tools
echo "JSON Results:"
cat << EOF
{
  "test": "avx-impact",
  "openssl_version": "${OPENSSL_VERSION}",
  "cpu": "${CPU_MODEL:-unknown}",
  "avx_capabilities": "${AVX_FLAGS:-none}",
  "results": {
    "aes_256_gcm_8k": {
      "with_avx_kbs": ${AES_AVX:-0},
      "without_avx_kbs": ${AES_NO_AVX:-0},
      "avx_improvement_percent": ${AES_DIFF:-0}
    },
    "sha256_8k": {
      "with_avx_kbs": ${SHA_AVX:-0},
      "without_avx_kbs": ${SHA_NO_AVX:-0},
      "avx_improvement_percent": ${SHA_DIFF:-0}
    },
    "ml_kem_768": {
      "with_avx_ops": ${MLKEM_AVX:-0},
      "without_avx_ops": ${MLKEM_NO_AVX:-0},
      "avx_improvement_percent": ${MLKEM_DIFF:-0}
    }
  }
}
EOF

