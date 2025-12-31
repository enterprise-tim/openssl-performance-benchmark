# Usage Guide

## Prerequisites

-   **Node.js**: v18+ (for orchestration scripts)
-   **Docker**: Engine v24+ (must be running)
-   **Git**: To clone the repository

## Running Locally

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run the Benchmark**
    This will sequentially build Docker images and run tests for all versions defined in `config/versions.json`.
    ```bash
    npm run benchmark
    ```
    *Note: This process can take 30+ minutes depending on your CPU and the number of versions, as each version is compiled from source.*

3.  **Generate Reports**
    After the benchmark completes, generate the Markdown report and HTML visualizations.
    ```bash
    npm run report
    ```
    Outputs will be in the `results/` directory:
    -   `results/REPORT.md`
    -   `results/visualizations.html`
    -   `results/summary.json`

## Running in GitHub Actions

The benchmark is configured to run automatically via GitHub Actions.

-   **Workflow File**: `.github/workflows/benchmark.yml`
-   **Triggers**:
    -   Push to `main` branch
    -   Weekly schedule (Sundays)
    -   Manual dispatch (via "Run workflow" button)

### Artifacts
The workflow uploads the following artifacts:
-   `result-[version].json`: Individual result files.
-   `benchmark-report`: Archive containing the aggregated summary, Markdown report, and HTML visualization.

## Troubleshooting

-   **Docker Errors**: Ensure the Docker daemon is running (`docker info`).
-   **Missing Results**: If a version fails, check the console output. The script attempts to continue to the next version.
-   **Zero Values**: If metrics show `0`, it usually means the regex parsing in `src/benchmark.sh` failed to match the `openssl` output format. Check the raw logs in the console or GitHub Actions output.

