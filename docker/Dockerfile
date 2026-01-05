FROM debian:bookworm-slim

ARG OPENSSL_VERSION
ARG OPENSSL_URL

ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    check \
    curl \
    perl \
    zlib1g-dev \
    linux-perf \
    jq \
    bc \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/local/src

# Download and compile OpenSSL
RUN echo "Downloading OpenSSL ${OPENSSL_VERSION} from ${OPENSSL_URL}" && \
    curl -L -o openssl.tar.gz "${OPENSSL_URL}" && \
    tar -xf openssl.tar.gz && \
    cd openssl-${OPENSSL_VERSION} && \
    # Determine config options based on version (ktls only supported in 3.0+) \
    if echo "${OPENSSL_VERSION}" | grep -q "^1\."; then \
        CONFIG_OPTS="enable-ec_nistp_64_gcc_128"; \
    else \
        CONFIG_OPTS="enable-ktls enable-ec_nistp_64_gcc_128"; \
    fi && \
    echo "========================================" && \
    echo "Building OpenSSL ${OPENSSL_VERSION}" && \
    echo "Config options: $CONFIG_OPTS" && \
    echo "========================================" && \
    ./config --prefix=/opt/openssl --openssldir=/opt/openssl/ssl $CONFIG_OPTS -Wl,-rpath,/opt/openssl/lib64 -Wl,-rpath,/opt/openssl/lib && \
    echo "" && \
    echo "========================================" && \
    echo "VERIFYING ASSEMBLY OPTIMIZATIONS" && \
    echo "========================================" && \
    echo "Checking configdata.pm for ASM flags..." && \
    (grep -E "asm|OPENSSL_CPUID|VPAES|AES_ASM|SHA.*_ASM|POLY1305_ASM|BN_ASM" configdata.pm 2>/dev/null | head -20 || echo "configdata.pm not found or no ASM flags") && \
    echo "" && \
    echo "Checking Makefile for ASM source files..." && \
    (grep -c "\.S\|\.s\|asm" Makefile 2>/dev/null && echo "ASM source files found in Makefile" || echo "No ASM references found") && \
    echo "========================================" && \
    make -j$(nproc) && \
    make install && \
    echo "" && \
    echo "========================================" && \
    echo "POST-BUILD VERIFICATION" && \
    echo "========================================" && \
    echo "Installed OpenSSL version:" && \
    /opt/openssl/bin/openssl version -a && \
    echo "" && \
    echo "Checking for ASM in compiled library:" && \
    (nm /opt/openssl/lib*/libcrypto.* 2>/dev/null | grep -iE "aesni|vpaes|sha.*_block|gcm" | head -10 || echo "Could not check symbols") && \
    echo "========================================"

# Update path to use the custom openssl
ENV PATH="/opt/openssl/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/openssl/lib64:/opt/openssl/lib:${LD_LIBRARY_PATH}"

WORKDIR /benchmark

# Compile ML-KEM benchmark tool (only for OpenSSL 3.x)
COPY src/mlkem_bench.c .
RUN if echo "${OPENSSL_VERSION}" | grep -q "^3\."; then \
        echo "Compiling ML-KEM benchmark for OpenSSL 3.x" && \
        gcc -o mlkem_bench mlkem_bench.c \
            -I/opt/openssl/include \
            -L/opt/openssl/lib64 -L/opt/openssl/lib \
            -lcrypto -Wl,-rpath,/opt/openssl/lib64 -Wl,-rpath,/opt/openssl/lib \
            && chmod +x mlkem_bench; \
    else \
        echo "Skipping ML-KEM benchmark (requires OpenSSL 3.x, found ${OPENSSL_VERSION})"; \
    fi

# Compile ML-DSA (Dilithium) benchmark tool with rejection sampling analysis (OpenSSL 3.5+)
COPY src/mldsa_bench.c .
RUN if echo "${OPENSSL_VERSION}" | grep -q "^3\.[5-9]\|^3\.[1-9][0-9]"; then \
        echo "Compiling ML-DSA benchmark for OpenSSL 3.5+ (${OPENSSL_VERSION})" && \
        gcc -o mldsa_bench mldsa_bench.c \
            -I/opt/openssl/include \
            -L/opt/openssl/lib64 -L/opt/openssl/lib \
            -lcrypto -lm -Wl,-rpath,/opt/openssl/lib64 -Wl,-rpath,/opt/openssl/lib \
            && chmod +x mldsa_bench; \
    else \
        echo "Skipping ML-DSA benchmark (requires OpenSSL 3.5+, found ${OPENSSL_VERSION})"; \
    fi

COPY src/benchmark.sh .
COPY src/avx_benchmark.sh .
COPY src/measure_memory.sh .
RUN chmod +x benchmark.sh avx_benchmark.sh measure_memory.sh

# Copy optimized OpenSSL configuration (for Mráz optimization tests)
COPY config/openssl-optimized.cnf /opt/openssl/openssl-optimized.cnf

ENTRYPOINT ["./benchmark.sh"]

