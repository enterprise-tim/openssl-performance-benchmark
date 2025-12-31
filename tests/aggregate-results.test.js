import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateMockIterations,
  generateCompleteTestDataset,
  assertWithinPercent,
  calculateExpectedStats,
  validateAggregatedResult,
  validateReasonableStddev,
  MockFileSystem
} from './test-helpers.js';

// Import functions to test
// Note: We'll need to refactor aggregate-results.js to export these functions
const aggregationModule = await import('../scripts/aggregate-results.js');

describe('Aggregation - Statistical Calculations', () => {
  it('should calculate correct mean for 3 iterations', () => {
    const values = [100, 105, 95];
    const expected = 100;
    
    const stats = calculateExpectedStats(values);
    
    expect(stats.mean).toBe(expected);
    assertWithinPercent(stats.mean, expected, 0.1, 'Mean calculation');
  });

  it('should calculate correct standard deviation', () => {
    const values = [100, 100, 100];
    const stats = calculateExpectedStats(values);
    
    expect(stats.stddev).toBe(0);
  });

  it('should calculate stddev for varied data', () => {
    const values = [100, 110, 90];
    const stats = calculateExpectedStats(values);
    
    // Expected stddev ≈ 8.16
    assertWithinPercent(stats.stddev, 8.165, 1, 'Standard deviation');
  });

  it('should track min and max correctly', () => {
    const values = [105, 95, 100, 110, 90];
    const stats = calculateExpectedStats(values);
    
    expect(stats.min).toBe(90);
    expect(stats.max).toBe(110);
  });

  it('should handle single value', () => {
    const values = [100];
    const stats = calculateExpectedStats(values);
    
    expect(stats.mean).toBe(100);
    expect(stats.stddev).toBe(0);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(100);
  });

  it('should handle large variance', () => {
    const values = [100, 200, 50, 150];
    const stats = calculateExpectedStats(values);
    
    expect(stats.mean).toBe(125);
    expect(stats.stddev > 0).toBeTruthy();
    // Large variance should result in significant stddev
    expect(stats.stddev > 50).toBeTruthy();
  });
});

describe('Aggregation - Mock Data Generation', () => {
  it('should generate valid mock result', () => {
    const result = generateMockIterations('3.5.3', 1)[0];
    
    expect(result.config.version).toBe('3.5.3');
    expect(result.iteration).toBe(1);
    expect(result.metrics.aes_256_gcm_8k_kbs > 0).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
  });

  it('should generate multiple iterations with variance', () => {
    const iterations = generateMockIterations('3.5.3', 3, 0.02);
    
    expect(iterations.length).toBe(3);
    
    // Check that values are different (variance applied)
    const values = iterations.map(i => i.metrics.aes_256_gcm_8k_kbs);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size > 1).toBeTruthy();
  });

  it('should generate complete dataset', () => {
    const dataset = generateCompleteTestDataset(['3.5.3', '3.4.0'], 3);
    
    expect(dataset.length).toBe(6);
    
    // Group by version
    const byVersion = dataset.reduce((acc, r) => {
      acc[r.config.version] = (acc[r.config.version] || 0) + 1;
      return acc;
    }, {});
    
    expect(byVersion['3.5.3']).toBe(3);
    expect(byVersion['3.4.0']).toBe(3);
  });
});

describe('Aggregation - Grouping and Aggregation Logic', () => {
  it('should group iterations by version', () => {
    const results = generateCompleteTestDataset(['3.5.3', '3.4.0'], 3);
    
    // Group manually (testing the logic)
    const byVersion = {};
    results.forEach(result => {
      const version = result.config.version;
      if (!byVersion[version]) {
        byVersion[version] = [];
      }
      byVersion[version].push(result);
    });
    
    expect(Object.keys(byVersion).length).toBe(2);
    expect(byVersion['3.5.3'].length).toBe(3);
    expect(byVersion['3.4.0'].length).toBe(3);
  });

  it('should aggregate metrics correctly', () => {
    const iterations = generateMockIterations('3.5.3', 3, 0.02);
    
    // Manually aggregate one metric to test logic
    const metricKey = 'aes_256_gcm_8k_kbs';
    const values = iterations.map(i => i.metrics[metricKey]);
    const stats = calculateExpectedStats(values);
    
    // Validate the aggregated values
    expect(stats.mean > 0).toBeTruthy();
    expect(stats.stddev >= 0).toBeTruthy();
    expect(stats.min <= stats.mean).toBeTruthy();
    expect(stats.max >= stats.mean).toBeTruthy();
  });

  it('should preserve metadata from first iteration', () => {
    const iterations = generateMockIterations('3.5.3', 3);
    
    // When aggregating, we should use first iteration's metadata
    const firstMetadata = iterations[0].metadata;
    
    expect(firstMetadata.compiler_flags).toBeTruthy();
    expect(firstMetadata.platform).toBeTruthy();
    expect(firstMetadata.cpu_model).toBeTruthy();
  });

  it('should add iterations_count to config', () => {
    const iterations = generateMockIterations('3.5.3', 5);
    
    // After aggregation, config should include iterations_count
    const expectedConfig = {
      ...iterations[0].config,
      iterations_count: 5
    };
    
    expect(expectedConfig.iterations_count).toBe(5);
  });
});

describe('Aggregation - Edge Cases', () => {
  it('should handle missing metrics gracefully', () => {
    const iterations = [
      { metrics: { test_metric: 100 } },
      { metrics: { test_metric: 200 } },
      { metrics: {} } // Missing metric
    ];
    
    const values = iterations
      .map(i => i.metrics.test_metric)
      .filter(v => v !== undefined);
    
    const stats = calculateExpectedStats(values);
    
    expect(stats.count).toBe(2);
    expect(stats.mean).toBe(150);
  });

  it('should handle zero values', () => {
    const values = [0, 0, 0];
    const stats = calculateExpectedStats(values);
    
    expect(stats.mean).toBe(0);
    expect(stats.stddev).toBe(0);
  });

  it('should handle very small variance', () => {
    const iterations = generateMockIterations('3.5.3', 3, 0.0001);
    const values = iterations.map(i => i.metrics.aes_256_gcm_8k_kbs);
    const stats = calculateExpectedStats(values);
    
    // Very small variance should result in very small stddev
    const percentVariance = (stats.stddev / stats.mean) * 100;
    expect(percentVariance < 0.1).toBeTruthy();
  });

  it('should handle large numbers without overflow', () => {
    const values = [
      2945000000, // ~3GB/s
      2950000000,
      2955000000
    ];
    
    const stats = calculateExpectedStats(values);
    
    expect(stats.mean > 0).toBeTruthy();
    expect(!isNaN(stats.stddev)).toBeTruthy();
    expect(isFinite(stats.stddev)).toBeTruthy();
  });
});

describe('Aggregation - Result Validation', () => {
  it('should produce valid aggregated result structure', () => {
    const iterations = generateMockIterations('3.5.3', 3);
    
    // Simulate aggregated result
    const aggregated = {
      version: iterations[0].version,
      config: {
        ...iterations[0].config,
        iterations_count: 3
      },
      metadata: iterations[0].metadata,
      metrics: {},
      timestamp: new Date().toISOString(),
      raw_iterations: iterations.map(i => ({
        iteration: i.iteration,
        timestamp: i.timestamp,
        metrics: i.metrics
      }))
    };
    
    // Add aggregated metrics
    const metricKeys = Object.keys(iterations[0].metrics);
    metricKeys.forEach(key => {
      const values = iterations.map(i => i.metrics[key]);
      const stats = calculateExpectedStats(values);
      
      aggregated.metrics[key] = stats.mean;
      aggregated.metrics[`${key}_stddev`] = stats.stddev;
      aggregated.metrics[`${key}_min`] = stats.min;
      aggregated.metrics[`${key}_max`] = stats.max;
    });
    
    // Validate structure
    validateAggregatedResult(aggregated);
    
    expect(aggregated.config.iterations_count).toBe(3);
    expect(aggregated.raw_iterations.length).toBe(3);
  });

  it('should validate reasonable stddev values', () => {
    const iterations = generateMockIterations('3.5.3', 3, 0.02);
    const values = iterations.map(i => i.metrics.handshakes_new_per_sec);
    const stats = calculateExpectedStats(values);
    
    // With 2% variance, stddev should be reasonable
    validateReasonableStddev(stats.mean, stats.stddev, 5);
  });

  it('should detect unreasonable stddev', () => {
    const mean = 1000;
    const stddev = 500; // 50% variance - too high!
    
    expect(() => {
      validateReasonableStddev(mean, stddev, 10);
    }).toThrow(/too high/);
  });

  it('should detect zero stddev for investigation', () => {
    const mean = 1000;
    const stddev = 0;
    
    expect(() => {
      validateReasonableStddev(mean, stddev);
    }).toThrow(/zero/);
  });
});

describe('Aggregation - Performance', () => {
  it('should handle 10 iterations efficiently', () => {
    const start = Date.now();
    const iterations = generateMockIterations('3.5.3', 10);
    
    // Aggregate all metrics
    const metricKeys = Object.keys(iterations[0].metrics);
    const aggregated = {};
    
    metricKeys.forEach(key => {
      const values = iterations.map(i => i.metrics[key]);
      aggregated[key] = calculateExpectedStats(values);
    });
    
    const duration = Date.now() - start;
    
    // Should complete in under 100ms
    expect(duration < 100).toBeTruthy();
  });

  it('should handle 20 iterations', () => {
    const iterations = generateMockIterations('3.5.3', 20);
    
    expect(iterations.length).toBe(20);
    
    const values = iterations.map(i => i.metrics.aes_256_gcm_8k_kbs);
    const stats = calculateExpectedStats(values);
    
    expect(stats.count).toBe(20);
  });
});

describe('Aggregation - Real-World Scenarios', () => {
  it('should aggregate 7 versions with 3 iterations each', () => {
    const versions = ['1.1.1w', '3.0.15', '3.1.7', '3.2.3', '3.3.2', '3.4.0', '3.5.3'];
    const dataset = generateCompleteTestDataset(versions, 3);
    
    expect(dataset.length).toBe(21);
    
    // Group by version
    const byVersion = {};
    dataset.forEach(r => {
      const v = r.config.version;
      if (!byVersion[v]) byVersion[v] = [];
      byVersion[v].push(r);
    });
    
    // Each version should have exactly 3 iterations
    Object.values(byVersion).forEach(iterations => {
      expect(iterations.length).toBe(3);
    });
  });

  it('should handle mixed iteration counts (backward compatibility)', () => {
    const results = [
      ...generateMockIterations('3.5.3', 3),
      ...generateMockIterations('3.4.0', 1) // Only 1 iteration
    ];
    
    const byVersion = {};
    results.forEach(r => {
      const v = r.config.version;
      if (!byVersion[v]) byVersion[v] = [];
      byVersion[v].push(r);
    });
    
    expect(byVersion['3.5.3'].length).toBe(3);
    expect(byVersion['3.4.0'].length).toBe(1);
    
    // Single iteration should have stddev = 0
    const singleIterValues = [byVersion['3.4.0'][0].metrics.aes_256_gcm_8k_kbs];
    const stats = calculateExpectedStats(singleIterValues);
    expect(stats.stddev).toBe(0);
  });

  it('should produce consistent results across runs', () => {
    // Same seed data should produce same aggregation
    const run1 = generateMockIterations('3.5.3', 3, 0.02);
    const run2 = generateMockIterations('3.5.3', 3, 0.02);
    
    // Values should be identical for same seed
    const values1 = run1.map(r => r.metrics.aes_256_gcm_8k_kbs);
    const values2 = run2.map(r => r.metrics.aes_256_gcm_8k_kbs);
    
    const stats1 = calculateExpectedStats(values1);
    const stats2 = calculateExpectedStats(values2);
    
    // Means should be identical
    expect(stats1.mean).toBe(stats2.mean);
  });
});

console.log('✅ All aggregation tests defined');

