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

## Technical Details

### Q: What tools are used for each metric?

**A:**
- **Throughput:** `openssl speed -evp [algo]` (uses hardware acceleration)
- **Handshakes:** `openssl s_time` + `openssl s_server`
- **Asymmetric ops:** `openssl speed [algo]` (RSA, ECDSA, ECDH)
- **PQC:** `openssl speed ml-kem-768` (OpenSSL 3.5+ only)

### Q: Why use `-evp` flag?

**A:** The EVP (Envelope) interface allows hardware acceleration (AES-NI). Testing without `-evp` measures software-only implementation, which is irrelevant for production use.

### Q: What block sizes are tested?

**A:** 16B, 64B, 256B, 1KB, and 8KB. 
- Small blocks (16-64B) stress initialization overhead
- Large blocks (8KB) show maximum throughput
- The gap reveals Provider architecture overhead in OpenSSL 3.x

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

## For More Information

- `docs/ITERATIONS.md` - Statistical iterations
- `docs/TESTING.md` - Testing guide
- `docs/REGENERATING_REPORTS.md` - Report regeneration
- `guide/metrics.md` - Metrics explained
- `guide/usage.md` - Usage instructions

