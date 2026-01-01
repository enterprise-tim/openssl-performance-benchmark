#!/bin/bash

# Disable set -e so we can handle errors manually and debug
# set -e

# =============================================================================
# Certificate Generation (Aligns with Bellingrath's RSA vs EC testing)
# =============================================================================
# 1. RSA-2048 Certificate (Industry Standard)
echo "Generating RSA-2048 certificate..." >&2
openssl req -x509 -newkey rsa:2048 -keyout rsa_key.pem -out rsa_cert.pem -days 1 -nodes -subj "/CN=localhost" >/dev/null 2>&1

# 2. ECDSA P-256 Certificate (For ECDHE-ECDSA cipher suites)
echo "Generating ECDSA P-256 certificate..." >&2
openssl ecparam -name prime256v1 -genkey -noout -out ec_key.pem 2>/dev/null
openssl req -x509 -new -key ec_key.pem -out ec_cert.pem -days 1 -nodes -subj "/CN=localhost" >/dev/null 2>&1

# Legacy symlinks for backward compatibility
cp rsa_key.pem key.pem
cp rsa_cert.pem cert.pem

# Output JSON structure builder
RESULTS="{}"
OPENSSL_VERSION_OUTPUT=$(openssl version)

# Detect OpenSSL version series for version-specific handling
IS_OPENSSL_1_1=$(echo "$OPENSSL_VERSION_OUTPUT" | grep -E "^OpenSSL\s+1\.1\." >/dev/null && echo "true" || echo "false")
IS_OPENSSL_3=$(echo "$OPENSSL_VERSION_OUTPUT" | grep -E "^OpenSSL\s+3\." >/dev/null && echo "true" || echo "false")

# =============================================================================
# CAPTURE METADATA (Compiler, OS, Container)
# =============================================================================
echo "Capturing environment metadata..." >&2
echo "DEBUG: Detected OpenSSL 1.1.x: $IS_OPENSSL_1_1" >&2
echo "DEBUG: Detected OpenSSL 3.x: $IS_OPENSSL_3" >&2

# OpenSSL Build Info
# Note: Flags might be multiline or contain quotes, so we clean them up
COMPILER_FLAGS=$(openssl version -f 2>/dev/null | sed 's/compiler: //g' | tr '\n' ' ' || echo "N/A")
PLATFORM=$(openssl version -p 2>/dev/null | sed 's/platform: //g' || echo "N/A")
OPENSSL_DIR=$(openssl version -d 2>/dev/null | sed 's/OPENSSLDIR: //g' | tr -d '"' || echo "N/A")

# OS / Container Info
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME="${NAME:-Debian}"
    OS_VERSION="${VERSION_ID:-Unknown}"
else
    OS_NAME="Linux"
    OS_VERSION="Unknown"
fi

KERNEL_VERSION=$(uname -sr)
CPU_MODEL=$(grep -m1 "model name" /proc/cpuinfo | cut -d: -f2 | xargs || echo "Unknown CPU")

# Initialize JSON with metadata
RESULTS=$(echo "$RESULTS" | jq -n \
    --arg v "$OPENSSL_VERSION_OUTPUT" \
    --arg cf "$COMPILER_FLAGS" \
    --arg pl "$PLATFORM" \
    --arg od "$OPENSSL_DIR" \
    --arg os "$OS_NAME $OS_VERSION" \
    --arg kv "$KERNEL_VERSION" \
    --arg cpu "$CPU_MODEL" \
    '{
        version: $v,
        metadata: {
            compiler_flags: $cf,
            platform: $pl,
            openssl_dir: $od,
            os_distribution: $os,
            kernel_version: $kv,
            cpu_model: $cpu,
            container: "Docker/Debian"
        },
        metrics: {}
    }')

echo "DEBUG: OpenSSL Version: $OPENSSL_VERSION_OUTPUT" >&2

# Helper function to parse speed output
# Usage: parse_speed <algo_name> <column_index_1k> <column_index_8k>
# Note: Column indexes in 'openssl speed -evp' are usually consistent across versions for the same block sizes?
# 16, 64, 256, 1024, 8192, 16384
# 1   2   3    4     5     6
parse_speed() {
    local algo=$1
    local col_1k=5
    local col_8k=6
    
    echo "Running $algo speed test..." >&2
    
    # Run speed test. capture output.
    # We use -seconds 10 for statistical stability
    local output
    output=$(openssl speed -seconds 10 -evp "$algo" 2>&1)
    
    # Find the line starting with the algo name (case insensitive)
    local line
    line=$(echo "$output" | grep -i "^$algo")
    
    if [ -z "$line" ]; then
        echo "WARNING: Could not find output line for $algo" >&2
        echo "Raw Output:" >&2
        echo "$output" >&2
        # Return 0s to avoid breaking JSON
        echo "0 0"
        return
    fi
    
    # Extract columns. We use awk. 
    # Remove 'k' suffix if present (OpenSSL 1.x uses k, 3.x usually bytes but let's be safe)
    local val_1k
    val_1k=$(echo "$line" | awk -v c=$col_1k '{print $c}' | sed 's/k$//')
    local val_8k
    val_8k=$(echo "$line" | awk -v c=$col_8k '{print $c}' | sed 's/k$//')
    
    echo "$val_1k $val_8k"
}

# --- AES-256-GCM ---
# Columns in 'openssl speed -evp aes-256-gcm':
# type             16 bytes     64 bytes    256 bytes   1024 bytes   8192 bytes  16384 bytes
# aes-256-gcm      ...
# $1               $2           $3          $4          $5           $6          $7
# So 1024 is $5, 8192 is $6.
read AES_1K AES_8K <<< $(parse_speed "aes-256-gcm")

RESULTS=$(echo "$RESULTS" | jq --arg v "${AES_1K:-0}" '.metrics.aes_256_gcm_1k_kbs = ($v | tonumber)')
RESULTS=$(echo "$RESULTS" | jq --arg v "${AES_8K:-0}" '.metrics.aes_256_gcm_8k_kbs = ($v | tonumber)')

# --- SHA256 ---
# Columns:
# sha256           ...
# Same layout usually?
read SHA_1K SHA_8K <<< $(parse_speed "sha256")

RESULTS=$(echo "$RESULTS" | jq --arg v "${SHA_1K:-0}" '.metrics.sha256_1k_kbs = ($v | tonumber)')
RESULTS=$(echo "$RESULTS" | jq --arg v "${SHA_8K:-0}" '.metrics.sha256_8k_kbs = ($v | tonumber)')

# --- Multi-threaded Throughput (AES-256-GCM) ---
echo "Running Multi-threaded AES-256-GCM speed test..." >&2
# Detect cores (default to 4 if detection fails)
CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
# Run speed test with -multi
# Removing 2>/dev/null to capture potential errors in logs
MULTI_OUT=$(openssl speed -seconds 10 -multi $CORES -evp aes-256-gcm 2>&1)

# Parse output. The format for -multi usually looks like:
# evp             486665.51k  1298888.79k ...
# It sums the throughput.
# We look for the line starting with 'evp' (since -evp was used) or the algorithm name depending on version.
# OpenSSL 3.x with -multi often prints 'evp' at the start of the line.
# UPDATED: grep -E "^\s*(evp|aes-256-gcm)" to handle potential leading whitespace
MULTI_LINE=$(echo "$MULTI_OUT" | grep -i -E "^\s*(evp|aes-256-gcm)" | tail -1)

# Extract 1K and 8K columns (same indices as single thread: 5 and 6)
if [ ! -z "$MULTI_LINE" ]; then
    MULTI_1K=$(echo "$MULTI_LINE" | awk '{print $5}' | sed 's/k$//')
    MULTI_8K=$(echo "$MULTI_LINE" | awk '{print $6}' | sed 's/k$//')
    RESULTS=$(echo "$RESULTS" | jq --arg v "${MULTI_1K:-0}" '.metrics.aes_256_gcm_multi_1k_kbs = ($v | tonumber)')
    RESULTS=$(echo "$RESULTS" | jq --arg v "${MULTI_8K:-0}" '.metrics.aes_256_gcm_multi_8k_kbs = ($v | tonumber)')
    RESULTS=$(echo "$RESULTS" | jq --arg v "${CORES}" '.config.cores_used = ($v | tonumber)')
else
    echo "WARNING: Could not parse multi-threaded output." >&2
    echo "Raw Output Start:" >&2
    echo "$MULTI_OUT" | head -n 10 >&2
    echo "Raw Output End:" >&2
    echo "$MULTI_OUT" | tail -n 5 >&2
    RESULTS=$(echo "$RESULTS" | jq '.metrics.aes_256_gcm_multi_1k_kbs = 0 | .metrics.aes_256_gcm_multi_8k_kbs = 0')
fi

# =============================================================================
# SCHMATZ ALGORITHM BENCHMARKS
# =============================================================================
# Reference: https://www.youtube.com/watch?v=69gUVhOEaVM
# Tests: RSA key sizes, ECDSA curves, ECDH, Sign vs Verify
# =============================================================================

echo "" >&2
echo "========================================" >&2
echo "SCHMATZ ALGORITHM TESTS" >&2
echo "========================================" >&2

# Helper function to parse asymmetric speed output (sign/s and verify/s)
# OpenSSL speed output for RSA/ECDSA:
#                   sign    verify    sign/s verify/s
# rsa 2048 bits 0.000123s 0.000004s   8118.2 246345.6
parse_asymmetric() {
    local algo=$1
    local output=$2
    
    # Find line matching the algorithm
    # We grep -v "^Doing" to avoid matching the status lines like "Doing 256 bits..."
    # We use tail -1 to get the last match (usually the summary table)
    # UPDATED: grep -E to handle potential leading whitespace and ensure we match the right line
    # For RSA, input is "rsa 2048", output line starts with "rsa  2048" (note spaces)
    # So we should be flexible with spaces.
    local line
    
    # Try flexible whitespace matching
    # Normalize spaces in algo input for grep regex
    local algo_regex
    algo_regex=$(echo "$algo" | sed 's/ /\\s\+/g')
    
    line=$(echo "$output" | grep -E "^\s*$algo_regex" | grep -v "^Doing" | tail -1)
    
    if [ -z "$line" ]; then
        # Try a broader search if specific match failed (sometimes version changes header format)
        # e.g. OpenSSL 3.x summary might just say "rsa2048" without spaces?
        # Let's log warning and return 0
        echo "WARNING: Could not find output line for '$algo' using regex '^\s*$algo_regex'" >&2
        echo "Raw Output Start:" >&2
        echo "$output" | head -n 5 >&2
        echo "Raw Output End:" >&2
        echo "$output" | tail -n 5 >&2
        echo "0 0"
        return
    fi
    
    # Extract sign/s and verify/s
    # OpenSSL 3.2+ format: algo bits time1 time2 time3 time4 sign/s verify/s encr./s decr./s
    # We need fields 6 and 7 (sign/s and verify/s), NOT the last two fields
    # which are encr./s and decr./s in newer versions
    local sign_rate verify_rate
    sign_rate=$(echo "$line" | awk '{print $6}')
    verify_rate=$(echo "$line" | awk '{print $7}')

    # Validate that these are numbers (handling +k suffix if present, though rare for ops/s)
    # If they are not numbers (e.g. "in"), return 0
    if ! [[ "$sign_rate" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
         sign_rate=0
    fi
    if ! [[ "$verify_rate" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
         verify_rate=0
    fi
    
    echo "${sign_rate:-0} ${verify_rate:-0}"
}

# --- RSA Key Size Comparison (Schmatz emphasis) ---
echo "RSA-2048 Sign/Verify..." >&2
RSA_OUT=$(openssl speed -seconds 5 rsa2048 2>&1)
read RSA2048_SIGN RSA2048_VERIFY <<< $(parse_asymmetric "rsa 2048" "$RSA_OUT")
RESULTS=$(echo "$RESULTS" | jq --arg v "${RSA2048_SIGN:-0}" '.metrics.rsa_2048_sign_per_sec = ($v | tonumber)')
RESULTS=$(echo "$RESULTS" | jq --arg v "${RSA2048_VERIFY:-0}" '.metrics.rsa_2048_verify_per_sec = ($v | tonumber)')

echo "RSA-3072 Sign/Verify..." >&2
RSA_OUT=$(openssl speed -seconds 5 rsa3072 2>&1)
read RSA3072_SIGN RSA3072_VERIFY <<< $(parse_asymmetric "rsa 3072" "$RSA_OUT")
RESULTS=$(echo "$RESULTS" | jq --arg v "${RSA3072_SIGN:-0}" '.metrics.rsa_3072_sign_per_sec = ($v | tonumber)')
RESULTS=$(echo "$RESULTS" | jq --arg v "${RSA3072_VERIFY:-0}" '.metrics.rsa_3072_verify_per_sec = ($v | tonumber)')

echo "RSA-4096 Sign/Verify..." >&2
RSA_OUT=$(openssl speed -seconds 5 rsa4096 2>&1)
read RSA4096_SIGN RSA4096_VERIFY <<< $(parse_asymmetric "rsa 4096" "$RSA_OUT")
RESULTS=$(echo "$RESULTS" | jq --arg v "${RSA4096_SIGN:-0}" '.metrics.rsa_4096_sign_per_sec = ($v | tonumber)')
RESULTS=$(echo "$RESULTS" | jq --arg v "${RSA4096_VERIFY:-0}" '.metrics.rsa_4096_verify_per_sec = ($v | tonumber)')

# --- ECDSA Curve Comparison (Schmatz emphasis) ---
echo "ECDSA P-256 Sign/Verify..." >&2
ECDSA_OUT=$(openssl speed -seconds 5 ecdsap256 2>&1)
read ECDSA256_SIGN ECDSA256_VERIFY <<< $(parse_asymmetric "256" "$ECDSA_OUT")
RESULTS=$(echo "$RESULTS" | jq --arg v "${ECDSA256_SIGN:-0}" '.metrics.ecdsa_p256_sign_per_sec = ($v | tonumber)')
RESULTS=$(echo "$RESULTS" | jq --arg v "${ECDSA256_VERIFY:-0}" '.metrics.ecdsa_p256_verify_per_sec = ($v | tonumber)')

echo "ECDSA P-384 Sign/Verify..." >&2
ECDSA_OUT=$(openssl speed -seconds 5 ecdsap384 2>&1)
read ECDSA384_SIGN ECDSA384_VERIFY <<< $(parse_asymmetric "384" "$ECDSA_OUT")
RESULTS=$(echo "$RESULTS" | jq --arg v "${ECDSA384_SIGN:-0}" '.metrics.ecdsa_p384_sign_per_sec = ($v | tonumber)')
RESULTS=$(echo "$RESULTS" | jq --arg v "${ECDSA384_VERIFY:-0}" '.metrics.ecdsa_p384_verify_per_sec = ($v | tonumber)')

echo "ECDSA P-521 Sign/Verify..." >&2
ECDSA_OUT=$(openssl speed -seconds 5 ecdsap521 2>&1)
read ECDSA521_SIGN ECDSA521_VERIFY <<< $(parse_asymmetric "521" "$ECDSA_OUT")
RESULTS=$(echo "$RESULTS" | jq --arg v "${ECDSA521_SIGN:-0}" '.metrics.ecdsa_p521_sign_per_sec = ($v | tonumber)')
RESULTS=$(echo "$RESULTS" | jq --arg v "${ECDSA521_VERIFY:-0}" '.metrics.ecdsa_p521_verify_per_sec = ($v | tonumber)')

# Helper function to parse ECDH output
parse_ecdh() {
    local term=$1
    local output=$2
    
    # 1. Filter out "Doing" lines (status)
    # 2. Find lines containing the search term (e.g. "256")
    # 3. Take the last line (the summary)
    # 4. Extract the last column (ops/sec)
    local val
    val=$(echo "$output" | grep -v "^Doing" | grep -i "$term" | tail -1 | awk '{print $NF}')
    
    # Verify it is a valid number
    if ! [[ "$val" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
         val=0
    fi
    echo "${val:-0}"
}

# --- ECDH Performance (Key Exchange) ---
echo "ECDH P-256 Key Exchange..." >&2
ECDH_OUT=$(openssl speed -seconds 5 ecdhp256 2>&1)
ECDH256_OPS=$(parse_ecdh "256" "$ECDH_OUT")
RESULTS=$(echo "$RESULTS" | jq --arg v "$ECDH256_OPS" '.metrics.ecdh_p256_per_sec = ($v | tonumber)')

echo "ECDH P-384 Key Exchange..." >&2
ECDH_OUT=$(openssl speed -seconds 5 ecdhp384 2>&1)
ECDH384_OPS=$(parse_ecdh "384" "$ECDH_OUT")
RESULTS=$(echo "$RESULTS" | jq --arg v "$ECDH384_OPS" '.metrics.ecdh_p384_per_sec = ($v | tonumber)')

echo "ECDH P-521 Key Exchange..." >&2
ECDH_OUT=$(openssl speed -seconds 5 ecdhp521 2>&1)
ECDH521_OPS=$(parse_ecdh "521" "$ECDH_OUT")
RESULTS=$(echo "$RESULTS" | jq --arg v "$ECDH521_OPS" '.metrics.ecdh_p521_per_sec = ($v | tonumber)')

# --- Block Size Sensitivity (AES at different sizes) ---
echo "AES-256-GCM Block Size Sensitivity..." >&2
AES_OUT=$(openssl speed -seconds 5 -evp aes-256-gcm 2>&1)
AES_LINE=$(echo "$AES_OUT" | grep -i "^aes-256-gcm")
if [ ! -z "$AES_LINE" ]; then
    # Columns: algo, 16B, 64B, 256B, 1024B, 8192B, 16384B
    AES_16B=$(echo "$AES_LINE" | awk '{print $2}' | sed 's/k$//')
    AES_64B=$(echo "$AES_LINE" | awk '{print $3}' | sed 's/k$//')
    AES_256B=$(echo "$AES_LINE" | awk '{print $4}' | sed 's/k$//')
    RESULTS=$(echo "$RESULTS" | jq --arg v "${AES_16B:-0}" '.metrics.aes_256_gcm_16b_kbs = ($v | tonumber)')
    RESULTS=$(echo "$RESULTS" | jq --arg v "${AES_64B:-0}" '.metrics.aes_256_gcm_64b_kbs = ($v | tonumber)')
    RESULTS=$(echo "$RESULTS" | jq --arg v "${AES_256B:-0}" '.metrics.aes_256_gcm_256b_kbs = ($v | tonumber)')
fi

echo "Schmatz algorithm tests complete." >&2

# --- PQC Tests (OpenSSL 3.5+) ---
# Try to detect if ML-KEM is available
# We check with 'list -public-key-algorithms' OR 'list -kem-algorithms' (if 3.x introduced it)
# We also just try to run the speed command on ml-kem-768 to be sure.
echo "Checking for PQC (ML-KEM) support..." >&2

# Enable detailed debug output for PQC detection
echo "DEBUG: OpenSSL Version: $OPENSSL_VERSION_OUTPUT" >&2
echo "DEBUG: Available public key algorithms:" >&2
openssl list -public-key-algorithms 2>/dev/null | grep -i "kem" >&2 || echo "  (No KEM algorithms found)" >&2

IS_PQC=false
if openssl list -public-key-algorithms 2>/dev/null | grep -i "ml-kem" >/dev/null; then
    IS_PQC=true
    echo "DEBUG: ML-KEM found via 'list -public-key-algorithms'" >&2
elif openssl speed -help 2>&1 | grep -i "ml-kem" >/dev/null; then
    IS_PQC=true
    echo "DEBUG: ML-KEM found via 'speed -help'" >&2
else
    # Try direct test - OpenSSL 3.5+ might support it even if not listed
    echo "DEBUG: Attempting direct ML-KEM-768 test..." >&2
    if openssl speed -seconds 1 ml-kem-768 2>&1 | grep -i "ml-kem-768" >/dev/null; then
        IS_PQC=true
        echo "DEBUG: ML-KEM-768 works directly!" >&2
    fi
fi

if [ "$IS_PQC" = true ]; then
    echo "PQC detected. Running ML-KEM-768 custom benchmark..." >&2
    
    # Check if our custom benchmark tool exists
    if [ -f "./mlkem_bench" ]; then
        echo "  Using custom ML-KEM benchmark tool" >&2
        PQC_OUT=$(./mlkem_bench 2>&1)
        
        echo "DEBUG PQC OUT:" >&2
        echo "$PQC_OUT" >&2
        
        # Parse output: "ml-kem-768 average: 1234.5 ops/sec"
        PQC_LINE=$(echo "$PQC_OUT" | grep "ml-kem-768 average" | tail -1)
        
        if [ ! -z "$PQC_LINE" ]; then
            # Extract the ops/sec value (second to last field)
            PQC_OPS=$(echo "$PQC_LINE" | awk '{print $(NF-1)}')
            
            # Validate it's a number
            if [[ "$PQC_OPS" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
                RESULTS=$(echo "$RESULTS" | jq --arg v "${PQC_OPS}" '.metrics.ml_kem_768_ops_sec = ($v | tonumber)')
                echo "  ✓ Captured ML-KEM-768: $PQC_OPS ops/sec" >&2
            else
                echo "WARNING: Could not extract numeric value from: $PQC_OPS" >&2
                RESULTS=$(echo "$RESULTS" | jq '.metrics.ml_kem_768_ops_sec = 0')
            fi
        else
            echo "WARNING: Could not parse ML-KEM benchmark output." >&2
            echo "Full Raw Output:" >&2
            echo "$PQC_OUT" >&2
            RESULTS=$(echo "$RESULTS" | jq '.metrics.ml_kem_768_ops_sec = 0')
        fi
    else
        echo "WARNING: Custom ML-KEM benchmark tool not found at ./mlkem_bench" >&2
        RESULTS=$(echo "$RESULTS" | jq '.metrics.ml_kem_768_ops_sec = 0')
    fi
else
    echo "PQC (ML-KEM) not detected in this OpenSSL build." >&2
    echo "DEBUG: Checking OpenSSL capabilities:" >&2
    openssl version -a 2>&1 | head -n 5 >&2
    RESULTS=$(echo "$RESULTS" | jq '.metrics.ml_kem_768_ops_sec = 0')
fi

# =============================================================================
# HANDSHAKE TESTS (Aligned with Bellingrath/Juniper Test Matrix)
# =============================================================================
# Reference: https://www.youtube.com/watch?v=b01y5FDx-ao
# Tests: TLS 1.3 (RSA/EC), TLS 1.2 (ECDHE-RSA, ECDHE-ECDSA, AES256-GCM-SHA384)
# Metrics: CPS (Connections Per Second), Session Resumption
# Note: OpenSSL 1.1.1 s_time has different flags than OpenSSL 3.x
# =============================================================================

echo "" >&2
echo "========================================" >&2
echo "HANDSHAKE TESTS (RSA Certificate)" >&2
echo "========================================" >&2

# Start RSA server on port 4433
# Remove 2>/dev/null to see potential startup errors
# Also redirect output to a log file for debugging
openssl s_server -cert rsa_cert.pem -key rsa_key.pem -www -accept 4433 -quiet > s_server_rsa.log 2>&1 &
RSA_SERVER_PID=$!
sleep 5

# Check if server is running
if ! kill -0 $RSA_SERVER_PID 2>/dev/null; then
    echo "ERROR: RSA s_server failed to start." >&2
    echo "Server Log:" >&2
    cat s_server_rsa.log >&2
fi

# --- TLS 1.3 with RSA Certificate ---
# Note: OpenSSL 1.1.1 s_time doesn't support -tls1_3 flag
if [ "$IS_OPENSSL_1_1" = "true" ]; then
    echo "TLS 1.3 RSA: New Connections (using auto-negotiation for OpenSSL 1.1.1)..." >&2
    # In OpenSSL 1.1.1, we use -ssl3 to allow auto-negotiation to TLS 1.3
    HS_TLS13_RSA_NEW=$(openssl s_time -connect localhost:4433 -new -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
else
    echo "TLS 1.3 RSA: New Connections..." >&2
    HS_TLS13_RSA_NEW=$(openssl s_time -connect localhost:4433 -new -tls1_3 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
fi

if [ -z "$HS_TLS13_RSA_NEW" ] || [ "$HS_TLS13_RSA_NEW" == "0" ]; then
    echo "WARNING: TLS 1.3 RSA New Connections returned 0 or empty." >&2
    # Run a quick check without grep to see output
    echo "Raw output sample:" >&2
    if [ "$IS_OPENSSL_1_1" = "true" ]; then
        openssl s_time -connect localhost:4433 -new -time 2 2>&1 | head -n 10 >&2
    else
        openssl s_time -connect localhost:4433 -new -tls1_3 -time 2 2>&1 | head -n 10 >&2
    fi
fi

RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS13_RSA_NEW:-0}" '.metrics.tls1_3_rsa_new_cps = (if $v == "" then 0 else ($v | tonumber) end)')

if [ "$IS_OPENSSL_1_1" = "true" ]; then
    echo "TLS 1.3 RSA: Resumed Connections (using auto-negotiation for OpenSSL 1.1.1)..." >&2
    HS_TLS13_RSA_RESUME=$(openssl s_time -connect localhost:4433 -reuse -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
else
    echo "TLS 1.3 RSA: Resumed Connections..." >&2
    HS_TLS13_RSA_RESUME=$(openssl s_time -connect localhost:4433 -reuse -tls1_3 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
fi
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS13_RSA_RESUME:-0}" '.metrics.tls1_3_rsa_resume_cps = (if $v == "" then 0 else ($v | tonumber) end)')

# --- TLS 1.3 with specific cipher (TLS-AES128-GCM-SHA256 from slide) ---
if [ "$IS_OPENSSL_1_1" = "true" ]; then
    echo "TLS 1.3 RSA: TLS_AES_128_GCM_SHA256 (using auto-negotiation for OpenSSL 1.1.1)..." >&2
    HS_TLS13_AES128=$(openssl s_time -connect localhost:4433 -new -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
else
    echo "TLS 1.3 RSA: TLS_AES_128_GCM_SHA256..." >&2
    HS_TLS13_AES128=$(openssl s_time -connect localhost:4433 -new -tls1_3 -ciphersuites TLS_AES_128_GCM_SHA256 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
fi
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS13_AES128:-0}" '.metrics.tls1_3_rsa_aes128gcm_cps = (if $v == "" then 0 else ($v | tonumber) end)')

# --- TLS 1.2 with ECDHE-RSA-AES128-GCM-SHA256 (Industry workhorse) ---
echo "TLS 1.2 RSA: ECDHE-RSA-AES128-GCM-SHA256..." >&2
# OpenSSL 1.1.1 supports -tls1_2 flag
HS_TLS12_ECDHE_RSA=$(openssl s_time -connect localhost:4433 -new -tls1_2 -cipher ECDHE-RSA-AES128-GCM-SHA256 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')

if [ -z "$HS_TLS12_ECDHE_RSA" ] || [ "$HS_TLS12_ECDHE_RSA" == "0" ]; then
    echo "WARNING: TLS 1.2 ECDHE-RSA test returned 0 or empty." >&2
    echo "Raw output sample:" >&2
    openssl s_time -connect localhost:4433 -new -tls1_2 -cipher ECDHE-RSA-AES128-GCM-SHA256 -time 2 2>&1 | head -n 10 >&2
fi

RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS12_ECDHE_RSA:-0}" '.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps = (if $v == "" then 0 else ($v | tonumber) end)')

# --- TLS 1.2 with AES256-GCM-SHA384 (From Bellingrath slide) ---
echo "TLS 1.2 RSA: AES256-GCM-SHA384..." >&2
HS_TLS12_AES256=$(openssl s_time -connect localhost:4433 -new -tls1_2 -cipher AES256-GCM-SHA384 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS12_AES256:-0}" '.metrics.tls1_2_rsa_aes256gcm_cps = (if $v == "" then 0 else ($v | tonumber) end)')

# --- TLS 1.2 RSA: Session Resumption ---
echo "TLS 1.2 RSA: Resumed Connections..." >&2
HS_TLS12_RSA_RESUME=$(openssl s_time -connect localhost:4433 -reuse -tls1_2 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS12_RSA_RESUME:-0}" '.metrics.tls1_2_rsa_resume_cps = (if $v == "" then 0 else ($v | tonumber) end)')

# Kill RSA server
kill $RSA_SERVER_PID 2>/dev/null
sleep 1

echo "" >&2
echo "========================================" >&2
echo "HANDSHAKE TESTS (ECDSA Certificate)" >&2
echo "========================================" >&2

# Start ECDSA server on port 4434
openssl s_server -cert ec_cert.pem -key ec_key.pem -www -accept 4434 -quiet >/dev/null 2>&1 &
EC_SERVER_PID=$!
sleep 5

# --- TLS 1.3 with ECDSA Certificate ---
if [ "$IS_OPENSSL_1_1" = "true" ]; then
    echo "TLS 1.3 ECDSA: New Connections (using auto-negotiation for OpenSSL 1.1.1)..." >&2
    HS_TLS13_EC_NEW=$(openssl s_time -connect localhost:4434 -new -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
else
    echo "TLS 1.3 ECDSA: New Connections..." >&2
    HS_TLS13_EC_NEW=$(openssl s_time -connect localhost:4434 -new -tls1_3 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
fi
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS13_EC_NEW:-0}" '.metrics.tls1_3_ecdsa_new_cps = (if $v == "" then 0 else ($v | tonumber) end)')

if [ "$IS_OPENSSL_1_1" = "true" ]; then
    echo "TLS 1.3 ECDSA: Resumed Connections (using auto-negotiation for OpenSSL 1.1.1)..." >&2
    HS_TLS13_EC_RESUME=$(openssl s_time -connect localhost:4434 -reuse -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
else
    echo "TLS 1.3 ECDSA: Resumed Connections..." >&2
    HS_TLS13_EC_RESUME=$(openssl s_time -connect localhost:4434 -reuse -tls1_3 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
fi
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS13_EC_RESUME:-0}" '.metrics.tls1_3_ecdsa_resume_cps = (if $v == "" then 0 else ($v | tonumber) end)')

# --- TLS 1.2 with ECDHE-ECDSA-AES128-GCM-SHA256 (From Bellingrath slide) ---
echo "TLS 1.2 ECDSA: ECDHE-ECDSA-AES128-GCM-SHA256..." >&2
HS_TLS12_ECDHE_ECDSA=$(openssl s_time -connect localhost:4434 -new -tls1_2 -cipher ECDHE-ECDSA-AES128-GCM-SHA256 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS12_ECDHE_ECDSA:-0}" '.metrics.tls1_2_ecdhe_ecdsa_aes128gcm_cps = (if $v == "" then 0 else ($v | tonumber) end)')

# --- TLS 1.2 ECDSA: Session Resumption ---
echo "TLS 1.2 ECDSA: Resumed Connections..." >&2
HS_TLS12_EC_RESUME=$(openssl s_time -connect localhost:4434 -reuse -tls1_2 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS12_EC_RESUME:-0}" '.metrics.tls1_2_ecdsa_resume_cps = (if $v == "" then 0 else ($v | tonumber) end)')

# Kill ECDSA server
kill $EC_SERVER_PID 2>/dev/null

# =============================================================================
# Legacy metric names for backward compatibility with existing report
# WARNING: These are TLS 1.3 metrics (not TLS 1.2)
# =============================================================================
# DEPRECATED: handshakes_new_per_sec and handshakes_resume_per_sec are TLS 1.3 RSA certificate handshakes
# Use the explicit tls1_3_rsa_* metrics instead for clarity
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS13_RSA_NEW:-0}" '.metrics.handshakes_new_per_sec = (if $v == "" then 0 else ($v | tonumber) end)')
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS13_RSA_RESUME:-0}" '.metrics.handshakes_resume_per_sec = (if $v == "" then 0 else ($v | tonumber) end)')
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS12_ECDHE_RSA:-0}" '.metrics.handshakes_new_tls1_2_per_sec = (if $v == "" then 0 else ($v | tonumber) end)')

# =============================================================================
# OPTIMIZED TESTS (Based on Tomáš Mráz's recommendations)
# =============================================================================
# Reference: https://www.youtube.com/watch?v=Cv-43gJJFIs
# These tests use an optimized OpenSSL configuration that:
# 1. Loads only the default provider (no FIPS, no legacy)
# 2. Sets explicit default_properties to avoid property queries
# 3. Disables unnecessary features
#
# These optimizations only apply to OpenSSL 3.x - for 1.1.1, we skip this section.
# =============================================================================

# Check if this is OpenSSL 3.x (use the variable we already set)
if [ "$IS_OPENSSL_3" = "true" ]; then
    echo "" >&2
    echo "========================================" >&2
    echo "OPTIMIZED TESTS (Mráz Configuration)" >&2
    echo "========================================" >&2
    
    # Check if optimized config exists (mounted from host)
    OPTIMIZED_CONF="/opt/openssl/openssl-optimized.cnf"
    
    if [ -f "$OPTIMIZED_CONF" ]; then
        echo "Using optimized config: $OPTIMIZED_CONF" >&2
        
        # Start RSA server with optimized config
        OPENSSL_CONF="$OPTIMIZED_CONF" openssl s_server -cert rsa_cert.pem -key rsa_key.pem -www -accept 4435 -quiet > s_server_opt.log 2>&1 &
        OPT_SERVER_PID=$!
        sleep 5
        
        # Check if server is running
        if ! kill -0 $OPT_SERVER_PID 2>/dev/null; then
            echo "ERROR: Optimized s_server failed to start." >&2
            echo "Server Log:" >&2
            cat s_server_opt.log >&2
        fi
        
        # --- Optimized TLS 1.3 Handshake ---
        echo "OPTIMIZED TLS 1.3 RSA: New Connections..." >&2
        OPT_TLS13=$(OPENSSL_CONF="$OPTIMIZED_CONF" openssl s_time -connect localhost:4435 -new -tls1_3 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
        RESULTS=$(echo "$RESULTS" | jq --arg v "${OPT_TLS13:-0}" '.metrics.optimized_tls1_3_rsa_new_cps = (if $v == "" then 0 else ($v | tonumber) end)')
        
        # --- Optimized TLS 1.2 Handshake ---
        echo "OPTIMIZED TLS 1.2 RSA: ECDHE-RSA-AES128..." >&2
        OPT_TLS12=$(OPENSSL_CONF="$OPTIMIZED_CONF" openssl s_time -connect localhost:4435 -new -tls1_2 -cipher ECDHE-RSA-AES128-GCM-SHA256 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
        RESULTS=$(echo "$RESULTS" | jq --arg v "${OPT_TLS12:-0}" '.metrics.optimized_tls1_2_ecdhe_rsa_cps = (if $v == "" then 0 else ($v | tonumber) end)')
        
        # --- Optimized AES Throughput ---
        echo "OPTIMIZED AES-256-GCM Throughput..." >&2
        OPT_AES_OUT=$(OPENSSL_CONF="$OPTIMIZED_CONF" openssl speed -seconds 10 -evp aes-256-gcm 2>&1)
        OPT_AES_LINE=$(echo "$OPT_AES_OUT" | grep -i "^aes-256-gcm")
        if [ ! -z "$OPT_AES_LINE" ]; then
            OPT_AES_8K=$(echo "$OPT_AES_LINE" | awk '{print $6}' | sed 's/k$//')
            RESULTS=$(echo "$RESULTS" | jq --arg v "${OPT_AES_8K:-0}" '.metrics.optimized_aes_256_gcm_8k_kbs = (if $v == "" then 0 else ($v | tonumber) end)')
        fi
        
        # Kill optimized server
        kill $OPT_SERVER_PID 2>/dev/null
        
        # Calculate improvement percentages
        if [ "${HS_TLS13_RSA_NEW:-0}" != "0" ] && [ "${OPT_TLS13:-0}" != "0" ]; then
            # Store the delta for reporting
            RESULTS=$(echo "$RESULTS" | jq '.config.optimized_config_applied = true')
        fi
        
        echo "Optimized tests complete." >&2
    else
        echo "Optimized config not found at $OPTIMIZED_CONF - skipping optimized tests" >&2
        RESULTS=$(echo "$RESULTS" | jq '.config.optimized_config_applied = false')
    fi
else
    echo "OpenSSL 1.x detected (Version: '$OPENSSL_VERSION_OUTPUT') - skipping optimization tests (not applicable)" >&2
    RESULTS=$(echo "$RESULTS" | jq '.config.optimized_config_applied = false')
fi

# Output final JSON
echo "$RESULTS"
