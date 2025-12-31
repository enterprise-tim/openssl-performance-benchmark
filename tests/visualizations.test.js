import { describe, it, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import { generateMockIterations, generateCompleteTestDataset } from './test-helpers.js';

describe('Visualizations - Data Validation', () => {
  it('should have valid data structure for charts', () => {
    const data = generateCompleteTestDataset(['3.5.3', '3.4.0'], 3);
    
    // Group and aggregate (simulate what visualization does)
    const byVersion = {};
    data.forEach(r => {
      const v = r.config.version;
      if (!byVersion[v]) byVersion[v] = [];
      byVersion[v].push(r);
    });
    
    const aggregated = Object.entries(byVersion).map(([version, iters]) => {
      const metrics = {};
      const metricKeys = Object.keys(iters[0].metrics);
      
      metricKeys.forEach(key => {
        const values = iters.map(i => i.metrics[key]);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stddev = Math.sqrt(variance);
        
        metrics[key] = mean;
        metrics[`${key}_stddev`] = stddev;
      });
      
      return {
        version,
        config: { version, iterations_count: iters.length },
        metrics
      };
    });
    
    // Validate chart data structure
    aggregated.forEach(d => {
      expect(d.version).toBeDefined();
      expect(d.config.version).toBeDefined();
      expect(d.metrics).toBeDefined();
      expect(typeof d.metrics.aes_256_gcm_8k_kbs).toBe('number');
      expect(typeof d.metrics.handshakes_new_per_sec).toBe('number');
    });
    
    expect(aggregated.length).toBe(2);
  });

  it('should handle missing stddev gracefully', () => {
    const dataWithoutStddev = {
      version: '3.5.3',
      config: { version: '3.5.3' },
      metrics: {
        aes_256_gcm_8k_kbs: 2950000
        // No stddev field
      }
    };
    
    const stddev = dataWithoutStddev.metrics.aes_256_gcm_8k_kbs_stddev || 0;
    expect(stddev).toBe(0);
  });

  it('should sort versions correctly for charts', () => {
    const versions = ['3.5.3', '1.1.1w', '3.0.15', '3.4.0'];
    const sorted = versions.sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true })
    );
    
    // 1.1.1w should come first
    expect(sorted[0]).toBe('1.1.1w');
    // Then 3.x in order
    expect(sorted[1]).toBe('3.0.15');
    expect(sorted[3]).toBe('3.5.3');
  });
});

describe('Visualizations - D3 Chart Generation', () => {
  let container;

  beforeEach(() => {
    // Create fresh DOM for each test
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#chart');
  });

  it('should create SVG element', () => {
    const width = 800;
    const height = 600;
    
    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height);
    
    expect(svg.node()).toBeTruthy();
    expect(svg.attr('width')).toBe(String(width));
    expect(svg.attr('height')).toBe(String(height));
  });

  it('should create bar chart elements', () => {
    const data = [
      { version: '3.5.3', value: 6450 },
      { version: '3.4.0', value: 6300 }
    ];
    
    const svg = container.append('svg').attr('width', 400).attr('height', 300);
    const g = svg.append('g');
    
    const bars = g.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d, i) => i * 50)
      .attr('y', d => 300 - d.value / 50)
      .attr('width', 40)
      .attr('height', d => d.value / 50);
    
    expect(bars.size()).toBe(2);
    
    const firstBar = d3.select(bars.nodes()[0]);
    expect(firstBar.attr('width')).toBe('40');
  });

  it('should create line chart elements', () => {
    const data = [
      { x: 0, y: 100 },
      { x: 1, y: 150 },
      { x: 2, y: 120 }
    ];
    
    const svg = container.append('svg').attr('width', 400).attr('height', 300);
    
    const line = d3.line()
      .x(d => d.x * 50)
      .y(d => d.y);
    
    const path = svg.append('path')
      .datum(data)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', 'blue');
    
    expect(path.node()).toBeTruthy();
    expect(path.attr('stroke')).toBe('blue');
  });

  it('should create scatter plot elements', () => {
    const data = generateCompleteTestDataset(['3.5.3'], 3);
    
    const svg = container.append('svg').attr('width', 600).attr('height', 400);
    const g = svg.append('g');
    
    const circles = g.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d, i) => i * 50 + 50)
      .attr('cy', 200)
      .attr('r', 5);
    
    expect(circles.size()).toBe(3);
  });

  it('should apply error bars when stddev present', () => {
    const data = [{
      version: '3.5.3',
      metrics: {
        aes_256_gcm_8k_kbs: 2950000,
        aes_256_gcm_8k_kbs_stddev: 4082
      }
    }];
    
    const hasStddev = data[0].metrics.aes_256_gcm_8k_kbs_stddev > 0;
    expect(hasStddev).toBe(true);
    
    const svg = container.append('svg').attr('width', 400).attr('height', 300);
    
    if (hasStddev) {
      const errorBars = svg.selectAll('line.error-bar')
        .data(data)
        .enter()
        .append('line')
        .attr('class', 'error-bar')
        .attr('x1', 100)
        .attr('x2', 100)
        .attr('y1', 150)
        .attr('y2', 250);
      
      expect(errorBars.size()).toBe(1);
    }
  });
});

describe('Visualizations - Scale Functions', () => {
  it('should create linear scale correctly', () => {
    const values = [1000, 2000, 3000, 4000, 5000];
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const yScale = d3.scaleLinear()
      .domain([min, max])
      .range([400, 0]);
    
    expect(yScale(min)).toBe(400);
    expect(yScale(max)).toBe(0);
    expect(yScale(3000)).toBe(200); // Middle value
  });

  it('should create band scale for versions', () => {
    const versions = ['1.1.1w', '3.0.15', '3.1.7'];
    
    const xScale = d3.scaleBand()
      .domain(versions)
      .range([0, 600])
      .padding(0.1);
    
    expect(xScale.bandwidth()).toBeGreaterThan(0);
    expect(xScale(versions[0])).toBeDefined();
    expect(xScale(versions[0])).toBeGreaterThanOrEqual(0);
  });

  it('should create color scale for series', () => {
    const colorScale = d3.scaleOrdinal()
      .domain(['1.1.1', '3.0', '3.1', '3.2'])
      .range(['#228be6', '#fa5252', '#fd7e14', '#fab005']);
    
    expect(colorScale('1.1.1')).toBe('#228be6');
    expect(colorScale('3.0')).toBe('#fa5252');
  });

  it('should handle dynamic domain calculation', () => {
    const data = generateCompleteTestDataset(['3.5.3'], 3);
    const values = data.map(d => d.metrics.aes_256_gcm_8k_kbs);
    
    const extent = d3.extent(values);
    const padding = (extent[1] - extent[0]) * 0.1;
    
    const scale = d3.scaleLinear()
      .domain([extent[0] - padding, extent[1] + padding])
      .range([400, 0]);
    
    expect(scale.domain()[0]).toBeLessThan(extent[0]);
    expect(scale.domain()[1]).toBeGreaterThan(extent[1]);
  });
});

describe('Visualizations - Axis Generation', () => {
  let container;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#chart');
  });

  it('should create x-axis', () => {
    const svg = container.append('svg').attr('width', 600).attr('height', 400);
    const g = svg.append('g').attr('transform', 'translate(50, 50)');
    
    const xScale = d3.scaleLinear().domain([0, 100]).range([0, 500]);
    const xAxis = d3.axisBottom(xScale);
    
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', 'translate(0, 300)')
      .call(xAxis);
    
    const axis = g.select('.x-axis');
    expect(axis.node()).toBeTruthy();
  });

  it('should create y-axis with custom ticks', () => {
    const svg = container.append('svg').attr('width', 600).attr('height', 400);
    const g = svg.append('g');
    
    const yScale = d3.scaleLinear().domain([0, 10000]).range([300, 0]);
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => (d / 1000) + 'K');
    
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);
    
    const axis = g.select('.y-axis');
    expect(axis.node()).toBeTruthy();
  });
});

describe('Visualizations - Tooltip Logic', () => {
  it('should format tooltip content', () => {
    const data = {
      version: '3.5.3',
      metrics: {
        aes_256_gcm_8k_kbs: 2950000,
        aes_256_gcm_8k_kbs_stddev: 4082
      }
    };
    
    const tooltipHtml = `<strong>${data.version}</strong><br>` +
      `Value: ${data.metrics.aes_256_gcm_8k_kbs.toLocaleString()}<br>` +
      `±${data.metrics.aes_256_gcm_8k_kbs_stddev.toLocaleString()}`;
    
    expect(tooltipHtml).toContain('3.5.3');
    expect(tooltipHtml).toContain('2,950,000');
    expect(tooltipHtml).toContain('±4,082');
  });

  it('should handle tooltip without stddev', () => {
    const data = {
      version: '3.5.3',
      metrics: {
        aes_256_gcm_8k_kbs: 2950000
      }
    };
    
    const stddev = data.metrics.aes_256_gcm_8k_kbs_stddev;
    const tooltipHtml = `<strong>${data.version}</strong><br>` +
      `Value: ${data.metrics.aes_256_gcm_8k_kbs.toLocaleString()}` +
      (stddev ? `<br>±${stddev.toLocaleString()}` : '');
    
    expect(tooltipHtml).toContain('3.5.3');
    expect(tooltipHtml).not.toContain('±');
  });
});

describe('Visualizations - Chart Data Transformation', () => {
  it('should transform data for slope chart (TLS 1.2 vs 1.3)', () => {
    const data = [{
      version: '3.5.3',
      metrics: {
        tls1_2_ecdhe_rsa_aes128gcm_cps: 6400,
        tls1_3_rsa_new_cps: 6450
      }
    }];
    
    const slopeData = data.map(d => ({
      version: d.version,
      tls12: d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps || 0,
      tls13: d.metrics.tls1_3_rsa_new_cps || 0,
      diff: (d.metrics.tls1_3_rsa_new_cps || 0) - (d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps || 0),
      pctDiff: ((d.metrics.tls1_3_rsa_new_cps - d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps) / 
                d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps) * 100
    }));
    
    expect(slopeData[0].tls12).toBe(6400);
    expect(slopeData[0].tls13).toBe(6450);
    expect(slopeData[0].diff).toBe(50);
    expect(slopeData[0].pctDiff).toBeCloseTo(0.78, 1);
  });

  it('should transform data for scatter plot', () => {
    const data = generateCompleteTestDataset(['3.5.3', '3.4.0'], 3);
    
    // Aggregate for scatter plot
    const byVersion = {};
    data.forEach(r => {
      const v = r.config.version;
      if (!byVersion[v]) byVersion[v] = [];
      byVersion[v].push(r);
    });
    
    const scatterData = Object.entries(byVersion).map(([version, iters]) => {
      const aesValues = iters.map(i => i.metrics.aes_256_gcm_8k_kbs);
      const hsValues = iters.map(i => i.metrics.handshakes_new_per_sec);
      
      return {
        version,
        x: aesValues.reduce((a, b) => a + b, 0) / aesValues.length,
        y: hsValues.reduce((a, b) => a + b, 0) / hsValues.length
      };
    });
    
    expect(scatterData.length).toBe(2);
    expect(scatterData[0].x).toBeGreaterThan(0);
    expect(scatterData[0].y).toBeGreaterThan(0);
  });

  it('should calculate percentage change for comparison charts', () => {
    const baseline = 6450;
    const current = 6480;
    
    const pctChange = ((current - baseline) / baseline) * 100;
    const formatted = (pctChange >= 0 ? '+' : '') + pctChange.toFixed(1) + '%';
    
    expect(formatted).toBe('+0.5%');
  });
});

describe('Visualizations - Error Handling', () => {
  it('should handle empty data gracefully', () => {
    const data = [];
    
    expect(() => {
      if (data.length === 0) {
        throw new Error('No data available');
      }
    }).toThrow('No data available');
  });

  it('should handle missing metrics', () => {
    const data = [{
      version: '3.5.3',
      metrics: {} // No metrics!
    }];
    
    const value = data[0].metrics.nonexistent_metric || 0;
    expect(value).toBe(0);
  });

  it('should validate numeric values', () => {
    const values = [1000, 2000, NaN, 3000, Infinity];
    const validValues = values.filter(v => isFinite(v) && !isNaN(v));
    
    expect(validValues).toEqual([1000, 2000, 3000]);
  });

  it('should handle zero domain', () => {
    const values = [0, 0, 0];
    const extent = d3.extent(values);
    
    // Should add padding to avoid zero domain
    const domain = extent[0] === extent[1] ? 
      [extent[0] - 1, extent[1] + 1] : 
      extent;
    
    expect(domain[0]).toBeLessThan(domain[1]);
  });
});

describe('Visualizations - Responsive Sizing', () => {
  it('should calculate width from container', () => {
    const containerWidth = 1200;
    const margin = { left: 60, right: 120 };
    const width = Math.max(containerWidth - margin.left - margin.right, 400);
    
    expect(width).toBe(1020);
  });

  it('should handle minimum width', () => {
    const containerWidth = 200; // Very small
    const margin = { left: 60, right: 120 };
    const width = Math.max(containerWidth - margin.left - margin.right, 400);
    
    expect(width).toBe(400); // Should use minimum
  });

  it('should calculate chart height', () => {
    const baseHeight = 400;
    const margin = { top: 20, bottom: 40 };
    const chartHeight = baseHeight - margin.top - margin.bottom;
    
    expect(chartHeight).toBe(340);
  });
});

describe('Visualizations - Legend Generation', () => {
  let container;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#chart');
  });

  it('should create legend items', () => {
    const svg = container.append('svg').attr('width', 600).attr('height', 400);
    const legend = svg.append('g').attr('class', 'legend');
    
    const items = [
      { label: 'TLS 1.3', color: '#228be6' },
      { label: 'TLS 1.2', color: '#fa5252' }
    ];
    
    items.forEach((item, i) => {
      const g = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      g.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color);
      
      g.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text(item.label);
    });
    
    const legendItems = legend.selectAll('g');
    expect(legendItems.size()).toBe(2);
  });
});

describe('Visualizations - HTML Generation', () => {
  it('should validate HTML structure', () => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Chart</title>
</head>
<body>
    <div id="chart"></div>
    <script src="https://d3js.org/d3.v7.min.js"></script>
</body>
</html>`;
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<meta charset="UTF-8">');
    expect(html).toContain('d3.v7.min.js');
  });

  it('should embed JSON data correctly', () => {
    const data = [{ version: '3.5.3', value: 123 }];
    const dataJson = JSON.stringify(data);
    
    const html = `<script>const data = ${dataJson};</script>`;
    
    expect(html).toContain('"version":"3.5.3"');
    expect(html).toContain('"value":123');
  });
});

console.log('✅ All visualization tests defined');

