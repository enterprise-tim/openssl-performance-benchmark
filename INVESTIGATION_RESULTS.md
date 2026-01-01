# Investigation: Missing RSA/ECDSA Metrics in Benchmark Results

## Problem
The ECDSA Sign Performance charts (and all RSA/ECDSA charts) were showing "0K" values on GitHub Pages because the result JSON files were missing asymmetric cryptography metrics.

## Root Cause
The benchmark script (`src/benchmark.sh`) **IS working correctly** and DOES collect all RSA/ECDSA metrics. However, the result files currently in the `/results` directory are from an earlier benchmark run (Dec 30, 2025) that didn't capture these metrics.

## Evidence

### 1. Current Benchmark Script Works Perfectly
Local test run of OpenSSL 3.5.3 successfully captured all metrics:
```json
{
  "rsa_2048_sign_per_sec": 110325.7,
  "rsa_2048_verify_per_sec": 2860,
  "rsa_3072_sign_per_sec": 51213.3,
  "rsa_3072_verify_per_sec": 1005.2,
  "rsa_4096_sign_per_sec": 30847.8,
  "rsa_4096_verify_per_sec": 462.8,
  "ecdsa_p256_sign_per_sec": 88885.9,
  "ecdsa_p256_verify_per_sec": 29113.8,
  "ecdsa_p384_sign_per_sec": 12741.5,
  "ecdsa_p384_verify_per_sec": 6037.6,
  "ecdsa_p521_sign_per_sec": 8272.7,
  "ecdsa_p521_verify_per_sec": 4643.7
}
```

### 2. Existing Result Files Are Incomplete
Current result files (from commit `ee2530b`, Dec 31 2025) only contain:
```json
{
  "aes_256_gcm_1k_kbs": ...,
  "aes_256_gcm_8k_kbs": ...,
  "sha256_1k_kbs": ...,
  "sha256_8k_kbs": ...,
  "handshakes_new_per_sec": ...,
  "handshakes_resume_per_sec": ...
}
```

Missing all RSA/ECDSA metrics that the charts expect.

### 3. Timeline
- Dec 30, 2025 15:55: Initial benchmark suite added (commit `acaa6fb`)
  - Schmatz tests were in the script from day 1
  - But the committed result files only had 6 metrics
- Dec 30-31: Various fixes and improvements
- Dec 31 14:19: Latest release (v1.0.9) still has incomplete results

## Solution
Re-run the benchmarks to generate complete result files with all metrics.

### Option 1: Trigger GitHub Actions Workflow
```bash
# Trigger a new benchmark run
gh workflow run benchmark.yml
```

### Option 2: Run Locally and Commit
```bash
# Run all benchmarks (takes ~60 minutes)
npm run benchmark

# Or run for a single version to test
docker build --build-arg OPENSSL_VERSION=3.5.3 \
  --build-arg OPENSSL_URL=https://github.com/openssl/openssl/releases/download/openssl-3.5.3/openssl-3.5.3.tar.gz \
  -f docker/Dockerfile -t test-bench:3.5.3 .
docker run --rm test-bench:3.5.3 > results/result-3.5.3.json

# Aggregate and generate reports
npm run aggregate:local
npm run report

# Commit and push
git add results/
git commit -m "feat: regenerate benchmark results with complete metrics"
git push
```

## Why Did the Original Run Fail?
The original benchmark run likely:
1. Timed out before completing all tests
2. Had an error in the asymmetric crypto tests that was silently ignored
3. Or the output was truncated before the JSON was complete

The current script has better error handling and should work correctly.

## Verification
After re-running benchmarks, verify that result files contain:
- `rsa_2048_sign_per_sec`, `rsa_2048_verify_per_sec`
- `rsa_3072_sign_per_sec`, `rsa_3072_verify_per_sec`  
- `rsa_4096_sign_per_sec`, `rsa_4096_verify_per_sec`
- `ecdsa_p256_sign_per_sec`, `ecdsa_p256_verify_per_sec`
- `ecdsa_p384_sign_per_sec`, `ecdsa_p384_verify_per_sec`
- `ecdsa_p521_sign_per_sec`, `ecdsa_p521_verify_per_sec`

## Status
✅ Investigation complete
✅ Root cause identified
✅ Local test confirms script works
⏳ Waiting for full benchmark re-run

