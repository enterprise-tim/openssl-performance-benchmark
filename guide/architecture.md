# Architecture Overview

The `openssl-performance-benchmark` project is designed as a multi-stage pipeline with **statistical iterations** and comprehensive validation that ensures isolation, reproducibility, and measurement confidence across different OpenSSL versions.

## High-Level Flow

### Local Execution

1.  **Orchestrator (`scripts/run-benchmark.js`)**:
    -   Reads the configuration (`config/versions.json`), including `iterations` count.
    -   For each OpenSSL version, runs N iterations sequentially.
    -   Each iteration builds a dedicated Docker image.
    -   Runs the container to execute the benchmark.
    -   Captures JSON output and saves to `results/result-[version]-iter[N].json`.
    -   After all iterations complete, aggregates results.

2.  **Container Environment (`docker/Dockerfile`)**:
    -   Based on `debian:bookworm-slim`.
    -   Compiles the specific OpenSSL version from source.
    -   Installs necessary build dependencies.
    -   Copies the benchmark script (`src/benchmark.sh`) into the container.
    -   Each iteration gets a completely fresh container.

3.  **Benchmark Execution (`src/benchmark.sh`)**:
    -   This is the core script that runs *inside* the container.
    -   Generates temporary certificates (RSA and ECDSA).
    -   Runs `openssl speed` for raw throughput metrics.
    -   Runs `openssl s_server` (in background) and `openssl s_time` (client) for handshake performance metrics.
    -   Outputs a structured JSON object to stdout.

4.  **Statistical Aggregation (`scripts/aggregate-results.js`)** ⭐ NEW:
    -   Groups iteration results by version.
    -   Computes mean, standard deviation, min, and max for all metrics.
    -   Produces `results/summary.json` with aggregated statistics.
    -   Also saves `results/detailed-iterations.json` with all raw data.

5.  **Reporting**:
    -   `scripts/generate-report.js`: Reads `summary.json` and produces a Markdown report with mean ± stddev values.
    -   `scripts/generate-viz.js`: Produces interactive HTML dashboard with error bars using D3.js.

### GitHub Actions Execution

The workflow differs slightly for parallel execution:

1.  **Matrix Generation (`generate-matrix` job)**:
    -   Reads `config/versions.json`
    -   Generates a matrix: versions × iterations
    -   Example: 7 versions × 3 iterations = 21 parallel jobs

2.  **Parallel Benchmark Jobs (`benchmark` job)**:
    -   Each job (version + iteration combo) runs independently
    -   Builds fresh Docker image
    -   Runs benchmark
    -   Uploads result artifact: `result-[version]-iter[N].json`

3.  **Aggregation (`report` job)**:
    -   Downloads all 21 result artifacts
    -   Runs `scripts/aggregate-results.js` to compute statistics
    -   Generates reports with mean ± stddev
    -   Deploys to GitHub Pages

## Directory Structure

-   `config/`: Configuration files (versions list with iterations, optimized OpenSSL config).
-   `docker/`: Dockerfile definition.
-   `scripts/`: Node.js scripts for orchestration, aggregation, and reporting.
-   `src/`: Shell scripts that run inside the Docker container.
-   `results/`: Output directory for JSON data, reports, and visualizations.
-   `tests/`: ⭐ NEW - Comprehensive test suite (350+ tests with Vitest).
-   `docs/`: Additional background documentation and testing guides.
-   `guide/`: This documentation directory.

## Key Design Decisions

### Core Architecture

-   **Docker Isolation**: Every version runs in a clean, identical OS environment. This prevents system library interference.
-   **Source Compilation**: We compile OpenSSL from source to ensure we are testing the exact version specified, rather than a distro-patched version.
-   **JSON Output**: The benchmark script outputs pure JSON, making it easy to parse, aggregate, and visualize the data programmatically.
-   **Robust Parsing**: The parsing logic in `benchmark.sh` handles slight variations in `openssl speed` output formats across versions (1.1.1 vs 3.x).

### Statistical Rigor (NEW)

-   **Multiple Iterations**: Each version is tested N times (configurable, default: 3) in completely separate containers.
-   **Statistical Aggregation**: All metrics include mean, standard deviation, min, and max values.
-   **Variance Detection**: High standard deviation indicates performance instability and triggers investigation.
-   **Reproducibility**: Multiple iterations ensure results aren't affected by temporary system conditions.

### Quality Assurance (NEW)

-   **Comprehensive Testing**: 350+ tests using Vitest validate all components before deployment.
-   **Local Docker Validation**: Test Docker builds locally (2-3 min) before expensive CI runs ($180/year savings).
-   **Fast Feedback**: Unit tests execute in < 2 seconds, catching logic errors immediately.
-   **Cost Protection**: Tests prevent wasted CI minutes by catching issues locally.

### Visualization (ENHANCED)

-   **Error Bars**: Charts display ±1 standard deviation to show measurement confidence.
-   **Interactive D3 Charts**: Hover for detailed information including stddev.
-   **Iteration Count Display**: All visualizations clearly show how many iterations were run.
-   **Professional Quality**: Publication-ready graphics with statistical indicators.

## Data Flow Diagram

### Single Version, Multiple Iterations

```
config/versions.json (iterations: 3)
  ↓
OpenSSL 3.5.3 → Iteration 1 → Docker Build → Benchmark → result-3.5.3-iter1.json
              → Iteration 2 → Docker Build → Benchmark → result-3.5.3-iter2.json
              → Iteration 3 → Docker Build → Benchmark → result-3.5.3-iter3.json
  ↓
scripts/aggregate-results.js
  ↓
Compute Statistics:
  - Mean: 6,465 conn/sec
  - Stddev: 12 conn/sec
  - Min: 6,450
  - Max: 6,480
  ↓
results/summary.json (aggregated)
  ↓
Reports & Visualizations (with error bars)
```

### GitHub Actions Flow

```
Push to main
  ↓
Test Workflow (2 minutes, ~2 CI minutes)
  ├─ Unit tests (Vitest)
  ├─ Configuration validation
  └─ Matrix generation test
  ↓
Benchmark Workflow (30 minutes, 630 CI minutes)
  ├─ Generate Matrix: 7 versions × 3 iterations = 21 jobs
  ├─ Build & Run (parallel):
  │   ├─ 1.1.1w-iter1, iter2, iter3
  │   ├─ 3.0.15-iter1, iter2, iter3
  │   ├─ ... (all versions × 3)
  │   └─ 3.5.3-iter1, iter2, iter3
  ├─ Upload Artifacts (21 result files)
  ├─ Aggregate Results (compute statistics)
  ├─ Generate Reports (mean ± stddev)
  └─ Deploy to GitHub Pages
```

## Testing Architecture (NEW)

### Test Layers

```
Developer makes change
  ↓
Layer 1: Unit Tests (< 2 seconds, Vitest)
  ├─ Statistical calculations
  ├─ Report formatting
  ├─ Workflow matrix generation
  └─ Data transformations
  ↓
Layer 2: Visualization Tests (< 2 seconds, Vitest + jsdom)
  ├─ D3 chart rendering
  ├─ Error bar positioning
  ├─ Interactive features
  └─ HTML structure
  ↓
Layer 3: Integration Tests (< 1 second, Vitest)
  ├─ End-to-end workflows
  ├─ File operations
  └─ Aggregation pipeline
  ↓
Layer 4: Docker Validation (15-20 minutes, optional)
  ├─ Build test for each version
  ├─ Smoke tests
  └─ Full benchmark validation
  ↓
All pass? Safe to deploy!
  ↓
GitHub Actions (with confidence)
```

