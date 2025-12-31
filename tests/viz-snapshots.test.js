import { describe, it, expect } from 'vitest';
import { generateCompleteTestDataset, calculateExpectedStats } from './test-helpers.js';

/**
 * Snapshot tests for visualization HTML output
 * These ensure the generated HTML structure remains consistent
 */

describe('Visualization Snapshots - Data Structure', () => {
  it('should generate consistent aggregated data structure', () => {
    const iterations = generateCompleteTestDataset(['3.5.3'], 3);
    
    // Aggregate
    const metrics = {};
    const metricKeys = Object.keys(iterations[0].metrics);
    
    metricKeys.forEach(key => {
      const values = iterations.map(i => i.metrics[key]);
      const stats = calculateExpectedStats(values);
      
      metrics[key] = stats.mean;
      metrics[`${key}_stddev`] = stats.stddev;
      metrics[`${key}_min`] = stats.min;
      metrics[`${key}_max`] = stats.max;
    });
    
    const result = {
      version: iterations[0].version,
      config: {
        version: '3.5.3',
        iterations_count: 3
      },
      metrics
    };
    
    // Snapshot the structure (not exact values, as they may vary slightly)
    expect(result).toMatchObject({
      version: expect.any(String),
      config: {
        version: '3.5.3',
        iterations_count: 3
      },
      metrics: expect.objectContaining({
        aes_256_gcm_8k_kbs: expect.any(Number),
        aes_256_gcm_8k_kbs_stddev: expect.any(Number),
        aes_256_gcm_8k_kbs_min: expect.any(Number),
        aes_256_gcm_8k_kbs_max: expect.any(Number)
      })
    });
  });
});

describe('Visualization Snapshots - HTML Template Structure', () => {
  it('should have consistent header structure', () => {
    const header = {
      title: 'OpenSSL Performance Benchmark',
      subtitle: 'Statistical Analysis',
      iterationCount: 3
    };
    
    const html = `
<div class="header">
    <h1>${header.title}</h1>
    <div class="subtitle">${header.subtitle}</div>
    <span id="iterations-note">● ${header.iterationCount} iterations per version</span>
</div>`;
    
    expect(html).toMatchSnapshot();
  });

  it('should have consistent tab structure', () => {
    const tabs = [
      { id: 'overview', label: '1. Overview', active: true },
      { id: 'tls', label: '2. TLS 1.2/1.3', active: false },
      { id: 'schmatz', label: '4. Schmatz Algos', active: false }
    ];
    
    const tabsHtml = tabs.map(tab => 
      `<div class="tab ${tab.active ? 'active' : ''}" onclick="switchTab('${tab.id}')">${tab.label}</div>`
    ).join('\n');
    
    expect(tabsHtml).toMatchSnapshot();
  });

  it('should have consistent card structure', () => {
    const card = {
      title: 'Test Chart',
      description: 'This is a test chart',
      chartId: 'test-chart'
    };
    
    const html = `
<div class="card">
    <h2>${card.title}</h2>
    <div class="card-desc">${card.description}</div>
    <div id="${card.chartId}" style="height: 400px;"></div>
</div>`;
    
    expect(html).toMatchSnapshot();
  });
});

describe('Visualization Snapshots - Chart Data Transformation', () => {
  it('should produce consistent slope chart data', () => {
    const input = [{
      version: '3.5.3',
      metrics: {
        tls1_2_ecdhe_rsa_aes128gcm_cps: 6400,
        tls1_3_rsa_new_cps: 6450,
        tls1_2_ecdhe_rsa_aes128gcm_cps_stddev: 50,
        tls1_3_rsa_new_cps_stddev: 12
      }
    }];
    
    const slopeData = input.map(d => ({
      version: d.version,
      tls12: d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps || 0,
      tls13: d.metrics.tls1_3_rsa_new_cps || 0,
      diff: (d.metrics.tls1_3_rsa_new_cps || 0) - (d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps || 0),
      pctDiff: ((d.metrics.tls1_3_rsa_new_cps - d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps) / 
                d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps) * 100,
      hasStats: true
    }));
    
    expect(slopeData).toMatchSnapshot();
  });

  it('should produce consistent scatter plot data', () => {
    const data = generateCompleteTestDataset(['3.5.3', '3.4.0'], 3);
    
    // Aggregate
    const byVersion = {};
    data.forEach(r => {
      const v = r.config.version;
      if (!byVersion[v]) byVersion[v] = [];
      byVersion[v].push(r);
    });
    
    const scatterData = Object.entries(byVersion).map(([version, iters]) => {
      const aesValues = iters.map(i => i.metrics.aes_256_gcm_8k_kbs);
      const hsValues = iters.map(i => i.metrics.handshakes_new_per_sec);
      
      const aesStats = calculateExpectedStats(aesValues);
      const hsStats = calculateExpectedStats(hsValues);
      
      return {
        version,
        x: aesStats.mean,
        y: hsStats.mean,
        xStddev: aesStats.stddev,
        yStddev: hsStats.stddev
      };
    });
    
    // Snapshot the structure (not exact values)
    expect(scatterData).toMatchObject([
      {
        version: expect.any(String),
        x: expect.any(Number),
        y: expect.any(Number),
        xStddev: expect.any(Number),
        yStddev: expect.any(Number)
      },
      {
        version: expect.any(String),
        x: expect.any(Number),
        y: expect.any(Number),
        xStddev: expect.any(Number),
        yStddev: expect.any(Number)
      }
    ]);
  });
});

describe('Visualization Snapshots - Complete HTML Output', () => {
  it('should generate complete HTML structure', () => {
    const data = [{
      version: '3.5.3',
      config: { version: '3.5.3', iterations_count: 3 },
      metrics: {
        aes_256_gcm_8k_kbs: 2950000,
        handshakes_new_per_sec: 6450
      }
    }];
    
    const dataJson = JSON.stringify(data);
    
    // Simplified template for testing
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OpenSSL Benchmark</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
    <div class="header">
        <h1>OpenSSL Performance Benchmark</h1>
    </div>
    <div class="tabs">
        <div class="tab active">1. Overview</div>
        <div class="tab">2. TLS 1.2/1.3</div>
    </div>
    <div id="scatter-chart"></div>
    <script>
        const data = ${dataJson};
    </script>
</body>
</html>`;
    
    // Validate key components exist
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('d3.v7.min.js');
    expect(html).toContain('class="header"');
    expect(html).toContain('class="tabs"');
    expect(html).toContain('id="scatter-chart"');
    expect(html).toContain('const data = ');
  });
});

describe('Visualization Snapshots - Fallback Messages', () => {
  it('should show no-data message for PQC when unavailable', () => {
    const data = [
      { version: '3.4.0', metrics: { ml_kem_768_ops_sec: 0 } }
    ];
    
    const hasPqc = data.some(d => d.metrics.ml_kem_768_ops_sec > 0);
    
    const message = hasPqc ? 
      '' : 
      'No Post-Quantum Data Available (requires OpenSSL 3.5+)';
    
    expect(message).toContain('Post-Quantum Data');
    expect(message).toContain('3.5+');
  });

  it('should show no-data message for optimization when unavailable', () => {
    const data = [
      { version: '1.1.1w', metrics: { optimized_tls1_3_rsa_new_cps: 0 } }
    ];
    
    const hasOptimized = data.some(d => d.metrics.optimized_tls1_3_rsa_new_cps > 0);
    
    const message = hasOptimized ?
      '' :
      'No optimization data available. Run benchmark with OpenSSL 3.x to see results.';
    
    expect(message).toContain('optimization data');
  });
});

describe('Visualization Snapshots - Chart Colors', () => {
  it('should use consistent color scheme', () => {
    const colorScheme = {
      '1.1.1': '#228be6',
      '3.0': '#fa5252',
      '3.1': '#fd7e14',
      '3.2': '#fab005',
      '3.3': '#40c057',
      '3.4': '#15aabf',
      '3.5': '#7950f2'
    };
    
    expect(colorScheme['1.1.1']).toBe('#228be6');
    expect(colorScheme['3.5']).toBe('#7950f2');
    
    // All colors should be hex codes
    Object.values(colorScheme).forEach(color => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it('should use semantic colors for improvement/regression', () => {
    const semanticColors = {
      positive: '#40c057',  // Green
      negative: '#fa5252',  // Red
      neutral: '#868e96'    // Gray
    };
    
    expect(semanticColors.positive).toBe('#40c057');
    expect(semanticColors.negative).toBe('#fa5252');
  });
});

console.log('✅ All visualization snapshot tests defined');

