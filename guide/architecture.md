# Architecture Overview

The `openssl-performance-benchmark` project is designed as a multi-stage pipeline that ensures isolation and reproducibility across different OpenSSL versions.

## High-Level Flow

1.  **Orchestrator (`scripts/run-benchmark.js`)**:
    -   Reads the configuration (`config/versions.json`).
    -   Iterates through each target OpenSSL version.
    -   Builds a dedicated Docker image for that version.
    -   Runs the container to execute the benchmark.
    -   Captures the JSON output and saves it to `results/`.
    -   Generates a final `results/summary.json`.

2.  **Container Environment (`docker/Dockerfile`)**:
    -   Based on `debian:bookworm-slim`.
    -   Compiles the specific OpenSSL version from source.
    -   Installs necessary build dependencies.
    -   Copies the benchmark script (`src/benchmark.sh`) into the container.

3.  **Benchmark Execution (`src/benchmark.sh`)**:
    -   This is the core script that runs *inside* the container.
    -   Generates temporary certificates (RSA and ECDSA).
    -   Runs `openssl speed` for raw throughput metrics.
    -   Runs `openssl s_server` (in background) and `openssl s_time` (client) for handshake performance metrics.
    -   Outputs a structured JSON object to stdout.

4.  **Reporting**:
    -   `scripts/generate-report.js`: Reads `summary.json` and produces a Markdown report (`results/REPORT.md`).
    -   `scripts/generate-viz.js`: Reads `summary.json` and produces an interactive HTML dashboard (`results/visualizations.html`) using D3.js.

## Directory Structure

-   `config/`: Configuration files (versions list, optimized OpenSSL config).
-   `docker/`: Dockerfile definition.
-   `scripts/`: Node.js scripts for orchestration and reporting.
-   `src/`: Shell scripts that run inside the Docker container.
-   `results/`: Output directory for JSON data, reports, and visualizations.
-   `docs/`: Additional background documentation.

## Key Design Decisions

-   **Docker Isolation**: Every version runs in a clean, identical OS environment. This prevents system library interference.
-   **Source Compilation**: We compile OpenSSL from source to ensure we are testing the exact version specified, rather than a distro-patched version.
-   **JSON Output**: The benchmark script outputs pure JSON, making it easy to parse, aggregate, and visualize the data programmatically.
-   **Robust Parsing**: The parsing logic in `benchmark.sh` handles slight variations in `openssl speed` output formats across versions (1.1.1 vs 3.x).

