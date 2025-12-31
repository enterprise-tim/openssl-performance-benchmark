# Configuration

## Version Matrix (`config/versions.json`)

This file defines the specific OpenSSL versions to be benchmarked.

```json
{
  "versions": [
    {
      "version": "1.1.1w",
      "url": "https://www.openssl.org/source/openssl-1.1.1w.tar.gz",
      "series": "1.1.1"
    },
    ...
  ]
}
```

-   **version**: The display name/tag for the version.
-   **url**: The direct download link to the source tarball.
-   **series**: Used for grouping in reports.

To add a new version, simply append an entry to this array.

## Docker Configuration (`docker/Dockerfile`)

The Dockerfile defines the build environment.

-   **Base Image**: `debian:bookworm-slim` (Chosen for stability and small footprint).
-   **Build Arguments**:
    -   `OPENSSL_VERSION`: Passed from the orchestrator.
    -   `OPENSSL_URL`: Passed from the orchestrator.
-   **Compilation Flags**:
    -   `./config --prefix=/opt/openssl ...`
    -   `make -j$(nproc)`: Compiles using all available cores.

## Optimized Configuration (`config/openssl-optimized.cnf`)

This file contains the "Mráz Optimization" settings applied during the optimized test runs for OpenSSL 3.x.

Key settings:
-   `default_properties = ?provider=default`: Explicitly selects the default provider to avoid expensive property queries.
-   Minimal module loading.

## Reporting Config

The reporting scripts (`scripts/generate-report.js` and `scripts/generate-viz.js`) contain embedded metadata about version release dates and features. If you add a new version, you may want to update the `VERSION_INFO` constant in these files to ensure the report commentary is accurate.

