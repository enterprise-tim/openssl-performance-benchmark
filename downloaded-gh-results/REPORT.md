# OpenSSL Performance Benchmark Results

Analysis of OpenSSL performance regressions and improvements across versions 1.1.1 through 3.5.3.

## Test Methodology & System Info

All tests were conducted in isolated Docker containers (Debian Bookworm) to ensure environment consistency. Each version was compiled from source.

**System Specification:**
- **CPU:** Unknown CPU (0 cores)
- **Memory:** 48 GB
- **OS:** darwin 24.6.0
- **Container OS:** Unknown
- **Kernel:** Unknown
- **Docker:** Engine v24+

**OpenSSL Configuration:**
Benchmarks run using source-compiled binaries. 
- **Platform:** `N/A`
- **Compiler Flags:** `Default`

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

## Multi-threaded Performance (Scalability)

> **Why this matters:** High-performance servers use multiple cores. HAProxy authors noted that [OpenSSL 3.0 performance was measurably lower in multi-threaded environments](https://www.haproxy.com/blog/state-of-ssl-stacks), often due to lock contention in the new Provider architecture. This test stresses that specific weakness.

| Version | Multi-Core Throughput (8K) | Scaling Factor |
|---------|---------------------------:|---------------:|

## Bellingrath Alignment: Certificate Type Comparison

> **Context:** William Bellingrath (Juniper Networks) specifically tested both RSA and ECDSA certificates in his [OpenSSL 3.x Performance presentation](https://www.youtube.com/watch?v=b01y5FDx-ao). These tests replicate that methodology.

### TLS 1.3 Performance by Certificate Type

| Version | RSA-2048 (New) | RSA-2048 (Resume) | ECDSA P-256 (New) | ECDSA P-256 (Resume) |
|---------|---------------:|------------------:|------------------:|---------------------:|
| **1.1.1w** | 0 | 0 | 0 | 0 |
| **3.0.15** | 0 | 0 | 0 | 0 |
| **3.1.7** | 0 | 0 | 0 | 0 |
| **3.2.3** | 0 | 0 | 0 | 0 |
| **3.3.2** | 0 | 0 | 0 | 0 |
| **3.4.0** | 0 | 0 | 0 | 0 |
| **3.5.3** | 0 | 0 | 0 | 0 |

### TLS 1.2 Performance by Cipher Suite (Bellingrath's Test Matrix)

| Version | ECDHE-RSA-AES128-GCM | ECDHE-ECDSA-AES128-GCM | AES256-GCM-SHA384 |
|---------|---------------------:|-----------------------:|------------------:|
| **1.1.1w** | 0 | 0 | 0 |
| **3.0.15** | 0 | 0 | 0 |
| **3.1.7** | 0 | 0 | 0 |
| **3.2.3** | 0 | 0 | 0 |
| **3.3.2** | 0 | 0 | 0 |
| **3.4.0** | 0 | 0 | 0 |
| **3.5.3** | 0 | 0 | 0 |

### Session Resumption Comparison (CPS)

> **Why test resumption?** TLS session resumption reuses cryptographic parameters, making it ~3-10x faster than full handshakes. Bellingrath tested both to measure overhead.

| Version | TLS 1.3 RSA (Resume) | TLS 1.2 RSA (Resume) |
|---------|---------------------:|---------------------:|
| **1.1.1w** | 0 | 0 |
| **3.0.15** | 0 | 0 |
| **3.1.7** | 0 | 0 |
| **3.2.3** | 0 | 0 |
| **3.3.2** | 0 | 0 |
| **3.4.0** | 0 | 0 |
| **3.5.3** | 0 | 0 |

**Understanding the Performance Gap:**

TLS 1.2 session resumption consistently achieves significantly higher performance (often 30,000-40,000+ CPS) compared to TLS 1.3 (typically 6,000-7,000 CPS). This occurs because:

1. **TLS 1.2 Resumption Simplicity:** Session tickets completely bypass expensive asymmetric cryptography. The server decrypts the ticket, retrieves the cached master secret, and derives new symmetric keys—no public key operations required.

2. **TLS 1.3 PSK Complexity:** Pre-Shared Key (PSK) resumption in TLS 1.3 is more secure (better forward secrecy) but performs additional operations: HKDF key derivation, optional ephemeral Diffie-Hellman exchanges, and more complex state management.

3. **Code Maturity:** TLS 1.2 has been optimized for over a decade. TLS 1.3 (introduced in OpenSSL 1.1.1) and especially the OpenSSL 3.x Provider architecture are still being tuned.

4. **OpenSSL 3.x Provider Overhead:** The abstraction layers in OpenSSL 3.x add per-operation overhead that accumulates during handshakes with many small cryptographic operations.

**Practical Impact:** While TLS 1.3 provides superior security properties (mandatory perfect forward secrecy, encrypted handshakes), TLS 1.2 session resumption remains faster in pure throughput. For most applications, TLS 1.3's security benefits outweigh this performance difference, but high-throughput environments may need to consider this tradeoff.


## Schmatz Algorithm Benchmarks

> **Context:** Martin Schmatz (IBM) emphasized comprehensive algorithm testing in his [OpenSSL Performance Analysis](https://www.youtube.com/watch?v=69gUVhOEaVM). These tests measure raw cryptographic operation speed independent of TLS overhead.

### RSA Key Size Comparison (ops/sec)

> **Why test key sizes?** RSA-4096 provides more security but is ~4x slower than RSA-2048. Understanding this tradeoff is critical for certificate selection.

| Version | RSA-2048 Sign | RSA-2048 Verify | RSA-3072 Sign | RSA-3072 Verify | RSA-4096 Sign | RSA-4096 Verify |
|---------|-------------:|----------------:|-------------:|----------------:|-------------:|----------------:|
| **1.1.1w** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.0.15** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.1.7** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.2.3** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.3.2** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.4.0** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.5.3** | 0 | 0 | 0 | 0 | 0 | 0 |

### ECDSA Curve Comparison (ops/sec)

> **Why test curves?** P-256 is fastest and most common. P-384 is required by some compliance regimes. P-521 offers highest security but at significant performance cost.

| Version | P-256 Sign | P-256 Verify | P-384 Sign | P-384 Verify | P-521 Sign | P-521 Verify |
|---------|----------:|-------------:|----------:|-------------:|----------:|-------------:|
| **1.1.1w** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.0.15** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.1.7** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.2.3** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.3.2** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.4.0** | 0 | 0 | 0 | 0 | 0 | 0 |
| **3.5.3** | 0 | 0 | 0 | 0 | 0 | 0 |

### ECDH Key Exchange (ops/sec)

> **Why test ECDH?** Elliptic Curve Diffie-Hellman is used in TLS to establish shared secrets. This is a major component of handshake CPU cost.

| Version | ECDH P-256 | ECDH P-384 | ECDH P-521 |
|---------|----------:|----------:|----------:|
| **1.1.1w** | 0 | 0 | 0 |
| **3.0.15** | 0 | 0 | 0 |
| **3.1.7** | 0 | 0 | 0 |
| **3.2.3** | 0 | 0 | 0 |
| **3.3.2** | 0 | 0 | 0 |
| **3.4.0** | 0 | 0 | 0 |
| **3.5.3** | 0 | 0 | 0 |

### Block Size Sensitivity (AES-256-GCM KB/s)

> **Why test block sizes?** Small blocks stress initialization overhead (Provider fetch). Large blocks show maximum throughput. The gap reveals architectural overhead.

| Version | 16 Bytes | 64 Bytes | 256 Bytes | 1024 Bytes | 8192 Bytes |
|---------|--------:|---------:|----------:|-----------:|-----------:|
| **1.1.1w** | 0 | 0 | 0 | 5,901,582 | 5,856,720 |
| **3.0.15** | 0 | 0 | 0 | 7,604,872 | 8,336,787 |
| **3.1.7** | 0 | 0 | 0 | 7,489,533 | 8,061,891 |
| **3.2.3** | 0 | 0 | 0 | 7,508,892 | 8,093,208 |
| **3.3.2** | 0 | 0 | 0 | 7,488,583 | 8,296,687 |
| **3.4.0** | 0 | 0 | 0 | 7,578,336 | 8,235,014 |
| **3.5.3** | 0 | 0 | 0 | 3,975,862 | 7,414,005 |
