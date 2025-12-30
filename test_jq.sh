#!/bin/bash
# Test script to verify JSON construction logic from benchmark.sh

# Mock variables usually provided by system commands
VERSION="OpenSSL 3.5.3 16 Sep 2025"
COMPILER_FLAGS="-O3 -Wall -DOPENSSL_USE_NODELETE"
PLATFORM="linux-x86_64"
OPENSSL_DIR="/opt/openssl/ssl"
OS_NAME="Debian GNU/Linux"
OS_VERSION="12 (bookworm)"
KERNEL_VERSION="Linux 6.6.0-linuxkit"
CPU_MODEL="Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz"

# The command from benchmark.sh
RESULTS=$(jq -n \
    --arg v "$VERSION" \
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

echo "Checking if JSON is valid..."
if echo "$RESULTS" | jq . >/dev/null 2>&1; then
    echo "✅ JSON is valid."
    echo "$RESULTS" | jq .metadata
else
    echo "❌ JSON is invalid!"
    exit 1
fi

