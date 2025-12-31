# Docker Build Testing Guide

## Overview

Before deploying to GitHub Actions (which costs 630 CI minutes per run), you can validate Docker builds and benchmark configurations **locally**. This catches build failures, compilation errors, and configuration issues before they waste expensive CI resources.

## The Problem

**Without local testing:**
```
Edit config → Push → GitHub Actions starts 21 jobs
→ Job 5 fails at minute 15 (OpenSSL 1.1.1w build error)
→ All 21 jobs wasted: 630 CI minutes = ~$5 lost
```

**With local testing:**
```
Edit config → Run test script (2-3 minutes per version)
→ Catch error locally → Fix → Test again → Push with confidence
→ Cost: $0, Time saved: 30 minutes + $5
```

---

## Quick Start

### Test All Versions (Quick Mode)

```bash
npm run test:docker
```

**What it does:**
- Builds Docker image for each OpenSSL version
- Runs smoke test (OpenSSL version, basic commands)
- Validates certificate generation
- Tests speed command
- **Time:** ~2-3 minutes per version
- **Output:** Pass/fail for each version

### Test All Versions (Full Mode)

```bash
npm run test:docker:full
```

**What it does:**
- Everything in quick mode PLUS
- Runs complete benchmark script
- Validates JSON output
- Shows sample metrics
- **Time:** ~5-10 minutes per version
- **Output:** Full benchmark results

### Test Specific Version

```bash
# Quick test for OpenSSL 1.1.1w
./scripts/test-docker-build.sh quick 1.1.1w

# Full test for OpenSSL 3.5.3
./scripts/test-docker-build.sh full 3.5.3
```

---

## Detailed Usage

### Command Syntax

```bash
./scripts/test-docker-build.sh [MODE] [VERSION]
```

**Parameters:**
- `MODE`: `quick` (default) or `full`
- `VERSION`: Optional specific version to test (e.g., `1.1.1w`)

**Examples:**

```bash
# Test all versions (quick)
./scripts/test-docker-build.sh

# Test all versions (full)
./scripts/test-docker-build.sh full

# Test specific version (quick)
./scripts/test-docker-build.sh quick 1.1.1w

# Test specific version (full)
./scripts/test-docker-build.sh full 3.5.3
```

---

## Output Examples

### Successful Test

```
═══════════════════════════════════════════════════════════
 Docker Build & Smoke Test
═══════════════════════════════════════════════════════════

 Reading configuration...
✓ Found 7 OpenSSL versions

Test mode: quick
  • Smoke test only (fast)
  • Use './scripts/test-docker-build.sh full' for complete validation

─────────────────────────────────────────────────────────
Testing OpenSSL 1.1.1w
─────────────────────────────────────────────────────────
⚙️  Building Docker image...
✓ Docker build successful (142s)
 Running smoke test...
✓ Smoke test passed (3s)
  → OpenSSL 1.1.1w  11 Sep 2023
🧹 Cleaning up test image...
1.1.1w PASSED (total: 145s)

... (repeat for each version)

═══════════════════════════════════════════════════════════
 Test Summary
═══════════════════════════════════════════════════════════

Passed: 7 / 7
Failed: 0

Total time: 18m 23s

ALL VERSIONS PASSED

Safe to deploy to GitHub Actions! 

Estimated CI cost if deployed:
  • Versions: 7
  • Iterations: 3
  • Total jobs: 21
  • Est. CI minutes: ~630
```

### Failed Test

```
─────────────────────────────────────────────────────────
Testing OpenSSL 1.1.1w
─────────────────────────────────────────────────────────
⚙️  Building Docker image...
Docker build FAILED
Build log:
  ERROR: unable to download openssl-1.1.1w.tar.gz
  wget: server returned error: HTTP/1.1 404 Not Found

═══════════════════════════════════════════════════════════
 Test Summary
═══════════════════════════════════════════════════════════

Passed: 6 / 7
Failed: 1

FAILED VERSIONS:
  • 1.1.1w
    Log: /tmp/docker-build-1.1.1w.log

WARNING:  DO NOT DEPLOY TO GITHUB ACTIONS
Fix these issues before pushing to save CI minutes!
```

---

## What Gets Tested

### Quick Mode (Default)

**Docker Build:**
- Dockerfile syntax
- Base image pulls successfully
- Build args work (OPENSSL_VERSION, OPENSSL_URL)
- OpenSSL compiles from source
- Dependencies install correctly

**Smoke Tests:**
- `openssl version` works
- Certificate generation succeeds
- `openssl speed` command works
- Basic cryptographic operations function

**Time:** ~2-3 minutes per version

### Full Mode

Everything in quick mode PLUS:

**Full Benchmark:**
- Complete benchmark script executes
- All metrics are collected
- JSON output is valid
- Sample metrics are reasonable

**Time:** ~5-10 minutes per version

---

## Common Scenarios

### Scenario 1: Testing Before First Deploy

```bash
# Clone repo, want to verify everything works
cd openssl-performance-benchmark

# Run quick tests on all versions
npm run test:docker

# If all pass, run one full test to be sure
./scripts/test-docker-build.sh full 3.5.3

# Everything good? Deploy!
git push
```

### Scenario 2: Added New OpenSSL Version

```bash
# Edit config
vim config/versions.json
# Add OpenSSL 3.6.0

# Test ONLY the new version first (quick)
./scripts/test-docker-build.sh quick 3.6.0

# If it passes, test full benchmark
./scripts/test-docker-build.sh full 3.6.0

# Everything works? Push!
git push
```

### Scenario 3: Modified Dockerfile or Benchmark Script

```bash
# Made changes to Dockerfile or src/benchmark.sh
vim docker/Dockerfile

# Test a known-good version to verify changes
./scripts/test-docker-build.sh quick 3.5.3

# Test problematic version (1.1.1w has different commands)
./scripts/test-docker-build.sh quick 1.1.1w

# Both pass? Safe to push
git push
```

### Scenario 4: Investigating OpenSSL 1.1.1w Issues

```bash
# 1.1.1w is known to have different CLI syntax
# Test it specifically
./scripts/test-docker-build.sh full 1.1.1w

# If it fails, check the log
cat /tmp/docker-build-1.1.1w.log
cat /tmp/docker-test-1.1.1w.log

# Fix the issue in benchmark.sh
vim src/benchmark.sh

# Retest
./scripts/test-docker-build.sh full 1.1.1w

# Passes? Great!
```

---

## Troubleshooting

### Docker Not Installed

**Error:**
```
bash: docker: command not found
```

**Solution:**
- Install Docker Desktop (macOS/Windows)
- Or install Docker Engine (Linux)
- Verify: `docker --version`

### Docker Daemon Not Running

**Error:**
```
Cannot connect to the Docker daemon
```

**Solution:**
- Start Docker Desktop
- Or start Docker service: `sudo systemctl start docker`

### Build Fails: Download Error

**Error:**
```
wget: server returned error: HTTP/1.1 404 Not Found
```

**Solution:**
- Check URL in `config/versions.json`
- Verify OpenSSL version exists
- Test URL manually: `curl -I <url>`

### Build Fails: Compilation Error

**Error:**
```
make: *** [all] Error 2
```

**Solution:**
- Check Docker build log: `/tmp/docker-build-<version>.log`
- May need different compiler flags for old versions
- Dockerfile may need adjustments

### Smoke Test Fails: OpenSSL Command Not Found

**Error:**
```
bash: openssl: command not found
```

**Solution:**
- Dockerfile may not have set PATH correctly
- Check WORKDIR and installation directory
- Verify `make install` completed

### Full Test Fails: Invalid JSON

**Error:**
```
Benchmark produced invalid JSON
```

**Solution:**
- Check benchmark script: `src/benchmark.sh`
- May have stderr mixing with stdout
- Redirect stderr appropriately: `2>&1`

---

## Integration with Test Suite

### Automated Docker Validation

The test suite includes Docker validation tests:

```bash
# Run all tests including Docker checks
npm test

# Run only Docker validation tests
node --test tests/docker-validation.test.js
```

**What's tested:**
- Dockerfile syntax validation
- Config file has valid URLs
- Benchmark script exists
- Version detection logic works
- (If Docker available) Build test for one version

### Pre-Deployment Checklist

```bash
# 1. Unit tests
npm test

# 2. Docker quick tests
npm run test:docker

# 3. (Optional) Full test on one version
./scripts/test-docker-build.sh full 3.5.3

# 4. If all pass, deploy
git push
```

---

## Performance

### Time Estimates

| Test Type | Per Version | All 7 Versions |
|-----------|-------------|----------------|
| **Quick Mode** | 2-3 min | 15-20 min |
| **Full Mode** | 5-10 min | 35-70 min |
| **Specific Version** | 2-10 min | N/A |

### Disk Usage

- Docker images: ~500MB each
- Temporary build files: ~100MB each
- **Total during test:** ~600MB × 7 = 4.2GB
- **After cleanup:** 0 MB (images removed)

### Parallelization

Currently tests run sequentially. Could be parallelized:

```bash
# Manual parallel testing (advanced)
for v in 1.1.1w 3.0.15 3.1.7; do
  ./scripts/test-docker-build.sh quick $v &
done
wait
```

---

## CI/CD Integration

### GitHub Actions Workflow

The test workflow includes Docker validation:

```yaml
- name: Test aggregation script with mock data
  run: |
    node scripts/aggregate-results.js test-input test-output

- name: Validate Docker configuration
  run: |
    npm run test:docker
```

**When it runs:**
- On every push to main
- On every pull request
- Before expensive benchmark workflow

**Why:**
- Catches Docker issues before full benchmark
- Saves CI minutes
- Provides fast feedback

---

## Best Practices

### Before Pushing Changes

```bash
# Always test before pushing
npm test                  # Unit tests (30s)
npm run test:docker      # Docker tests (15-20 min)
git push                 # Confident deploy
```

### Testing New Versions

```bash
# Test new version first
./scripts/test-docker-build.sh full <new-version>

# If passes, test all
npm run test:docker

# Then deploy
git push
```

### Regular Validation

```bash
# Weekly or monthly, verify all versions still work
npm run test:docker:full

# Catch upstream URL changes, deprecations, etc.
```

### Save Logs

```bash
# Keep logs for debugging
./scripts/test-docker-build.sh quick 2>&1 | tee docker-test.log

# Review later if needed
less docker-test.log
```

---

## Cost Savings

### Example Scenario

**Before Docker testing:**
- 3 failed deployments/month due to build issues
- 630 CI minutes × 3 = 1,890 minutes wasted
- Cost: ~$15/month wasted

**With Docker testing:**
- Catch all issues locally (20 min local time)
- 0 failed deployments
- Cost: $0 wasted
- **Savings: $15/month = $180/year**

### ROI Calculation

- **Time invested:** 20 minutes per test
- **Time saved:** 30+ minutes debugging in CI
- **Money saved:** $5-15 per prevented failure
- **ROI:** 300%+

---

## Advanced Usage

### Custom Docker Build Args

```bash
# Test with custom compiler flags
docker build -t test-image \
  --build-arg OPENSSL_VERSION=3.5.3 \
  --build-arg OPENSSL_URL=https://... \
  --build-arg CFLAGS="-O3 -march=native" \
  -f docker/Dockerfile .
```

### Interactive Debugging

```bash
# Build image
docker build -t debug-image \
  --build-arg OPENSSL_VERSION=1.1.1w \
  --build-arg OPENSSL_URL=https://... \
  -f docker/Dockerfile .

# Run interactively
docker run -it debug-image bash

# Debug inside container
openssl version
bash /app/src/benchmark.sh
```

### Save Test Results

```bash
# Run full test and save results
./scripts/test-docker-build.sh full 3.5.3
cp /tmp/docker-benchmark-3.5.3.json results/local-test-3.5.3.json

# Compare with CI results later
diff results/local-test-3.5.3.json results/ci-result-3.5.3.json
```

---

## Summary

### Commands Reference

| Command | Purpose | Time |
|---------|---------|------|
| `npm run test:docker` | Test all (quick) | 15-20 min |
| `npm run test:docker:full` | Test all (full) | 35-70 min |
| `./scripts/test-docker-build.sh quick <ver>` | Test one (quick) | 2-3 min |
| `./scripts/test-docker-build.sh full <ver>` | Test one (full) | 5-10 min |

### When to Use

- **Before first deploy** - Verify everything works
- **After config changes** - Test new versions
- **After Dockerfile edits** - Verify builds still work
- **After benchmark script changes** - Test on all versions
- **Investigating issues** - Debug specific versions
- **Regular validation** - Monthly sanity check

### Why It Matters

-  **Saves money:** Prevent $5-15 in wasted CI minutes per failure
- ⏱️ **Saves time:** 20 min local test vs. 30+ min CI debugging
- 🎯 **Confidence:** Know it works before pushing
- 🐛 **Early detection:** Catch issues before they cost money

---

**Remember: 20 minutes of local testing saves hours of debugging and dollars in CI costs!**

