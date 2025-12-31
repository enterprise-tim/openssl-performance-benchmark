# OpenSSL Performance Benchmark

This project automates the performance testing of OpenSSL across multiple versions (from 1.1.1 to the latest 3.x series) to identify performance regressions and improvements.

It runs in isolated Docker containers to ensure consistent, reproducible results.

## Quick Start

### Prerequisites
*   Node.js v18+
*   Docker (Daemon must be running)

### Run Benchmark
```bash
npm install
npm run benchmark
```
This will compile and test each configured OpenSSL version. **Note:** This can take 30+ minutes as it compiles from source.

### Generate Reports
```bash
npm run report
```
This processes the results and generates:
*   `results/REPORT.md`: Detailed markdown analysis.
*   `results/visualizations.html`: Interactive charts.

## Documentation

For detailed information, please see the [**Guide**](./guide/index.md):

*   [**Architecture**](./guide/architecture.md): How the pipeline works.
*   [**Metrics**](./guide/metrics.md): Explanation of what is being measured (Throughput, Handshake CPS, etc.).
*   [**Configuration**](./guide/configuration.md): How to add new OpenSSL versions.
*   [**Usage**](./guide/usage.md): Detailed usage instructions.

## Key Features

*   **Throughput Testing:** AES-GCM and SHA256 at various block sizes.
*   **Handshake Performance:** TLS 1.2 vs 1.3, RSA vs ECDSA, New vs Resumed.
*   **Asymmetric Crypto:** RSA and ECDSA signing/verification speeds.
*   **Post-Quantum:** ML-KEM-768 testing for supported versions (OpenSSL 3.5+).
*   **Optimization Analysis:** Tests OpenSSL 3.x with default vs. tuned configurations (Mráz optimizations).
