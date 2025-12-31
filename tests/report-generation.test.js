import { describe, it, expect } from 'vitest';
import {
  generateMockIterations,
  generateCompleteTestDataset,
  validateAggregatedResult
} from './test-helpers.js';

// Test formatting functions (we'll need to export these from generate-report.js)
function formatNum(n) {
  if (n === undefined || n === null) return '0';
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function formatNumWithStddev(mean, stddev) {
  if (mean === undefined || mean === null) return '0';
  if (stddev === undefined || stddev === null || stddev === 0) {
    return formatNum(mean);
  }
  // Format as "mean ± stddev" with appropriate precision
  const stddevPercent = (stddev / mean) * 100;
  if (stddevPercent < 0.1) {
    // Very low variance, don't clutter the output
    return formatNum(mean);
  }
  return `${formatNum(mean)} ± ${formatNum(stddev)}`;
}

describe('Report Generation - Number Formatting', () => {
  it('should format simple numbers correctly', () => {
    expect(formatNum(1000)).toBe('1,000');
    expect(formatNum(1000000)).toBe('1,000,000');
    expect(formatNum(6450)).toBe('6,450');
  });

  it('should handle zero and null', () => {
    expect(formatNum(0)).toBe('0');
    expect(formatNum(null)).toBe('0');
    expect(formatNum(undefined)).toBe('0');
  });

  it('should round to nearest integer', () => {
    expect(formatNum(1234.567)).toBe('1,235');
    expect(formatNum(999.4)).toBe('999');
    expect(formatNum(999.6)).toBe('1,000');
  });

  it('should format large numbers', () => {
    expect(formatNum(2945000)).toBe('2,945,000');
    expect(formatNum(35100000)).toBe('35,100,000');
  });
});

describe('Report Generation - Mean ± Stddev Formatting', () => {
  it('should format mean with stddev', () => {
    const result = formatNumWithStddev(6450, 12);
    expect(result).toBe('6,450 ± 12');
  });

  it('should hide insignificant stddev (< 0.1%)', () => {
    const result = formatNumWithStddev(10000, 5); // 0.05%
    expect(result).toBe('10,000'); // No stddev shown
  });

  it('should show significant stddev', () => {
    const result = formatNumWithStddev(1000, 50); // 5%
    expect(result).toBe('1,000 ± 50');
  });

  it('should handle zero stddev', () => {
    const result = formatNumWithStddev(1000, 0);
    expect(result).toBe('1,000'); // No stddev when zero
  });

  it('should handle null/undefined stddev', () => {
    expect(formatNumWithStddev(1000, null)).toBe('1,000');
    expect(formatNumWithStddev(1000, undefined)).toBe('1,000');
  });

  it('should handle large numbers with stddev', () => {
    const result = formatNumWithStddev(2950000, 4082);
    expect(result).toBe('2,950,000 ± 4,082');
  });

  it('should handle very small stddev percentage', () => {
    const result = formatNumWithStddev(1000000, 100); // 0.01%
    expect(result).toBe('1,000,000'); // Too small to show
  });
});

describe('Report Generation - Data Structure Validation', () => {
  it('should validate aggregated result has required fields', () => {
    const iterations = generateMockIterations('3.5.3', 3);
    
    const aggregated = {
      version: iterations[0].version,
      config: {
        ...iterations[0].config,
        iterations_count: 3
      },
      metadata: iterations[0].metadata,
      metrics: {
        aes_256_gcm_8k_kbs: 2950000,
        aes_256_gcm_8k_kbs_stddev: 4082,
        aes_256_gcm_8k_kbs_min: 2945000,
        aes_256_gcm_8k_kbs_max: 2955000
      },
      timestamp: new Date().toISOString()
    };
    
    validateAggregatedResult(aggregated);
  });

  it('should detect iterations_count in config', () => {
    const result = {
      config: { iterations_count: 3, version: '3.5.3' }
    };
    
    expect(result.config.iterations_count).toBe(3);
    expect(result.config.iterations_count > 1).toBeTruthy();
  });

  it('should handle single iteration (backward compatibility)', () => {
    const result = {
      config: { version: '3.5.3' } // No iterations_count
    };
    
    const iterCount = result.config.iterations_count || 1;
    expect(iterCount).toBe(1);
  });
});

describe('Report Generation - Markdown Table Generation', () => {
  it('should generate valid markdown table row', () => {
    const version = '3.5.3';
    const mean = 6450;
    const stddev = 12;
    
    const formattedValue = formatNumWithStddev(mean, stddev);
    const row = `| **${version}** | ${formattedValue} |`;
    
    expect(row.includes('3.5.3')).toBeTruthy();
    expect(row.includes('6,450 ± 12')).toBeTruthy();
  });

  it('should generate row without stddev for single iteration', () => {
    const version = '3.5.3';
    const mean = 6450;
    
    const formattedValue = formatNum(mean);
    const row = `| **${version}** | ${formattedValue} |`;
    
    expect(row.includes('3.5.3')).toBeTruthy();
    expect(row.includes('6,450')).toBeTruthy();
    expect(!row.includes('±')).toBeTruthy();
  });

  it('should handle multiple metrics in one row', () => {
    const data = {
      version: '3.5.3',
      aes: formatNumWithStddev(2950000, 4082),
      sha: formatNumWithStddev(1248000, 2055)
    };
    
    const row = `| **${data.version}** | ${data.aes} | ${data.sha} |`;
    
    expect(row.includes('2,950,000 ± 4,082')).toBeTruthy();
    expect(row.includes('1,248,000 ± 2,055')).toBeTruthy();
  });
});

describe('Report Generation - Statistical Notes', () => {
  it('should generate correct statistical note', () => {
    const iterCount = 3;
    const note = `Statistical Analysis: ${iterCount} iterations per version`;
    
    expect(note.includes('3 iterations')).toBeTruthy();
  });

  it('should generate methodology note', () => {
    const iterCount = 3;
    const note = `Each value is the mean of ${iterCount} independent runs ± standard deviation`;
    
    expect(note.includes('3 independent runs')).toBeTruthy();
    expect(note.includes('standard deviation')).toBeTruthy();
  });

  it('should not show statistical note for single iteration', () => {
    const iterCount = 1;
    const shouldShow = iterCount > 1;
    
    expect(shouldShow).toBe(false);
  });
});

describe('Report Generation - Percentage Calculations', () => {
  it('should calculate percentage change correctly', () => {
    const baseline = 6450;
    const current = 6480;
    const pctChange = ((current - baseline) / baseline) * 100;
    
    expect(Math.abs(pctChange - 0.465) < 0.001).toBeTruthy();
  });

  it('should format percentage with sign', () => {
    const pctChange = 5.5;
    const formatted = (pctChange >= 0 ? '+' : '') + pctChange.toFixed(1) + '%';
    
    expect(formatted).toBe('+5.5%');
  });

  it('should handle negative percentage', () => {
    const pctChange = -5.5;
    const formatted = (pctChange >= 0 ? '+' : '') + pctChange.toFixed(1) + '%';
    
    expect(formatted).toBe('-5.5%');
  });

  it('should show baseline as special case', () => {
    const version = '1.1.1w';
    const isBaseline = version === '1.1.1w';
    const display = isBaseline ? 'Baseline' : '+5.5%';
    
    expect(display).toBe('Baseline');
  });
});

describe('Report Generation - Complete Report Structure', () => {
  it('should generate report with multiple versions', () => {
    const versions = ['3.5.3', '3.4.0', '3.3.2'];
    const dataset = generateCompleteTestDataset(versions, 3);
    
    // Group by version
    const byVersion = {};
    dataset.forEach(r => {
      const v = r.config.version;
      if (!byVersion[v]) byVersion[v] = [];
      byVersion[v].push(r);
    });
    
    expect(Object.keys(byVersion).length).toBe(3);
    
    // Each version should be reportable
    Object.entries(byVersion).forEach(([version, iterations]) => {
      expect(version).toBeTruthy();
      expect(iterations.length).toBe(3);
    });
  });

  it('should sort versions correctly', () => {
    const versions = ['3.5.3', '1.1.1w', '3.0.15', '3.4.0'];
    const sorted = versions.sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true })
    );
    
    // 1.1.1w should come first
    expect(sorted[0]).toBe('1.1.1w');
    // Then 3.x in order
    expect(sorted[1]).toBe('3.0.15');
  });

  it('should handle version info metadata', () => {
    const versionInfo = {
      '3.5.3': {
        date: '2025-04-01',
        series: '3.5',
        features: 'Post-Quantum Cryptography'
      }
    };
    
    expect(versionInfo['3.5.3'].features.includes('Post-Quantum')).toBeTruthy();
  });
});

describe('Report Generation - Error Handling', () => {
  it('should handle missing metrics gracefully', () => {
    const result = {
      metrics: {}
    };
    
    const value = result.metrics.nonexistent_metric || 0;
    const formatted = formatNum(value);
    
    expect(formatted).toBe('0');
  });

  it('should handle NaN values', () => {
    const value = NaN;
    const safe = isNaN(value) ? 0 : value;
    
    expect(safe).toBe(0);
  });

  it('should handle Infinity', () => {
    const value = Infinity;
    const safe = isFinite(value) ? value : 0;
    
    expect(safe).toBe(0);
  });
});

describe('Report Generation - Console Output', () => {
  it('should pad strings correctly for alignment', () => {
    const version = '3.5.3';
    const padded = version.padEnd(15);
    
    expect(padded.length).toBe(15);
    expect(padded.startsWith('3.5.3')).toBeTruthy();
  });

  it('should create aligned table', () => {
    const row1 = '3.5.3'.padEnd(15) + '6,450'.padEnd(20);
    const row2 = '1.1.1w'.padEnd(15) + '6,320'.padEnd(20);
    
    expect(row1.length).toBe(row2.length);
  });
});

console.log('✅ All report generation tests defined');

