# Vitest Testing Guide

## Overview

The OpenSSL Performance Benchmark system uses **Vitest** as the primary testing framework for all JavaScript code, especially visualization and chart generation. Vitest provides fast, modern testing with excellent TypeScript/ESM support and a great developer experience.

## Why Vitest?

### Advantages Over Node Test Runner

- **Faster:** Uses Vite's transformation pipeline
- **Better DX:** Watch mode, UI, coverage reports
- **DOM Testing:** Built-in jsdom support for D3 charts
- **Snapshots:** Easy snapshot testing
- **ESM Native:** Works seamlessly with ES modules
- **Compatible:** Similar API to Jest

### Perfect for Testing Visualizations

- **jsdom integration:** Test D3 charts without a browser
- **Fast feedback:** Watch mode re-runs tests on change
- **Coverage:** Built-in code coverage
- **UI mode:** Visual test explorer

---

## Installation

Already configured in `package.json`:

```json
{
  "devDependencies": {
    "vitest": "^1.1.0",
    "jsdom": "^23.0.0",
    "@vitest/ui": "^1.1.0",
    "@vitest/coverage-v8": "^1.1.0",
    "d3": "^7.8.5"
  }
}
```

Install dependencies:
```bash
npm install
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run with Vitest directly
npx vitest run

# Watch mode (re-runs on file changes)
npm run test:watch

# UI mode (browser-based test explorer)
npm run test:ui

# Coverage report
npm run test:coverage
```

### Specific Test Files

```bash
# Run only visualization tests
npm run test:viz

# Watch visualization tests
npm run test:viz:watch

# Run specific test file
npx vitest run tests/charts.test.js

# Run tests matching pattern
npx vitest run --grep "Scatter Plot"
```

---

## Test Structure

### Test Files

```
tests/
├── setup.vitest.js          # Vitest setup (jsdom, globals)
├── test-helpers.js          # Mock data and utilities
├── visualizations.test.js   # D3 chart generation tests
├── charts.test.js           # Specific chart type tests
├── html-generation.test.js  # HTML output tests
└── viz-snapshots.test.js    # Snapshot tests
```

### Test Categories

| File | Tests | Purpose |
|------|-------|---------|
| `visualizations.test.js` | 40+ | Core D3 chart logic |
| `charts.test.js` | 60+ | Specific chart types |
| `html-generation.test.js` | 30+ | HTML output structure |
| `viz-snapshots.test.js` | 20+ | Snapshot testing |

**Total: 150+ visualization tests**

---

## Writing Tests

### Basic Test

```javascript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something', () => {
    const result = someFunction();
    expect(result).toBe(expected);
  });
});
```

### Testing D3 Charts

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';

describe('Chart Test', () => {
  let container;

  beforeEach(() => {
    // Create fresh DOM for each test
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#chart');
  });

  it('should render chart', () => {
    const svg = container.append('svg')
      .attr('width', 600)
      .attr('height', 400);
    
    const circles = svg.selectAll('circle')
      .data([1, 2, 3])
      .enter()
      .append('circle')
      .attr('r', 5);
    
    expect(circles.size()).toBe(3);
  });
});
```

### Testing with Mock Data

```javascript
import { generateMockIterations } from './test-helpers.js';

it('should handle aggregated data', () => {
  const iterations = generateMockIterations('3.5.3', 3);
  
  expect(iterations.length).toBe(3);
  expect(iterations[0].metrics.aes_256_gcm_8k_kbs).toBeGreaterThan(0);
});
```

### Snapshot Testing

```javascript
it('should match HTML structure', () => {
  const html = generateChartHtml(data);
  expect(html).toMatchSnapshot();
});
```

**First run:** Creates snapshot file
**Subsequent runs:** Compares against snapshot
**Update snapshots:** `npx vitest run -u`

---

## Test Configuration

### vitest.config.js

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,              // Use global test functions
    environment: 'jsdom',       // DOM environment for D3
    setupFiles: ['./tests/setup.vitest.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    testTimeout: 10000,
  },
});
```

### Setup File (tests/setup.vitest.js)

```javascript
import { beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  // Set up jsdom for D3 testing
  const dom = new JSDOM('<!DOCTYPE html>...');
  global.window = dom.window;
  global.document = dom.window.document;
  global.SVGElement = dom.window.SVGElement;
});
```

---

## Common Test Patterns

### Pattern 1: Chart Rendering

```javascript
it('should render bar chart', () => {
  const data = [10, 20, 30];
  const svg = container.append('svg');
  
  const bars = svg.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('height', d => d);
  
  expect(bars.size()).toBe(3);
  expect(bars.nodes()[0].getAttribute('height')).toBe('10');
});
```

### Pattern 2: Scale Testing

```javascript
it('should create correct scale', () => {
  const scale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, 500]);
  
  expect(scale(0)).toBe(0);
  expect(scale(100)).toBe(500);
  expect(scale(50)).toBe(250);
});
```

### Pattern 3: Data Transformation

```javascript
it('should transform data correctly', () => {
  const raw = [{ v: '3.5.3', val: 6450 }];
  const transformed = raw.map(d => ({
    version: d.v,
    normalized: d.val / 1000
  }));
  
  expect(transformed[0].normalized).toBe(6.45);
});
```

### Pattern 4: Error Bar Testing

```javascript
it('should render error bars', () => {
  const data = [{ value: 100, stddev: 5 }];
  
  const errorBars = svg.selectAll('.error-bar')
    .data(data)
    .enter()
    .append('line')
    .attr('y1', d => scale(d.value - d.stddev))
    .attr('y2', d => scale(d.value + d.stddev));
  
  expect(errorBars.size()).toBe(1);
});
```

### Pattern 5: Interactive Features

```javascript
it('should handle mouse events', () => {
  let hoverCount = 0;
  
  const circle = svg.append('circle')
    .on('mouseover', () => hoverCount++);
  
  circle.dispatch('mouseover');
  
  expect(hoverCount).toBe(1);
});
```

---

## Testing Specific Charts

### Scatter Plot (Overview)

```javascript
describe('Scatter Plot', () => {
  it('should plot throughput vs handshakes', () => {
    const data = aggregatedResults;
    
    const xVal = d => d.metrics.aes_256_gcm_8k_kbs;
    const yVal = d => d.metrics.handshakes_new_per_sec;
    
    const circles = svg.selectAll('circle')
      .data(data)
      .attr('cx', d => xScale(xVal(d)))
      .attr('cy', d => yScale(yVal(d)));
    
    expect(circles.size()).toBe(data.length);
  });
});
```

### Slope Chart (TLS Comparison)

```javascript
describe('Slope Chart', () => {
  it('should connect TLS 1.2 and 1.3 values', () => {
    const data = [{ tls12: 6400, tls13: 6450 }];
    
    const lines = svg.selectAll('line')
      .data(data)
      .attr('x1', xScale('TLS 1.2'))
      .attr('y1', d => yScale(d.tls12))
      .attr('x2', xScale('TLS 1.3'))
      .attr('y2', d => yScale(d.tls13));
    
    expect(lines.size()).toBe(1);
  });
});
```

### Bar Chart (Grouped)

```javascript
describe('Grouped Bar Chart', () => {
  it('should render groups for each version', () => {
    const versions = ['3.5.3', '3.4.0'];
    const groups = svg.selectAll('.group')
      .data(versions)
      .enter()
      .append('g');
    
    expect(groups.size()).toBe(2);
  });
});
```

---

## Coverage

### Generate Coverage Report

```bash
npm run test:coverage
```

**Output:**
```
 % Coverage report from v8
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   87.5  |   82.3   |   90.1  |   87.5  |
 scripts/aggregate-results.js|   92.1  |   85.6   |   95.0  |   92.1  |
 scripts/generate-report.js  |   85.3  |   78.9   |   88.2  |   85.3  |
 scripts/generate-viz.js     |   82.1  |   80.1   |   85.7  |   82.1  |
-----------------------------|---------|----------|---------|---------|
```

### View HTML Coverage Report

```bash
npm run test:coverage
open coverage/index.html
```

---

## Watch Mode

### Interactive Development

```bash
npm run test:watch
```

**Features:**
- Re-runs tests on file save
- Shows only failing tests
- Can filter by test name
- Press keys for actions:
  - `a` - run all tests
  - `f` - run only failed tests
  - `q` - quit

**Example workflow:**
1. Start watch mode: `npm run test:watch`
2. Edit `scripts/generate-viz.js`
3. Save file → tests re-run automatically
4. Fix issues → save → tests re-run
5. All green? Done!

---

## UI Mode

### Visual Test Explorer

```bash
npm run test:ui
```

**Opens browser with:**
- Test tree view
- Individual test results
- Console output
- File viewer
- Re-run buttons

**Perfect for:**
- Debugging test failures
- Exploring test suite
- Reviewing coverage
- Demo/presentation

---

## Debugging Tests

### Using console.log

```javascript
it('should debug data', () => {
  const data = generateMockIterations('3.5.3', 3);
  console.log('Data:', data);
  
  expect(data.length).toBe(3);
});
```

### Using debug mode

```bash
# Run with Node debugger
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Or use VS Code debugger with launch.json
```

### Isolating Tests

```javascript
// Run only this test
it.only('should run only this test', () => {
  // ...
});

// Skip this test
it.skip('should skip this test', () => {
  // ...
});
```

---

## Best Practices

### 1. Use beforeEach for Setup

```javascript
beforeEach(() => {
  // Fresh DOM for each test
  const dom = new JSDOM('...');
  global.document = dom.window.document;
  container = d3.select('#chart');
});
```

### 2. Test in Isolation

```javascript
// Bad: Tests depend on each other
let sharedData;
it('test 1', () => { sharedData = []; });
it('test 2', () => { sharedData.push(1); });

// Good: Each test is independent
it('test 1', () => { const data = []; });
it('test 2', () => { const data = [1]; });
```

### 3. Use Descriptive Names

```javascript
// Bad
it('test 1', () => {});

// Good
it('should render error bars when stddev > 0', () => {});
```

### 4. Test Edge Cases

```javascript
it('should handle empty data', () => {});
it('should handle null values', () => {});
it('should handle very large numbers', () => {});
it('should handle single data point', () => {});
```

### 5. Mock External Dependencies

```javascript
import { vi } from 'vitest';

it('should call D3 function', () => {
  const mockFunction = vi.fn();
  // Test with mock
});
```

---

## Troubleshooting

### Tests Fail with "document is not defined"

**Cause:** jsdom not set up
**Fix:** Check `vitest.config.js` has `environment: 'jsdom'`

### Tests Pass Locally but Fail in CI

**Cause:** Missing dependencies
**Fix:** Ensure `package.json` includes all devDependencies

### Snapshot Tests Fail

**Cause:** Output changed
**Fix:** 
1. Review changes
2. If intentional: `npx vitest run -u` (update snapshots)
3. Commit updated snapshot files

### Tests are Slow

**Cause:** Too many DOM operations
**Fix:**
- Use `beforeEach` to reset state
- Avoid unnecessary DOM creation
- Use `it.only` to test specific cases

### Coverage is Low

**Cause:** Some code paths not tested
**Fix:**
- Run `npm run test:coverage`
- Check HTML report: `open coverage/index.html`
- Add tests for uncovered lines

---

## Examples

### Example 1: Testing Scatter Plot

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';

describe('Scatter Plot', () => {
  let container;

  beforeEach(() => {
    const dom = new JSDOM('<div id="chart"></div>');
    global.document = dom.window.document;
    container = d3.select('#chart');
  });

  it('should render points for each version', () => {
    const data = [
      { version: '3.5.3', x: 100, y: 200 },
      { version: '3.4.0', x: 105, y: 195 }
    ];
    
    const svg = container.append('svg');
    
    const circles = svg.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 5);
    
    expect(circles.size()).toBe(2);
  });

  it('should render error bars', () => {
    const data = [{ x: 100, y: 200, xStddev: 5, yStddev: 3 }];
    
    const svg = container.append('svg');
    
    const errorBars = svg.selectAll('.error-bar')
      .data(data)
      .enter()
      .append('line')
      .attr('x1', d => d.x - d.xStddev)
      .attr('x2', d => d.x + d.xStddev)
      .attr('y1', d => d.y)
      .attr('y2', d => d.y);
    
    expect(errorBars.size()).toBe(1);
  });
});
```

### Example 2: Testing Data Transformation

```javascript
import { describe, it, expect } from 'vitest';
import { calculateExpectedStats } from './test-helpers.js';

describe('Data Transformation', () => {
  it('should aggregate iterations correctly', () => {
    const iterations = [
      { metrics: { test: 100 } },
      { metrics: { test: 105 } },
      { metrics: { test: 95 } }
    ];
    
    const values = iterations.map(i => i.metrics.test);
    const stats = calculateExpectedStats(values);
    
    expect(stats.mean).toBe(100);
    expect(stats.stddev).toBeCloseTo(4.08, 1);
  });

  it('should transform for slope chart', () => {
    const data = [{
      tls12: 6400,
      tls13: 6450
    }];
    
    const transformed = data.map(d => ({
      ...d,
      diff: d.tls13 - d.tls12,
      pctDiff: ((d.tls13 - d.tls12) / d.tls12) * 100
    }));
    
    expect(transformed[0].diff).toBe(50);
    expect(transformed[0].pctDiff).toBeCloseTo(0.78, 1);
  });
});
```

### Example 3: Testing Interactive Features

```javascript
describe('Interactive Features', () => {
  it('should show tooltip on hover', () => {
    const svg = container.append('svg');
    
    let tooltipShown = false;
    
    const circle = svg.append('circle')
      .on('mouseover', () => {
        tooltipShown = true;
      });
    
    circle.dispatch('mouseover');
    
    expect(tooltipShown).toBe(true);
  });

  it('should hide tooltip on mouseout', () => {
    let tooltipVisible = true;
    
    const circle = svg.append('circle')
      .on('mouseout', () => {
        tooltipVisible = false;
      });
    
    circle.dispatch('mouseout');
    
    expect(tooltipVisible).toBe(false);
  });
});
```

---

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Install dependencies
  run: npm ci

- name: Run Vitest tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

### Pre-commit Hook

```bash
#!/bin/bash
npm test
if [ $? -ne 0 ]; then
  echo "Vitest tests failed"
  exit 1
fi
```

---

## Workflow Examples

### Daily Development

```bash
# Start watch mode
npm run test:watch

# Edit files
vim scripts/generate-viz.js

# Tests re-run automatically
# Fix issues until all green

# Commit
git commit -m "Update visualization"
```

### Before Pushing

```bash
# Run full test suite
npm test

# Check coverage
npm run test:coverage

# If all pass
git push
```

### Debugging Failures

```bash
# Run specific test
npx vitest run tests/charts.test.js --reporter=verbose

# Or run with UI
npm run test:ui

# Fix issue
vim scripts/generate-viz.js

# Retest
npx vitest run tests/charts.test.js
```

---

## Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Chart rendering | 90%+ | |
| Data transformation | 95%+ | |
| HTML generation | 90%+ | |
| Error handling | 85%+ | |
| Interactive features | 80%+ | |

---

## Performance

### Test Execution Speed

- **All tests:** < 2 seconds
- **Visualization tests only:** < 1 second
- **With coverage:** < 3 seconds

**Much faster than:**
- Running actual benchmarks (30+ minutes)
- Docker builds (2-3 minutes per version)
- Manual browser testing (minutes per chart)

---

## Troubleshooting Common Issues

### Issue: "Cannot find module 'd3'"

**Solution:**
```bash
npm install d3 --save-dev
```

### Issue: "SVGElement is not defined"

**Solution:** Check `tests/setup.vitest.js` includes:
```javascript
global.SVGElement = dom.window.SVGElement;
```

### Issue: Tests fail with "window is not defined"

**Solution:** Ensure `vitest.config.js` has:
```javascript
environment: 'jsdom'
```

### Issue: Snapshot tests always fail

**Solution:**
```bash
# Update snapshots after intentional changes
npx vitest run -u

# Commit updated snapshot files
git add tests/__snapshots__
git commit -m "Update test snapshots"
```

---

## Advanced Features

### Mocking

```javascript
import { vi } from 'vitest';

it('should call function', () => {
  const mockFn = vi.fn();
  someComponent(mockFn);
  expect(mockFn).toHaveBeenCalled();
});
```

### Async Testing

```javascript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

### Parameterized Tests

```javascript
it.each([
  [100, 200],
  [105, 210],
  [95, 190]
])('should calculate %i * 2 = %i', (input, expected) => {
  expect(input * 2).toBe(expected);
});
```

---

## Quick Reference

### Essential Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode |
| `npm run test:ui` | UI mode |
| `npm run test:coverage` | Coverage report |
| `npm run test:viz` | Visualization tests only |

### Test Structure

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Group', () => {
  beforeEach(() => { /* setup */ });
  
  it('should test something', () => {
    expect(actual).toBe(expected);
  });
});
```

### Assertions

```javascript
expect(value).toBe(5);
expect(value).toBeCloseTo(5.0, 1);
expect(value).toBeGreaterThan(0);
expect(array).toHaveLength(3);
expect(obj).toMatchObject({ key: 'value' });
expect(html).toMatchSnapshot();
```

---

## Summary

**Vitest provides:**
- **Fast tests** (< 2 seconds for all viz tests)
- **Great DX** (watch mode, UI, coverage)
- **DOM support** (test D3 charts)
- **Snapshot testing** (catch unintended changes)
- **Modern features** (ESM, TypeScript ready)

**For this project:**
- 150+ visualization tests
- Full D3 chart coverage
- HTML output validation
- Interactive feature testing
- < 2 second test execution

**Run before every push:**
```bash
npm test
```

**Happy testing!** 

