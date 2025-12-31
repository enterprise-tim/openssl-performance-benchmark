# Report Generation Separation - Quick Guide

## TL;DR

**Benchmarks and reports are completely separate!** You can regenerate reports unlimited times without re-running expensive benchmarks.

---

## The Architecture

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Run Benchmarks (Expensive - Run Once)          │
├─────────────────────────────────────────────────────────┤
│ npm run benchmark                                       │
│   ↓                                                     │
│ Outputs: result-*.json files                           │
│ Time: 60+ minutes locally, 30 min in CI (630 CI min)  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Aggregate (Fast - Rerun Anytime)               │
├─────────────────────────────────────────────────────────┤
│ npm run aggregate:local                                 │
│   ↓                                                     │
│ Reads: result-*.json files                             │
│ Outputs: summary.json, detailed-iterations.json        │
│ Time: 1 second                                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Generate Reports (Fast - Rerun Unlimited!)     │
├─────────────────────────────────────────────────────────┤
│ npm run report                                          │
│   ↓                                                     │
│ Reads: summary.json                                     │
│ Outputs: REPORT.md, index.html, 6 chart pages         │
│ Time: 2-3 seconds                                       │
└─────────────────────────────────────────────────────────┘
```

**Key:** Steps 2 and 3 can run as many times as you want without touching Step 1!

---

## Common Scenarios

### Scenario 1: Fix Typo in Report

```bash
# Already have results from yesterday's benchmark

# 1. Fix typo
vim scripts/generate-report.js

# 2. Regenerate (2 seconds)
npm run generate-report

# 3. Check
cat results/REPORT.md
```

**Time:** 2 seconds (vs. 60+ minutes to re-run benchmark)

---

### Scenario 2: Add New Chart

```bash
# Already have results

# 1. Edit visualizations
vim scripts/generate-viz-multipage.js

# 2. Watch mode (continuous feedback)
npm run test:viz:watch

# 3. Regenerate (1 second)
npm run generate-viz

# 4. Preview
open results/new-chart.html
```

**Time:** Instant iteration!

---

### Scenario 3: Tweak Both Reports and Visualizations

```bash
# Already have results

# 1. Edit both generators
vim scripts/generate-report.js
vim scripts/generate-viz-multipage.js

# 2. Regenerate both (3 seconds)
npm run report

# 3. Preview
open results/index.html
```

**Time:** 3 seconds total

---

### Scenario 4: Use Results from GitHub Actions

```bash
# 1. Download results from latest CI run
gh run list --workflow=benchmark.yml
gh run download <run-id>

# 2. Move to results directory
mv result-*.json results/

# 3. Regenerate everything
npm run report:regen

# 4. Preview
open results/index.html
```

**Benefit:** Use CI's expensive benchmark results locally for unlimited report iterations!

---

## GitHub Actions Workflows

### Full Benchmark (Expensive)

**Workflow:** `benchmark.yml`

**What it does:**
- Builds 21 Docker images
- Runs 21 benchmarks
- Aggregates results
- Generates reports
- Deploys to GitHub Pages

**Time:** ~30 minutes
**Cost:** ~630 CI minutes

**Trigger:**
```bash
gh workflow run benchmark.yml
```

---

### Report Regeneration Only (Cheap!)

**Workflow:** `regenerate-reports.yml`  NEW

**What it does:**
- Downloads existing benchmark results
- Re-aggregates (optional)
- Regenerates reports
- Deploys to GitHub Pages

**Time:** ~3 minutes
**Cost:** ~3 CI minutes (210x cheaper!)

**Trigger:**
```bash
# Use latest benchmark results
gh workflow run regenerate-reports.yml

# Or use specific run
gh workflow run regenerate-reports.yml -f run_id=1234567890
```

---

## Commands Quick Reference

### Local

| Command | What It Does | Requires | Time |
|---------|--------------|----------|------|
| `npm run benchmark` | Run benchmarks | - | 60+ min |
| `npm run aggregate:local` | Re-aggregate | `result-*-iter*.json` | 1s |
| `npm run generate-report` | Markdown only | `summary.json` | 1s |
| `npm run generate-viz` | Visualizations only | `summary.json` | 1s |
| `npm run report` | Both reports | `summary.json` | 2-3s |
| `npm run report:regen` | Interactive regen | Result files | 3-5s |

### GitHub Actions

| Command | What It Does | Time | Cost |
|---------|--------------|------|------|
| `gh workflow run benchmark.yml` | Full benchmark | 30m | ~630 min |
| `gh workflow run regenerate-reports.yml` | Reports only | 3m | ~3 min |

---

## Why This Matters

### Cost Savings

**Example:** You need to fix 5 formatting issues in reports this month.

**Without separation (if this weren't already separate):**
- 5 full benchmark runs
- 5 × 630 = 3,150 CI minutes
- Cost: ~$25

**With separation:**
- 1 benchmark run + 5 report regens
- 630 + (5 × 3) = 645 CI minutes
- Cost: ~$5

**Savings: $20/month = $240/year**

### Time Savings

**Iterating on report format:**
- Without separation: Edit → wait 60 min → see result → repeat
- With separation: Edit → wait 2 sec → see result → repeat

**10x faster iteration cycle!**

---

## How to Use This

### Daily Development

```bash
# Run benchmark once (in the morning, go get coffee ☕)
npm run benchmark

# Iterate on reports all day (instant feedback)
npm run test:viz:watch  # Watch mode
vim scripts/generate-viz-multipage.js
# Save → tests run → regenerate → preview
npm run generate-viz && open results/index.html
```

### Before Major Release

```bash
# 1. Run full benchmark
npm run benchmark

# 2. Generate reports
npm run report

# 3. Review
open results/index.html

# 4. If formatting needs tweaks, regenerate instantly
vim scripts/generate-report.js
npm run generate-report

# 5. Deploy when perfect
git push
```

### After CI Benchmark Completes

```bash
# Benchmark ran in CI overnight

# Download results
gh run download <run-id>
mv result-*.json results/

# Iterate on reports locally (fast!)
npm run report        # Generate
open results/index.html  # Preview
vim scripts/generate-viz-multipage.js  # Tweak
npm run report        # Regenerate (2 seconds!)

# When perfect, deploy
gh workflow run regenerate-reports.yml
```

---

## Key Insight

**The benchmark script (`src/benchmark.sh`) only generates raw JSON data.**

It does **NOT** generate reports. That's done by separate Node.js scripts:
- `scripts/aggregate-results.js` - Computes statistics
- `scripts/generate-report.js` - Creates markdown
- `scripts/generate-viz-multipage.js` - Creates HTML charts

**This means:**
- Run expensive benchmarks once
- Iterate on reports unlimited times
- Each iteration takes seconds, not hours

---

## Quick Commands

### I want to...

**...regenerate everything:**
```bash
npm run report:regen
```

**...regenerate just markdown:**
```bash
npm run generate-report
```

**...regenerate just visualizations:**
```bash
npm run generate-viz
```

**...regenerate in GitHub Actions:**
```bash
gh workflow run regenerate-reports.yml
```

**...use older benchmark results:**
```bash
gh workflow run regenerate-reports.yml -f run_id=<old-run-id>
```

---

## Complete Separation Flow

```
ONE TIME (expensive):
  npm run benchmark → Creates result-*.json files
                                ↓
UNLIMITED TIMES (cheap):
  npm run report → Reads summary.json → Creates reports
  npm run report → Reads summary.json → Creates reports
  npm run report → Reads summary.json → Creates reports
  ... (repeat forever!)
```

---

## Summary

- **Benchmarks = Expensive** (60+ min locally, 630 CI min)
- **Reports = Cheap** (2 sec locally, 3 CI min)
- **Completely Separate** (regenerate reports unlimited times)
- **GitHub Actions Workflow** (regenerate-reports.yml)
- **Interactive Script** (npm run report:regen)
- **Cost Savings** ($240/year by not re-running benchmarks for report tweaks)

**The separation is already there - now you know how to use it!**

---

**Try it:**
```bash
# If you have existing results
npm run report:regen
```

**Full guide:** [docs/REGENERATING_REPORTS.md](../docs/REGENERATING_REPORTS.md)

