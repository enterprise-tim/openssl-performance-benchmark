# Performance Metrics

This document details the specific performance metrics collected by the benchmark suite.

## 1. Algorithm Throughput

Measured using `openssl speed -evp [algorithm]`. These tests measure the raw speed of cryptographic primitives using the high-level Envelope (EVP) interface, which allows OpenSSL to utilize hardware acceleration (like AES-NI) where available.

-   **AES-256-GCM**: Authenticated encryption. Measured at multiple block sizes (16B, 64B, 256B, 1KB, 8KB).
    -   *Why it matters:* This is the standard cipher for modern TLS. Large block performance indicates bulk transfer speed. Small block performance can reveal overhead in the OpenSSL "Provider" architecture (v3.0+).
-   **SHA256**: Hashing algorithm.
    -   *Why it matters:* Ubiquitous for digital signatures and data integrity.

## 2. TLS Handshake Performance

Measured using `openssl s_time`. This test spins up a local `openssl s_server` and runs a client that performs repeated handshakes for a fixed duration (10 seconds).

**Metric:** Connections Per Second (CPS).

### Test Matrix (Bellingrath Alignment)

We follow the test matrix proposed by William Bellingrath (Juniper Networks) to isolate variables:

-   **Protocol:** TLS 1.2 vs TLS 1.3
-   **Certificate Type:** RSA-2048 vs ECDSA P-256
-   **Session State:** New Connection vs Session Resumption

| Metric Key | Description |
| :--- | :--- |
| `tls1_3_rsa_new_cps` | TLS 1.3 handshake with RSA-2048 cert (New Session) |
| `tls1_3_rsa_resume_cps` | TLS 1.3 handshake with RSA-2048 cert (Resumed Session) |
| `tls1_3_ecdsa_new_cps` | TLS 1.3 handshake with ECDSA P-256 cert (New Session) |
| `tls1_2_ecdhe_rsa_aes128gcm_cps` | TLS 1.2, ECDHE Key Exchange, RSA Cert (Industry Standard) |
| `tls1_2_ecdhe_ecdsa_aes128gcm_cps`| TLS 1.2, ECDHE Key Exchange, ECDSA Cert |

> **Note:** Handshake performance is typically CPU-bound by asymmetric crypto operations (signing/verifying).

## 3. Asymmetric Primitives (Schmatz Benchmarks)

Measured using `openssl speed [algorithm]`. These tests isolate the specific mathematical operations used during a handshake, based on Martin Schmatz's (IBM) methodology.

**Metric:** Operations Per Second (ops/sec).

-   **RSA**: Signing and Verification at 2048, 3072, and 4096 bits.
-   **ECDSA**: Signing and Verification on P-256, P-384, and P-521 curves.
-   **ECDH**: Elliptic Curve Diffie-Hellman key exchange on P-256, P-384, and P-521.

## 4. Post-Quantum Cryptography (PQC)

For OpenSSL 3.5+ versions that support it.

-   **ML-KEM-768**: Module-Lattice-Based Key Encapsulation Mechanism (FIPS 203).
    -   *Metric:* KeyGen/Encap/Decap operations per second.

## 5. Multi-threaded Scalability

Runs `openssl speed -multi [cores] -evp aes-256-gcm`.

-   **Scalability Factor**: Compares the aggregated throughput of N parallel threads against single-thread performance.
-   *Why it matters:* OpenSSL 3.0 introduced global locks in the Provider architecture that significantly impacted multi-threaded performance in early versions. This metric tracks recovery.

