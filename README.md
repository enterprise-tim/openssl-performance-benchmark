# OpenSSL Performance Benchmark

This project automates the performance testing of OpenSSL across multiple versions (from 1.1.1 to the latest 3.x series) to identify performance regressions and improvements.

It runs in isolated Docker containers to ensure consistent, reproducible results.

## Quick Start

### Prerequisites
*   Node.js v18+
*   Docker (Daemon must be running)

### Test Before Deploying (Recommended!)

**Quick unit tests** (< 2 seconds):
```bash
npm test
```

**Docker build validation** (saves CI costs):
```bash
# Test all versions locally
npm run test:docker

# Or test specific version
./scripts/test-docker-build.sh quick 1.1.1w
```

**Why?** 
- Unit tests catch logic errors instantly
- Docker tests catch build failures locally before spending CI minutes
- Combined: Save $10-15/month in wasted CI runs

📖 **Testing Guides:**
- **[Vitest Testing Guide](./docs/VITEST_GUIDE.md)** - Graph and visualization tests
- **[Docker Testing Guide](./docs/DOCKER_TESTING.md)** - Build validation
- **[General Testing Guide](./docs/TESTING.md)** - Complete overview

### Run Benchmark (Once)
```bash
npm install
npm run benchmark
```
This will compile and test each configured OpenSSL version. **Note:** This can take 30-60 minutes as it compiles from source and runs multiple iterations.

### Generate Reports (Anytime)
```bash
npm run report
```
**Important:** Report generation is **separate** from benchmarks. You can regenerate reports unlimited times without re-running benchmarks!

This processes existing `results/summary.json` and generates:
*   `results/REPORT.md`: Detailed markdown analysis with mean ± stddev.
*   `results/index.html`: Multi-page interactive dashboard (deep-linkable!)
*   Individual chart pages: `overview.html`, `tls-comparison.html`, `bellingrath.html`, `schmatz.html`, `mraz.html`, `pqc.html`

**Time:** ~2-3 seconds (vs. 30-60 minutes for full benchmark!)

### Regenerate Reports (Interactive)
```bash
npm run report:regen
```
Interactive script that checks for existing results, optionally re-aggregates, and regenerates all reports.

**Perfect for:**
- Tweaking report formatting
- Adding new visualizations  
- Changing chart styles
- Fixing typos

📖 **[Read Regenerating Reports Guide](./docs/REGENERATING_REPORTS.md)** for complete details.

## Automated CI/CD

This project includes GitHub Actions workflows that automatically:
- Run benchmarks weekly or on push to `main`
- Generate reports and visualizations
- Create GitHub releases with benchmark data
- **Deploy results to GitHub Pages** for easy viewing

See [GitHub Pages Setup Guide](./docs/GITHUB_PAGES_SETUP.md) for enabling automated publishing.

## Testing

This project includes **comprehensive testing** to ensure reliability before expensive CI runs:

### Quick Tests (< 2 seconds)
```bash
npm test  # Vitest unit tests (200+) + visualization tests (150+)
```

### Docker Validation (15-20 minutes)
```bash
npm run test:docker  # Test all OpenSSL versions locally
```

### Complete Validation (20-25 minutes)
```bash
npm run validate  # Everything: unit + Docker + coverage
```

📖 **Testing Documentation:**
- [**Vitest Guide**](./docs/VITEST_GUIDE.md) - Graph and visualization testing
- [**Docker Testing**](./docs/DOCKER_TESTING.md) - Build validation
- [**Testing Overview**](./docs/TESTING.md) - Complete guide

## Documentation

**Main guides:**
- [guide/index.md](./guide/index.md) - Developer guide overview
- [docs/ITERATIONS.md](./docs/ITERATIONS.md) - Statistical iterations  
- [docs/TESTING.md](./docs/TESTING.md) - Testing guide
- [docs/REGENERATING_REPORTS.md](./docs/REGENERATING_REPORTS.md) - Report regeneration
- [DOCS_INDEX.md](./DOCS_INDEX.md) - Complete documentation map

## Key Features

*   **Statistical Reliability:** Each version tested **N times** (configurable, default 3) in separate containers with mean and standard deviation calculated for all metrics.
*   **Throughput Testing:** AES-GCM and SHA256 at various block sizes.
*   **Handshake Performance:** TLS 1.2 vs 1.3, RSA vs ECDSA, New vs Resumed.
*   **Asymmetric Crypto:** RSA and ECDSA signing/verification speeds.
*   **Post-Quantum:** ML-KEM-768 testing for supported versions (OpenSSL 3.5+).
*   **Optimization Analysis:** Tests OpenSSL 3.x with default vs. tuned configurations (Mráz optimizations).
*   **Multi-Page Visualizations:** Separate HTML pages for each chart type (deep-linkable).
*   **Comprehensive Testing:** 350+ tests with Vitest ensure reliability before deployment.

**Note on OpenSSL 1.1.1:** The benchmark script automatically handles CLI differences between OpenSSL 1.1.1 and 3.x (e.g., `s_time` doesn't support `-tls1_3` flag in 1.1.1). Version detection ensures compatibility.

## Statistical Iterations

Each OpenSSL version is tested **3 times** (configurable) in separate containers. Results include mean ± standard deviation to quantify measurement reliability.

**Configure in `config/versions.json`:**
```json
{
  "iterations": 3,
  "versions": [...]
}
```

**Output example:** `6,465 ± 12 conn/sec` (mean ± stddev)

See [docs/ITERATIONS.md](./docs/ITERATIONS.md) for details.
