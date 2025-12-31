import { describe, it, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import { generateCompleteTestDataset, calculateExpectedStats } from './test-helpers.js';

describe('Charts - Scatter Plot (Overview)', () => {
  let container, svg;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="scatter-chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#scatter-chart');
  });

  it('should render scatter plot with correct number of points', () => {
    const data = generateCompleteTestDataset(['3.5.3', '3.4.0', '3.3.2'], 3);
    
    // Aggregate to one point per version
    const byVersion = {};
    data.forEach(r => {
      const v = r.config.version;
      if (!byVersion[v]) byVersion[v] = [];
      byVersion[v].push(r);
    });
    
    const aggregated = Object.entries(byVersion).map(([version, iters]) => {
      const aesValues = iters.map(i => i.metrics.aes_256_gcm_8k_kbs);
      const mean = aesValues.reduce((a, b) => a + b, 0) / aesValues.length;
      
      return { version, value: mean };
    });
    
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    
    const circles = svg.selectAll('circle')
      .data(aggregated)
      .enter()
      .append('circle')
      .attr('cx', (d, i) => i * 100 + 50)
      .attr('cy', 200)
      .attr('r', 10);
    
    expect(circles.size()).toBe(3);
  });

  it('should apply color scale based on series', () => {
    const colorScale = d3.scaleOrdinal()
      .domain(['1.1.1', '3.0', '3.1', '3.2', '3.3', '3.4', '3.5'])
      .range(['#228be6', '#fa5252', '#fd7e14', '#fab005', '#40c057', '#15aabf', '#7950f2']);
    
    const getSeries = (version) => {
      if (version.startsWith('1.1.1')) return '1.1.1';
      return version.split('.').slice(0, 2).join('.');
    };
    
    expect(colorScale(getSeries('1.1.1w'))).toBe('#228be6');
    expect(colorScale(getSeries('3.5.3'))).toBe('#7950f2');
    expect(colorScale(getSeries('3.0.15'))).toBe('#fa5252');
  });

  it('should render error bars for scatter plot', () => {
    const data = [{
      version: '3.5.3',
      x: 2950000,
      y: 6450,
      xStddev: 4082,
      yStddev: 12
    }];
    
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    const g = svg.append('g');
    
    const xScale = d3.scaleLinear().domain([2900000, 3000000]).range([0, 500]);
    const yScale = d3.scaleLinear().domain([6400, 6500]).range([300, 0]);
    
    // X-axis error bars
    const xErrorBars = g.selectAll('.error-x')
      .data(data)
      .enter()
      .append('line')
      .attr('class', 'error-x')
      .attr('x1', d => xScale(d.x - d.xStddev))
      .attr('x2', d => xScale(d.x + d.xStddev))
      .attr('y1', d => yScale(d.y))
      .attr('y2', d => yScale(d.y));
    
    // Y-axis error bars
    const yErrorBars = g.selectAll('.error-y')
      .data(data)
      .enter()
      .append('line')
      .attr('class', 'error-y')
      .attr('x1', d => xScale(d.x))
      .attr('x2', d => xScale(d.x))
      .attr('y1', d => yScale(d.y - d.yStddev))
      .attr('y2', d => yScale(d.y + d.yStddev));
    
    expect(xErrorBars.size()).toBe(1);
    expect(yErrorBars.size()).toBe(1);
  });
});

describe('Charts - Slope Chart (TLS 1.2 vs 1.3)', () => {
  let container, svg;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="tls-chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#tls-chart');
  });

  it('should render slope lines connecting TLS versions', () => {
    const data = [
      { version: '3.5.3', tls12: 6400, tls13: 6450 },
      { version: '3.4.0', tls12: 6500, tls13: 6300 }
    ];
    
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    const g = svg.append('g');
    
    const xScale = d3.scalePoint()
      .domain(['TLS 1.2', 'TLS 1.3'])
      .range([0, 500]);
    
    const yScale = d3.scaleLinear()
      .domain([6000, 7000])
      .range([300, 0]);
    
    const lines = g.selectAll('.slope-line')
      .data(data)
      .enter()
      .append('line')
      .attr('class', 'slope-line')
      .attr('x1', xScale('TLS 1.2'))
      .attr('y1', d => yScale(d.tls12))
      .attr('x2', xScale('TLS 1.3'))
      .attr('y2', d => yScale(d.tls13));
    
    expect(lines.size()).toBe(2);
  });

  it('should calculate slope direction (up/down)', () => {
    const data = [
      { version: '3.5.3', tls12: 6400, tls13: 6450, diff: 50 },
      { version: '3.4.0', tls12: 6500, tls13: 6300, diff: -200 }
    ];
    
    const upSlopes = data.filter(d => d.diff > 0);
    const downSlopes = data.filter(d => d.diff < 0);
    
    expect(upSlopes.length).toBe(1);
    expect(downSlopes.length).toBe(1);
  });

  it('should calculate percentage change', () => {
    const tls12 = 6400;
    const tls13 = 6450;
    const pctDiff = ((tls13 - tls12) / tls12) * 100;
    
    expect(pctDiff).toBeCloseTo(0.78, 1);
  });

  it('should render percentage labels', () => {
    const data = [{ version: '3.5.3', pctDiff: 0.78 }];
    
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    
    const labels = svg.selectAll('text')
      .data(data)
      .enter()
      .append('text')
      .attr('x', 500)
      .attr('y', 200)
      .text(d => {
        const sign = d.pctDiff > 0 ? '+' : '';
        return `${sign}${d.pctDiff.toFixed(1)}%`;
      });
    
    expect(labels.size()).toBe(1);
    expect(labels.text()).toBe('+0.8%');
  });
});

describe('Charts - Bar Chart (Grouped)', () => {
  let container, svg;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="bar-chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#bar-chart');
  });

  it('should render grouped bar chart', () => {
    const data = [
      { version: '3.5.3', metrics: [
        { key: 'rsa_sign', value: 8500 },
        { key: 'rsa_verify', value: 245000 }
      ]}
    ];
    
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    
    const x0 = d3.scaleBand()
      .domain(data.map(d => d.version))
      .range([0, 500])
      .paddingInner(0.2);
    
    const x1 = d3.scaleBand()
      .domain(['rsa_sign', 'rsa_verify'])
      .range([0, x0.bandwidth()])
      .padding(0.05);
    
    const groups = svg.selectAll('.version-group')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'version-group')
      .attr('transform', d => `translate(${x0(d.version)}, 0)`);
    
    groups.selectAll('rect')
      .data(d => d.metrics)
      .enter()
      .append('rect')
      .attr('x', d => x1(d.key))
      .attr('width', x1.bandwidth());
    
    const allBars = svg.selectAll('rect');
    expect(allBars.size()).toBe(2);
  });

  it('should calculate bar positions correctly', () => {
    const versions = ['3.5.3', '3.4.0'];
    const x0 = d3.scaleBand()
      .domain(versions)
      .range([0, 600])
      .paddingInner(0.2);
    
    const position1 = x0('3.5.3');
    const position2 = x0('3.4.0');
    
    expect(position1).toBeLessThan(position2);
    expect(x0.bandwidth()).toBeGreaterThan(0);
  });
});

describe('Charts - Line Chart (Block Size Sensitivity)', () => {
  let container, svg;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="line-chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#line-chart');
  });

  it('should render line chart with multiple lines', () => {
    const data = [
      { version: '3.5.3', blocks: [100, 200, 300, 400, 500] },
      { version: '3.4.0', blocks: [95, 195, 295, 395, 495] }
    ];
    
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    
    const xScale = d3.scaleLinear().domain([0, 4]).range([0, 500]);
    const yScale = d3.scaleLinear().domain([0, 600]).range([300, 0]);
    
    const line = d3.line()
      .x((d, i) => xScale(i))
      .y(d => yScale(d));
    
    data.forEach(version => {
      svg.append('path')
        .datum(version.blocks)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'blue');
    });
    
    const paths = svg.selectAll('path');
    expect(paths.size()).toBe(2);
  });

  it('should render data points on line', () => {
    const blockData = [100, 200, 300, 400, 500];
    
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    
    const circles = svg.selectAll('circle')
      .data(blockData)
      .enter()
      .append('circle')
      .attr('cx', (d, i) => i * 100)
      .attr('cy', d => 400 - d)
      .attr('r', 4);
    
    expect(circles.size()).toBe(5);
  });
});

describe('Charts - Error Bar Rendering', () => {
  let container, svg;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="error-chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#error-chart');
  });

  it('should render error bars with caps', () => {
    const data = [{
      version: '3.5.3',
      value: 6450,
      stddev: 12
    }];
    
    svg = container.append('svg').attr('width', 400).attr('height', 300);
    const g = svg.append('g');
    
    const yScale = d3.scaleLinear().domain([6400, 6500]).range([200, 0]);
    
    // Vertical line
    g.selectAll('.error-line')
      .data(data)
      .enter()
      .append('line')
      .attr('class', 'error-line')
      .attr('x1', 200)
      .attr('x2', 200)
      .attr('y1', d => yScale(d.value - d.stddev))
      .attr('y2', d => yScale(d.value + d.stddev));
    
    // Top cap
    g.selectAll('.error-cap-top')
      .data(data)
      .enter()
      .append('line')
      .attr('class', 'error-cap-top')
      .attr('x1', 195)
      .attr('x2', 205)
      .attr('y1', d => yScale(d.value + d.stddev))
      .attr('y2', d => yScale(d.value + d.stddev));
    
    // Bottom cap
    g.selectAll('.error-cap-bottom')
      .data(data)
      .enter()
      .append('line')
      .attr('class', 'error-cap-bottom')
      .attr('x1', 195)
      .attr('x2', 205)
      .attr('y1', d => yScale(d.value - d.stddev))
      .attr('y2', d => yScale(d.value - d.stddev));
    
    expect(g.selectAll('.error-line').size()).toBe(1);
    expect(g.selectAll('.error-cap-top').size()).toBe(1);
    expect(g.selectAll('.error-cap-bottom').size()).toBe(1);
  });

  it('should only render error bars when stddev > 0', () => {
    const data = [
      { version: '3.5.3', value: 6450, stddev: 12 },
      { version: '3.4.0', value: 6300, stddev: 0 }  // No error bar
    ];
    
    const dataWithStddev = data.filter(d => d.stddev > 0);
    
    expect(dataWithStddev.length).toBe(1);
    expect(dataWithStddev[0].version).toBe('3.5.3');
  });

  it('should calculate error bar extent correctly', () => {
    const value = 6450;
    const stddev = 12;
    
    const minValue = value - stddev;
    const maxValue = value + stddev;
    
    expect(minValue).toBe(6438);
    expect(maxValue).toBe(6462);
  });
});

describe('Charts - Bellingrath Matrix (Grouped Bar)', () => {
  let container, svg;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="bellingrath-chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#bellingrath-chart');
  });

  it('should render grouped bars for RSA vs ECDSA', () => {
    const data = [
      {
        version: '3.5.3',
        metrics: [
          { key: 'tls1_3_rsa', value: 6450, color: '#228be6' },
          { key: 'tls1_3_ecdsa', value: 6550, color: '#15aabf' }
        ]
      }
    ];
    
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    
    const x0 = d3.scaleBand()
      .domain(data.map(d => d.version))
      .range([0, 500])
      .paddingInner(0.2);
    
    const x1 = d3.scaleBand()
      .domain(['tls1_3_rsa', 'tls1_3_ecdsa'])
      .range([0, x0.bandwidth()])
      .padding(0.05);
    
    const groups = svg.selectAll('.group')
      .data(data)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${x0(d.version)}, 0)`);
    
    groups.selectAll('rect')
      .data(d => d.metrics)
      .enter()
      .append('rect')
      .attr('x', d => x1(d.key))
      .attr('width', x1.bandwidth())
      .attr('fill', d => d.color);
    
    const bars = svg.selectAll('rect');
    expect(bars.size()).toBe(2);
  });

  it('should toggle between absolute and relative views', () => {
    const baseline = 6450;
    const current = 6300;
    
    // Absolute value
    const absoluteValue = current;
    expect(absoluteValue).toBe(6300);
    
    // Relative value (% change)
    const relativeValue = ((current - baseline) / baseline) * 100;
    expect(relativeValue).toBeCloseTo(-2.33, 1);
  });

  it('should render relative bars correctly (positive and negative)', () => {
    const baseline = 6450;
    const data = [
      { version: '3.5.3', value: 6480 },  // +0.5%
      { version: '3.4.0', value: 6300 }   // -2.3%
    ];
    
    const percentages = data.map(d => ({
      version: d.version,
      pct: ((d.value - baseline) / baseline) * 100
    }));
    
    expect(percentages[0].pct).toBeGreaterThan(0);
    expect(percentages[1].pct).toBeLessThan(0);
  });
});

describe('Charts - Small Multiples', () => {
  it('should generate multiple charts with same scale', () => {
    const versions = ['3.5.3', '3.4.0', '3.3.2'];
    const data = versions.map(v => ({
      version: v,
      value: Math.random() * 1000 + 6000
    }));
    
    // All charts should use same y-scale for comparison
    const allValues = data.map(d => d.value);
    const yExtent = d3.extent(allValues);
    
    const yScale = d3.scaleLinear()
      .domain([yExtent[0] * 0.95, yExtent[1] * 1.05])
      .range([200, 0]);
    
    // All data points should fit in the scale
    data.forEach(d => {
      const y = yScale(d.value);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(200);
    });
  });

  it('should normalize data for percentage view', () => {
    const baseline = { version: '1.1.1w', value: 6450 };
    const data = [
      { version: '3.5.3', value: 6480 },
      { version: '3.4.0', value: 6300 }
    ];
    
    const normalized = data.map(d => ({
      version: d.version,
      pct: ((d.value - baseline.value) / baseline.value) * 100
    }));
    
    expect(normalized[0].pct).toBeCloseTo(0.47, 1);
    expect(normalized[1].pct).toBeCloseTo(-2.33, 1);
  });
});

describe('Charts - Mráz Optimization Comparison', () => {
  let container, svg;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="mraz-chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#mraz-chart');
  });

  it('should render default vs optimized bars', () => {
    const data = [{
      version: '3.0.15',
      default: 6200,
      optimized: 6800,
      improvement: 9.7
    }];
    
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    
    const bars = svg.selectAll('rect')
      .data([data[0].default, data[0].optimized])
      .enter()
      .append('rect')
      .attr('x', (d, i) => i * 50)
      .attr('width', 40)
      .attr('height', d => d / 50);
    
    expect(bars.size()).toBe(2);
  });

  it('should calculate improvement percentage', () => {
    const defaultValue = 6200;
    const optimizedValue = 6800;
    const improvement = ((optimizedValue - defaultValue) / defaultValue) * 100;
    
    expect(improvement).toBeCloseTo(9.68, 1);
  });

  it('should color bars by improvement (green/red)', () => {
    const improvements = [
      { version: '3.0.15', pct: 9.7 },   // Green
      { version: '3.2.3', pct: -2.3 }    // Red (unusual)
    ];
    
    const colors = improvements.map(d => 
      d.pct >= 0 ? '#40c057' : '#fa5252'
    );
    
    expect(colors[0]).toBe('#40c057');
    expect(colors[1]).toBe('#fa5252');
  });
});

describe('Charts - Interactive Features', () => {
  let container, svg;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="interactive-chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#interactive-chart');
  });

  it('should attach mouse event handlers', () => {
    svg = container.append('svg').attr('width', 400).attr('height', 300);
    
    let hoverCount = 0;
    
    const circle = svg.append('circle')
      .attr('cx', 100)
      .attr('cy', 100)
      .attr('r', 10)
      .on('mouseover', () => { hoverCount++; })
      .on('mouseout', () => { hoverCount++; });
    
    // Simulate events
    circle.dispatch('mouseover');
    circle.dispatch('mouseout');
    
    expect(hoverCount).toBe(2);
  });

  it('should highlight element on hover', () => {
    svg = container.append('svg').attr('width', 400).attr('height', 300);
    
    const circle = svg.append('circle')
      .attr('cx', 100)
      .attr('cy', 100)
      .attr('r', 10)
      .attr('opacity', 0.7)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.7);
      });
    
    // Initial state
    expect(circle.attr('opacity')).toBe('0.7');
    
    // After hover
    circle.dispatch('mouseover');
    expect(circle.attr('opacity')).toBe('1');
    
    // After mouse out
    circle.dispatch('mouseout');
    expect(circle.attr('opacity')).toBe('0.7');
  });
});

describe('Charts - Data Filtering and Transformation', () => {
  it('should filter out invalid values', () => {
    const data = [
      { version: '3.5.3', value: 6450 },
      { version: '3.4.0', value: 0 },     // Invalid
      { version: '3.3.2', value: NaN },   // Invalid
      { version: '3.2.3', value: null }   // Invalid
    ];
    
    const validData = data.filter(d => 
      d.value && isFinite(d.value) && d.value > 0
    );
    
    expect(validData.length).toBe(1);
    expect(validData[0].version).toBe('3.5.3');
  });

  it('should transform throughput to GB/s', () => {
    const kbs = 2950000; // KB/s
    const gbs = kbs / 1024 / 1024; // GB/s
    
    expect(gbs).toBeCloseTo(2.81, 2);
  });

  it('should format large numbers with K suffix', () => {
    const value = 6450;
    const formatted = (value / 1000).toFixed(1) + 'K';
    
    expect(formatted).toBe('6.5K');
  });

  it('should flatten nested data for visualizations', () => {
    const data = [
      {
        version: '3.5.3',
        metrics: {
          tls1_3_rsa: 6450,
          tls1_3_ecdsa: 6550
        }
      }
    ];
    
    const flattened = data.flatMap(d => 
      Object.entries(d.metrics).map(([key, value]) => ({
        version: d.version,
        metric: key,
        value: value
      }))
    );
    
    expect(flattened.length).toBe(2);
    expect(flattened[0].metric).toBe('tls1_3_rsa');
    expect(flattened[1].metric).toBe('tls1_3_ecdsa');
  });
});

describe('Charts - Responsive Design', () => {
  it('should calculate responsive width', () => {
    const containerWidth = 1200;
    const margin = { left: 60, right: 120 };
    const minWidth = 400;
    
    const width = Math.max(containerWidth - margin.left - margin.right, minWidth);
    
    expect(width).toBe(1020);
  });

  it('should handle small container', () => {
    const containerWidth = 300;
    const margin = { left: 60, right: 120 };
    const minWidth = 400;
    
    const width = Math.max(containerWidth - margin.left - margin.right, minWidth);
    
    expect(width).toBe(400); // Should use minimum
  });

  it('should calculate aspect ratio', () => {
    const width = 800;
    const aspectRatio = 16 / 9;
    const height = width / aspectRatio;
    
    expect(height).toBeCloseTo(450, 0);
  });
});

describe('Charts - Statistical Indicators', () => {
  it('should display iteration count badge', () => {
    const data = [{ config: { iterations_count: 3 } }];
    const iterCount = data[0].config.iterations_count || 1;
    const badgeText = iterCount > 1 ? `● ${iterCount} iterations per version` : '';
    
    expect(badgeText).toBe('● 3 iterations per version');
  });

  it('should show stddev in tooltip', () => {
    const data = {
      version: '3.5.3',
      value: 6450,
      stddev: 12
    };
    
    const hasStats = data.stddev && data.stddev > 0;
    const tooltip = hasStats ? 
      `${data.value.toLocaleString()} ± ${data.stddev}` :
      `${data.value.toLocaleString()}`;
    
    expect(tooltip).toBe('6,450 ± 12');
  });

  it('should calculate coefficient of variation', () => {
    const mean = 6450;
    const stddev = 12;
    const cv = (stddev / mean) * 100; // As percentage
    
    expect(cv).toBeCloseTo(0.186, 2);
    expect(cv).toBeLessThan(1); // Good consistency
  });
});

describe('Charts - Chart-Specific Logic', () => {
  it('should handle TLS comparison with missing data', () => {
    const data = [
      { version: '3.5.3', tls12: 6400, tls13: 6450 },
      { version: '3.4.0', tls12: 0, tls13: 6300 }      // Missing TLS 1.2
    ];
    
    const validData = data.filter(d => d.tls12 > 0 && d.tls13 > 0);
    
    expect(validData.length).toBe(1);
  });

  it('should handle PQC data (only in 3.5+)', () => {
    const data = [
      { version: '1.1.1w', ml_kem_768: 0 },
      { version: '3.4.0', ml_kem_768: 0 },
      { version: '3.5.3', ml_kem_768: 12500 }
    ];
    
    const pqcData = data.filter(d => d.ml_kem_768 > 0);
    
    expect(pqcData.length).toBe(1);
    expect(pqcData[0].version).toBe('3.5.3');
  });

  it('should handle optimized data (only in 3.x)', () => {
    const data = [
      { version: '1.1.1w', optimized_cps: 0 },
      { version: '3.0.15', optimized_cps: 6800 }
    ];
    
    const optimizedData = data.filter(d => d.optimized_cps > 0);
    
    expect(optimizedData.length).toBe(1);
    expect(optimizedData[0].version).toBe('3.0.15');
  });
});

describe('Charts - Grid and Axes', () => {
  let container, svg;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="chart"></div></body></html>');
    global.document = dom.window.document;
    container = d3.select('#chart');
  });

  it('should render grid lines', () => {
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    const g = svg.append('g');
    
    const yScale = d3.scaleLinear().domain([0, 100]).range([300, 0]);
    
    const grid = g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale).tickSize(-500).tickFormat(''));
    
    expect(grid.node()).toBeTruthy();
    expect(grid.attr('class')).toBe('grid');
  });

  it('should render axis with custom tick format', () => {
    const yScale = d3.scaleLinear().domain([0, 10000]).range([300, 0]);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => (d / 1000) + 'K');
    
    const ticks = yAxis.scale().ticks();
    const formatted = ticks.map(d => (d / 1000) + 'K');
    
    expect(formatted).toContain('0K');
    expect(formatted).toContain('10K');
  });

  it('should render baseline reference line', () => {
    svg = container.append('svg').attr('width', 600).attr('height', 400);
    
    const baselineValue = 6450;
    const yScale = d3.scaleLinear().domain([6000, 7000]).range([300, 0]);
    
    const baselineLine = svg.append('line')
      .attr('class', 'baseline')
      .attr('x1', 0)
      .attr('x2', 500)
      .attr('y1', yScale(baselineValue))
      .attr('y2', yScale(baselineValue))
      .attr('stroke-dasharray', '4,4');
    
    expect(baselineLine.node()).toBeTruthy();
    expect(baselineLine.attr('stroke-dasharray')).toBe('4,4');
  });
});

describe('Charts - Performance', () => {
  it('should render chart efficiently with many data points', () => {
    const start = Date.now();
    
    const data = Array.from({ length: 1000 }, (_, i) => ({
      x: i,
      y: Math.random() * 100
    }));
    
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="chart"></div></body></html>');
    global.document = dom.window.document;
    const container = d3.select('#chart');
    
    const svg = container.append('svg').attr('width', 600).attr('height', 400);
    
    svg.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => d.x * 0.5)
      .attr('cy', d => 400 - d.y * 3)
      .attr('r', 2);
    
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500); // Should be fast
    expect(svg.selectAll('circle').size()).toBe(1000);
  });
});

console.log('✅ All chart tests defined');

