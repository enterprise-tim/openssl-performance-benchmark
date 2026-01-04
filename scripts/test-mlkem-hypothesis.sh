#!/bin/bash

# Test Script: ML-KEM Performance Impact Hypothesis
# 
# This script tests the hypothesis that the default ML-KEM keyshare settings
# in OpenSSL 3.5.x are the primary contributor to the ~13% handshake
# performance reduction compared to OpenSSL 3.4.x.
#
# The test compares three configurations:
# 1. OpenSSL 3.5.4 with DEFAULT settings (ML-KEM preferred in TLS keyshares)
# 2. OpenSSL 3.5.4 with ECDH-only keyshares (traditional, like 3.4.0)
# 3. OpenSSL 3.5.4 compiled WITHOUT ML-KEM support (no-ml-kem)
#
# If hypothesis is correct:
# - Config 1 (default) should be ~13% slower than Config 2 (ECDH-only)
# - Config 2 (ECDH-only) should be similar to OpenSSL 3.4.0
# - Config 3 (no-ml-kem build) should also be similar to Config 2

set -e

OPENSSL_VERSION="3.5.4"
OPENSSL_URL="https://www.openssl.org/source/openssl-${OPENSSL_VERSION}.tar.gz"
WORK_DIR="/tmp/openssl-mlkem-test"
ITERATIONS=3

echo "=============================================="
echo "ML-KEM Performance Impact Hypothesis Test"
echo "=============================================="
echo ""
echo "Testing OpenSSL ${OPENSSL_VERSION}"
echo "Work directory: ${WORK_DIR}"
echo "Iterations per test: ${ITERATIONS}"
echo ""

# Create work directory
mkdir -p "${WORK_DIR}"
cd "${WORK_DIR}"

# Download OpenSSL if not present
if [ ! -f "openssl-${OPENSSL_VERSION}.tar.gz" ]; then
    echo "Downloading OpenSSL ${OPENSSL_VERSION}..."
    curl -L -o "openssl-${OPENSSL_VERSION}.tar.gz" "${OPENSSL_URL}"
fi

# Function to build OpenSSL with specific options
build_openssl() {
    local build_name="$1"
    local config_opts="$2"
    local build_dir="${WORK_DIR}/build-${build_name}"
    local install_dir="${WORK_DIR}/install-${build_name}"
    
    echo ""
    echo "----------------------------------------------"
    echo "Building OpenSSL: ${build_name}"
    echo "Config options: ${config_opts}"
    echo "----------------------------------------------"
    
    # Clean and extract
    rm -rf "${build_dir}" "${install_dir}"
    mkdir -p "${build_dir}"
    cd "${build_dir}"
    tar -xf "${WORK_DIR}/openssl-${OPENSSL_VERSION}.tar.gz"
    cd "openssl-${OPENSSL_VERSION}"
    
    # Configure and build
    ./config --prefix="${install_dir}" --openssldir="${install_dir}/ssl" \
        enable-ktls enable-ec_nistp_64_gcc_128 ${config_opts}
    
    make -j$(nproc)
    make install_sw
    
    echo "Build complete: ${install_dir}"
}

# Function to run TLS handshake benchmark
run_handshake_benchmark() {
    local name="$1"
    local openssl_dir="$2"
    local groups="$3"  # Optional: specify TLS groups to use
    
    local openssl="${openssl_dir}/bin/openssl"
    export LD_LIBRARY_PATH="${openssl_dir}/lib64:${openssl_dir}/lib:${LD_LIBRARY_PATH}"
    
    echo ""
    echo "Running benchmark: ${name}"
    echo "OpenSSL: ${openssl}"
    if [ -n "${groups}" ]; then
        echo "Groups: ${groups}"
    fi
    
    # Show version info
    "${openssl}" version
    
    # Run s_time benchmark for new connections
    local total_new=0
    local total_resume=0
    
    for i in $(seq 1 ${ITERATIONS}); do
        echo "  Iteration ${i}/${ITERATIONS}..."
        
        # Generate temporary certificate for testing
        local cert_dir="${WORK_DIR}/certs-${name}"
        mkdir -p "${cert_dir}"
        
        if [ ! -f "${cert_dir}/server.pem" ]; then
            "${openssl}" req -x509 -newkey rsa:2048 -keyout "${cert_dir}/server.key" \
                -out "${cert_dir}/server.pem" -days 1 -nodes \
                -subj "/CN=localhost" 2>/dev/null
        fi
        
        # Start server in background
        local port=$((4433 + RANDOM % 1000))
        
        if [ -n "${groups}" ]; then
            "${openssl}" s_server -accept ${port} \
                -cert "${cert_dir}/server.pem" -key "${cert_dir}/server.key" \
                -tls1_3 -groups "${groups}" -quiet &
        else
            "${openssl}" s_server -accept ${port} \
                -cert "${cert_dir}/server.pem" -key "${cert_dir}/server.key" \
                -tls1_3 -quiet &
        fi
        local server_pid=$!
        sleep 1
        
        # Run client benchmark for new connections
        if [ -n "${groups}" ]; then
            local new_result=$("${openssl}" s_time -connect localhost:${port} \
                -new -time 3 -groups "${groups}" 2>/dev/null | grep "connections/sec" | awk '{print $1}')
        else
            local new_result=$("${openssl}" s_time -connect localhost:${port} \
                -new -time 3 2>/dev/null | grep "connections/sec" | awk '{print $1}')
        fi
        
        # Run client benchmark for resumed connections
        if [ -n "${groups}" ]; then
            local resume_result=$("${openssl}" s_time -connect localhost:${port} \
                -reuse -time 3 -groups "${groups}" 2>/dev/null | grep "connections/sec" | awk '{print $1}')
        else
            local resume_result=$("${openssl}" s_time -connect localhost:${port} \
                -reuse -time 3 2>/dev/null | grep "connections/sec" | awk '{print $1}')
        fi
        
        # Stop server
        kill ${server_pid} 2>/dev/null || true
        wait ${server_pid} 2>/dev/null || true
        
        if [ -n "${new_result}" ]; then
            total_new=$(echo "${total_new} + ${new_result}" | bc)
        fi
        if [ -n "${resume_result}" ]; then
            total_resume=$(echo "${total_resume} + ${resume_result}" | bc)
        fi
    done
    
    local avg_new=$(echo "scale=2; ${total_new} / ${ITERATIONS}" | bc)
    local avg_resume=$(echo "scale=2; ${total_resume} / ${ITERATIONS}" | bc)
    
    echo ""
    echo "  Results for ${name}:"
    echo "    New connections/sec (avg): ${avg_new}"
    echo "    Resume connections/sec (avg): ${avg_resume}"
    
    # Store results in file
    echo "${name},${avg_new},${avg_resume}" >> "${WORK_DIR}/results.csv"
}

# Initialize results file
echo "Configuration,New Connections/sec,Resume Connections/sec" > "${WORK_DIR}/results.csv"

echo ""
echo "=============================================="
echo "Step 1: Build OpenSSL with DEFAULT settings"
echo "=============================================="
build_openssl "default" ""

echo ""
echo "=============================================="
echo "Step 2: Build OpenSSL WITHOUT ML-KEM support"
echo "=============================================="
build_openssl "no-mlkem" "no-ml-kem"

echo ""
echo "=============================================="
echo "Step 3: Run Benchmarks"
echo "=============================================="

# Test 1: Default settings (ML-KEM preferred)
run_handshake_benchmark "3.5.4-default-mlkem" "${WORK_DIR}/install-default" ""

# Test 2: Default build but with ECDH-only keyshares (like 3.4.0 behavior)
run_handshake_benchmark "3.5.4-ecdh-only" "${WORK_DIR}/install-default" "X25519:P-256:P-384"

# Test 3: Build without ML-KEM
run_handshake_benchmark "3.5.4-no-mlkem-build" "${WORK_DIR}/install-no-mlkem" ""

echo ""
echo "=============================================="
echo "Results Summary"
echo "=============================================="
echo ""
cat "${WORK_DIR}/results.csv" | column -t -s,

echo ""
echo "=============================================="
echo "Analysis"
echo "=============================================="
echo ""

# Read results
DEFAULT=$(grep "3.5.4-default-mlkem" "${WORK_DIR}/results.csv" | cut -d, -f2)
ECDH_ONLY=$(grep "3.5.4-ecdh-only" "${WORK_DIR}/results.csv" | cut -d, -f2)
NO_MLKEM=$(grep "3.5.4-no-mlkem-build" "${WORK_DIR}/results.csv" | cut -d, -f2)

if [ -n "${DEFAULT}" ] && [ -n "${ECDH_ONLY}" ]; then
    DIFF=$(echo "scale=2; ((${ECDH_ONLY} - ${DEFAULT}) / ${DEFAULT}) * 100" | bc)
    echo "Performance difference (ECDH-only vs Default ML-KEM): ${DIFF}%"
    echo ""
    
    if (( $(echo "${DIFF} > 10" | bc -l) )); then
        echo "HYPOTHESIS CONFIRMED: Switching to ECDH-only keyshares improves"
        echo "performance by more than 10%, confirming that the default ML-KEM"
        echo "keyshare settings are the primary contributor to the performance"
        echo "reduction in OpenSSL 3.5.x."
    else
        echo "HYPOTHESIS NEEDS REVIEW: Performance difference is less than 10%."
        echo "Other factors may be contributing to the performance difference."
    fi
fi

echo ""
echo "Results saved to: ${WORK_DIR}/results.csv"
echo ""
echo "To restore 3.4.0-like performance in 3.5.x applications:"
echo "  Use SSL_CTX_set1_groups_list(ctx, \"X25519:P-256:P-384\");"
echo "  Or in openssl.cnf: Groups = X25519:P-256:P-384"
echo ""

