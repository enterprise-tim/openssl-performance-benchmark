# OpenSSL Performance Benchmark Results

Analysis of OpenSSL performance regressions and improvements across versions 1.1.1 through 3.5.3.

## Test Methodology & System Info

All tests were conducted in isolated Docker containers (Debian Bookworm) to ensure environment consistency. Each version was compiled from source.

**System Specification:**
- **CPU:** Apple M4 Max (16 cores)
- **Memory:** 48 GB
- **OS:** darwin 24.6.0
- **Docker:** Engine v24+

**Test Definitions:**
- **Algorithm Throughput:** Measured using `openssl speed -evp [algo]`. This uses the high-level Envelope interface, which utilizes hardware acceleration (like AES-NI) where available. It represents raw encryption speed for bulk data transfer.
- **TLS Handshake:** Measured using `openssl s_time -new`. This creates repeated new TLS connections to a local `openssl s_server`. It stresses the CPU-intensive parts of the protocol (key exchange, certificate parsing, signature verification) rather than network I/O.

## Performance Analysis

### Why Throughput Improved but Handshakes Slowed Down

You may notice a divergence in the results: **Algorithm throughput (AES-GCM, SHA256) often increases in 3.x, while Handshake performance decreases.**

1.  **Throughput Increase:** OpenSSL 3.x includes updated assembly optimizations and better pipelining for modern processors. The EVP layer in 3.x is highly optimized for bulk operations, allowing it to process large blocks of data (8KB) more efficiently.
2.  **Handshake Decrease:** The drop in handshake performance is primarily due to the architectural overhaul in OpenSSL 3.0, specifically the "Provider" model. This introduced abstraction layers that require property queries and provider lookups for every cryptographic operation. Since a TLS handshake involves many *small* operations (random number generation, hashing, signing), this per-operation overhead accumulates, resulting in fewer connections per second compared to the leaner 1.1.1 architecture.

## Version Overview

| Version | Release Date | Series Features |
|---------|--------------|-----------------|
| **1.1.1w** | 2023-09-11 | Final release of the 1.1.1 LTS series (EOL Sept 2023). Support for TLS 1.3, SHA-3, X448/Ed448. The performance baseline. |
| **3.0.15** | 2024-09-03 | LTS release. Introduced the Provider architecture (FIPS 140-2). Major architectural overhaul often cited as the cause of performance regressions. |
| **3.1.7** | 2024-09-03 | FIPS 140-3 compliance. Focused on performance improvements over 3.0 and addressing initial regressions. |
| **3.2.3** | 2024-09-03 | Client-side QUIC support. TLS certificate compression (RFC 8879). Deterministic ECDSA (RFC 6979). |
| **3.3.2** | 2024-09-03 | QUIC trace and polling improvements. New EVP_DigestSqueeze API. Further performance tuning. |
| **3.4.0** | 2024-10-22 | FIPS indicators. Composite signature algorithms. PBMAC1 support. New integrity checks. |
| **3.5.3** | 2025-10-22 | LTS release. Post-Quantum Cryptography (ML-KEM, ML-DSA). Significant performance work to match 1.1.1 baseline. |

## TLS Handshake Performance (Connections/sec)

> **Why this matters:** Handshake performance is critical for web servers handling many short-lived connections. This was a primary regression point in OpenSSL 3.0.

| Version | New Connections | Resumed | Change vs 1.1.1w |
|---------|----------------:|--------:|-----------------:|
| **1.1.1w** | 19,557 | 20,580 | Baseline |
| **3.0.15** | 16,719 | 17,178 | -14.5% |
| **3.1.7** | 17,150 | 17,984 | -12.3% |
| **3.2.3** | 17,892 | 18,345 | -8.5% |
| **3.3.2** | 17,107 | 18,022 | -12.5% |
| **3.4.0** | 18,806 | 19,355 | -3.8% |
| **3.5.3** | 16,300 | 17,284 | -16.7% |

## Algorithm Throughput (KB/s)

> **Why this matters:** Raw encryption speed affects bulk data transfer. AES-256-GCM is the standard for TLS, and SHA256 is ubiquitous for signing.

| Version | AES-256-GCM (8K) | SHA256 (8K) |
|---------|-----------------:|------------:|
| **1.1.1w** | 5,856,720 | 3,332,688 |
| **3.0.15** | 8,336,787 | 3,352,901 |
| **3.1.7** | 8,061,891 | 3,319,217 |
| **3.2.3** | 8,093,208 | 3,345,648 |
| **3.3.2** | 8,296,687 | 3,321,159 |
| **3.4.0** | 8,235,014 | 3,334,942 |
| **3.5.3** | 7,414,005 | 3,337,351 |
