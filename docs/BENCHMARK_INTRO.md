# Benchmark Introduction & Methodology

## What This Project Measures

This project benchmarks the performance of the **OpenSSL** cryptography library across multiple versions, specifically targeting the transition from the 1.1.1 series to the 3.x series.

It focuses on two critical performance metrics for web servers and secure applications:

### 1. TLS Handshake Performance (Connections per Second)
*   **The Test:** Uses `openssl s_time` to establish repeated new TLS connections to a local server.
*   **What it measures:** The CPU cost of negotiating a secure connection. This involves:
    *   Public Key Cryptography (RSA/ECC)
    *   Certificate Verification
    *   Key Derivation
    *   Protocol Overhead (parsing TLS frames)
*   **Why it matters:** This is the primary bottleneck for servers handling high-traffic, short-lived connections (like a REST API or a busy web server). A drop in this metric means your server can handle fewer concurrent users.

### 2. Algorithm Throughput (KB per Second)
*   **The Test:** Uses `openssl speed -evp` to measure raw encryption speed.
*   **What it measures:** How fast the library can encrypt/decrypt data once a connection is established. It tests:
    *   **AES-256-GCM:** The industry standard for bulk encryption (used for HTTPS data).
    *   **SHA256:** The standard hashing algorithm (used for signatures and integrity).
*   **Why it matters:** This affects the latency of transferring large files or data streams.

### 3. Multi-threaded Scalability (New)
*   **The Test:** Uses `openssl speed -multi [cores]` to run encryption algorithms in parallel across available CPU cores.
*   **Why it matters:** Real-world servers are multi-threaded. HAProxy authors noted that [OpenSSL 3.0 performance was measurably lower in multi-threaded environments](https://www.haproxy.com/blog/state-of-ssl-stacks), often due to lock contention in the new Provider architecture. This test stresses that specific weakness.

## Industry Context: Why We Are Testing This

This benchmark is designed to validate specific critiques raised by high-volume users of OpenSSL. Notably, **William Bellingrath (Juniper Networks)** presented detailed findings on OpenSSL 3.x regressions at OpenSSL Conference 2024.

**Key Critiques from [Bellingrath's Presentation](https://www.youtube.com/watch?v=b01y5FDx-ao):**
1.  **"The Provider Tax":** The new modular architecture (Providers) requires fetching algorithms and querying properties for every operation. This introduces a fixed CPU cost that is negligible for large data transfers but devastating for small, frequent operations like Handshakes.
2.  **Latency vs. Throughput:** While *throughput* (MB/s) often looks good because the underlying assembly code (AES-NI) hasn't changed, the *latency* (time to start the operation) has increased.
3.  **Lock Contention:** In multi-core systems, the new architecture can suffer from thread contention, meaning adding more cores doesn't scale performance as linearly as it did in 1.1.1.

Our benchmark suite specifically targets these three areas (Handshake rate, Small vs Large block throughput, and Multi-core scaling) to empirically test his assertions.

### Mráz's Performance Tuning Recommendations

While Bellingrath documented the *problems*, **Tomáš Mráz** (OpenSSL core developer) presented solutions in his talk [OpenSSL 3.x Performance Tuning](https://www.youtube.com/watch?v=Cv-43gJJFIs). Key recommendations include:

1.  **Pre-fetch algorithms at startup**: The Provider overhead comes from `EVP_MD_fetch()` and `EVP_CIPHER_fetch()` being called on every operation. Applications should fetch once and reuse the handles.
2.  **Use explicit algorithm names**: Avoid property queries by specifying exact algorithm names rather than relying on defaults.
3.  **Clone contexts instead of reinitializing**: `EVP_MD_CTX_dup()` is faster than creating a new context each time.
4.  **Avoid FIPS provider when not needed**: The FIPS provider has additional overhead for compliance checks.
5.  **Minimal OpenSSL configuration**: Loading fewer providers and modules reduces startup cost.

Our benchmark includes an **"Optimized" configuration** that applies these *runtime* tunings to show the potential performance recovery in OpenSSL 3.x.

### Advanced Build-Time Optimizations (For Production Builds)

In addition to runtime tuning, Mráz outlined specific **compile-time flags** for optimal performance. While this benchmark uses standard build options to represent a typical "out-of-the-box" experience, production environments should consider compiling OpenSSL with:

*   **`enable-ec_nistp_64_gcc_128`**: Essential for 64-bit platforms. It enables specific assembly optimizations for P-256 and P-521 curves, which can significantly boost ECDSA/ECDH performance.
*   **`no-engines`**: Disables the legacy "Engine" architecture if you don't need hardware tokens, reducing code footprint.
*   **`no-dh` / `no-dsa`**: Disables finite-field Diffie-Hellman and DSA if your environment is purely Elliptic Curve (ECDH/ECDSA), reducing library size and initialization work.
*   **Ensure `no-asm` is NOT used**: Assembly modules are critical for performance.
*   **Avoid `-d` or `--debug`**: These flags disable compiler optimizations.

> **Recommendation:** Watch Tomáš Mráz's full presentation [OpenSSL 3.x Performance Tuning](https://www.youtube.com/watch?v=Cv-43gJJFIs) before finalizing your production build strategy.

### Schmatz's Comprehensive Algorithm Benchmarking

**Martin Schmatz** (IBM) presented a systematic approach to OpenSSL performance measurement in his talk [OpenSSL Performance Analysis](https://www.youtube.com/watch?v=69gUVhOEaVM). His methodology emphasizes:

1.  **Key Size Sensitivity**: Performance varies dramatically with key size. RSA-2048 is ~4x faster than RSA-4096. Testing multiple sizes reveals scalability characteristics.
2.  **Sign vs Verify Asymmetry**: RSA signing is much slower than verification (due to private key operations). ECDSA has the opposite ratio. Understanding this affects architecture decisions.
3.  **Curve Comparison**: ECDSA P-256 vs P-384 vs P-521 have very different performance profiles. Most deployments use P-256, but compliance requirements may mandate larger curves.
4.  **ECDH Performance**: Key exchange (ECDH) is a critical component of TLS handshakes. Testing this separately isolates key agreement overhead.
5.  **Block Size Sensitivity**: Symmetric algorithm performance varies with input size. Small blocks (16-256 bytes) stress initialization overhead; large blocks (8KB+) show maximum throughput.

Our benchmark includes Schmatz-aligned tests for RSA key sizes, ECDSA curves, and ECDH performance.

### Bellingrath Test Matrix Alignment

To maximize relevance to real-world production environments, our handshake tests directly mirror the configurations used in Bellingrath's Juniper testing (as shown in his presentation slide):

| Test Configuration | Protocol | Certificate | Cipher Suite | Our Metric Name |
|--------------------|----------|-------------|--------------|-----------------|
| TLS 1.3 Default | TLS 1.3 | RSA-2048 | TLS_AES_128_GCM_SHA256 | `tls1_3_rsa_aes128gcm_cps` |
| TLS 1.3 Default | TLS 1.3 | ECDSA P-256 | TLS_AES_128_GCM_SHA256 | `tls1_3_ecdsa_new_cps` |
| TLS 1.2 Workhorse | TLS 1.2 | RSA-2048 | ECDHE-RSA-AES128-GCM-SHA256 | `tls1_2_ecdhe_rsa_aes128gcm_cps` |
| TLS 1.2 EC Auth | TLS 1.2 | ECDSA P-256 | ECDHE-ECDSA-AES128-GCM-SHA256 | `tls1_2_ecdhe_ecdsa_aes128gcm_cps` |
| TLS 1.2 AES-256 | TLS 1.2 | RSA-2048 | AES256-GCM-SHA384 | `tls1_2_rsa_aes256gcm_cps` |
| Session Resumption | TLS 1.3 | RSA-2048 | (default) | `tls1_3_rsa_resume_cps` |
| Session Resumption | TLS 1.2 | RSA-2048 | (default) | `tls1_2_rsa_resume_cps` |

**Why both RSA and ECDSA?**
*   RSA-2048 remains the dominant certificate type in enterprise environments.
*   ECDSA (Elliptic Curve) is faster for signing/verification and increasingly used by cloud providers (AWS, Cloudflare).
*   Comparing both reveals whether regressions are algorithm-specific or architectural.

**Why these cipher suites?**
*   `ECDHE-RSA-AES128-GCM-SHA256` is the most common TLS 1.2 cipher suite in the wild (used by ~60% of TLS 1.2 connections according to Qualys SSL Labs).
*   `TLS_AES_128_GCM_SHA256` is one of only five permitted TLS 1.3 cipher suites and the most widely deployed.
*   `AES256-GCM-SHA384` represents the "high security" configuration often mandated by compliance requirements.

---

## Architecture & Design

To ensure fair and reproducible results, this benchmark uses a **Containerized Matrix Build** approach:

1.  **Isolation:**
    Each OpenSSL version runs in its own isolated Docker container (based on `debian:bookworm-slim`). This ensures that:
    *   No shared libraries conflict.
    *   All versions run on the exact same OS base.
    *   Compilation tools (gcc, make) are identical for every version.

2.  **Source Compilation:**
    We do *not* use `apt-get install openssl`. We download the official source tarball for every version and compile it from scratch. This guarantees we are testing the upstream code as released by the OpenSSL project, without distribution-specific patches or optimizations.

3.  **Local Loopback Testing:**
    The handshake test runs against `localhost`. This is intentional. By eliminating network latency (which is variable and unpredictable), we ensure that any difference in test duration is due to **CPU processing time** within the library itself, not network jitter.

## Reading the Results

The final report provides a comparative table against **OpenSSL 1.1.1w** (the baseline).

*   **Negative % (e.g., -15%):** Indicates a regression. The new version is slower than 1.1.1w.
*   **Positive %:** Indicates an improvement.
*   **Throughput vs. Handshake:** You may notice throughput *improving* while handshakes *degrade*. This is a known characteristic of OpenSSL 3.0's architecture: the individual algorithms are highly optimized (often faster), but the "management" overhead of setting up those algorithms (the Provider model) adds cost to the setup phase (the handshake).

