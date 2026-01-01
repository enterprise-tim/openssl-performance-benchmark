# Usage Guide

## Prerequisites

-   **Node.js**: v18+ (for orchestration scripts)
-   **Docker**: Engine v24+ (must be running)
-   **Git**: To clone the repository
-   **jq**: For JSON processing (usually pre-installed on Linux/macOS)

## Quick Start

```bash
# 1. Install
npm install

# 2. Validate (2 seconds)
npm test

# 3. Run benchmark
npm run benchmark
```

## Testing Before Running Expensive Benchmarks (RECOMMENDED!)

### Step 1: Quick Validation (< 2 seconds)

```bash
npm test
```

**What runs:**
- 200+ unit tests (statistical calculations, formatting, workflow)
- 150+ visualization tests (D3 charts, error bars, tooltips)
- Configuration validation

**Why:** Catches 95%+ of issues before wasting CI minutes. **Saves $10-15/month.**

### Step 2: Docker Build Validation (15-20 minutes)

```bash
# Test all versions
npm run test:docker

# Or test specific version (2-3 minutes)
./scripts/test-docker-build.sh quick 1.1.1w
```

**What runs:**
- Docker builds for each OpenSSL version
- Smoke tests (openssl version, basic commands)
- Validates certificates generate correctly

**Why:** Catches build failures, missing URLs, compilation errors **before GitHub Actions**.

### Step 3: Deploy with Confidence

```bash
git push
```

**See [Testing Documentation](../docs/TESTING.md) for complete testing guide.**

## Running Benchmarks Locally

### Standard Workflow

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Validate Configuration**
    ```bash
    # Run tests
    npm test
    
    # Validate JSON
    jq '.' config/versions.json
    ```

3.  **Run the Benchmark (Once - Takes Time!)**
    This will run each version × iterations in sequence.
    ```bash
    npm run benchmark
    ```
    
    **Time estimation:**
    - With `iterations: 3` and 7 versions
    - Sequential execution locally
    - ~90-120 minutes total
    
    **Note:** Local execution is sequential. GitHub Actions runs all iterations in parallel (~30 min total).

4.  **Generate Reports (Anytime - Fast!)**
    After benchmarks complete, generate reports from existing results.
    ```bash
    npm run report
    ```
    
    **Time:** ~2-3 seconds (no benchmark re-run!)
    
    **Important:** Report generation is **completely separate** from benchmarks. You can:
    - Regenerate reports unlimited times
    - Modify visualizations and regenerate
    - Fix formatting and regenerate
    - **No need to re-run expensive benchmarks!**
    
    Outputs in `results/`:
    -   `results/summary.json` - Aggregated statistics (mean, stddev, min, max)
    -   `results/detailed-iterations.json` - All raw iteration data
    -   `results/REPORT.md` - Markdown report with mean ± stddev
    -   `results/index.html` - **Multi-page dashboard** (navigation hub)
    -   `results/overview.html` - Scatter plot (deep-linkable!)
    -   `results/tls-comparison.html` - TLS 1.2 vs 1.3 (deep-linkable!)
    -   `results/bellingrath.html` - Bellingrath matrix (deep-linkable!)
    -   `results/schmatz.html` - Algorithm benchmarks (deep-linkable!)
    -   `results/mraz.html` - Optimization analysis (only generated if optimized benchmarks were run)
    -   `results/pqc.html` - Post-quantum results (deep-linkable!)

## Regenerating Reports Without Re-Running Benchmarks

**Scenario:** You want to tweak report formatting but don't want to wait 60 minutes for benchmarks.

**Solution:**
```bash
# Option 1: Quick regeneration
npm run generate-report    # Just markdown (1 second)
npm run generate-viz        # Just visualizations (1 second)

# Option 2: Interactive regeneration
npm run report:regen        # Checks for results and regenerates everything

# Option 3: Full regeneration
npm run report              # Both markdown and visualizations
```

**Requirements:**
- `results/summary.json` must exist (from previous benchmark)
- Or `results/result-*-iter*.json` files exist (will re-aggregate)

**Time:** 2-3 seconds (vs. 60+ minutes to re-run benchmark!)

📖 **[Read Complete Guide: Regenerating Reports](../docs/REGENERATING_REPORTS.md)**

### Benefits of Separate Report Generation

- ✅ **Fast iteration:** Edit → regenerate → preview (2 seconds)
- ✅ **Cost savings:** No wasted CI minutes on report tweaks
- ✅ **Flexibility:** Test different report formats instantly
- ✅ **Efficiency:** Run expensive benchmarks once, regenerate reports unlimited times

**Benefits of multi-page visualizations:**
- ✅ **Deep link** to specific charts: Share `schmatz.html` directly
- ✅ **Bookmark** individual pages
- ✅ **Faster loading:** Each page loads only its code
- ✅ **Browser navigation:** Back/forward works naturally

## Understanding Statistical Iterations

### What Happens

With `iterations: 3` in config:

```
OpenSSL 3.5.3 → Run 1 → result-3.5.3-iter1.json (6,450 conn/sec)
              → Run 2 → result-3.5.3-iter2.json (6,480 conn/sec)
              → Run 3 → result-3.5.3-iter3.json (6,465 conn/sec)
                ↓
         Aggregation
                ↓
         Mean: 6,465 conn/sec
         Stddev: 12 conn/sec (0.19% variance)
                ↓
         Report: "6,465 ± 12 conn/sec"
```

### Configuration

Edit `config/versions.json`:
```json
{
  "iterations": 3,  // ← Change this
  "versions": [...]
}
```

**Options:**
- `1`: No statistics (backward compatible)
- `2`: Minimal statistics  
- `3`: **Recommended** (good balance)
- `10`: High confidence (publication quality)
- `20`: Maximum confidence

**See [Statistical Iterations Guide](../docs/STATISTICAL_ITERATIONS.md) for details.**

## Testing Commands

### Essential Test Commands

| Command | Purpose | Time | When to Use |
|---------|---------|------|-------------|
| `npm test` | All unit tests (Vitest) | 2s | Before every push |
| `npm run test:watch` | Watch mode | Continuous | During development |
| `npm run test:ui` | Visual test explorer | Continuous | Debugging |
| `npm run test:viz` | Graph tests only | 1s | After chart changes |
| `npm run test:docker` | Docker validation | 15-20m | Before major deploy |
| `npm run validate` | Everything | 20-25m | Before releases |

### Test Workflow

```bash
# Daily development
npm run test:watch   # Leave running, auto-tests on save

# Before pushing
npm test            # Quick validation

# Before deploying new version
./scripts/test-docker-build.sh quick <version>

# Before major release
npm run validate    # Complete validation
```

**See [Testing Guide](../docs/TESTING.md) and [Vitest Guide](../docs/VITEST_GUIDE.md) for complete information.**

## Running in GitHub Actions

The benchmark is configured to run automatically via GitHub Actions with **statistical iterations**.

-   **Workflow Files**:
    -   `.github/workflows/test.yml`: Runs tests on every push (~2 minutes)
    -   `.github/workflows/benchmark.yml`: Runs full benchmarks (~30 minutes)

-   **Triggers**:
    -   **Test workflow:** Push, pull request
    -   **Benchmark workflow:** Push to `main`, weekly schedule (Sundays), manual dispatch

### How GitHub Actions Handles Iterations

**Matrix Generation:**
```
7 versions × 3 iterations = 21 parallel jobs
```

**Each job:**
1. Builds Docker image for specific version-iteration
2. Runs benchmark
3. Uploads result: `result-[version]-iter[N].json`

**After all jobs:**
1. Aggregation step computes statistics
2. Reports generated with mean ± stddev
3. Deployed to GitHub Pages

### Artifacts

The workflow uploads:
-   `result-[version]-iter[N].json`: Individual iteration results (21 files with 3 iterations)
-   `summary.json`: Aggregated results with statistics
-   `detailed-iterations.json`: All raw iteration data
-   `benchmark-report`: Archive with reports and visualizations

### Manual Triggering

```bash
# Using GitHub CLI
gh workflow run benchmark.yml

# Or via GitHub UI
# Navigate to Actions → OpenSSL Performance Benchmark → Run workflow
```

## Troubleshooting

### Common Issues

**Docker Errors**
- Ensure Docker daemon is running: `docker info`
- Check Docker has enough disk space: `docker system df`
- Verify Docker version: `docker --version` (need v24+)

**Build Failures**
- Test locally first: `./scripts/test-docker-build.sh quick <version>`
- Check logs: `/tmp/docker-build-<version>.log`
- Verify URL is accessible: `curl -I <url>`

**Test Failures**
- Run `npm test` to identify issue
- Use watch mode: `npm run test:watch`
- Check specific test: `npx vitest run tests/<file>.test.js`

**Missing Results**
- If a version fails, check console output
- Script continues to next version
- Check GitHub Actions logs for specific job

**Zero Values in Metrics**
- Usually means regex parsing in `src/benchmark.sh` failed
- OpenSSL output format differs between versions
- Test with: `./scripts/test-docker-build.sh full <version>`
- Check raw output in logs

**High Standard Deviations**
- Indicates performance instability
- Increase iterations to 10
- Check for system interference
- Review detailed-iterations.json for outliers

**Aggregation Fails**
- Check all iteration files are present
- Validate JSON syntax: `jq '.' results/result-*.json`
- Run manually: `node scripts/aggregate-results.js results results`

### Getting Help

1. **Run verification script:**
   ```bash
   ./scripts/verify-installation.sh
   ```

2. **Check documentation:**
   - [Testing Guide](../docs/TESTING.md)
   - [Docker Testing](../docs/DOCKER_TESTING.md)
   - [Statistical Iterations](../docs/STATISTICAL_ITERATIONS.md)

3. **Review logs:**
   - Local: `/tmp/docker-build-*.log`
   - CI: GitHub Actions workflow logs

