# OpenSSL Performance Benchmark

This project is a benchmark suite designed to evaluate the performance of different OpenSSL versions, specifically investigating reported regressions in the 3.x series compared to 1.1.1.

## Architecture

The benchmark uses a matrix build approach:
1.  **Configuration**: `config/versions.json` defines the OpenSSL versions to test and their source URLs.
2.  **Containerization**: A parameterized `Dockerfile` builds a clean environment for each version, compiling OpenSSL from source to ensure consistency.
3.  **Orchestration**: A Node.js script (`scripts/run-benchmark.js`) iterates through the versions, builds the Docker images, runs the benchmarks, and aggregates results.
4.  **Metrics**:
    *   **Throughput**: AES-256-GCM and SHA256 (via `openssl speed`).
    *   **Handshake**: New and Resumed TLS connections per second (via `openssl s_time`).

## Usage

1.  **Prerequisites**:
    *   Docker
    *   Node.js (for the runner script)

2.  **Run the Benchmark**:
    ```bash
    npm run benchmark
    ```

3.  **View Results**:
    Results will be saved in the `results/` directory as individual JSON files and a consolidated `summary.json`.

## Configuration

Edit `config/versions.json` to add or remove versions.

## Current Versions Tested

*   1.1.1w (Baseline)
*   3.0.15 (LTS)
*   3.1.7
*   3.2.3
*   3.3.2
*   3.4.0

