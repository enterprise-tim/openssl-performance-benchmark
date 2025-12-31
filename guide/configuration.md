# Configuration

## Version Matrix (`config/versions.json`)

This file defines the specific OpenSSL versions to be benchmarked and the number of statistical iterations.

```json
{
  "iterations": 3,
  "versions": [
    {
      "version": "1.1.1w",
      "url": "https://www.openssl.org/source/openssl-1.1.1w.tar.gz",
      "series": "1.1.1"
    },
    {
      "version": "3.5.3",
      "url": "https://github.com/openssl/openssl/releases/download/openssl-3.5.3/openssl-3.5.3.tar.gz",
      "series": "3.5"
    }
  ]
}
```

### Configuration Fields

-   **iterations** ⭐ NEW: Number of times to test each version (default: 3)
    -   `1`: Single run (backward compatible, no statistics)
    -   `3`: Recommended default (good balance of confidence vs. cost)
    -   `10`: High confidence (publication quality)
    -   `20`: Maximum confidence (exhaustive validation)

-   **version**: The display name/tag for the version.
-   **url**: The direct download link to the source tarball.
-   **series**: Used for grouping in reports and color coding in charts.

### Adding a New Version

1.  **Add entry to versions array:**
    ```json
    {
      "version": "3.6.0",
      "url": "https://github.com/openssl/openssl/releases/download/openssl-3.6.0/openssl-3.6.0.tar.gz",
      "series": "3.6"
    }
    ```

2.  **Test locally BEFORE pushing:**
    ```bash
    # Test the new version's Docker build (2-3 minutes)
    ./scripts/test-docker-build.sh quick 3.6.0
    
    # If passes, test full benchmark
    ./scripts/test-docker-build.sh full 3.6.0
    ```

3.  **Deploy:**
    ```bash
    git push
    ```

### Changing Iteration Count

**Impact calculation:**
```
7 versions × 3 iterations = 21 GitHub Actions jobs
7 versions × 10 iterations = 70 GitHub Actions jobs
```

**CI Cost:**
- Each job ≈ 30 minutes
- Free tier: 2,000 minutes/month
- 3 iterations: 630 minutes/run
- 10 iterations: 2,100 minutes/run

**Recommendation:**
- **3 iterations**: Good for regular benchmarks
- **10 iterations**: Use for important releases or publications
- **2 iterations**: If CI budget is tight but you want some statistical validation

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

## Validation and Testing (NEW)

### Before Deploying Configuration Changes

Always validate locally to avoid wasting CI minutes:

```bash
# 1. Validate JSON syntax
jq '.' config/versions.json

# 2. Run unit tests (2 seconds)
npm test

# 3. Test Docker builds locally (15-20 minutes)
npm run test:docker

# 4. Or test specific new version (2-3 minutes)
./scripts/test-docker-build.sh quick <new-version>
```

### Configuration Validation Tests

The test suite automatically validates:
- ✅ JSON syntax
- ✅ Required fields (version, url, series)
- ✅ URL format (must start with http)
- ✅ Iterations is a positive number
- ✅ Versions array is not empty

**Run validation:**
```bash
npm test  # Includes config validation
```

### Cost Estimation

Before pushing changes, estimate CI cost:

```bash
# Calculate total jobs
VERSIONS=$(jq '.versions | length' config/versions.json)
ITERATIONS=$(jq '.iterations // 3' config/versions.json)
TOTAL_JOBS=$((VERSIONS * ITERATIONS))
EST_MINUTES=$((TOTAL_JOBS * 30))

echo "Estimated CI minutes: $EST_MINUTES"
```

### Testing New Configurations

**Recommended workflow:**

```bash
# 1. Edit config
vim config/versions.json

# 2. Validate
npm test

# 3. Test one version locally
./scripts/test-docker-build.sh quick <version>

# 4. If passes, test all (optional but recommended)
npm run test:docker

# 5. Deploy
git push
```

## Configuration Best Practices

### Iterations

- **Development/Testing:** Use `iterations: 2` to save CI time
- **Production:** Use `iterations: 3` for good confidence
- **Publication:** Use `iterations: 10+` for scientific rigor
- **Never use 1:** Always run at least 2 iterations for statistical validation

### Version Selection

- **Include baseline:** Always keep 1.1.1w for comparison
- **LTS versions:** Include 3.0.x and 3.5.x (both LTS)
- **Latest stable:** Include newest release
- **Test locally first:** Use Docker validation for new versions

### URL Sources

- **OpenSSL 1.1.1:** `https://www.openssl.org/source/`
- **OpenSSL 3.x:** `https://github.com/openssl/openssl/releases/download/`
- **Verify URL:** Test with `curl -I <url>` before adding

### Error Recovery

If a version fails in CI:
1. Check GitHub Actions logs
2. Test locally: `./scripts/test-docker-build.sh full <version>`
3. Review logs: `/tmp/docker-build-<version>.log`
4. Fix configuration or benchmark script
5. Retest locally before pushing

