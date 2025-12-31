#!/bin/bash

# Quick test script to validate the OpenSSL 1.1.1 fix
# This script tests the version detection logic without running full benchmarks

set -e

echo "=========================================="
echo "OpenSSL 1.1.1 Fix Validation Test"
echo "=========================================="
echo ""

# Test version detection logic
test_version_detection() {
    local test_version="$1"
    local expected_1_1="$2"
    local expected_3="$3"
    
    echo "Testing: $test_version"
    
    OPENSSL_VERSION_OUTPUT="$test_version"
    IS_OPENSSL_1_1=$(echo "$OPENSSL_VERSION_OUTPUT" | grep -E "^OpenSSL\s+1\.1\." >/dev/null && echo "true" || echo "false")
    IS_OPENSSL_3=$(echo "$OPENSSL_VERSION_OUTPUT" | grep -E "^OpenSSL\s+3\." >/dev/null && echo "true" || echo "false")
    
    echo "  IS_OPENSSL_1_1: $IS_OPENSSL_1_1 (expected: $expected_1_1)"
    echo "  IS_OPENSSL_3: $IS_OPENSSL_3 (expected: $expected_3)"
    
    if [ "$IS_OPENSSL_1_1" = "$expected_1_1" ] && [ "$IS_OPENSSL_3" = "$expected_3" ]; then
        echo "  ✅ PASS"
    else
        echo "  ❌ FAIL"
        exit 1
    fi
    echo ""
}

# Test various OpenSSL version strings
echo "1. Testing version detection:"
echo ""

test_version_detection "OpenSSL 1.1.1w  11 Sep 2023" "true" "false"
test_version_detection "OpenSSL 1.1.1  11 Sep 2018" "true" "false"
test_version_detection "OpenSSL 1.1.1k  25 Mar 2021" "true" "false"
test_version_detection "OpenSSL 3.0.15 3 Sep 2024" "false" "true"
test_version_detection "OpenSSL 3.1.7 3 Sep 2024" "false" "true"
test_version_detection "OpenSSL 3.2.3 3 Sep 2024" "false" "true"
test_version_detection "OpenSSL 3.3.2 3 Sep 2024" "false" "true"
test_version_detection "OpenSSL 3.4.0 22 Oct 2024" "false" "true"
test_version_detection "OpenSSL 3.5.3 16 Sep 2025" "false" "true"

echo "=========================================="
echo "2. Testing s_time command availability:"
echo "=========================================="
echo ""

# Check if s_time is available
ACTUAL_VERSION=$(openssl version)
echo "System OpenSSL version: $ACTUAL_VERSION"
echo ""

# Test if s_time supports -help
echo "Testing s_time availability:"
if openssl s_time -help 2>&1 | grep -q "Usage"; then
    echo "  ✅ s_time command is available"
else
    echo "  ⚠️  s_time command may not be available"
fi
echo ""

# Test if -tls1_2 flag is supported
echo "Testing -tls1_2 flag:"
if openssl s_time -help 2>&1 | grep -q "\-tls1_2"; then
    echo "  ✅ -tls1_2 flag is supported"
else
    echo "  ⚠️  -tls1_2 flag may not be supported"
fi
echo ""

# Test if -tls1_3 flag is supported
echo "Testing -tls1_3 flag:"
if openssl s_time -help 2>&1 | grep -q "\-tls1_3"; then
    echo "  ✅ -tls1_3 flag is supported (OpenSSL 3.x)"
else
    echo "  ℹ️  -tls1_3 flag not supported (expected for OpenSSL 1.1.1)"
fi
echo ""

echo "=========================================="
echo "3. Suggested command patterns:"
echo "=========================================="
echo ""

IS_OPENSSL_1_1=$(echo "$ACTUAL_VERSION" | grep -E "^OpenSSL\s+1\.1\." >/dev/null && echo "true" || echo "false")

if [ "$IS_OPENSSL_1_1" = "true" ]; then
    echo "For TLS 1.3 tests on OpenSSL 1.1.1:"
    echo "  openssl s_time -connect HOST:PORT -new -time 10"
    echo "  (omit -tls1_3 flag, use auto-negotiation)"
    echo ""
    echo "For TLS 1.2 tests on OpenSSL 1.1.1:"
    echo "  openssl s_time -connect HOST:PORT -new -tls1_2 -cipher CIPHER"
    echo "  (use -tls1_2 flag)"
else
    echo "For TLS 1.3 tests on OpenSSL 3.x:"
    echo "  openssl s_time -connect HOST:PORT -new -tls1_3 -time 10"
    echo "  (use -tls1_3 flag)"
    echo ""
    echo "For TLS 1.2 tests on OpenSSL 3.x:"
    echo "  openssl s_time -connect HOST:PORT -new -tls1_2 -cipher CIPHER"
    echo "  (use -tls1_2 flag)"
fi
echo ""

echo "=========================================="
echo "✅ All tests passed!"
echo "=========================================="

