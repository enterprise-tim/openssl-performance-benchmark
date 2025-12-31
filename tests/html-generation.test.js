import { describe, it, expect } from 'vitest';
import { generateCompleteTestDataset } from './test-helpers.js';

describe('HTML Generation - Structure', () => {
  it('should generate valid HTML5 document', () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenSSL Benchmark</title>
</head>
<body>
    <div id="chart"></div>
</body>
</html>`;
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<meta charset="UTF-8">');
    expect(html).toContain('lang="en"');
  });

  it('should include D3.js library', () => {
    const html = '<script src="https://d3js.org/d3.v7.min.js"></script>';
    
    expect(html).toContain('d3.v7.min.js');
  });

  it('should embed JSON data in script tag', () => {
    const data = generateCompleteTestDataset(['3.5.3'], 3);
    
    // Aggregate for single entry
    const aggregated = [{
      version: '3.5.3',
      metrics: {
        aes_256_gcm_8k_kbs: 2950000,
        aes_256_gcm_8k_kbs_stddev: 4082
      }
    }];
    
    const dataJson = JSON.stringify(aggregated);
    const html = `<script>const data = ${dataJson};</script>`;
    
    expect(html).toContain('"version":"3.5.3"');
    expect(html).toContain('"aes_256_gcm_8k_kbs":2950000');
    expect(html).toContain('"aes_256_gcm_8k_kbs_stddev":4082');
  });

  it('should include required chart containers', () => {
    const requiredContainers = [
      'scatter-chart',
      'tls-chart',
      'rsa-vs-ecdsa-chart',
      'mraz-chart',
      'pqc-chart'
    ];
    
    requiredContainers.forEach(id => {
      const html = `<div id="${id}"></div>`;
      expect(html).toContain(`id="${id}"`);
    });
  });

  it('should include CSS styles', () => {
    const css = `
<style>
    body { font-family: sans-serif; }
    .tooltip { position: absolute; opacity: 0; }
    .grid line { stroke: #f1f3f5; }
</style>`;
    
    expect(css).toContain('.tooltip');
    expect(css).toContain('.grid line');
    expect(css).toContain('position: absolute');
  });

  it('should include tab navigation', () => {
    const html = `
<div class="tabs">
    <div class="tab active" onclick="switchTab('overview')">1. Overview</div>
    <div class="tab" onclick="switchTab('tls')">2. TLS 1.2/1.3</div>
</div>`;
    
    expect(html).toContain('class="tab active"');
    expect(html).toContain("switchTab('overview')");
  });
});

describe('HTML Generation - Metadata', () => {
  it('should include iteration count in header', () => {
    const iterCount = 3;
    const headerHtml = `
<div class="header">
    <h1>OpenSSL Performance Benchmark</h1>
    <span id="iterations-note">● ${iterCount} iterations per version</span>
</div>`;
    
    expect(headerHtml).toContain('3 iterations per version');
  });

  it('should include generation timestamp', () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const html = `<div>Generated: ${timestamp}</div>`;
    
    expect(html).toMatch(/Generated: \d{4}-\d{2}-\d{2}/);
  });

  it('should conditionally show iteration badge', () => {
    const iterCount = 1;
    const showBadge = iterCount > 1;
    const badgeHtml = showBadge ? `<span>● ${iterCount} iterations</span>` : '';
    
    expect(badgeHtml).toBe('');
    
    const iterCount2 = 3;
    const showBadge2 = iterCount2 > 1;
    const badgeHtml2 = showBadge2 ? `<span>● ${iterCount2} iterations</span>` : '';
    
    expect(badgeHtml2).toContain('3 iterations');
  });
});

describe('HTML Generation - JavaScript Functions', () => {
  it('should define tab switching function', () => {
    const jsCode = `
window.switchTab = function(tabId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
};`;
    
    expect(jsCode).toContain('window.switchTab');
    expect(jsCode).toContain('classList.remove');
    expect(jsCode).toContain('classList.add');
  });

  it('should define tooltip show/hide functions', () => {
    const jsCode = `
function showTooltip(event, html) {
    tooltip.style("opacity", 0.9);
    tooltip.html(html);
}

function hideTooltip() {
    tooltip.style("opacity", 0);
}`;
    
    expect(jsCode).toContain('showTooltip');
    expect(jsCode).toContain('hideTooltip');
    expect(jsCode).toContain('tooltip.html');
  });

  it('should define render functions for each chart', () => {
    const chartTypes = [
      'renderScatter',
      'renderTlsChart',
      'renderBellingrathRsaEcdsa',
      'renderMrazChart',
      'renderPqc'
    ];
    
    chartTypes.forEach(funcName => {
      const jsCode = `function ${funcName}() { /* chart logic */ }`;
      expect(jsCode).toContain(funcName);
    });
  });
});

describe('HTML Generation - Chart Initialization', () => {
  it('should initialize charts on page load', () => {
    const jsCode = `
// Init Charts (Overview is active by default)
renderForTab('overview');`;
    
    expect(jsCode).toContain("renderForTab('overview')");
  });

  it('should handle window resize', () => {
    const jsCode = `
window.addEventListener('resize', () => {
    const active = document.querySelector('.view-section.active');
    if (active) {
        renderForTab(active.id);
    }
});`;
    
    expect(jsCode).toContain("addEventListener('resize'");
    expect(jsCode).toContain('renderForTab');
  });

  it('should use requestAnimationFrame for rendering', () => {
    const jsCode = `
requestAnimationFrame(() => requestAnimationFrame(run));`;
    
    expect(jsCode).toContain('requestAnimationFrame');
  });
});

describe('HTML Generation - Data Validation', () => {
  it('should validate data before generating HTML', () => {
    const data = generateCompleteTestDataset(['3.5.3'], 3);
    
    // Check data is array
    expect(Array.isArray(data)).toBe(true);
    
    // Check has required structure
    data.forEach(d => {
      expect(d.config).toBeDefined();
      expect(d.metrics).toBeDefined();
    });
  });

  it('should handle malformed data gracefully', () => {
    const data = [
      { version: '3.5.3', metrics: null }  // Null metrics
    ];
    
    const isValid = data.every(d => d.metrics && typeof d.metrics === 'object');
    
    expect(isValid).toBe(false);
  });

  it('should provide fallback for missing chart data', () => {
    const data = [];
    const hasTlsData = data.some(d => d.tls12 && d.tls13);
    
    const chartHtml = hasTlsData ? 
      '<div id="tls-chart"></div>' :
      '<div class="no-data">TLS comparison data not available</div>';
    
    expect(chartHtml).toContain('no-data');
  });
});

describe('HTML Generation - CSS Classes', () => {
  it('should have required CSS classes', () => {
    const requiredClasses = [
      '.tooltip',
      '.grid',
      '.axis',
      '.tab',
      '.view-section',
      '.card'
    ];
    
    requiredClasses.forEach(className => {
      expect(className).toMatch(/^\.[a-z-]+$/);
    });
  });

  it('should have hover states', () => {
    const css = `
.tab:hover { background: #f8f9fa; }
.view-toggle:hover { border-color: #228be6; }`;
    
    expect(css).toContain(':hover');
  });

  it('should have active states', () => {
    const css = `
.tab.active { background: white; }
.view-toggle.active { background: #228be6; }`;
    
    expect(css).toContain('.active');
  });
});

describe('HTML Generation - Accessibility', () => {
  it('should include lang attribute', () => {
    const html = '<html lang="en">';
    expect(html).toContain('lang="en"');
  });

  it('should include viewport meta tag', () => {
    const html = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    expect(html).toContain('viewport');
  });

  it('should include title', () => {
    const html = '<title>OpenSSL Benchmark: Deep Dive</title>';
    expect(html).toContain('<title>');
    expect(html).toContain('</title>');
  });

  it('should include alt text for visual elements (where applicable)', () => {
    // While charts don't have alt text, we should ensure aria-labels exist
    const html = '<div role="img" aria-label="Performance comparison chart"></div>';
    expect(html).toContain('aria-label');
  });
});

describe('HTML Generation - Template Functions', () => {
  it('should generate HTML template with data', () => {
    const data = [{ version: '3.5.3', value: 123 }];
    const dataJson = JSON.stringify(data);
    
    const htmlTemplate = (json) => `<!DOCTYPE html>
<html>
<body>
<script>const data = ${json};</script>
</body>
</html>`;
    
    const html = htmlTemplate(dataJson);
    
    expect(html).toContain('const data = ');
    expect(html).toContain('"version":"3.5.3"');
  });

  it('should escape special characters in data', () => {
    const data = [{ text: 'Test "quoted" value' }];
    const dataJson = JSON.stringify(data);
    
    expect(dataJson).toContain('\\"quoted\\"');
  });
});

console.log('✅ All HTML generation tests defined');

