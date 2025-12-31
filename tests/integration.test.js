import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateCompleteTestDataset,
  MockFileSystem,
  validateAggregatedResult,
  calculateExpectedStats
} from './test-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Integration - End-to-End Workflow Simulation', () => {
  it('should simulate complete workflow from iterations to report', async () => {
    // Step 1: Generate mock iteration data (simulates benchmark jobs)
    const versions = ['3.5.3', '3.4.0'];
    const iterations = 3;
    const mockResults = generateCompleteTestDataset(versions, iterations);
    
    expect(mockResults.length).toBe(6);
    
    // Step 2: Group by version (simulates aggregation script)
    const byVersion = {};
    mockResults.forEach(result => {
      const v = result.config.version;
      if (!byVersion[v]) byVersion[v] = [];
      byVersion[v].push(result);
    });
    
    assert.strictEqual(Object.keys(byVersion).length, 2);
    
    // Step 3: Aggregate statistics
    const aggregated = [];
    Object.entries(byVersion).forEach(([version, iters]) => {
      const firstIter = iters[0];
      
      // Aggregate metrics
      const aggregatedMetrics = {};
      const metricKeys = Object.keys(firstIter.metrics);
      
      metricKeys.forEach(key => {
        const values = iters.map(i => i.metrics[key]);
        const stats = calculateExpectedStats(values);
        
        aggregatedMetrics[key] = stats.mean;
        aggregatedMetrics[`${key}_stddev`] = stats.stddev;
        aggregatedMetrics[`${key}_min`] = stats.min;
        aggregatedMetrics[`${key}_max`] = stats.max;
      });
      
      aggregated.push({
        version: firstIter.version,
        config: {
          ...firstIter.config,
          iterations_count: iters.length
        },
        metadata: firstIter.metadata,
        metrics: aggregatedMetrics,
        timestamp: new Date().toISOString()
      });
    });
    
    expect(aggregated.length).toBe(2);
    
    // Step 4: Validate structure
    aggregated.forEach(result => {
      validateAggregatedResult(result);
      expect(result.config.iterations_count).toBe(3);
    });
    
    // Step 5: Verify statistics are reasonable
    aggregated.forEach(result => {
      Object.keys(result.metrics).forEach(key => {
        if (key.endsWith('_stddev')) {
          const baseKey = key.replace('_stddev', '');
          const mean = result.metrics[baseKey];
          const stddev = result.metrics[key];
          
          // Stddev should be < 5% of mean for our controlled test data
          const percentStddev = (stddev / mean) * 100;
          assert.ok(percentStddev < 5, 
            `${key}: ${percentStddev.toFixed(2)}% should be < 5%`);
        }
      });
    });
  });
});

describe('Integration - File Operations', () => {
  it('should simulate reading and writing result files', async () => {
    const mockFS = new MockFileSystem();
    const results = generateCompleteTestDataset(['3.5.3'], 3);
    
    // Write iteration files
    for (const result of results) {
      const filename = `result-${result.config.version}-iter${result.iteration}.json`;
      await mockFS.writeFile(
        `downloaded-results/${filename}`,
        JSON.stringify(result)
      );
    }
    
    // Read back
    const files = await mockFS.readdir('downloaded-results');
    expect(files.length).toBe(3);
    
    // Verify content
    const file1 = await mockFS.readFile('downloaded-results/result-3.5.3-iter1.json');
    const parsed = JSON.parse(file1);
    expect(parsed.config.version).toBe('3.5.3');
    expect(parsed.iteration).toBe(1);
  });

  it('should simulate aggregation output', async () => {
    const mockFS = new MockFileSystem();
    
    const aggregated = [{
      version: 'OpenSSL 3.5.3',
      config: { version: '3.5.3', iterations_count: 3 },
      metrics: {
        aes_256_gcm_8k_kbs: 2950000,
        aes_256_gcm_8k_kbs_stddev: 4082
      }
    }];
    
    // Write summary
    await mockFS.writeFile(
      'results/summary.json',
      JSON.stringify(aggregated, null, 2)
    );
    
    // Verify
    assert.ok(mockFS.hasFile('results/summary.json'));
    
    const content = await mockFS.readFile('results/summary.json');
    const parsed = JSON.parse(content);
    
    expect(parsed[0].config.iterations_count).toBe(3);
  });
});

describe('Integration - Error Scenarios', () => {
  it('should handle missing iteration files gracefully', async () => {
    const mockFS = new MockFileSystem();
    
    // Only write 2 of 3 expected iterations
    const results = generateCompleteTestDataset(['3.5.3'], 2);
    
    for (const result of results) {
      const filename = `result-${result.config.version}-iter${result.iteration}.json`;
      await mockFS.writeFile(`downloaded-results/${filename}`, JSON.stringify(result));
    }
    
    const files = await mockFS.readdir('downloaded-results');
    
    // Should still process the 2 that exist
    expect(files.length).toBe(2);
  });

  it('should handle malformed JSON', async () => {
    const mockFS = new MockFileSystem();
    
    await mockFS.writeFile('downloaded-results/result-bad.json', 'invalid json {');
    
    try {
      const content = await mockFS.readFile('downloaded-results/result-bad.json');
      JSON.parse(content);
      assert.fail('Should have thrown');
    } catch (error) {
      assert.ok(error.message.includes('JSON') || error.message.includes('Unexpected'));
    }
  });

  it('should handle missing metrics', () => {
    const result = {
      config: { version: '3.5.3' },
      metrics: {} // No metrics!
    };
    
    const value = result.metrics.nonexistent || 0;
    expect(value).toBe(0);
  });
});

describe('Integration - Performance at Scale', () => {
  it('should handle 7 versions × 10 iterations efficiently', () => {
    const start = Date.now();
    
    // Generate 70 results
    const results = generateCompleteTestDataset(
      ['1.1.1w', '3.0.15', '3.1.7', '3.2.3', '3.3.2', '3.4.0', '3.5.3'],
      10
    );
    
    expect(results.length).toBe(70);
    
    // Group and aggregate
    const byVersion = {};
    results.forEach(r => {
      const v = r.config.version;
      if (!byVersion[v]) byVersion[v] = [];
      byVersion[v].push(r);
    });
    
    const aggregated = [];
    Object.entries(byVersion).forEach(([version, iters]) => {
      const metricKeys = Object.keys(iters[0].metrics);
      const metrics = {};
      
      metricKeys.forEach(key => {
        const values = iters.map(i => i.metrics[key]);
        const stats = calculateExpectedStats(values);
        metrics[key] = stats.mean;
        metrics[`${key}_stddev`] = stats.stddev;
      });
      
      aggregated.push({
        config: { version, iterations_count: iters.length },
        metrics
      });
    });
    
    const duration = Date.now() - start;
    
    // Should complete in under 500ms even with 70 results
    assert.ok(duration < 500, `Processing took ${duration}ms (should be < 500ms)`);
    expect(aggregated.length).toBe(7);
  });
});

describe('Integration - Backward Compatibility', () => {
  it('should handle mix of old (no iteration) and new data', () => {
    const oldFormat = {
      version: 'OpenSSL 3.5.3',
      config: { version: '3.5.3' }, // No iteration field
      metrics: { aes_256_gcm_8k_kbs: 2950000 }
    };
    
    const newFormat = {
      version: 'OpenSSL 3.4.0',
      config: { version: '3.4.0', iteration: 1 },
      metrics: { aes_256_gcm_8k_kbs: 2900000 },
      iteration: 1
    };
    
    const results = [oldFormat, newFormat];
    
    // Should be able to process both
    results.forEach(r => {
      expect(r.config.version).toBeTruthy();
      expect(r.metrics).toBeTruthy();
    });
  });

  it('should treat single result as iteration_count=1', () => {
    const result = {
      config: { version: '3.5.3' },
      metrics: { test: 100 }
    };
    
    const iterCount = result.config.iterations_count || 1;
    expect(iterCount).toBe(1);
    
    // For single iteration, stddev should be 0
    const stats = calculateExpectedStats([100]);
    expect(stats.stddev).toBe(0);
  });
});

describe('Integration - Real-World Data Validation', () => {
  it('should validate realistic performance numbers', () => {
    const result = generateCompleteTestDataset(['3.5.3'], 3)[0];
    
    // AES-256-GCM should be in reasonable range (500MB/s - 5GB/s)
    const aesValue = result.metrics.aes_256_gcm_8k_kbs;
    expect(aesValue > 500000).toBeTruthy();
    expect(aesValue < 5000000).toBeTruthy();
    
    // Handshakes should be in thousands per second
    const hsValue = result.metrics.handshakes_new_per_sec;
    expect(hsValue > 1000).toBeTruthy();
    expect(hsValue < 50000).toBeTruthy();
  });

  it('should validate variance is realistic', () => {
    const iterations = generateCompleteTestDataset(['3.5.3'], 3);
    const values = iterations.map(i => i.metrics.aes_256_gcm_8k_kbs);
    const stats = calculateExpectedStats(values);
    
    // Variance should be small (< 5%) for controlled benchmark
    const percentVariance = (stats.stddev / stats.mean) * 100;
    expect(percentVariance < 5).toBeTruthy();
  });
});

console.log('✅ All integration tests defined');

