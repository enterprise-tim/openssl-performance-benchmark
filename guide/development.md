# Development Guide

## Modifying the Benchmark Script

The core logic resides in `src/benchmark.sh`.

### Adding a New Metric
1.  **Run the Command**: Add the `openssl` command to generate the metric.
    ```bash
    MY_METRIC_OUT=$(openssl speed -evp my-algo 2>&1)
    ```
2.  **Parse the Output**: Use `grep` and `awk` to extract the numerical value. Be robust against format changes!
    ```bash
    VAL=$(echo "$MY_METRIC_OUT" | grep ... | awk ...)
    ```
3.  **Add to JSON**: Use `jq` to insert the value into the `RESULTS` object.
    ```bash
    RESULTS=$(echo "$RESULTS" | jq --arg v "$VAL" '.metrics.my_new_metric = ($v | tonumber)')
    ```

### Testing Changes
You don't need to run the full suite to test script changes.
1.  Build a single image manually:
    ```bash
    docker build -t test-bench --build-arg OPENSSL_VERSION=3.3.2 --build-arg OPENSSL_URL=... -f docker/Dockerfile .
    ```
2.  Run it interactively:
    ```bash
    docker run --rm -it --entrypoint /bin/bash test-bench
    ```
3.  Run the script inside the container:
    ```bash
    ./benchmark.sh
    ```

## Project Structure (for LLMs)

```
openssl-performance-benchmark/
├── config/                 # Version lists and OpenSSL config files
├── docker/                 # Dockerfile
├── guide/                  # Documentation (You are here)
├── results/                # Output directory (gitignored except example)
├── scripts/                # Node.js orchestration and reporting
└── src/                    # Shell scripts executed inside containers
```

