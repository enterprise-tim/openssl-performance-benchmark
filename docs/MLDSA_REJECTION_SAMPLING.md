# ML-DSA (Dilithium) Rejection Sampling Analysis

## Overview

This benchmark specifically tests the **rejection sampling retry mechanism** in ML-DSA (Dilithium) signature generation. Unlike traditional signature algorithms, Dilithium may need to **retry internally** when generating signatures, causing timing variance.

## Background: Why Dilithium Retries

### The Rejection Sampling Mechanism

Dilithium (standardized as ML-DSA in FIPS 204) uses a technique called **rejection sampling** during signature generation:

1. The signer generates a random masking polynomial `y`
2. The signer computes a candidate signature `z = y + c*s` (where `c` is the challenge, `s` is the secret key)
3. If `z` is "too close" to `s` (would leak secret key information), the attempt is **rejected** and the algorithm starts over
4. On average, this takes **4-7 attempts** to produce a valid signature

### Why This Matters

- **Security**: Rejection sampling prevents side-channel attacks by ensuring the signature distribution doesn't reveal the secret key
- **Performance Variance**: Each retry adds latency, causing some signatures to take 2-10x longer than others
- **Stress Testing**: Under high load, this variance can cause latency spikes and tail latency issues

### Schmatz's Concern

Martin Schmatz (IBM) raised concerns about how this retry mechanism behaves under stress:
- Can the retry count explode under certain conditions?
- Does CPU contention or memory pressure affect retry rates?
- How does timing variance manifest in real workloads?

## What This Benchmark Measures

The `mldsa_bench.c` tool captures detailed timing statistics for each individual signing operation:

### Metrics Collected

| Metric | Description | Why It Matters |
|--------|-------------|----------------|
| **Mean Time** | Average signing time | Baseline performance |
| **Std Deviation** | Timing spread | High = more retry variance |
| **CV%** (Coefficient of Variation) | stddev/mean × 100 | Normalized variance metric |
| **Min/Max Time** | Fastest/slowest operations | Bounds of retry impact |
| **P50/P95/P99** | Percentile latencies | Tail latency analysis |
| **P99.9** | 99.9th percentile (1 in 1,000) | Extreme tail for high-traffic systems |
| **P99.99** | 99.99th percentile (1 in 10,000) | Worst-case for SLA guarantees |
| **Outlier Count** | Operations >2x mean | Multi-retry scenarios |
| **Outlier %** | Percentage of outliers | Frequency of retries |

### Interpreting Results

| CV% | Outlier % | Interpretation |
|-----|-----------|----------------|
| < 5% | < 2% | Exceptionally stable (unlikely for Dilithium) |
| 5-10% | 2-5% | Normal variance, well-behaved |
| 10-20% | 5-10% | Moderate variance, acceptable |
| > 20% | > 10% | High variance, investigate |

### Statistical Requirements for Tail Percentiles

| Percentile | Minimum Samples Needed | Why |
|------------|------------------------|-----|
| P99 | ~100 | At least 1 sample at the 99th position |
| P99.9 | ~1,000 | At least 1 sample at the 99.9th position |
| P99.99 | ~10,000 | At least 1 sample at the 99.99th position |

The ML-DSA benchmark runs for **90 seconds** to ensure enough samples for robust P99.9 and P99.99 measurements. At typical throughput (~1,200 ops/sec), this yields approximately **108,000 samples**, providing high confidence in tail percentile calculations.

## Running the Test

### Quick Test (Docker)

```bash
./scripts/test-mldsa-retry.sh 3.5.3
```

### As Part of Full Benchmark

The ML-DSA test runs automatically as part of the full benchmark suite for OpenSSL 3.5+:

```bash
npm run benchmark
```

### Local Compilation (requires OpenSSL 3.5+ headers)

```bash
cd src
gcc -o mldsa_bench mldsa_bench.c \
    -I/opt/openssl/include \
    -L/opt/openssl/lib64 \
    -lcrypto -lm \
    -Wl,-rpath,/opt/openssl/lib64

./mldsa_bench
```

## Sample Output

```
========================================
Testing ML-DSA-65 (Rejection Sampling Analysis)
========================================
Generating ML-DSA-65 keypair...
Keypair generated successfully
Benchmarking signing (10 seconds)...
Benchmarking verification (10 seconds)...

ML-DSA-65 SIGNING Analysis:
  Operations:     12847
  Throughput:     1284.7 ops/sec
  Mean time:      0.778 ms
  Std deviation:  0.124 ms (CV: 15.9%)
  Min time:       0.642 ms
  Max time:       2.341 ms (3.0x mean)
  P50 (median):   0.756 ms
  P95:            0.982 ms
  P99:            1.156 ms
  P99.9:          1.834 ms
  P99.99:         2.156 ms
  Outliers (>2x): 47 (0.37%)
  ⚠️  HIGH VARIANCE detected - likely rejection sampling retries!

Sign Timing Distribution (showing retry variance):
  Time (ms)     Count  Distribution
  ─────────────────────────────────────────────────────
  0.642-0.727   3421  ████████████████████████████████
  0.727-0.812   4892  ████████████████████████████████████████
  0.812-0.897   2341  ████████████████████
  0.897-0.982   1023  █████████
  0.982-1.067    412  ████
  ...
```

## Understanding the Histogram

The timing distribution histogram shows:

- **Tight cluster at min**: Most signatures complete with minimal retries
- **Long tail to the right**: Some signatures required multiple retries
- **Gap between clusters**: Can indicate distinct retry counts (1 vs 2 vs 3+ retries)

## Stress Testing Recommendations

To specifically stress the retry mechanism:

1. **CPU Contention**: Run with `--multi` to test under multi-threaded load
2. **Memory Pressure**: Limit container memory to see if it affects retry rates
3. **Extended Duration**: Run for longer periods to catch rare high-retry cases
4. **Different Security Levels**: Compare ML-DSA-44/65/87 (higher levels = more retries)

## Related Reading

- [NIST FIPS 204 (ML-DSA Standard)](https://csrc.nist.gov/pubs/fips/204/final)
- [CRYSTALS-Dilithium Paper](https://pq-crystals.org/dilithium/)
- [OpenSSL ML-DSA Implementation](https://github.com/openssl/openssl/tree/master/crypto/ml_dsa)

## FAQ

### Why doesn't verification show the same variance?

Verification is deterministic - it doesn't use rejection sampling. The verifier simply checks if the signature is valid, with no retries needed.

### Can I see the actual retry count?

Not without modifying OpenSSL. The benchmark infers retry activity through timing variance. Direct retry counting would require instrumenting OpenSSL's `ml_dsa_sign()` function.

### Is high variance a security problem?

**No.** The variance is intentional and provides security. However, it can be a **performance concern** for latency-sensitive applications.

### How does this compare to ECDSA?

ECDSA (especially with RFC 6979 deterministic nonces) has very consistent timing. Dilithium's variance is a fundamental difference in the algorithm design.

