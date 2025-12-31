# Performance Metrics

This document details the specific performance metrics collected by the benchmark suite and how statistical aggregation is applied across multiple iterations.

## Statistical Reporting (NEW)

All metrics are now reported with **statistical confidence** when multiple iterations are run (default: 3):

### Metric Structure

Each metric includes:
- **Mean value**: Average across all iterations
- **Standard deviation**: Measure of variance
- **Minimum**: Lowest value observed
- **Maximum**: Highest value observed

### Example

```json
{
  "metrics": {
    "aes_256_gcm_8k_kbs": 2950000,           // Mean
    "aes_256_gcm_8k_kbs_stddev": 4082,       // Std Dev
    "aes_256_gcm_8k_kbs_min": 2945000,       // Min
    "aes_256_gcm_8k_kbs_max": 2955000        // Max
  }
}
```

### Display Format

Reports show: **"6,465 ± 12 conn/sec"**
- `6,465` = Mean value (average of iterations)
- `± 12` = Standard deviation (measurement confidence)
- Low stddev (<1%) = reliable
- High stddev (>5%) = investigate

### Interpreting Standard Deviation

| Stddev % | Interpretation | Action |
|----------|----------------|--------|
| < 1% | Excellent consistency | ✅ Reliable measurement |
| 1-5% | Acceptable variance | ⚠️ Consider more iterations if publishing |
| > 5% | High variance | ❌ Investigate system interference |

**Example:**
- `6,465 ± 12` = 0.19% variance → Excellent!
- `6,465 ± 323` = 5% variance → Acceptable
- `6,465 ± 646` = 10% variance → Investigate!

## 1. Algorithm Throughput

Measured using `openssl speed -evp [algorithm]`. These tests measure the raw speed of cryptographic primitives using the high-level Envelope (EVP) interface, which allows OpenSSL to utilize hardware acceleration (like AES-NI) where available.

### Metrics Collected

-   **AES-256-GCM**: Authenticated encryption. Measured at multiple block sizes (16B, 64B, 256B, 1KB, 8KB).
    -   *Why it matters:* This is the standard cipher for modern TLS. Large block performance indicates bulk transfer speed. Small block performance can reveal overhead in the OpenSSL "Provider" architecture (v3.0+).
    -   **Typical values:** 500 MB/s - 5 GB/s depending on CPU and OpenSSL version
    -   **Statistical variance:** Usually < 1% (hardware acceleration is very consistent)

-   **SHA256**: Hashing algorithm.
    -   *Why it matters:* Ubiquitous for digital signatures and data integrity.
    -   **Typical values:** 200 MB/s - 2 GB/s
    -   **Statistical variance:** Usually < 1%

### Statistical Properties

**Throughput metrics** typically show **low variance** (< 1%) because:
- Hardware acceleration (AES-NI) is deterministic
- CPU-bound operations are consistent
- Minimal external dependencies

**Example statistical output:**
```
AES-256-GCM (8K): 2,950,000 ± 4,082 KB/s
                  ^^^^^^^^^   ^^^^^
                  Mean        Stddev (0.14% - excellent!)
```

### Metric Keys

All throughput metrics include:
- `[metric]`: Mean value
- `[metric]_stddev`: Standard deviation
- `[metric]_min`: Minimum across iterations
- `[metric]_max`: Maximum across iterations

Example:
- `aes_256_gcm_8k_kbs`
- `aes_256_gcm_8k_kbs_stddev`
- `aes_256_gcm_8k_kbs_min`
- `aes_256_gcm_8k_kbs_max`

## 2. TLS Handshake Performance

Measured using `openssl s_time`. This test spins up a local `openssl s_server` and runs a client that performs repeated handshakes for a fixed duration (10 seconds).

**Metric:** Connections Per Second (CPS).

### Test Matrix (Bellingrath Alignment)

We follow the test matrix proposed by William Bellingrath (Juniper Networks) to isolate variables:

-   **Protocol:** TLS 1.2 vs TLS 1.3
-   **Certificate Type:** RSA-2048 vs ECDSA P-256
-   **Session State:** New Connection vs Session Resumption

| Metric Key | Description | Typical Range |
| :--- | :--- | :--- |
| `tls1_3_rsa_new_cps` | TLS 1.3 handshake with RSA-2048 cert (New) | 6,000-7,000 |
| `tls1_3_rsa_resume_cps` | TLS 1.3 handshake with RSA-2048 cert (Resumed) | 30,000-40,000 |
| `tls1_3_ecdsa_new_cps` | TLS 1.3 handshake with ECDSA P-256 cert (New) | 6,000-7,000 |
| `tls1_2_ecdhe_rsa_aes128gcm_cps` | TLS 1.2, ECDHE Key Exchange, RSA Cert | 6,000-7,000 |
| `tls1_2_ecdhe_ecdsa_aes128gcm_cps`| TLS 1.2, ECDHE Key Exchange, ECDSA Cert | 6,000-7,000 |
| `tls1_2_rsa_resume_cps` | TLS 1.2 session resumption | 30,000-50,000 |

> **Note:** Handshake performance is typically CPU-bound by asymmetric crypto operations (signing/verifying).

### Statistical Properties

**Handshake metrics** typically show **moderate variance** (1-3%) because:
- Many small operations accumulate variance
- CPU scheduling affects timing
- Memory allocations vary slightly

**Example statistical output:**
```
TLS 1.3 New Connections: 6,465 ± 12 conn/sec
                         ^^^^^   ^^
                         Mean    Stddev (0.19% - very good)
```

**Higher variance (3-5%)** may indicate:
- System load during test
- Thermal throttling
- Provider architecture overhead (OpenSSL 3.x)

### All Metric Keys Include Statistics

For each handshake metric:
- `[metric]_cps`: Mean connections per second
- `[metric]_cps_stddev`: Standard deviation
- `[metric]_cps_min`: Minimum
- `[metric]_cps_max`: Maximum

#### Understanding Session Resumption Performance

**Why TLS 1.2 Resumed Connections Show Higher Performance:**

When examining the benchmark results, you'll notice that TLS 1.2 session resumption consistently achieves significantly higher connections-per-second (often 30,000-40,000+ CPS) compared to TLS 1.3 (typically 6,000-7,000 CPS). This performance difference exists for several technical reasons:

1. **Simplified Cryptographic Path:** TLS 1.2 session resumption using session IDs or session tickets completely bypasses the expensive asymmetric cryptography operations (RSA signing/ECDSA signing, certificate verification). The client presents a session ticket, the server decrypts it to retrieve the cached master secret, and both parties derive new symmetric keys. No public key operations occur in the resumed handshake.

2. **TLS 1.3 PSK Additional Overhead:** TLS 1.3 uses Pre-Shared Key (PSK) resumption, which is more secure with better forward secrecy properties. However, it still performs:
   - HKDF (HMAC-based Key Derivation Function) operations for deriving multiple keys
   - Optional ephemeral Diffie-Hellman key exchange (for 1-RTT PSK-DHE mode)
   - Additional cryptographic computations that weren't present in TLS 1.2

3. **Code Maturity:** TLS 1.2 has been in production for over a decade and its code paths in OpenSSL have been extensively optimized. TLS 1.3 support was added in OpenSSL 1.1.1 (2018) and is still being optimized, particularly in the OpenSSL 3.x Provider architecture.

4. **Provider Architecture Overhead:** The OpenSSL 3.x Provider model introduces abstraction layers that add per-operation overhead. Since handshakes involve many small operations, this overhead accumulates more significantly than in bulk data encryption.

**Practical Implications:** In real-world scenarios, the absolute performance numbers depend on many factors (CPU, network latency, certificate chain length, etc.). However, this benchmark isolates the cryptographic performance, showing that while TLS 1.3 provides better security properties (mandatory perfect forward secrecy, encrypted handshake), TLS 1.2's session resumption remains faster in pure throughput terms. For most web servers, the additional security of TLS 1.3 outweighs the performance difference, but for extremely high-throughput environments, this trade-off is worth considering.

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

### Statistical Properties

Multi-threaded tests can show **higher variance** (2-5%) due to:
- Thread scheduling variations
- Lock contention
- CPU core availability
- Cache effects

## 6. Statistical Metadata (NEW)

### Iteration Count

All results include `config.iterations_count` indicating how many times the version was tested.

**Example:**
```json
{
  "config": {
    "version": "3.5.3",
    "iterations_count": 3
  }
}
```

### Raw Iteration Data

The `detailed-iterations.json` file preserves all individual iteration results for analysis:

```json
{
  "3.5.3": [
    { "iteration": 1, "metrics": {...} },
    { "iteration": 2, "metrics": {...} },
    { "iteration": 3, "metrics": {...} }
  ]
}
```

**Use cases:**
- Identifying outliers
- Validating aggregation
- Detailed performance analysis
- Debugging unusual variance

## Visualization of Metrics

### Error Bars

Charts include error bars showing ±1 standard deviation:

```
Scatter Plot: X-axis and Y-axis error bars
Bar Charts: Vertical error bars on each bar
```

**Interpretation:**
- Small error bars = consistent performance
- Large error bars = investigate variability

### Tooltips

Interactive tooltips show:
- Version name
- Mean value
- Standard deviation (when available)
- Min/max values (in some charts)

### Iteration Badge

All visualizations display:
```
● 3 iterations per version
```

This confirms statistical validation was applied.

## Metric Reliability

### Expected Variance by Category

| Metric Category | Expected Stddev | Notes |
|-----------------|-----------------|-------|
| **Throughput (AES, SHA)** | < 1% | Hardware acceleration is consistent |
| **New Handshakes** | 1-3% | Many operations, some variance expected |
| **Resumed Handshakes** | 2-5% | Less crypto, but more system-dependent |
| **RSA Operations** | 1-2% | CPU-bound, relatively consistent |
| **ECDSA Operations** | 1-3% | Slightly more variable than RSA |
| **PQC (ML-KEM)** | 2-5% | New code, less optimized |

### When to Re-run Benchmarks

Re-run if you see:
- **Stddev > 5%:** High variance indicates issues
- **Unexpected changes:** Large diff from previous run
- **Outliers:** One iteration dramatically different
- **After system changes:** New hardware, OS updates, etc.

**Solution:** Increase iterations to 10+ for better confidence.

