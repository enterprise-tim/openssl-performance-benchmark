#!/bin/bash

# ML-KEM Comparison Benchmark Script
# 
# This script runs TLS handshake benchmarks to test the hypothesis that
# the default ML-KEM keyshare settings in OpenSSL 3.5.x are the primary
# contributor to the ~13% handshake performance reduction.

set -e

ITERATIONS=${1:-5}
DURATION=${2:-10}

echo "{"
echo "  \"test\": \"mlkem_hypothesis_test\","
echo "  \"openssl_version\": \"3.5.3\","
echo "  \"iterations\": ${ITERATIONS},"
echo "  \"duration_per_test\": ${DURATION},"
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
echo "  \"results\": {"

# Function to run handshake benchmark
run_benchmark() {
    local name="$1"
    local openssl_dir="$2"
    local groups="$3"
    
    local openssl="${openssl_dir}/bin/openssl"
    export LD_LIBRARY_PATH="${openssl_dir}/lib64:${openssl_dir}/lib"
    
    # Generate certificate
    local cert_dir="/tmp/certs-${name}"
    mkdir -p "${cert_dir}"
    "${openssl}" req -x509 -newkey rsa:2048 -keyout "${cert_dir}/server.key" \
        -out "${cert_dir}/server.pem" -days 1 -nodes \
        -subj "/CN=localhost" 2>/dev/null
    
    local total_new=0
    local total_resume=0
    local results_new=""
    local results_resume=""
    
    for i in $(seq 1 ${ITERATIONS}); do
        local port=$((4433 + RANDOM % 1000))
        
        # Start server
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
        
        # New connections
        if [ -n "${groups}" ]; then
            local new_result=$("${openssl}" s_time -connect localhost:${port} \
                -new -time ${DURATION} -groups "${groups}" 2>/dev/null | \
                grep "connections/sec" | awk '{print $1}' || echo "0")
        else
            local new_result=$("${openssl}" s_time -connect localhost:${port} \
                -new -time ${DURATION} 2>/dev/null | \
                grep "connections/sec" | awk '{print $1}' || echo "0")
        fi
        
        # Resume connections
        if [ -n "${groups}" ]; then
            local resume_result=$("${openssl}" s_time -connect localhost:${port} \
                -reuse -time ${DURATION} -groups "${groups}" 2>/dev/null | \
                grep "connections/sec" | awk '{print $1}' || echo "0")
        else
            local resume_result=$("${openssl}" s_time -connect localhost:${port} \
                -reuse -time ${DURATION} 2>/dev/null | \
                grep "connections/sec" | awk '{print $1}' || echo "0")
        fi
        
        kill ${server_pid} 2>/dev/null || true
        wait ${server_pid} 2>/dev/null || true
        
        total_new=$(echo "${total_new} + ${new_result}" | bc)
        total_resume=$(echo "${total_resume} + ${resume_result}" | bc)
        
        if [ -n "${results_new}" ]; then
            results_new="${results_new}, ${new_result}"
            results_resume="${results_resume}, ${resume_result}"
        else
            results_new="${new_result}"
            results_resume="${resume_result}"
        fi
    done
    
    local avg_new=$(echo "scale=2; ${total_new} / ${ITERATIONS}" | bc)
    local avg_resume=$(echo "scale=2; ${total_resume} / ${ITERATIONS}" | bc)
    
    echo "    \"${name}\": {"
    echo "      \"new_connections_per_sec\": {"
    echo "        \"average\": ${avg_new},"
    echo "        \"iterations\": [${results_new}]"
    echo "      },"
    echo "      \"resume_connections_per_sec\": {"
    echo "        \"average\": ${avg_resume},"
    echo "        \"iterations\": [${results_resume}]"
    echo "      }"
    echo "    }"
}

# Test 1: Default (ML-KEM hybrid preferred)
echo "    \"default_mlkem\": {"
echo "      \"description\": \"OpenSSL 3.5.3 with default settings (X25519MLKEM768 preferred)\","
run_benchmark "default" "/opt/openssl-default" ""
echo "    },"

# Test 2: Default build, but with ECDH-only groups (simulate 3.4.0 behavior)
echo "    \"ecdh_only_groups\": {"
echo "      \"description\": \"OpenSSL 3.5.3 with X25519-only groups (simulates 3.4.0 behavior)\","
run_benchmark "ecdh" "/opt/openssl-default" "X25519:P-256:P-384"
echo "    },"

# Test 3: Build without ML-KEM
echo "    \"no_mlkem_build\": {"
echo "      \"description\": \"OpenSSL 3.5.3 compiled with no-ml-kem option\","
run_benchmark "no-mlkem" "/opt/openssl-no-mlkem" ""
echo "    }"

echo "  },"

# Calculate and output analysis
echo "  \"analysis\": {"

# Get results for comparison
DEFAULT_NEW=$(grep -A5 '"default_mlkem"' /dev/stdin 2>/dev/null | grep "average" | head -1 | awk -F: '{print $2}' | tr -d ' ,' || echo "0")
ECDH_NEW=$(grep -A5 '"ecdh_only_groups"' /dev/stdin 2>/dev/null | grep "average" | head -1 | awk -F: '{print $2}' | tr -d ' ,' || echo "0")

echo "    \"hypothesis\": \"ML-KEM default keyshares cause ~13% handshake performance reduction\","
echo "    \"methodology\": \"Compare same OpenSSL build with different keyshare configurations\","
echo "    \"expected_outcome\": \"ECDH-only should be 10-15% faster than default ML-KEM\","
echo "    \"recommendation\": \"If confirmed, use SSL_CTX_set1_groups_list() to restore performance\""
echo "  }"
echo "}"

