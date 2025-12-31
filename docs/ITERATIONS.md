# Statistical Iterations

## Overview

Each OpenSSL version is tested **multiple times** (default: 3) in separate containers to ensure measurement reliability. All metrics include mean, standard deviation, min, and max values.

---

## Configuration

Edit `config/versions.json`:
```json
{
  "iterations": 3,
  "versions": [
    {
      "version": "3.5.3",
      "url": "https://github.com/openssl/openssl/releases/download/openssl-3.5.3/openssl-3.5.3.tar.gz",
      "series": "3.5"
    }
  ]
}
```

**Iteration options:**
- `2`: Minimal statistics
- `3`: Recommended default
- `10`: Publication quality
- `20`: Maximum confidence

## How It Works

### GitHub Actions (Parallel)

```
Matrix Generation: 7 versions × 3 iterations = 21 jobs
  ↓
Each job runs in fresh Docker container (parallel)
  ↓
Upload 21 result files: result-[version]-iter[N].json
  ↓
Aggregation: Compute mean, stddev, min, max
  ↓
Reports: Display "6,465 ± 12 conn/sec"
```

**Time:** ~30 minutes (parallel execution)
**CI Cost:** 630 minutes per run (vs 210 for single iteration)

### Local Execution (Sequential)

```
For each version:
  For each iteration:
    Build Docker container
    Run benchmark
    Save result-[version]-iter[N].json
  ↓
Aggregate results
  ↓
Generate reports
```

**Time:** ~90-120 minutes for 7 versions × 3 iterations (sequential)

---

## Reading Results

### Console Output

```
Statistical Analysis: 3 iterations per version
Version    New Connections
3.5.3      6,465 ± 12        ← Mean ± Stddev (0.19% variance)
```

### Interpreting Standard Deviation

| Stddev % | Meaning | Action |
|----------|---------|--------|
| < 1% | Excellent consistency | Reliable |
| 1-5% | Acceptable variance | WARNING: OK, consider more iterations for papers |
| > 5% | High variance | Investigate - increase iterations or check for interference |

**Examples:**
- `6,465 ± 12` (0.19%) → Excellent!
- `6,465 ± 193` (3%) → Acceptable
- `6,465 ± 646` (10%) → Investigate!

---

## Configuration Scenarios

### Development: Fast Iteration
```json
{"iterations": 2}
```
- 420 CI minutes/run
- Fits in free tier with weekly runs
- Still provides basic statistics

### Production: Balanced
```json
{"iterations": 3}
```
- 630 CI minutes/run
- Good confidence
- **Recommended default**

### Publication: High Confidence
```json
{"iterations": 10}
```
- 2,100 CI minutes/run
- Scientific rigor
- Use for papers or critical analysis

---

## Implementation Details

### What Changed

1. **`config/versions.json`** - Added `iterations` field
2. **Workflow** - Matrix generates version × iteration combinations
3. **`scripts/aggregate-results.js`** - NEW: Computes statistics
4. **Reports** - Display mean ± stddev
5. **Visualizations** - Error bars showing ±1 stddev

### Output Structure

```json
{
  "config": {
    "version": "3.5.3",
    "iterations_count": 3
  },
  "metrics": {
    "aes_256_gcm_8k_kbs": 2950000,        // Mean
    "aes_256_gcm_8k_kbs_stddev": 4082,    // Std Dev
    "aes_256_gcm_8k_kbs_min": 2945000,    // Min
    "aes_256_gcm_8k_kbs_max": 2955000     // Max
  }
}
```

### Files Generated

**Iteration results:**
```
result-3.5.3-iter1.json
result-3.5.3-iter2.json
result-3.5.3-iter3.json
```

**Aggregated:**
```
summary.json                    (mean, stddev, min, max)
detailed-iterations.json        (all raw data)
```

---

## GitHub Actions

### Cost Calculation

```
Versions: 7
Iterations: 3
Jobs: 7 × 3 = 21
CI minutes: 21 × 30 = 630 per run

Weekly: 630 × 4 = 2,520 minutes/month
Free tier: 2,000 minutes/month
Overage: 520 minutes = ~$4/month
```

### Solutions for Free Tier

**Option 1:** Bi-weekly schedule
```yaml
schedule:
  - cron: '0 3 1,15 * *'
```
Result: 1,260 minutes/month ✅

**Option 2:** Reduce iterations to 2
```json
{"iterations": 2}
```
Result: 1,680 minutes/month ✅

**Option 3:** Manual triggers only

---

## Local Usage

### Manual Aggregation

```bash
# Run benchmarks multiple times
npm run benchmark  # Creates result files

# Rename with iteration numbers
mv results/result-3.5.3.json results/result-3.5.3-iter1.json
# Repeat for iter2, iter3...

# Aggregate
node scripts/aggregate-results.js results results

# Generate reports
npm run report
```

### Using CI Results Locally

```bash
# Download from GitHub Actions
gh run download <run-id>

# Move to results
mv result-*.json results/

# Aggregate and generate reports
npm run aggregate:local
npm run report
```

---

## Troubleshooting

### No Standard Deviations Shown

**Cause:** `iterations: 1` or not set  
**Fix:** Set `"iterations": 3` in `config/versions.json`

### Aggregation Fails

**Cause:** Missing result files  
**Fix:** Check workflow logs, ensure all builds succeeded

### High Standard Deviations (> 5%)

**Cause:** Performance instability  
**Fix:**
- Increase to 10 iterations
- Check for system interference
- Review `detailed-iterations.json` for outliers

---

## Backward Compatibility

If `iterations` is not set, defaults to 1 (single run, no statistics). Single-iteration results display without stddev. No breaking changes.

---

## Commands

```bash
# Change iterations
vim config/versions.json

# Test locally (with mock data)
node scripts/aggregate-results.js test-data results

# Run full benchmark
npm run benchmark

# Aggregate manually
npm run aggregate:local

# Generate reports
npm run report
```

---

## Quick Reference

```bash
# Check iteration setting
jq '.iterations' config/versions.json

# Test locally
npm test

# Test Docker builds
npm run test:docker

# Run benchmarks
npm run benchmark

# Regenerate reports (without re-running benchmarks)
npm run report
```

## Key Points

- Default: 3 iterations per version
- Each iteration runs in fresh Docker container
- GitHub Actions: All iterations run in parallel
- Local: Iterations run sequentially
- Results include mean, stddev, min, max
- Reports regenerate in seconds without re-running benchmarks

