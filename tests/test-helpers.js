/**
 * Test Helpers and Mock Data Generators
 * Used across all test files
 */

/**
 * Generate a mock benchmark result for a specific version and iteration
 */
export function generateMockResult(version, iteration, variance = 0.02) {
  // Base values with some controlled variance
  const baseValues = {
    aes_256_gcm_1k_kbs: 785000,
    aes_256_gcm_8k_kbs: 2945000,
    sha256_1k_kbs: 445000,
    sha256_8k_kbs: 1245000,
    handshakes_new_per_sec: 6450,
    handshakes_resume_per_sec: 35000,
    tls1_3_rsa_new_cps: 6450,
    tls1_3_rsa_resume_cps: 35000,
    tls1_2_ecdhe_rsa_aes128gcm_cps: 6400,
    rsa_2048_sign_per_sec: 8500,
    rsa_2048_verify_per_sec: 245000,
    ecdsa_p256_sign_per_sec: 45000,
    ecdsa_p256_verify_per_sec: 35000
  };

  // Add controlled variance based on iteration
  const metrics = {};
  for (const [key, baseValue] of Object.entries(baseValues)) {
    // Add some variance: ±variance% based on iteration
    const varianceFactor = 1 + (Math.sin(iteration) * variance);
    metrics[key] = Math.round(baseValue * varianceFactor);
  }

  return {
    version: `OpenSSL ${version}`,
    config: {
      version: version,
      url: `https://example.com/openssl-${version}.tar.gz`,
      series: version.split('.')[0],
      iteration: iteration
    },
    metadata: {
      compiler_flags: "gcc -O3",
      platform: "linux-x86_64",
      os_distribution: "Debian GNU/Linux 12",
      kernel_version: "Linux 6.5.0",
      cpu_model: "Intel(R) Xeon(R) CPU @ 2.20GHz"
    },
    metrics: metrics,
    timestamp: new Date(Date.now() - (100 - iteration) * 60000).toISOString(),
    iteration: iteration
  };
}

/**
 * Generate multiple iterations for testing
 */
export function generateMockIterations(version, count = 3, variance = 0.02) {
  return Array.from({ length: count }, (_, i) => 
    generateMockResult(version, i + 1, variance)
  );
}

/**
 * Generate a complete test dataset with multiple versions and iterations
 */
export function generateCompleteTestDataset(versions = ['3.5.3', '3.4.0'], iterations = 3) {
  const results = [];
  
  for (const version of versions) {
    for (let i = 1; i <= iterations; i++) {
      results.push(generateMockResult(version, i));
    }
  }
  
  return results;
}

/**
 * Assert that a number is within a certain percentage of expected
 */
export function assertWithinPercent(actual, expected, percent, message) {
  const tolerance = expected * (percent / 100);
  const min = expected - tolerance;
  const max = expected + tolerance;
  
  if (actual < min || actual > max) {
    throw new Error(
      `${message}: Expected ${actual} to be within ${percent}% of ${expected} (${min.toFixed(2)} - ${max.toFixed(2)})`
    );
  }
}

/**
 * Assert object has required keys
 */
export function assertHasKeys(obj, keys, message = "Object missing required keys") {
  const missing = keys.filter(key => !(key in obj));
  if (missing.length > 0) {
    throw new Error(`${message}: Missing keys: ${missing.join(', ')}`);
  }
}

/**
 * Calculate expected statistics for validation
 */
export function calculateExpectedStats(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stddev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return { mean, stddev, min, max, count: values.length };
}

/**
 * Mock file system operations for testing
 */
export class MockFileSystem {
  constructor() {
    this.files = new Map();
  }

  writeFile(path, content) {
    this.files.set(path, content);
    return Promise.resolve();
  }

  readFile(path) {
    if (!this.files.has(path)) {
      return Promise.reject(new Error(`File not found: ${path}`));
    }
    return Promise.resolve(this.files.get(path));
  }

  readdir(path) {
    const files = Array.from(this.files.keys())
      .filter(p => p.startsWith(path))
      .map(p => p.replace(path + '/', '').split('/')[0]);
    return Promise.resolve([...new Set(files)]);
  }

  mkdir(path, options) {
    // Mock mkdir - no-op for tests
    return Promise.resolve();
  }

  clear() {
    this.files.clear();
  }

  getFile(path) {
    return this.files.get(path);
  }

  hasFile(path) {
    return this.files.has(path);
  }
}

/**
 * Validate aggregated result structure
 */
export function validateAggregatedResult(result) {
  assertHasKeys(result, ['version', 'config', 'metadata', 'metrics', 'timestamp'], 
    "Aggregated result");
  
  assertHasKeys(result.config, ['version', 'iterations_count'], 
    "Aggregated result config");
  
  // Check that we have both mean and stddev for key metrics
  const sampleMetric = 'aes_256_gcm_8k_kbs';
  assertHasKeys(result.metrics, [
    sampleMetric,
    `${sampleMetric}_stddev`,
    `${sampleMetric}_min`,
    `${sampleMetric}_max`
  ], "Aggregated metrics");
}

/**
 * Generate mock workflow matrix output
 */
export function generateMockMatrix(versions, iterations) {
  const include = [];
  
  for (const version of versions) {
    for (let i = 1; i <= iterations; i++) {
      include.push({
        version: version,
        url: `https://example.com/openssl-${version}.tar.gz`,
        series: version.split('.').slice(0, 2).join('.'),
        iteration: i
      });
    }
  }
  
  return { include };
}

/**
 * Test that stddev is reasonable (not zero, not too high)
 */
export function validateReasonableStddev(mean, stddev, maxPercentage = 10) {
  if (stddev === 0) {
    throw new Error("Standard deviation is zero - data may be too uniform");
  }
  
  const percentStddev = (stddev / mean) * 100;
  if (percentStddev > maxPercentage) {
    throw new Error(
      `Standard deviation too high: ${percentStddev.toFixed(2)}% (max: ${maxPercentage}%)`
    );
  }
}

