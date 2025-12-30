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
    ./config --prefix=/opt/openssl --openssldir=/opt/openssl/ssl -Wl,-rpath,/opt/openssl/lib64 -Wl,-rpath,/opt/openssl/lib && \
    make -j$(nproc) && \
    make install

# Update path to use the custom openssl
ENV PATH="/opt/openssl/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/openssl/lib64:/opt/openssl/lib:${LD_LIBRARY_PATH}"

WORKDIR /benchmark
COPY src/benchmark.sh .
RUN chmod +x benchmark.sh

# Copy optimized OpenSSL configuration (for Mráz optimization tests)
COPY config/openssl-optimized.cnf /opt/openssl/openssl-optimized.cnf

ENTRYPOINT ["./benchmark.sh"]

