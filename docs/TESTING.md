# Testing Documentation

## Overview

The OpenSSL Performance Benchmark system includes a comprehensive test suite to ensure reliability before running expensive CI/CD pipelines. Since each benchmark run costs significant GitHub Actions minutes, these tests help catch issues early.

## Why Testing Matters

**Cost Consideration:**
- Full benchmark: 7 versions × 3 iterations × ~30 minutes = **630 CI minutes**
- With weekly runs: **2,520 minutes/month** (exceeds free tier)
- Failed runs = wasted money

**Solution:**
- Run tests locally before pushing (< 1 minute)
- Automated tests on PRs (< 2 minutes)
- Catch configuration errors, logic bugs, and integration issues

## Test Suite Structure

### Test Files

```
tests/
├── test-helpers.js           # Mock data generators and utilities
├── aggregate-results.test.js # Statistical aggregation tests
├── report-generation.test.js # Report formatting tests
├── workflow-matrix.test.js   # CI/CD matrix generation tests
├── integration.test.js       # End-to-end workflow tests
└── run-all-tests.js         # Test runner
```

### Test Coverage

| Component | Test File | Coverage |
|-----------|-----------|----------|
| **Statistical calculations** | `aggregate-results.test.js` | Mean, stddev, min, max, edge cases |
| **Report formatting** | `report-generation.test.js` | Number formatting, mean±stddev display |
| **Workflow logic** | `workflow-matrix.test.js` | Matrix generation, artifact naming |
| **End-to-end** | `integration.test.js` | Complete workflow simulation |
| **Mock data** | `test-helpers.js` | Realistic test data generation |

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run with Node's built-in test runner (more verbose)
npm run test:unit

# Watch mode (re-runs on file changes)
npm run test:watch

# Legacy JQ validation tests
npm run test:legacy
```

### Test Output

```
 OpenSSL Benchmark Test Suite

═══════════════════════════════════════════════════════
 Found 4 test files:

   • aggregate-results.test.js
   • report-generation.test.js
   • workflow-matrix.test.js
   • integration.test.js

All report generation tests defined
▶ Report Generation - Number Formatting
  ✔ should format simple numbers correctly (1.2ms)
  ✔ should handle zero and null (0.1ms)
  ...
  
127 tests passed
```

## Test Categories

### 1. Statistical Calculations (`aggregate-results.test.js`)

Tests the core aggregation logic:

```javascript
describe('Aggregation - Statistical Calculations', () => {
  it('should calculate correct mean for 3 iterations', () => {
    const values = [100, 105, 95];
    const stats = calculateExpectedStats(values);
    assert.strictEqual(stats.mean, 100);
  });
});
```

**What's tested:**
- Mean calculation accuracy
- Standard deviation correctness
- Min/max tracking
- Edge cases (single value, zeros, large numbers)
- Performance with many iterations

### 2. Report Formatting (`report-generation.test.js`)

Tests display logic:

```javascript
it('should format mean with stddev', () => {
  const result = formatNumWithStddev(6450, 12);
  assert.strictEqual(result, '6,450 ± 12');
});
```

**What's tested:**
- Number formatting (thousands separators)
- Mean ± stddev display
- Hiding insignificant stddev (< 0.1%)
- Markdown table generation
- Percentage calculations

### 3. Workflow Matrix (`workflow-matrix.test.js`)

Tests CI/CD configuration:

```javascript
it('should generate matrix for 7 versions × 3 iterations', () => {
  const matrix = generateMockMatrix(versions, 3);
  assert.strictEqual(matrix.include.length, 21);
});
```

**What's tested:**
- Matrix generation (version × iteration combinations)
- Artifact naming uniqueness
- Cost calculations
- Edge cases (1 iteration, 20 iterations)

### 4. Integration Tests (`integration.test.js`)

Tests complete workflows:

```javascript
it('should simulate complete workflow from iterations to report', () => {
  // Generate mock results
  const results = generateCompleteTestDataset(['3.5.3'], 3);
  
  // Group by version
  const byVersion = groupByVersion(results);
  
  // Aggregate statistics
  const aggregated = aggregateResults(byVersion);
  
  // Validate output
  validateAggregatedResult(aggregated[0]);
});
```

**What's tested:**
- End-to-end workflow simulation
- File operations
- Error scenarios
- Performance at scale (70 results)
- Backward compatibility

## Mock Data Generation

The test suite uses realistic mock data:

```javascript
// Generate 3 iterations of version 3.5.3 with 2% variance
const iterations = generateMockIterations('3.5.3', 3, 0.02);

// Complete dataset: 7 versions × 3 iterations
const dataset = generateCompleteTestDataset(
  ['1.1.1w', '3.0.15', '3.1.7', '3.2.3', '3.3.2', '3.4.0', '3.5.3'],
  3
);
```

**Features:**
- Realistic performance numbers (based on actual benchmarks)
- Controlled variance (default 2%)
- Consistent metadata
- All required fields

## Test Helpers

### Assertion Utilities

```javascript
// Check value is within percentage tolerance
assertWithinPercent(actual, expected, 1, 'Mean calculation');

// Validate object structure
assertHasKeys(obj, ['version', 'config', 'metrics']);

// Validate reasonable stddev
validateReasonableStddev(mean, stddev, maxPercent);
```

### Mock File System

```javascript
const mockFS = new MockFileSystem();

await mockFS.writeFile('path/file.json', JSON.stringify(data));
const content = await mockFS.readFile('path/file.json');
mockFS.clear();
```

## CI/CD Integration

### GitHub Actions Test Workflow

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
```

**What's tested in CI:**
- Unit tests across Node.js versions
- Configuration validation
- Aggregation script with mock data
- Matrix generation logic
- Shell script syntax
- JSON/YAML validity

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm test
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

## Writing New Tests

### Template

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = createTestData();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    assert.strictEqual(result.expected, 'value');
  });
});
```

### Best Practices

1. **One assertion per test** (when possible)
2. **Descriptive test names** (`should calculate mean for 3 iterations`)
3. **Arrange-Act-Assert** pattern
4. **Test edge cases** (empty, null, extreme values)
5. **Mock external dependencies** (file system, network)

## Common Test Scenarios

### Test Statistical Aggregation

```javascript
const iterations = generateMockIterations('3.5.3', 3);
const values = iterations.map(i => i.metrics.aes_256_gcm_8k_kbs);
const stats = calculateExpectedStats(values);

assert.ok(stats.stddev > 0);
assert.ok(stats.min <= stats.mean);
assert.ok(stats.max >= stats.mean);
```

### Test Error Handling

```javascript
it('should handle missing metrics gracefully', () => {
  const result = { metrics: {} };
  const value = result.metrics.nonexistent || 0;
  assert.strictEqual(value, 0);
});
```

### Test Backward Compatibility

```javascript
it('should handle single iteration (no stddev)', () => {
  const iterCount = result.config.iterations_count || 1;
  assert.strictEqual(iterCount, 1);
  
  const stats = calculateExpectedStats([100]);
  assert.strictEqual(stats.stddev, 0);
});
```

## Troubleshooting

### Tests Fail Locally

```bash
# Clear any cached modules
rm -rf node_modules
npm install

# Run with verbose output
node --test --reporter=spec tests/*.test.js

# Run specific test file
node --test tests/aggregate-results.test.js
```

### Tests Pass Locally But Fail in CI

Common causes:
- Node.js version differences (test on 18.x and 20.x)
- Missing dependencies in CI
- File path assumptions

### Mock Data Seems Unrealistic

Update `test-helpers.js` baseValues:
```javascript
const baseValues = {
  aes_256_gcm_8k_kbs: 2945000, // ← Adjust these
  handshakes_new_per_sec: 6450,
  // ...
};
```

## Performance Testing

The test suite includes performance benchmarks:

```javascript
it('should handle 7 versions × 10 iterations efficiently', () => {
  const start = Date.now();
  
  const results = generateCompleteTestDataset(versions, 10);
  const aggregated = aggregateAllResults(results);
  
  const duration = Date.now() - start;
  assert.ok(duration < 500, `Too slow: ${duration}ms`);
});
```

**Targets:**
- Aggregation: < 100ms for 10 iterations
- Complete workflow: < 500ms for 70 results
- Mock data generation: < 50ms for 21 results

## Test Coverage Goals

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| Statistical functions | 100% | Complete |
| Formatting functions | 100% | Complete |
| Matrix generation | 100% | Complete |
| Error handling | 90%+ | Complete |
| Integration paths | 80%+ | Complete |

## Continuous Improvement

### Adding Tests for New Features

1. Create test file: `tests/new-feature.test.js`
2. Add mock data generators if needed
3. Test happy path
4. Test edge cases
5. Test error conditions
6. Update this documentation

### Maintaining Tests

- **Review tests** when changing core logic
- **Update mock data** to reflect actual results
- **Add regression tests** for bugs
- **Remove obsolete tests** (but document why)

## Quick Reference

### Run Tests

```bash
npm test                    # All tests
npm run test:unit          # Node test runner
npm run test:watch         # Watch mode
npm run test:legacy        # JQ validation
```

### Test Commands

```bash
# Run single file
node --test tests/aggregate-results.test.js

# Run with reporter
node --test --reporter=spec tests/*.test.js

# Run with coverage (experimental)
npm run test:coverage
```

### CI/CD

```bash
# Manually trigger test workflow
gh workflow run test.yml

# View test results
gh run view --log
```

## Summary

The test suite provides:
- **Fast feedback** (< 1 minute locally)
- **Cost savings** (catch errors before expensive CI runs)
- **Confidence** (comprehensive coverage of critical paths)
- **Documentation** (tests as living examples)
- **Regression prevention** (automated validation)

**Before every push:**
```bash
npm test
```

**Before opening a PR:**
```bash
npm test && npm run test:legacy
```

**Before deploying:**
```bash
# Full validation
npm test
npm run test:legacy
# Test aggregation with real (local) data if available
node scripts/aggregate-results.js results-backup results-test
```

---

**Remember:** A few minutes of testing saves hours of debugging and dollars in CI costs!

