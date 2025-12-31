import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

/**
 * Aggregate multiple benchmark iterations for each version
 * Computes mean and standard deviation for all metrics
 */

function calculateStats(values) {
  if (!values || values.length === 0) {
    return { mean: 0, stddev: 0, min: 0, max: 0, count: 0 };
  }
  
  const validValues = values.filter(v => typeof v === 'number' && !isNaN(v));
  
  if (validValues.length === 0) {
    return { mean: 0, stddev: 0, min: 0, max: 0, count: 0 };
  }
  
  const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
  
  if (validValues.length === 1) {
    return { mean, stddev: 0, min: mean, max: mean, count: 1 };
  }
  
  const variance = validValues.reduce((sum, val) => {
    return sum + Math.pow(val - mean, 2);
  }, 0) / validValues.length;
  
  const stddev = Math.sqrt(variance);
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  
  return { mean, stddev, min, max, count: validValues.length };
}

function aggregateMetrics(iterations) {
  const aggregated = {};
  
  // Get all metric keys from the first iteration
  const sampleMetrics = iterations[0]?.metrics || {};
  const metricKeys = Object.keys(sampleMetrics);
  
  // For each metric, collect values from all iterations and calculate stats
  metricKeys.forEach(key => {
    const values = iterations
      .map(iter => iter.metrics[key])
      .filter(v => v !== undefined && v !== null);
    
    const stats = calculateStats(values);
    aggregated[key] = stats.mean;
    aggregated[`${key}_stddev`] = stats.stddev;
    aggregated[`${key}_min`] = stats.min;
    aggregated[`${key}_max`] = stats.max;
  });
  
  return aggregated;
}

async function main() {
  const args = process.argv.slice(2);
  const resultsDir = args[0] || path.join(ROOT_DIR, 'downloaded-results');
  const outputDir = args[1] || path.join(ROOT_DIR, 'results');
  
  console.log('🔄 Aggregating benchmark results...');
  console.log(`📂 Input directory: ${resultsDir}`);
  console.log(`📂 Output directory: ${outputDir}`);
  
  try {
    // Read all result files
    const files = await fs.readdir(resultsDir);
    const resultFiles = files.filter(f => f.startsWith('result-') && f.endsWith('.json'));
    
    console.log(`📊 Found ${resultFiles.length} result files`);
    
    if (resultFiles.length === 0) {
      console.error('❌ No result files found!');
      process.exit(1);
    }
    
    // Read all results
    const allResults = await Promise.all(
      resultFiles.map(async file => {
        const content = await fs.readFile(path.join(resultsDir, file), 'utf8');
        return JSON.parse(content);
      })
    );
    
    // Group by version
    const byVersion = {};
    allResults.forEach(result => {
      const version = result.config?.version || result.version;
      if (!version) {
        console.warn('⚠️  Skipping result without version:', result);
        return;
      }
      
      if (!byVersion[version]) {
        byVersion[version] = [];
      }
      byVersion[version].push(result);
    });
    
    console.log(`📦 Grouped results into ${Object.keys(byVersion).length} versions:`);
    Object.entries(byVersion).forEach(([version, iterations]) => {
      console.log(`   - ${version}: ${iterations.length} iteration(s)`);
    });
    
    // Aggregate each version
    const aggregatedResults = [];
    
    Object.entries(byVersion).forEach(([version, iterations]) => {
      console.log(`\n🧮 Aggregating ${version} (${iterations.length} iterations)...`);
      
      // Aggregate metrics
      const aggregatedMetrics = aggregateMetrics(iterations);
      
      // Use first iteration for non-metric data (config, metadata)
      const baseResult = iterations[0];
      
      const aggregated = {
        version: baseResult.version,
        config: {
          ...baseResult.config,
          iterations_count: iterations.length
        },
        metadata: baseResult.metadata,
        metrics: aggregatedMetrics,
        timestamp: new Date().toISOString(),
        raw_iterations: iterations.map(iter => ({
          iteration: iter.iteration || 1,
          timestamp: iter.timestamp,
          metrics: iter.metrics
        }))
      };
      
      aggregatedResults.push(aggregated);
      
      // Log some sample statistics
      const sampleMetric = 'aes_256_gcm_8k_kbs';
      if (aggregatedMetrics[sampleMetric]) {
        console.log(`   ✓ Sample (${sampleMetric}): ${aggregatedMetrics[sampleMetric].toFixed(0)} ± ${aggregatedMetrics[`${sampleMetric}_stddev`].toFixed(0)}`);
      }
    });
    
    // Sort by version
    aggregatedResults.sort((a, b) => {
      return a.config.version.localeCompare(b.config.version, undefined, { numeric: true });
    });
    
    // Write aggregated summary
    await fs.mkdir(outputDir, { recursive: true });
    const summaryPath = path.join(outputDir, 'summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(aggregatedResults, null, 2));
    
    console.log(`\n✅ Aggregated results written to: ${summaryPath}`);
    console.log(`📊 Total versions: ${aggregatedResults.length}`);
    console.log(`🔢 Total iterations processed: ${allResults.length}`);
    
    // Write detailed iteration data separately
    const detailedPath = path.join(outputDir, 'detailed-iterations.json');
    await fs.writeFile(detailedPath, JSON.stringify(byVersion, null, 2));
    console.log(`📝 Detailed iteration data written to: ${detailedPath}`);
    
  } catch (error) {
    console.error('❌ Aggregation failed:', error);
    process.exit(1);
  }
}

// Only run main() if this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

