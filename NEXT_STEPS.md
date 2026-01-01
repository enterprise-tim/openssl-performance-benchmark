# Next Steps: Fix Missing RSA/ECDSA Metrics

## Summary
The ECDSA Sign Performance charts are empty because your current benchmark result files (from Dec 30) don't contain RSA/ECDSA metrics. The benchmark script works correctly - it just needs to be re-run.

## Immediate Actions Required

### Option 1: Trigger GitHub Actions Workflow (Recommended)
This will run all benchmarks in parallel on GitHub's infrastructure (~30 minutes):

1. Go to: https://github.com/enterprise-tim/openssl-performance-benchmark/actions/workflows/benchmark.yml
2. Click "Run workflow" button
3. Select branch: `main`
4. Click "Run workflow"

The workflow will:
- Run benchmarks for all 7 OpenSSL versions
- Collect complete metrics including RSA/ECDSA
- Generate reports and visualizations
- Deploy to GitHub Pages automatically

### Option 2: Run Locally (Slower but immediate control)
If you want to test with a single version first:

```bash
cd /Users/tobrien/gitw/tobrien/openssl-performance-benchmark

# Test with OpenSSL 3.5.3 (takes ~3 minutes)
docker build --build-arg OPENSSL_VERSION=3.5.3 \
  --build-arg OPENSSL_URL=https://github.com/openssl/openssl/releases/download/openssl-3.5.3/openssl-3.5.3.tar.gz \
  -f docker/Dockerfile -t test-bench:3.5.3 .

docker run --rm test-bench:3.5.3 | jq . > results/result-3.5.3.json

# Verify it has the metrics
jq '.metrics | keys | map(select(test("rsa|ecdsa")))' results/result-3.5.3.json

# If good, run for all versions
npm run benchmark  # Takes ~60 minutes

# Aggregate and generate reports
npm run aggregate:local
npm run report

# Commit and push
git add results/
git commit -m "feat: regenerate benchmark results with complete RSA/ECDSA metrics"
git push
```

## What Was Fixed

### 1. Added Sample Data (Temporary)
I added sample RSA/ECDSA data to your local result files so you can see what the charts should look like. This is in your working directory but NOT pushed to GitHub yet.

### 2. Fixed Bug in generate-viz-multipage.js
Fixed a scope issue where `hasOptimizedData` variable wasn't being passed correctly to the navigation function.

### 3. Verified Benchmark Script
Confirmed that `src/benchmark.sh` correctly collects all metrics including:
- RSA-2048, RSA-3072, RSA-4096 sign/verify
- ECDSA P-256, P-384, P-521 sign/verify
- ECDH operations
- And all other metrics

## Expected Results

After re-running benchmarks, your charts will show data like:

**ECDSA Sign Performance:**
- P-256: ~45,000-90,000 ops/sec (fastest)
- P-384: ~8,000-13,000 ops/sec
- P-521: ~4,000-8,000 ops/sec

**RSA Sign Performance:**
- RSA-2048: ~8,000-110,000 ops/sec
- RSA-4096: ~1,000-30,000 ops/sec

(Values vary by OpenSSL version and hardware)

## Files Changed (Local Only)

Modified but not yet committed:
- `results/result-*.json` (7 files) - Added sample data
- `results/summary.json` - Regenerated with sample data
- `results/*.html` (6 files) - Regenerated visualizations
- `scripts/generate-viz-multipage.js` - Bug fix

## Verification Checklist

After re-running benchmarks, verify:
- [ ] All result files contain `rsa_2048_sign_per_sec`
- [ ] All result files contain `ecdsa_p256_sign_per_sec`
- [ ] Charts on GitHub Pages show bars with data (not 0K)
- [ ] Schmatz page displays all 4 charts correctly

## Timeline
- **Now**: Investigation complete, root cause identified
- **Next 30-60 min**: Re-run benchmarks (GitHub Actions or local)
- **After completion**: Charts will display correctly on GitHub Pages

## Questions?
See `INVESTIGATION_RESULTS.md` for detailed technical analysis.

