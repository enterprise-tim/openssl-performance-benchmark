#!/bin/bash
# =============================================================================
# AVX Impact Benchmark - Measures performance with and without AVX
# =============================================================================
# This script is called from benchmark.sh to measure the impact of AVX
# on various cryptographic operations.
#
# On x86_64: Tests with/without AVX using OPENSSL_ia32cap
# On aarch64: Tests with/without hardware crypto using ARM-specific caps
#
# Output: JSON fragment with comparison metrics
# =============================================================================

CPU_ARCH=$(uname -m)

# Check if hardware acceleration is available on this system
check_hw_accel_support() {
    if [ ! -f /proc/cpuinfo ]; then
        return 1
    fi
    
    if [ "$CPU_ARCH" = "x86_64" ]; then
        # Check for AVX on x86
        if grep -qw "avx" /proc/cpuinfo; then
            return 0
        fi
    elif [ "$CPU_ARCH" = "aarch64" ]; then
        # Check for NEON/ASIMD on ARM (always present on ARMv8)
        if grep -qE "asimd|neon|aes" /proc/cpuinfo; then
            return 0
        fi
    fi
    
    return 1
}

# Get the appropriate mask to disable hardware acceleration
get_disable_mask() {
    if [ "$CPU_ARCH" = "x86_64" ]; then
        # OPENSSL_ia32cap mask to disable AVX/AVX2
        echo "~0x200000200000000:~0x20"
    elif [ "$CPU_ARCH" = "aarch64" ]; then
        # On ARM, OPENSSL_armcap can disable features
        # Setting to 0 disables hardware crypto
        echo "0"
    else
        echo ""
    fi
}

# Get the environment variable name for the platform
get_cap_env_var() {
    if [ "$CPU_ARCH" = "x86_64" ]; then
        echo "OPENSSL_ia32cap"
    elif [ "$CPU_ARCH" = "aarch64" ]; then
        echo "OPENSSL_armcap"
    else
        echo ""
    fi
}

# Run a speed test with optional hardware acceleration disabled
run_speed_test() {
    local algo="$1"
    local disable_hw="$2"  # "true" to disable hardware accel
    local col="${3:-6}"    # Default to column 6 (8K block size)
    
    local output
    local cap_var=$(get_cap_env_var)
    local disable_mask=$(get_disable_mask)
    
    if [ "$disable_hw" = "true" ] && [ -n "$cap_var" ] && [ -n "$disable_mask" ]; then
        output=$(eval "$cap_var=\"$disable_mask\" openssl speed -seconds 5 -evp \"$algo\" 2>&1")
    else
        output=$(openssl speed -seconds 5 -evp "$algo" 2>&1)
    fi
    
    local line
    line=$(echo "$output" | grep -i "^$algo")
    
    if [ -z "$line" ]; then
        echo "0"
        return
    fi
    
    local val
    val=$(echo "$line" | awk -v c=$col '{print $c}' | sed 's/k$//')
    
    # Validate it's a number
    if [[ "$val" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
        echo "$val"
    else
        echo "0"
    fi
}

# Run ML-KEM benchmark with optional hardware acceleration disabled
run_mlkem_test() {
    local disable_hw="$1"  # "true" to disable hardware accel
    
    if [ ! -f "./mlkem_bench" ]; then
        echo "0"
        return
    fi
    
    local output
    local cap_var=$(get_cap_env_var)
    local disable_mask=$(get_disable_mask)
    
    if [ "$disable_hw" = "true" ] && [ -n "$cap_var" ] && [ -n "$disable_mask" ]; then
        output=$(eval "$cap_var=\"$disable_mask\" ./mlkem_bench 2>&1")
    else
        output=$(./mlkem_bench 2>&1)
    fi
    
    local result
    result=$(echo "$output" | grep "ml-kem-768 average" | awk '{print $(NF-1)}')
    
    if [[ "$result" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
        echo "$result"
    else
        echo "0"
    fi
}

# Main function - outputs JSON fragment
main() {
    echo "Running hardware acceleration impact benchmarks..." >&2
    echo "  CPU Architecture: $CPU_ARCH" >&2
    
    # Check for hardware acceleration support first
    if ! check_hw_accel_support; then
        echo "Hardware acceleration not available on this CPU - skipping comparison" >&2
        cat << 'EOF'
{
    "hw_accel_available": false,
    "avx_available": false,
    "hw_accel_tests_skipped": true
}
EOF
        return
    fi
    
    local accel_type="AVX"
    if [ "$CPU_ARCH" = "aarch64" ]; then
        accel_type="NEON/Crypto"
    fi
    
    echo "$accel_type support detected - running comparison tests..." >&2
    
    # AES-256-GCM with hardware acceleration
    echo "  Testing AES-256-GCM with $accel_type..." >&2
    local aes_with_hw
    aes_with_hw=$(run_speed_test "aes-256-gcm" "false")
    
    # AES-256-GCM without hardware acceleration
    echo "  Testing AES-256-GCM without $accel_type..." >&2
    local aes_without_hw
    aes_without_hw=$(run_speed_test "aes-256-gcm" "true")
    
    # SHA256 with hardware acceleration
    echo "  Testing SHA256 with $accel_type..." >&2
    local sha_with_hw
    sha_with_hw=$(run_speed_test "sha256" "false")
    
    # SHA256 without hardware acceleration
    echo "  Testing SHA256 without $accel_type..." >&2
    local sha_without_hw
    sha_without_hw=$(run_speed_test "sha256" "true")
    
    # ML-KEM tests (if available)
    local mlkem_with_hw="0"
    local mlkem_without_hw="0"
    
    if [ -f "./mlkem_bench" ]; then
        echo "  Testing ML-KEM-768 with $accel_type..." >&2
        mlkem_with_hw=$(run_mlkem_test "false")
        
        echo "  Testing ML-KEM-768 without $accel_type..." >&2
        mlkem_without_hw=$(run_mlkem_test "true")
    fi
    
    # Calculate improvement percentages
    local aes_improvement="0"
    local sha_improvement="0"
    local mlkem_improvement="0"
    
    if [ "$aes_without_hw" != "0" ] && [ "$aes_without_hw" != "" ]; then
        aes_improvement=$(echo "scale=2; (($aes_with_hw - $aes_without_hw) / $aes_without_hw) * 100" | bc 2>/dev/null || echo "0")
    fi
    
    if [ "$sha_without_hw" != "0" ] && [ "$sha_without_hw" != "" ]; then
        sha_improvement=$(echo "scale=2; (($sha_with_hw - $sha_without_hw) / $sha_without_hw) * 100" | bc 2>/dev/null || echo "0")
    fi
    
    if [ "$mlkem_without_hw" != "0" ] && [ "$mlkem_without_hw" != "" ]; then
        mlkem_improvement=$(echo "scale=2; (($mlkem_with_hw - $mlkem_without_hw) / $mlkem_without_hw) * 100" | bc 2>/dev/null || echo "0")
    fi
    
    echo "  Hardware acceleration benchmarks complete." >&2
    
    # Determine if AVX is available (for x86) or equivalent (for ARM)
    local avx_available="false"
    if [ "$CPU_ARCH" = "x86_64" ]; then
        if grep -qw "avx" /proc/cpuinfo 2>/dev/null; then
            avx_available="true"
        fi
    elif [ "$CPU_ARCH" = "aarch64" ]; then
        # ARM always has NEON on ARMv8, report as equivalent
        avx_available="true"
    fi
    
    # Output JSON
    cat << EOF
{
    "cpu_architecture": "${CPU_ARCH}",
    "hw_accel_type": "${accel_type}",
    "hw_accel_available": true,
    "avx_available": ${avx_available},
    "aes_256_gcm_with_avx_kbs": ${aes_with_hw:-0},
    "aes_256_gcm_without_avx_kbs": ${aes_without_hw:-0},
    "aes_256_gcm_avx_improvement_percent": ${aes_improvement:-0},
    "sha256_with_avx_kbs": ${sha_with_hw:-0},
    "sha256_without_avx_kbs": ${sha_without_hw:-0},
    "sha256_avx_improvement_percent": ${sha_improvement:-0},
    "ml_kem_768_with_avx_ops": ${mlkem_with_hw:-0},
    "ml_kem_768_without_avx_ops": ${mlkem_without_hw:-0},
    "ml_kem_768_avx_improvement_percent": ${mlkem_improvement:-0}
}
EOF
}

main

