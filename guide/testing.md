# Testing Guide (for Developers)

## Overview

The benchmark system includes comprehensive testing to ensure reliability before expensive CI runs. This guide covers testing from a developer perspective.

## Test Architecture

### Four Testing Layers

```
Layer 1: Unit Tests (Vitest)          → < 2 seconds   → Logic validation
Layer 2: Visualization Tests (Vitest) → < 2 seconds   → Graph rendering
Layer 3: Integration Tests (Vitest)   → < 1 second    → End-to-end
Layer 4: Docker Tests (Bash)          → 15-70 minutes → Build validation
```

## Quick Reference

### Essential Commands

```bash
# Quick validation (always run before pushing)
npm test                      # < 2 seconds

# Development
npm run test:watch           # Watch mode (re-run on save)
npm run test:ui              # Visual test explorer

# Specific tests
npm run test:viz             # Visualization tests only
npm run test:docker          # Docker build tests

# Complete validation
npm run validate             # Unit + Docker
npm run validate:full        # Everything + coverage
```

## Test Files Overview

| File | Tests | Coverage | Purpose |
|------|-------|----------|---------|
| `test-helpers.js` | - | - | Mock data & utilities |
| `aggregate-results.test.js` | 60+ | 100% | Statistical aggregation |
| `report-generation.test.js` | 40+ | 95% | Report formatting |
| `workflow-matrix.test.js` | 30+ | 100% | CI/CD logic |
| `integration.test.js` | 20+ | 85% | End-to-end workflows |
| `visualizations.test.js` | 40+ | 90% | D3 chart core |
| `charts.test.js` | 60+ | 90% | Specific chart types |
| `html-generation.test.js` | 30+ | 90% | HTML output |
| `viz-snapshots.test.js` | 20+ | 85% | Snapshot testing |
| `docker-validation.test.js` | 10+ | 100% | Docker configs |

**Total: 350+ tests**

## Testing Workflows

### Workflow 1: Daily Development

```bash
# Start watch mode
npm run test:watch

# Make changes
vim scripts/generate-report.js

# Tests re-run automatically on save
# Fix issues until all green

# Push
git push
```

### Workflow 2: Adding New Feature

```bash
# 1. Write test first (TDD)
vim tests/my-feature.test.js

# 2. Run test (should fail)
npm test

# 3. Implement feature
vim scripts/my-feature.js

# 4. Test (should pass)
npm test

# 5. Push
git push
```

### Workflow 3: Modifying Visualizations

```bash
# 1. Start viz watch mode
npm run test:viz:watch

# 2. Edit chart code
vim scripts/generate-viz.js

# 3. Tests re-run on save

# 4. Preview in browser
npm run generate-viz && open results/visualizations.html

# 5. Push
git push
```

### Workflow 4: Testing New OpenSSL Version

```bash
# 1. Add to config
vim config/versions.json

# 2. Unit tests (validate config)
npm test

# 3. Docker build test
./scripts/test-docker-build.sh quick <new-version>

# 4. Full benchmark test
./scripts/test-docker-build.sh full <new-version>

# 5. If all pass, push
git push
```

## Writing Tests

### Test Template

```javascript
import { describe, it, expect } from 'vitest';
import { generateMockIterations } from './test-helpers.js';

describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = generateMockIterations('3.5.3', 3);
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Testing Statistical Functions

```javascript
import { calculateExpectedStats } from './test-helpers.js';

it('should calculate mean correctly', () => {
  const values = [100, 105, 95];
  const stats = calculateExpectedStats(values);
  
  expect(stats.mean).toBe(100);
  expect(stats.stddev).toBeCloseTo(4.08, 1);
  expect(stats.min).toBe(95);
  expect(stats.max).toBe(105);
});
```

### Testing Visualizations

```javascript
import { beforeEach } from 'vitest';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';

describe('Chart Test', () => {
  let container;

  beforeEach(() => {
    const dom = new JSDOM('<div id="chart"></div>');
    global.document = dom.window.document;
    container = d3.select('#chart');
  });

  it('should render error bars', () => {
    const svg = container.append('svg');
    
    const errorBars = svg.selectAll('.error-bar')
      .data([{x: 100, stddev: 5}])
      .enter()
      .append('line')
      .attr('x1', d => d.x - d.stddev)
      .attr('x2', d => d.x + d.stddev);
    
    expect(errorBars.size()).toBe(1);
  });
});
```

### Testing Report Generation

```javascript
it('should format with stddev', () => {
  const result = formatNumWithStddev(6450, 12);
  expect(result).toBe('6,450 ± 12');
});

it('should hide insignificant stddev', () => {
  const result = formatNumWithStddev(10000, 5); // 0.05%
  expect(result).toBe('10,000');
});
```

## Mock Data

### Generating Test Data

```javascript
import { 
  generateMockResult,
  generateMockIterations,
  generateCompleteTestDataset 
} from './test-helpers.js';

// Single result
const result = generateMockResult('3.5.3', 1);

// 3 iterations with 2% variance
const iterations = generateMockIterations('3.5.3', 3, 0.02);

// Complete dataset: 7 versions × 3 iterations
const dataset = generateCompleteTestDataset(
  ['1.1.1w', '3.0.15', '3.1.7', '3.2.3', '3.3.2', '3.4.0', '3.5.3'],
  3
);
```

### Mock Data Features

- **Realistic values** based on actual benchmarks
- **Controlled variance** (default 2%)
- **All required fields**
- **Consistent metadata**
- **Fast generation** (< 50ms for 70 results)

## Continuous Integration

### GitHub Actions Test Workflow

**File:** `.github/workflows/test.yml`

**Runs on:**
- Every push
- Every pull request
- Before benchmark workflow

**What it tests:**
- Unit tests (Vitest)
- Configuration validation
- Matrix generation
- Aggregation with mock data
- Syntax checks (bash, JSON, YAML)

**Time:** ~2 minutes
**Cost:** ~2 CI minutes (vs. 630 for full benchmark)

### Pre-commit Hook (Optional)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi
```

```bash
chmod +x .git/hooks/pre-commit
```

## Performance Considerations

### Test Execution Speed

- **Unit tests:** < 2 seconds (all 200+)
- **Viz tests:** < 2 seconds (all 150+)
- **Watch mode re-run:** < 500ms
- **Docker smoke test:** 2-3 minutes
- **Docker full test:** 5-10 minutes

### Optimization Tips

1. **Use `it.only`** to run single test during development
2. **Use watch mode** to auto-run only changed files
3. **Use `--grep`** to run subset of tests
4. **Cache Docker images** during development

## Troubleshooting

### Tests Fail After npm install

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

### Vitest Not Found

```bash
# Check installation
npm list vitest

# If missing
npm install --save-dev vitest jsdom d3
```

### Docker Tests Fail

```bash
# Check Docker running
docker ps

# Check Docker version
docker --version  # Need v24+

# Test specific version
./scripts/test-docker-build.sh quick 3.5.3

# Review logs
cat /tmp/docker-build-3.5.3.log
```

### Snapshot Tests Fail

```bash
# Review changes
git diff tests/__snapshots__

# If changes are intentional, update
npx vitest run -u

# Commit updated snapshots
git add tests/__snapshots__
```

### Watch Mode Not Working

```bash
# Kill and restart
pkill -f vitest
npm run test:watch
```

## Advanced Topics

### Custom Assertions

```javascript
import { assertWithinPercent } from './test-helpers.js';

it('should be within tolerance', () => {
  assertWithinPercent(actual, expected, 1, 'Calculation');
});
```

### Parameterized Tests

```javascript
it.each([
  [3, 100, 105, 95],
  [5, 100, 105, 102, 98, 95],
  [10, /* ... */]
])('should aggregate %i iterations', (count, ...values) => {
  const stats = calculateExpectedStats(values);
  expect(stats.count).toBe(count);
});
```

### Async Testing

```javascript
it('should read files', async () => {
  const data = await fs.readFile('file.json', 'utf8');
  const parsed = JSON.parse(data);
  expect(parsed).toBeDefined();
});
```

### Mocking

```javascript
import { vi } from 'vitest';

it('should call function', () => {
  const mock = vi.fn();
  someFunction(mock);
  expect(mock).toHaveBeenCalledWith(expectedArgs);
});
```

## Contributing

### Before Submitting PR

```bash
# 1. Run all tests
npm test

# 2. Check coverage
npm run test:coverage

# 3. Test Docker builds
npm run test:docker

# 4. Lint check
npm run test:legacy

# 5. If all pass, submit PR
git push origin feature-branch
```

### Code Review Checklist

- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Coverage maintained or improved
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Backward compatible

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [D3.js Documentation](https://d3js.org/)
- [jsdom Documentation](https://github.com/jsdom/jsdom)
- Project testing guides in `docs/`

## Project Structure (Updated)
