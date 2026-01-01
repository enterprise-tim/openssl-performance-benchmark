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
    echo "Building with options: $CONFIG_OPTS" && \
    ./config --prefix=/opt/openssl --openssldir=/opt/openssl/ssl $CONFIG_OPTS -Wl,-rpath,/opt/openssl/lib64 -Wl,-rpath,/opt/openssl/lib && \
    make -j$(nproc) && \
    make install

# Update path to use the custom openssl
ENV PATH="/opt/openssl/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/openssl/lib64:/opt/openssl/lib:${LD_LIBRARY_PATH}"

WORKDIR /benchmark

# Compile ML-KEM benchmark tool
COPY src/mlkem_bench.c .
RUN gcc -o mlkem_bench mlkem_bench.c \
    -I/opt/openssl/include \
    -L/opt/openssl/lib64 -L/opt/openssl/lib \
    -lcrypto -Wl,-rpath,/opt/openssl/lib64 -Wl,-rpath,/opt/openssl/lib \
    && chmod +x mlkem_bench

COPY src/benchmark.sh .
RUN chmod +x benchmark.sh

# Copy optimized OpenSSL configuration (for Mráz optimization tests)
COPY config/openssl-optimized.cnf /opt/openssl/openssl-optimized.cnf

ENTRYPOINT ["./benchmark.sh"]

