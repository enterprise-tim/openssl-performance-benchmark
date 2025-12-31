# Regenerating Reports Without Re-Running Benchmarks

## Problem

Benchmarks take a long time to run (~30-60 minutes locally, ~30 minutes in CI with 630 CI minutes consumed). If you just need to tweak report formatting or add a new visualization, you don't want to re-run all the benchmarks.

## Solution

The benchmark and report generation are **completely separate**. You can regenerate reports as many times as you want from existing results.

---

## Architecture (Clarified)

### Separate Steps

```
Step 1: Run Benchmarks (once, takes time)
  ↓
  Generates: result-*.json files
  ↓
Step 2: Aggregate Results (fast, ~1 second)
  ↓
  Reads: result-*.json files
  Outputs: summary.json, detailed-iterations.json
  ↓
Step 3: Generate Reports (fast, ~2 seconds)
  ↓
  Reads: summary.json
  Outputs: REPORT.md, *.html files
  ↓
Step 4: Deploy (optional)
  ↓
  Uploads: All report files to GitHub Pages
```

**Key insight:** Steps 2-4 can be repeated without re-running Step 1!

---

## Local Workflow

### Scenario 1: Tweak Report Formatting

```bash
# 1. You already have results from a previous benchmark
ls results/summary.json  # Should exist

# 2. Edit report generator
vim scripts/generate-report.js

# 3. Regenerate report (2 seconds)
npm run generate-report

# 4. Check output
cat results/REPORT.md
```

**Time:** 2 seconds (vs. 30-60 minutes to re-run benchmark)

### Scenario 2: Modify Visualization

```bash
# 1. Check existing results
ls results/summary.json

# 2. Edit visualization generator
vim scripts/generate-viz-multipage.js

# 3. Test with watch mode
npm run test:viz:watch

# 4. Regenerate visualizations (2 seconds)
npm run generate-viz

# 5. Preview
open results/index.html
```

**Time:** 2 seconds per iteration

### Scenario 3: Re-aggregate with Different Logic

```bash
# 1. You have iteration files
ls results/result-*-iter*.json

# 2. Edit aggregation logic
vim scripts/aggregate-results.js

# 3. Re-aggregate (1 second)
npm run aggregate:local

# 4. Regenerate reports
npm run report

# 5. Check output
open results/index.html
```

**Time:** ~3 seconds total

### Scenario 4: All Reports from Scratch

```bash
# One-step regeneration (interactive)
npm run report:regen
```

**What it does:**
1. Checks for existing results
2. Optionally re-aggregates if you have iteration files
3. Regenerates markdown report
4. Regenerates all visualizations
5. Lists all outputs

**Time:** ~5 seconds

---

## GitHub Actions Workflow

### Trigger Report Regeneration

**Without re-running benchmarks:**

```bash
# Method 1: Use GitHub CLI
gh workflow run regenerate-reports.yml

# Method 2: Use GitHub CLI with specific run
gh workflow run regenerate-reports.yml -f run_id=1234567890

# Method 3: Use GitHub UI
# Navigate to: Actions → Regenerate Reports Only → Run workflow
```

**What happens:**
1. Downloads results from latest (or specified) benchmark run
2. Re-aggregates if needed
3. Regenerates markdown report
4. Regenerates all visualizations
5. Deploys to GitHub Pages

**Time:** ~2-3 minutes
**Cost:** ~2-3 CI minutes (vs. 630 for full benchmark!)

---

## Use Cases

### Use Case 1: Fix Typo in Report

**Problem:** You notice a typo in `REPORT.md`

**Solution:**
```bash
# 1. Fix typo
vim scripts/generate-report.js

# 2. Test
npm test

# 3. Regenerate
npm run generate-report

# 4. Verify
cat results/REPORT.md | grep "fixed text"

# 5. Push
git push

# 6. Trigger report regeneration in GitHub Actions
gh workflow run regenerate-reports.yml
```

**Time:** Minutes (vs. hours for full benchmark)
**Cost:** ~2 CI minutes (vs. 630)

### Use Case 2: Add New Chart

**Problem:** You want to add a new visualization

**Solution:**
```bash
# 1. Edit generator
vim scripts/generate-viz-multipage.js

# 2. Add new chart function
# 3. Add new page generation

# 4. Test locally (watch mode)
npm run test:viz:watch

# 5. Regenerate from existing data
npm run generate-viz

# 6. Preview
open results/my-new-chart.html

# 7. Push when ready
git push

# 8. Regenerate in GitHub Actions
gh workflow run regenerate-reports.yml
```

**Time:** Instant feedback in watch mode
**Cost:** ~2 CI minutes to deploy

### Use Case 3: Change Report Format

**Problem:** You want to change from "mean ± stddev" to "mean (stddev)"

**Solution:**
```bash
# 1. Edit formatNumWithStddev function
vim scripts/generate-report.js

# 2. Test
npm test

# 3. Regenerate
npm run report

# 4. Review
open results/index.html

# 5. If good, push and deploy
git push
gh workflow run regenerate-reports.yml
```

### Use Case 4: Use Older Benchmark Results

**Problem:** Latest benchmark failed, want to use previous results

**Solution:**
```bash
# Find previous successful run
gh run list --workflow=benchmark.yml --status=success

# Get run ID (e.g., 1234567890)

# Regenerate from that run
gh workflow run regenerate-reports.yml -f run_id=1234567890
```

**Result:** Reports regenerated from older (working) benchmark data

---

## Downloading Results from GitHub Actions

### Method 1: GitHub CLI (Easiest)

```bash
# List recent runs
gh run list --workflow=benchmark.yml --limit=5

# Download latest successful run
RUN_ID=$(gh run list --workflow=benchmark.yml --status=success --limit=1 --json databaseId --jq='.[0].databaseId')
gh run download $RUN_ID

# Results will be in current directory
ls result-*-iter*.json

# Move to results/
mv result-*.json results/

# Regenerate reports
npm run report:regen
```

### Method 2: GitHub UI

1. Navigate to Actions → OpenSSL Performance Benchmark
2. Click on a successful run
3. Scroll down to Artifacts
4. Download `result-*` artifacts
5. Extract to `results/` directory
6. Run: `npm run report:regen`

---

## Commands Reference

### Local Commands

| Command | Purpose | Requires |
|---------|---------|----------|
| `npm run generate-report` | Regenerate markdown | `summary.json` exists |
| `npm run generate-viz` | Regenerate visualizations | `summary.json` exists |
| `npm run report` | Both reports | `summary.json` exists |
| `npm run report:regen` | Interactive regeneration | Result files exist |
| `npm run aggregate:local` | Re-aggregate iterations | `result-*-iter*.json` exist |

### GitHub Actions Commands

| Command | Purpose | Time | Cost |
|---------|---------|------|------|
| `gh workflow run benchmark.yml` | Full benchmark | 30m | ~630 min |
| `gh workflow run regenerate-reports.yml` | Reports only | 3m | ~3 min |
| `gh workflow run regenerate-reports.yml -f run_id=123` | From specific run | 3m | ~3 min |

---

## Workflow Comparison

### Full Benchmark Workflow

```
Trigger: benchmark.yml
  ↓
Build 21 Docker images (7 versions × 3 iterations)
  ↓
Run 21 benchmarks in parallel
  ↓
Upload 21 result artifacts
  ↓
Aggregate results
  ↓
Generate reports
  ↓
Deploy to GitHub Pages

Time: ~30 minutes
Cost: ~630 CI minutes
```

### Report Regeneration Workflow

```
Trigger: regenerate-reports.yml
  ↓
Download existing result artifacts
  ↓
Aggregate results
  ↓
Generate reports
  ↓
Deploy to GitHub Pages

Time: ~3 minutes
Cost: ~3 CI minutes
```

**Savings:** 210x faster, 210x cheaper!

---

## Best Practices

### 1. Separate Development Workflows

**For benchmark changes:**
```bash
vim src/benchmark.sh
./scripts/test-docker-build.sh full 3.5.3
npm run benchmark
```

**For report changes:**
```bash
vim scripts/generate-report.js
npm test
npm run generate-report
```

**For visualization changes:**
```bash
vim scripts/generate-viz-multipage.js
npm run test:viz:watch  # Edit → Save → Tests re-run
npm run generate-viz
open results/index.html
```

### 2. Keep Results Cached

```bash
# Save results after expensive benchmark
cp -r results results-backup-$(date +%Y%m%d)

# Now you can regenerate reports anytime
npm run report
```

### 3. Use GitHub Actions Artifacts

```bash
# Download once
gh run download <latest-run-id>
mv result-*.json results/

# Regenerate reports many times
npm run report
npm run report
npm run report  # As many times as needed!
```

### 4. Test Locally Before CI

```bash
# 1. Generate reports locally
npm run report

# 2. Verify they look good
open results/index.html

# 3. Then push and trigger regeneration
git push
gh workflow run regenerate-reports.yml
```

---

## Troubleshooting

### "No summary.json found"

**Problem:** Haven't run benchmarks yet

**Solution:**
```bash
# Option 1: Run benchmarks locally
npm run benchmark

# Option 2: Download from GitHub Actions
gh run download <run-id>
mv result-*.json results/
npm run aggregate:local
```

### "Regeneration shows old data"

**Problem:** Stale summary.json

**Solution:**
```bash
# Re-aggregate from iteration files
npm run aggregate:local

# Or download fresh results from CI
gh run download <run-id>
```

### "GitHub Actions can't find artifacts"

**Problem:** Benchmark run didn't complete

**Solution:**
```bash
# Check recent runs
gh run list --workflow=benchmark.yml

# Use a successful run
gh workflow run regenerate-reports.yml -f run_id=<successful-run-id>
```

---

## Quick Reference

### I want to...

**...tweak report formatting:**
```bash
vim scripts/generate-report.js
npm run generate-report
```

**...modify a chart:**
```bash
vim scripts/generate-viz-multipage.js
npm run generate-viz
```

**...regenerate everything from existing results:**
```bash
npm run report:regen
```

**...regenerate in GitHub Actions:**
```bash
gh workflow run regenerate-reports.yml
```

**...use results from specific run:**
```bash
gh workflow run regenerate-reports.yml -f run_id=1234567890
```

**...download results for local work:**
```bash
gh run download <run-id>
mv result-*.json results/
npm run report
```

---

## Cost Savings

### Example Scenario

**You need to fix 3 formatting issues in reports:**

**Without separation:**
- Run benchmark: 630 CI minutes × 3 fixes = 1,890 minutes
- Cost: ~$15
- Time: 90 minutes

**With separation:**
- Run benchmark once: 630 CI minutes
- Regenerate reports: 3 × 3 CI minutes = 9 minutes
- Cost: ~$5
- Time: 30 minutes + 9 minutes

**Savings:** $10 and 51 minutes

### Monthly Impact

Typical usage:
- Full benchmarks: 4/month (weekly)
- Report tweaks: 6/month (formatting, new charts, etc.)

**Without separation:**
- 10 full benchmark runs
- Cost: ~$50/month

**With separation:**
- 4 full benchmarks + 6 report regens
- Cost: ~$20/month

**Savings: $30/month = $360/year**

---

## Summary

**The system already separates benchmarks from reports!**

**Local:**
```bash
npm run generate-report  # Just reports
npm run generate-viz     # Just visualizations
npm run report           # Both
```

**GitHub Actions:**
```bash
# Full benchmark (630 CI minutes)
gh workflow run benchmark.yml

# Reports only (3 CI minutes)
gh workflow run regenerate-reports.yml
```

**Key points:**
- Reports read from `summary.json`
- Can regenerate unlimited times
- No need to re-run benchmarks
- Saves time and money
- Perfect for iterating on output

---

**Try it now:**
```bash
# If you have existing results
npm run report:regen
```

