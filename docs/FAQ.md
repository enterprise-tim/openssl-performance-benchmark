# Frequently Asked Questions

## Benchmark Methodology

### Q: Are synthetic benchmarks representative of real-world performance?

**A:** No, but that's intentional. This benchmark measures the **library overhead ceiling**. Tools like `openssl speed` isolate cryptographic performance. 

Real applications (Nginx, Node.js) spend time on HTTP parsing, TCP management, and logging. A 15% OpenSSL regression might only cause a 1-2% application slowdown. 

We're measuring the engine, not the whole car. If the library is slower, the application cannot be faster, but other factors will dilute the impact.

### Q: Why test on localhost instead of over a real network?

**A:** To eliminate network jitter. The `s_time` handshake test connects to `s_server` on localhost to measure CPU cost, not network latency.

In production, network RTT often dominates connection time. A 0.5ms CPU regression might be invisible against 50ms of network latency. Testing on localhost isolates the CPU efficiency we're trying to measure.

### Q: Why compile from source instead of using distro packages?

**A:** To compare codebases, not packagers' optimization skills.

Linux distributions apply heavy patching and compiler flags (`-O3`, `-march=native`). Using upstream defaults ensures we're comparing OpenSSL 1.1 vs 3.x code changes, not Debian's vs RHEL's build process.

Absolute numbers may differ from `apt-get install openssl`, but relative regressions between versions remain valid.

### Q: Doesn't Docker add overhead?

**A:** On Linux, Docker overhead is negligible (syscall isolation). On macOS/Windows, there is virtualization overhead.

However, since every version runs in the same Docker environment, the overhead cancels out. We're measuring trends across versions, not absolute hardware limits.

### Q: Is s_server single-threaded?

**A:** Yes. `openssl s_server` is a simple test tool, not a production server.

However, it runs the same OpenSSL version being tested. If OpenSSL 3.x makes the server slower to accept connections, that's part of the regression. The single-threaded nature is consistent across all tested versions.

---

## Statistical Iterations

### Q: Why run each version multiple times?

**A:** To eliminate measurement noise and provide statistical confidence. A single run might be affected by temporary system conditions. Multiple iterations reveal whether performance is consistent or variable.

Results include mean ± standard deviation. Low stddev indicates reliable measurement; high stddev suggests investigating system interference.

### Q: How many iterations should I use?

**A:** Depends on your needs:
- **2 iterations:** Minimal statistics, fast
- **3 iterations:** Recommended default
- **10 iterations:** Publication quality
- **20 iterations:** Maximum confidence

Each iteration runs in a fresh Docker container. GitHub Actions runs all in parallel, so wall-clock time stays the same (~30 minutes), but CI minutes scale linearly.

### Q: What if I see high standard deviation (>5%)?

**A:** High variance indicates performance instability. Possible causes:
- System load during test
- Thermal throttling
- Resource contention

Solutions:
- Increase iterations to 10+
- Review `detailed-iterations.json` for outliers
- Check CI runner specifications

---

## Testing and Validation

### Q: Do I need to run the full benchmark to test changes?

**A:** No. The system has multiple testing layers:
- **Unit tests:** 2 seconds (`npm test`)
- **Docker validation:** 2-3 minutes per version (`./scripts/test-docker-build.sh quick <version>`)
- **Full benchmark:** 60+ minutes

Test incrementally. Most issues are caught by unit tests.

### Q: How do I test OpenSSL 1.1.1 compatibility?

**A:** The benchmark script automatically detects version differences (e.g., `s_time` CLI flags differ between 1.1.1 and 3.x).

Test locally:
```bash
./scripts/test-docker-build.sh full 1.1.1w
```

The script handles version-specific commands automatically.

### Q: Can I test without Docker?

**A:** For unit tests, yes (`npm test`). For benchmark validation, Docker is required as it provides the isolated build environment.

---

## Report Generation

### Q: Do I need to re-run benchmarks to fix a report typo?

**A:** No. Reports are completely separate from benchmarks.

Benchmarks generate JSON files. Reports read those files. Regenerate reports unlimited times:
```bash
npm run report  # 2 seconds
```

See `docs/REGENERATING_REPORTS.md` for details.

### Q: How do I regenerate reports in GitHub Actions?

**A:** Use the dedicated workflow:
```bash
gh workflow run regenerate-reports.yml
```

This downloads existing benchmark results and regenerates reports without re-running benchmarks. Takes ~3 CI minutes vs ~630 for full benchmark.

### Q: Can I use older benchmark results?

**A:** Yes. Specify the run ID:
```bash
gh workflow run regenerate-reports.yml -f run_id=1234567890
```

Or download locally:
```bash
gh run download <run-id>
mv result-*.json results/
npm run report
```

---

## Visualizations

### Q: Why separate HTML pages instead of tabs?

**A:** Deep linking. Separate pages allow:
- Direct URLs: `benchmark/schmatz.html`
- Bookmarkable charts
- Sharing specific results
- Faster page loads (only loads current chart)

### Q: Can I still get a single-page view?

**A:** Yes:
```bash
npm run generate-viz:single
```

Generates `results/visualizations.html` with the old tab-based layout.

### Q: What are the error bars on charts?

**A:** When multiple iterations are run, error bars show ±1 standard deviation. They visualize measurement confidence - smaller bars indicate more consistent performance.

---

## Configuration

### Q: How do I add a new OpenSSL version?

**A:** 
1. Add to `config/versions.json`
2. Test locally: `./scripts/test-docker-build.sh quick <version>`
3. If successful, push

Always test locally first to avoid wasting CI minutes on build failures.

### Q: Can I test different iteration counts per metric?

**A:** Not currently. The `iterations` setting applies to all benchmarks. This is a potential future enhancement.

### Q: How do I reduce CI costs?

**A:** Options:
- Reduce iterations to 2: `{"iterations": 2}`
- Change schedule to bi-weekly
- Use manual triggers only
- Test locally instead of CI

---

## AVX Impact Testing

### Q: What are AVX and AVX2?

**A:** Advanced Vector Extensions (AVX/AVX2) are CPU instruction set extensions that enable SIMD (Single Instruction Multiple Data) operations. They allow processing multiple data elements simultaneously, significantly accelerating cryptographic operations.

### Q: Does the benchmark test AVX impact?

**A:** Yes. The benchmark automatically runs with and without AVX enabled to measure the performance difference. This is controlled using the `OPENSSL_ia32cap` environment variable, which tells OpenSSL which CPU features to use at runtime.

### Q: How is AVX disabled without recompiling?

**A:** OpenSSL supports the `OPENSSL_ia32cap` environment variable to control which CPU features it uses at runtime. Setting `OPENSSL_ia32cap=~0x200000200000000:~0x20` disables AVX/AVX2 bits in the CPU capability mask.

This is incredibly useful because:
- Same Docker image can test both configurations
- No recompilation needed
- Measures pure AVX impact vs other optimizations

### Q: Do GitHub Actions runners support AVX?

**A:** Yes. The `ubuntu-latest` and `ubuntu-latest-4-cores` runners use Intel Xeon or AMD EPYC processors that typically support AVX, AVX2, and often AVX-512.

The benchmark automatically detects AVX support and skips AVX comparison tests if running on hardware without AVX (e.g., some virtualized environments).

### Q: Why is AVX particularly important for ML-KEM?

**A:** ML-KEM (Kyber) is a lattice-based post-quantum algorithm that involves many matrix and polynomial operations. These operations map extremely well to SIMD instructions:

- **Vector additions/multiplications:** Core of lattice operations
- **Parallel NTT (Number Theoretic Transform):** AVX2 accelerates by 4-8x
- **Packing/unpacking:** Vectorized bit manipulation

You'll often see 50-100%+ improvement with AVX enabled for ML-KEM vs disabled.

### Q: How do I run the AVX impact test locally?

**A:** Use the standalone test script:
```bash
./scripts/test-avx-impact.sh 3.5.4
```

Or run inside a Docker container:
```bash
docker run --rm openssl-bench:3.5.4 ./avx_benchmark.sh
```

### Q: What if my server doesn't have AVX?

**A:** Servers without AVX support (older hardware, some virtualized environments) will see significantly reduced performance for:
- Post-quantum cryptography (ML-KEM, ML-DSA)
- Vectorized symmetric operations
- Modern hash implementations (SHA-NI)

For optimal OpenSSL 3.5+ performance, especially with PQC, ensure your servers have AVX2 capability.

### Q: Can I disable other CPU features for testing?

**A:** Yes. `OPENSSL_ia32cap` can control many features:
- AES-NI: `OPENSSL_ia32cap=~0x200000000` 
- AVX: `OPENSSL_ia32cap=~0x10000000000000000`
- AVX2: `OPENSSL_ia32cap=:~0x20`
- Multiple features: Combine with `:` separator

This is useful for testing on development machines to simulate older hardware.

---

## Technical Details

### Q: What tools are used for each metric?

**A:**
- **Throughput:** `openssl speed -evp [algo]` (uses hardware acceleration)
- **Handshakes:** `openssl s_time` + `openssl s_server`
- **Asymmetric ops:** `openssl speed [algo]` (RSA, ECDSA, ECDH)
- **PQC:** `openssl speed ml-kem-768` (OpenSSL 3.5+ only)

### Q: Why use `-evp` flag?

**A:** The EVP (Envelope) interface allows hardware acceleration (AES-NI). Testing without `-evp` measures software-only implementation, which is irrelevant for production use.

### Q: What is a "block size" in cryptographic benchmarks?

**A:** In cryptographic benchmarks, "block size" refers to the **size of data chunks** being encrypted or hashed in a single operation—NOT the underlying cipher's internal block size.

**Understanding the terminology:**

1. **Cipher block size (fixed):** AES always operates on 128-bit (16-byte) internal blocks. This is a property of the algorithm itself and cannot be changed.

2. **Benchmark block size (variable):** The amount of data passed to the encryption function in one call. When we test "8KB blocks," we're encrypting 8,192 bytes in a single `EVP_EncryptUpdate()` call.

**Why block size matters for performance:**

Every encryption operation has overhead:
- **Context initialization:** Setting up the cipher context
- **Key schedule:** Preparing round keys
- **Provider lookup (OpenSSL 3.x):** Finding the algorithm implementation
- **Function call overhead:** Entry/exit costs

**Example comparison:**

| Scenario | Data Size | Block Size | Operations | Overhead Impact |
|----------|-----------|------------|------------|-----------------|
| IoT sensor | 64 bytes | 64B | 1 per message | **High** - 100% overhead per message |
| Database field | 256 bytes | 256B | 1 per field | **Medium** - overhead still significant |
| File encryption | 1 MB | 8KB | 128 operations | **Low** - overhead amortized |
| TLS record | 16KB | 16KB | 1 per record | **Minimal** - bulk throughput |

**Real-world implications:**

- **Chat applications** encrypting 100-byte messages see lower throughput than the "8KB" benchmark numbers suggest
- **Bulk file encryption** achieves near-maximum throughput shown in benchmarks
- **Database encryption** (per-field) falls somewhere in between

This is why we test multiple block sizes: to help you understand performance across different use cases.

### Q: What block sizes are tested in this benchmark?

**A:** 16B, 64B, 256B, 1KB, and 8KB. 
- Small blocks (16-64B) stress initialization overhead
- Large blocks (8KB) show maximum throughput
- The gap reveals Provider architecture overhead in OpenSSL 3.x

**Note:** Currently, only 1KB and 8KB block size data is captured in the benchmark results. Smaller block sizes (16B, 64B, 256B) require additional benchmark runs to collect.

---

## Interpreting Results

### Q: Why does throughput improve but handshakes slow down in OpenSSL 3.x?

**A:** Different architectural components:

**Throughput increase:** Updated assembly optimizations, better pipelining for bulk operations.

**Handshake decrease:** Provider model introduces abstraction layers. Handshakes involve many small operations (RNG, hashing, signing), and per-operation overhead accumulates.

### Q: Why is TLS 1.2 session resumption faster than TLS 1.3?

**A:** TLS 1.2 session resumption completely bypasses asymmetric crypto. TLS 1.3 PSK resumption still performs HKDF key derivation and potentially ephemeral DH for enhanced forward secrecy.

TLS 1.2 resumption: 30-40K+ CPS
TLS 1.3 resumption: 6-7K CPS

TLS 1.3 provides better security properties, but TLS 1.2 resumption remains faster in pure throughput.

### Q: How do I know if results are reliable?

**A:** Check the standard deviation:
- <1%: Excellent consistency
- 1-5%: Acceptable
- >5%: Investigate

Also review `detailed-iterations.json` for outliers or patterns.

---

## Cost and Resources

### Q: How much do GitHub Actions runs cost?

**A:** With 7 versions × 3 iterations:
- Per run: ~630 CI minutes
- Free tier: 2,000 minutes/month
- Weekly runs: 2,520 minutes/month (exceeds free tier by ~$4/month)

Testing locally and using the regenerate-reports workflow can reduce costs significantly.

### Q: How long does it take locally?

**A:**
- Benchmarks: 60-120 minutes (sequential)
- Tests: <2 seconds
- Docker validation: 15-20 minutes (all versions)
- Report generation: 2-3 seconds

---

## Post-Quantum Cryptography (PQC)

### Q: What is ML-KEM-768 and why is it tested?

**A:** ML-KEM (formerly CRYSTALS-Kyber) is a lattice-based key encapsulation mechanism standardized by NIST in FIPS 203 (August 2024). It's designed to resist attacks from quantum computers.

ML-KEM-768 is the medium security level, providing approximately 192-bit classical and 128-bit post-quantum security. It's the recommended level for most applications.

### Q: Why compare ML-KEM to ECDH, not ECDSA?

**A:** ML-KEM and ECDH serve the same purpose: **key exchange** (establishing a shared secret). ECDSA is a **signature algorithm** (authentication), which serves a different purpose. 

The post-quantum equivalent of ECDSA is ML-DSA (CRYSTALS-Dilithium), not ML-KEM.

### Q: When will quantum computers break current cryptography?

**A:** This is unknown, but conservative estimates suggest:
- **2030-2035:** Possible early cryptographically-relevant quantum computers
- **2035-2040:** More likely timeline for widespread capability

The real concern is **"harvest now, decrypt later"** attacks where adversaries capture encrypted traffic today to decrypt in the future. Data that needs protection beyond 2030 should consider PQC today.

### Q: Why is ML-KEM performance close to ECDH?

**A:** ML-KEM uses highly optimized lattice operations (Number Theoretic Transform) that map well to modern SIMD instructions (AVX2, AVX-512). With AVX2 enabled, ML-KEM-768 often performs within 2x of ECDH P-256, sometimes faster than ECDH P-384.

The overhead isn't in computation but in **bandwidth**: ML-KEM public keys are ~1,184 bytes vs 32 bytes for ECDH P-256.

---

## Benchmark Limitations

### Q: What doesn't this benchmark measure?

**A:** This benchmark focuses on isolated cryptographic performance. It does **not** measure:

- **Application-level performance:** Real applications have HTTP parsing, database queries, and business logic that dwarf crypto overhead.
- **Memory pressure:** We measure peak memory but not garbage collection behavior or memory fragmentation.
- **Sustained load behavior:** Tests run for seconds, not hours. Long-running servers may exhibit different characteristics.
- **Network effects:** All tests run on localhost to isolate CPU performance.

### Q: Why might my production results differ?

**A:** Several factors affect real-world performance:

1. **Kernel and syscall overhead:** Our containerized tests minimize but don't eliminate this.
2. **NUMA effects:** Multi-socket servers may show different scaling.
3. **Thermal throttling:** Long benchmark runs on laptops may throttle.
4. **Background processes:** Production servers have monitoring, logging, etc.
5. **TLS library wrappers:** Applications often use OpenSSL through higher-level libraries that add their own overhead.

### Q: Should I expect the exact same performance in production?

**A:** No. This benchmark measures **relative performance** across OpenSSL versions, not absolute production numbers. Use it to:

1. Understand regression trends between versions
2. Compare algorithm performance characteristics
3. Identify configuration improvements (like Mráz optimizations)

For production capacity planning, benchmark your actual application under realistic load.

---

## For More Information

- `docs/ITERATIONS.md` - Statistical iterations
- `docs/TESTING.md` - Testing guide
- `docs/REGENERATING_REPORTS.md` - Report regeneration
- `docs/ECDH_VS_ECDSA_CLARIFICATION.md` - ECDH vs ECDSA explanation
- `guide/metrics.md` - Metrics explained
- `guide/usage.md` - Usage instructions

