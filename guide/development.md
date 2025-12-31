# Development Guide

## Development Workflow

### Recommended Workflow

```bash
# 1. Start watch mode
npm run test:watch

# 2. Make changes
vim scripts/generate-viz.js

# 3. Tests re-run automatically on save

# 4. When all green, push
git push
```

### Fast Iteration Cycle

**Don't wait for full benchmarks!** Test incrementally:

1. **Unit tests** (2 seconds): `npm test`
2. **Docker smoke test** (3 minutes): `./scripts/test-docker-build.sh quick 3.5.3`
3. **Full benchmark** (only when confident): `npm run benchmark`

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

4.  **Test with Docker** (NEW):
    ```bash
    # Test on one version
    ./scripts/test-docker-build.sh full 3.5.3
    
    # Verify metric appears in output
    cat /tmp/docker-benchmark-3.5.3.json | jq '.metrics.my_new_metric'
    ```

5.  **Add test** (NEW):
    ```javascript
    // tests/aggregate-results.test.js
    it('should aggregate new metric', () => {
      const iterations = generateMockIterations('3.5.3', 3);
      // Add my_new_metric to mock data
      iterations.forEach(i => i.metrics.my_new_metric = 1000 + Math.random() * 10);
      
      const values = iterations.map(i => i.metrics.my_new_metric);
      const stats = calculateExpectedStats(values);
      
      expect(stats.mean).toBeGreaterThan(1000);
      expect(stats.stddev).toBeGreaterThan(0);
    });
    ```

### Testing Changes (ENHANCED)

**Don't run the full suite for every change!** Use incremental testing:

#### Quick Validation (2 seconds)
```bash
npm test
```

Catches:
- Logic errors
- JSON format issues
- Calculation bugs

#### Docker Smoke Test (2-3 minutes)
```bash
./scripts/test-docker-build.sh quick 3.5.3
```

Catches:
- Build failures
- Script syntax errors
- Missing commands

#### Full Benchmark Test (5-10 minutes)
```bash
./scripts/test-docker-build.sh full 3.5.3
```

Catches:
- Metric collection issues
- JSON output problems
- Performance anomalies

#### Interactive Debugging (Manual)
```bash
# 1. Build image
docker build -t test-bench \
  --build-arg OPENSSL_VERSION=3.5.3 \
  --build-arg OPENSSL_URL=https://... \
  -f docker/Dockerfile .

# 2. Run interactively
docker run --rm -it --entrypoint /bin/bash test-bench

# 3. Debug inside container
openssl version
bash /app/src/benchmark.sh
```

## Modifying Visualizations

The visualization system uses D3.js and generates **multiple HTML pages** for deep linking. Each chart has its own page.

### Adding a New Chart

1.  **Edit `scripts/generate-viz-multipage.js`:**
    ```javascript
    function renderMyNewChart() {
      const container = d3.select("#my-chart");
      const svg = container.append('svg')...
      
      // Render chart with error bars if we have stats
      if (hasStats) {
        // Add error bars showing ±1 stddev
      }
    }
    ```

2.  **Add HTML container:**
    ```javascript
    const HTML_TEMPLATE = (dataJson) => `
      <div id="my-chart" style="height: 400px;"></div>
    `;
    ```

3.  **Write tests FIRST** (TDD approach):
    ```javascript
    // tests/charts.test.js
    describe('My New Chart', () => {
      it('should render new chart type', () => {
        const data = generateMockIterations('3.5.3', 3);
        // ... test chart rendering
      });
      
      it('should render error bars', () => {
        // ... test error bar logic
      });
    });
    ```

4.  **Create separate page for new chart:**
    ```javascript
    // In generate-viz-multipage.js
    console.log('  📄 Generating my-chart.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'my-chart.html'),
      createPageTemplate(
        'My New Chart',
        'Description of what this chart shows',
        getMyChartFunction(),
        rawData,
        iterationCount
      )
    );
    ```

5.  **Add link to index page:**
    ```javascript
    // In generateNavigation() function
    <a href="my-chart.html">
        <h3>7. My New Chart</h3>
        <p>Description for navigation</p>
    </a>
    ```

6.  **Test in watch mode:**
    ```bash
    npm run test:viz:watch
    ```

7.  **Preview in browser:**
    ```bash
    # Generate visualizations
    npm run generate-viz
    
    # Open index (dashboard)
    open results/index.html
    
    # Or open specific page
    open results/my-chart.html
    ```

### Modifying Existing Charts

**Workflow:**

```bash
# 1. Start watch mode
npm run test:viz:watch

# 2. Edit visualization code
vim scripts/generate-viz.js

# 3. Tests re-run on save

# 4. When tests pass, preview
npm run generate-viz && open results/visualizations.html

# 5. Commit
git add scripts/generate-viz.js tests/charts.test.js
git commit -m "Update chart rendering"
```

### Testing Chart Changes

**Vitest provides:**
- Fast feedback (< 1 second per test file)
- jsdom for D3 testing (no browser needed)
- Snapshot testing (catch unintended changes)

```bash
# Test all visualizations
npm run test:viz

# Test specific chart
npx vitest run --grep "Scatter Plot"

# Watch mode
npm run test:viz:watch

# UI mode (visual debugging)
npm run test:ui
```

## Modifying Reports

The report generation system outputs Markdown with statistical formatting.

### Adding Content to Reports

1.  **Edit `scripts/generate-report.js`:**
    ```javascript
    md += `\n## My New Section\n\n`;
    md += `| Version | New Metric |\n`;
    md += `|---------|----------:|\n`;
    
    results.forEach(r => {
      const m = r.metrics;
      const showStddev = r.config?.iterations_count > 1;
      
      const value = showStddev ? 
        formatNumWithStddev(m.new_metric, m.new_metric_stddev) :
        formatNum(m.new_metric);
      
      md += `| **${r.config.version}** | ${value} |\n`;
    });
    ```

2.  **Write tests:**
    ```javascript
    // tests/report-generation.test.js
    it('should format new metric with stddev', () => {
      const result = formatNumWithStddev(1000, 50);
      expect(result).toBe('1,000 ± 50');
    });
    ```

3.  **Test:**
    ```bash
    npm test
    ```

### Statistical Formatting

Use `formatNumWithStddev()` for values with statistics:

```javascript
// Shows stddev if > 0.1% of mean
formatNumWithStddev(6450, 12)  // "6,450 ± 12"

// Hides insignificant stddev
formatNumWithStddev(10000, 5)  // "10,000" (only 0.05%)

// Handles missing stddev
formatNumWithStddev(1000, null)  // "1,000"
```

## Modifying Aggregation Logic

The aggregation system computes statistics across iterations.

### Customizing Statistical Calculations

Edit `scripts/aggregate-results.js`:

```javascript
function calculateStats(values) {
  // Current: mean, stddev, min, max
  
  // Add custom stats:
  const median = d3.median(values);
  const percentile95 = d3.quantile(values, 0.95);
  
  return { mean, stddev, min, max, median, percentile95 };
}
```

### Adding Custom Aggregation

```javascript
// Example: Calculate coefficient of variation
metricKeys.forEach(key => {
  const values = iterations.map(i => i.metrics[key]);
  const stats = calculateStats(values);
  
  aggregated[key] = stats.mean;
  aggregated[`${key}_stddev`] = stats.stddev;
  aggregated[`${key}_cv`] = (stats.stddev / stats.mean) * 100; // CV%
});
```

### Testing Aggregation Changes

```javascript
// tests/aggregate-results.test.js
it('should calculate custom statistic', () => {
  const values = [100, 105, 95];
  const mean = values.reduce((a,b) => a+b) / values.length;
  const cv = (stddev / mean) * 100;
  
  expect(cv).toBeCloseTo(expectedCV, 1);
});
```

## Best Practices

### Always Test Before Pushing

```bash
# Minimum (2 seconds)
npm test && git push

# Recommended (3-5 minutes)
npm test && ./scripts/test-docker-build.sh quick <version> && git push

# Before major changes (20-25 minutes)
npm run validate && git push
```

### Use Watch Mode for Development

```bash
# Leave running while developing
npm run test:watch

# Or for visualizations
npm run test:viz:watch
```

### Write Tests for New Features

**Always write tests when adding:**
- New metrics
- New charts
- New aggregation logic
- New report sections

**Test template:**
```javascript
import { describe, it, expect } from 'vitest';

describe('New Feature', () => {
  it('should do something specific', () => {
    const result = newFunction(input);
    expect(result).toBe(expected);
  });
  
  it('should handle edge cases', () => {
    const result = newFunction(null);
    expect(result).toBe(defaultValue);
  });
});
```

### Handle Both Single and Multiple Iterations

**Always check `iterations_count`:**

```javascript
const iterCount = result.config?.iterations_count || 1;
const showStddev = iterCount > 1;

if (showStddev) {
  return formatNumWithStddev(mean, stddev);
} else {
  return formatNum(mean);
}
```

### Version-Specific Logic

**Handle differences between OpenSSL 1.1.x and 3.x:**

```bash
# In benchmark.sh
IS_OPENSSL_1_1=$(echo "$VERSION" | grep -E "1\.1\." >/dev/null && echo "true" || echo "false")
IS_OPENSSL_3=$(echo "$VERSION" | grep -E "^OpenSSL\s+3\." >/dev/null && echo "true" || echo "false")

if [ "$IS_OPENSSL_1_1" = "true" ]; then
  # Use 1.1.1-specific commands
else
  # Use 3.x commands
fi
```

## Common Development Tasks

### Task 1: Update Iteration Count

```bash
# 1. Edit config
vim config/versions.json
# Change "iterations": 3 to desired number

# 2. Test
npm test

# 3. Deploy
git push
```

### Task 2: Add New OpenSSL Version

```bash
# 1. Add to config
vim config/versions.json

# 2. Test build locally
./scripts/test-docker-build.sh quick <new-version>

# 3. Test full benchmark
./scripts/test-docker-build.sh full <new-version>

# 4. Test all versions
npm run test:docker

# 5. Deploy
git push
```

### Task 3: Modify Visualization

```bash
# 1. Start watch mode
npm run test:viz:watch

# 2. Edit chart
vim scripts/generate-viz.js

# 3. Tests re-run automatically

# 4. When green, generate and preview
npm run generate-viz
open results/visualizations.html

# 5. Commit
git push
```

### Task 4: Debug Test Failure

```bash
# 1. Run specific test
npx vitest run tests/charts.test.js --reporter=verbose

# 2. Or use UI mode
npm run test:ui

# 3. Fix issue
vim scripts/generate-viz.js

# 4. Verify fix
npm test
```

### Task 5: Add New Metric to Reports

```bash
# 1. Modify benchmark script
vim src/benchmark.sh
# Add new metric collection

# 2. Test in Docker
./scripts/test-docker-build.sh full 3.5.3

# 3. Add to report generator
vim scripts/generate-report.js
# Add new table/section

# 4. Write test
vim tests/report-generation.test.js

# 5. Test
npm test

# 6. Deploy
git push
```

## Debugging

### Debug Test Failures

```bash
# Verbose output
npx vitest run --reporter=verbose

# Run only failing tests
npm run test:watch
# Press 'f' to run only failed tests

# Debug specific test
npx vitest run --grep "specific test name"
```

### Debug Docker Build Failures

```bash
# Test version
./scripts/test-docker-build.sh quick <version>

# Check build log
cat /tmp/docker-build-<version>.log

# Check test log
cat /tmp/docker-test-<version>.log

# Interactive debugging
docker build -t debug --build-arg OPENSSL_VERSION=<v> ...
docker run -it debug bash
```

### Debug Aggregation Issues

```bash
# Check iteration files exist
ls results/result-*-iter*.json

# Validate JSON
jq '.' results/result-*.json

# Run aggregation manually with debug
node scripts/aggregate-results.js results results

# Check output
cat results/summary.json | jq '.[] | {version: .config.version, iterations: .config.iterations_count}'
```

### Debug Visualization Issues

```bash
# Test charts
npm run test:viz

# Use UI mode for visual debugging
npm run test:ui

# Generate and inspect HTML
npm run generate-viz
cat results/visualizations.html | grep "const data ="

# Check data structure
cat results/summary.json | jq '.[0] | {metrics: .metrics | keys}'
```

## Project Structure (Updated)

```
openssl-performance-benchmark/
├── config/                 # Version lists with iterations, OpenSSL configs
├── docker/                 # Dockerfile
├── guide/                  # Documentation (You are here)
├── docs/                   # Additional guides (testing, iterations, etc.)
├── tests/                  # ⭐ NEW: 350+ tests (Vitest)
│   ├── test-helpers.js            # Mock data generators
│   ├── aggregate-results.test.js  # Aggregation tests (60+)
│   ├── report-generation.test.js  # Report tests (40+)
│   ├── workflow-matrix.test.js    # Workflow tests (30+)
│   ├── integration.test.js        # Integration tests (20+)
│   ├── visualizations.test.js     # Viz tests (40+)
│   ├── charts.test.js             # Chart tests (60+)
│   ├── html-generation.test.js    # HTML tests (30+)
│   ├── viz-snapshots.test.js      # Snapshot tests (20+)
│   └── docker-validation.test.js  # Docker tests
├── results/                # Output directory
│   ├── summary.json                # Aggregated statistics
│   ├── detailed-iterations.json    # ⭐ NEW: Raw iteration data
│   ├── REPORT.md                   # Markdown report
│   └── visualizations.html         # Interactive charts
├── scripts/                # Node.js orchestration and reporting
│   ├── run-benchmark.js            # Orchestrator
│   ├── aggregate-results.js        # ⭐ NEW: Statistical aggregation
│   ├── generate-report.js          # Report generator
│   ├── generate-viz.js             # Visualization generator
│   ├── test-docker-build.sh        # ⭐ NEW: Docker validation
│   └── verify-installation.sh      # ⭐ NEW: Installation check
└── src/                    # Shell scripts executed inside containers
    └── benchmark.sh                # Core benchmark logic
```

## Testing Your Changes

### Test-Driven Development (Recommended)

```bash
# 1. Write test FIRST
vim tests/my-feature.test.js

# 2. Run test (should fail)
npm test

# 3. Implement feature
vim scripts/generate-report.js

# 4. Test (should pass)
npm test

# 5. Deploy
git push
```

### Incremental Testing Strategy

| Change Type | Test Command | Time | When |
|-------------|--------------|------|------|
| **Logic change** | `npm test` | 2s | Always |
| **Visualization** | `npm run test:viz:watch` | Continuous | While editing |
| **Benchmark script** | `./scripts/test-docker-build.sh quick <v>` | 3m | After changes |
| **Config change** | `npm run test:docker` | 15-20m | Before deploy |
| **Major change** | `npm run validate:full` | 25-30m | Before release |

### Test Coverage

Check what's tested:
```bash
npm run test:coverage
open coverage/index.html
```

**Coverage goals:**
- Statistical functions: 100%
- Report generation: 95%+
- Visualizations: 90%+
- Workflow logic: 100%

