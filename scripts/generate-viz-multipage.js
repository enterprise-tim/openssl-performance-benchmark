import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');

// Shared CSS and utilities
const SHARED_STYLES = `
body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f8f9fa; color: #333; }

/* Header */
.header { background: white; padding: 20px 40px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
.header h1 { margin: 0; font-size: 1.5rem; }
.header .nav-links { display: flex; gap: 15px; }
.header .nav-links a { color: #228be6; text-decoration: none; font-weight: 500; }
.header .nav-links a:hover { text-decoration: underline; }

/* Container */
.container { max-width: 1400px; margin: 0 auto; padding: 30px; }

/* Cards */
.card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); margin-bottom: 30px; }
.card h2 { margin-top: 0; font-size: 1.2rem; color: #495057; border-bottom: 1px solid #f1f3f5; padding-bottom: 15px; margin-bottom: 20px; }
.card-desc { font-size: 0.9rem; color: #868e96; margin-bottom: 20px; line-height: 1.6; }

/* Tooltip */
.tooltip { position: absolute; background: rgba(33, 37, 41, 0.95); color: white; padding: 8px 12px; border-radius: 4px; pointer-events: none; opacity: 0; font-size: 12px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: opacity 0.2s; }

/* View Toggle Buttons */
.view-toggle { padding: 6px 14px; border: 1px solid #dee2e6; background: white; border-radius: 4px; cursor: pointer; font-size: 13px; color: #495057; transition: all 0.2s; font-weight: 500; }
.view-toggle:hover { background: #f8f9fa; border-color: #228be6; color: #228be6; }
.view-toggle.active { background: #228be6; color: white; border-color: #228be6; }

/* D3 Styling */
.grid line { stroke: #f1f3f5; }
.grid path { stroke: none; }
.axis text { fill: #868e96; font-size: 11px; }
.axis path, .axis line { stroke: #dee2e6; }
.baseline-line { stroke: #333; stroke-dasharray: 4,4; stroke-width: 1.5; opacity: 0.5; }
.zero-line { stroke: #868e96; stroke-dasharray: 2,2; stroke-width: 1; opacity: 0.7; }

/* Breadcrumb */
.breadcrumb { background: white; padding: 15px 40px; border-bottom: 1px solid #e9ecef; font-size: 0.9rem; }
.breadcrumb a { color: #228be6; text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.breadcrumb span { color: #868e96; margin: 0 8px; }
`;

const SHARED_UTILS = `
// Shared D3 utilities
const colorScale = d3.scaleOrdinal()
    .domain(['1.1.1', '3.0', '3.1', '3.2', '3.3', '3.4', '3.5'])
    .range(['#228be6', '#fa5252', '#fd7e14', '#fab005', '#40c057', '#15aabf', '#7950f2']);

const getSeries = (ver) => {
    if (ver.startsWith('1.1.1')) return '1.1.1';
    return ver.split('.').slice(0, 2).join('.');
};

const tooltip = d3.select("body").append("div").attr("class", "tooltip");

function showTooltip(event, html) {
    tooltip.transition().duration(200).style("opacity", .9);
    tooltip.html(html)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
}

function hideTooltip() {
    tooltip.transition().duration(500).style("opacity", 0);
}

function getWidth(container, pad = 60, minWidth = 320) {
    const rect = container.node().getBoundingClientRect();
    const parentRect = container.node().parentNode ? container.node().parentNode.getBoundingClientRect() : { width: 1200 };
    const rawWidth = rect.width > 0 ? rect.width : parentRect.width;
    return Math.max(rawWidth - pad, minWidth);
}
`;

function generateHeader(title, iterationCount) {
  const iterNote = iterationCount > 1 ? 
    `<span style="color: #40c057; margin-left: 20px;">● ${iterationCount} iterations per version</span>` : 
    '';
  
  return `
<div class="breadcrumb">
    <a href="index.html">🏠 Home</a>
    <span>›</span>
    <span>${title}</span>
</div>
<div class="header">
    <h1>OpenSSL Performance Benchmark</h1>
    <div style="font-size: 0.9rem; color: #868e96;">
        ${title}${iterNote}
    </div>
</div>`;
}

function generateNavigation(hasOptimizedData) {
  return `
<div class="container">
    <div class="card">
        <h2>📊 Available Charts</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
            <a href="overview.html" style="display: block; padding: 20px; background: #e7f5ff; border-radius: 8px; text-decoration: none; color: #1971c2; border: 2px solid #a5d8ff;">
                <h3 style="margin: 0 0 10px 0;">1. Overview</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #495057;">Throughput vs Handshake scatter plot with error bars</p>
            </a>
            <a href="tls-comparison.html" style="display: block; padding: 20px; background: #fff0f6; border-radius: 8px; text-decoration: none; color: #c2255c; border: 2px solid #ffdeeb;">
                <h3 style="margin: 0 0 10px 0;">2. TLS 1.2 vs 1.3</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #495057;">Slope chart showing protocol performance comparison</p>
            </a>
            <a href="bellingrath.html" style="display: block; padding: 20px; background: #fff3e0; border-radius: 8px; text-decoration: none; color: #d05f00; border: 2px solid #ffe8cc;">
                <h3 style="margin: 0 0 10px 0;">3. Bellingrath Matrix</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #495057;">RSA vs ECDSA certificate comparison</p>
            </a>
            <a href="schmatz.html" style="display: block; padding: 20px; background: #e7ffe7; border-radius: 8px; text-decoration: none; color: #2f6c2f; border: 2px solid #b2f2bb;">
                <h3 style="margin: 0 0 10px 0;">4. Schmatz Algorithms</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #495057;">RSA/ECDSA key sizes and curves</p>
            </a>
            ${hasOptimizedData ? `<a href="mraz.html" style="display: block; padding: 20px; background: #f3f0ff; border-radius: 8px; text-decoration: none; color: #6741d9; border: 2px solid #e5dbff;">
                <h3 style="margin: 0 0 10px 0;">5. Mráz Optimization</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #495057;">Default vs optimized configuration</p>
            </a>` : `<div style="display: block; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px solid #dee2e6; opacity: 0.6;">
                <h3 style="margin: 0 0 10px 0; color: #868e96;">5. Mráz Optimization</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #868e96;">Not available - run benchmarks with OpenSSL 3.x and optimized config</p>
            </div>`}
            <a href="pqc.html" style="display: block; padding: 20px; background: #f0f9ff; border-radius: 8px; text-decoration: none; color: #0c8599; border: 2px solid #99e9f2;">
                <h3 style="margin: 0 0 10px 0;">6. Post-Quantum (PQC)</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #495057;">ML-KEM-768 performance (OpenSSL 3.5+)</p>
            </a>
        </div>
    </div>
    
    <div class="card">
        <h2>📥 Downloads</h2>
        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <a href="REPORT.md" download style="padding: 12px 24px; background: #228be6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
                📄 Markdown Report
            </a>
            <a href="summary.json" download style="padding: 12px 24px; background: #40c057; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
                📊 JSON Data
            </a>
            <a href="detailed-iterations.json" download style="padding: 12px 24px; background: #fab005; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
                🔢 Raw Iterations
            </a>
        </div>
    </div>
</div>`;
}

// Generate individual page templates
function createPageTemplate(title, description, chartFunction, dataJson, iterationCount) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - OpenSSL Benchmark</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
${SHARED_STYLES}
    </style>
</head>
<body>

${generateHeader(title, iterationCount)}

<div class="container">
    <div class="card">
        <h2>${title}</h2>
        <div class="card-desc">${description}</div>
        <div id="chart-container" style="min-height: 400px;"></div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="index.html" style="padding: 12px 24px; background: #228be6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
            ← Back to Overview
        </a>
    </div>
</div>

<script>
    const data = ${dataJson};
    const hasStats = data.length > 0 && data[0].config && data[0].config.iterations_count > 1;
    const iterationCount = data[0]?.config?.iterations_count || 1;
    
    data.sort((a, b) => a.config.version.localeCompare(b.config.version, undefined, { numeric: true }));
    const baseline = data.find(d => d.config.version === '1.1.1w') || data[0];
    
${SHARED_UTILS}

    // Chart-specific rendering
    ${chartFunction}
    
    // Render on load and resize
    window.addEventListener('load', renderChart);
    window.addEventListener('resize', renderChart);
</script>

</body>
</html>`;
}

async function main() {
  const summaryPath = path.join(RESULTS_DIR, 'summary.json');
  
  try {
    console.log('📊 Generating multi-page visualizations...\n');
    
    const rawData = await fs.readFile(summaryPath, 'utf8');
    const jsonData = JSON.parse(rawData);

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error('summary.json contains no results.');
    }
    
    const iterationCount = jsonData[0]?.config?.iterations_count || 1;
    
    // Check if we have optimized data for Mráz page
    const hasOptimizedData = jsonData.some(d => d.metrics?.optimized_tls1_3_rsa_new_cps > 0);

    // Page 1: Index/Navigation
    console.log('  📄 Generating index.html...');
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenSSL Performance Benchmark Results</title>
    <style>
${SHARED_STYLES}
        .card a { transition: transform 0.2s; display: block; }
        .card a:hover { transform: translateY(-2px); }
    </style>
</head>
<body>

${generateHeader('Dashboard', iterationCount)}

${generateNavigation(hasOptimizedData)}

<div class="container">
    <div class="card">
        <h2>About This Benchmark</h2>
        <p>
            This benchmark suite tests OpenSSL performance across versions 1.1.1w through 3.5.3.
            ${iterationCount > 1 ? `Each version was tested <strong>${iterationCount} times</strong> in separate containers, with results showing <strong>mean ± standard deviation</strong>.` : ''}
        </p>
        <p>
            <strong>Test Environment:</strong> Debian Bookworm containers, compiled from source, isolated execution.
        </p>
        <p>
            <strong>Generated:</strong> ${new Date().toISOString().split('T')[0]}
        </p>
    </div>
</div>

</body>
</html>`;
    
    await fs.writeFile(path.join(RESULTS_DIR, 'index.html'), indexHtml);

    // Page 2: Overview (Scatter Plot)
    console.log('  📄 Generating overview.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'overview.html'),
      createPageTemplate(
        'Overview: Performance Tradeoffs',
        'Scatter plot showing <strong>TLS 1.3 Handshake Speed</strong> (Y) vs <strong>AES-256-GCM Encryption Throughput</strong> (X). Handshake metrics use the deprecated <code>handshakes_new_per_sec</code> (TLS 1.3 with RSA certificates). Error bars show ±1 standard deviation when multiple iterations were run.',
        getScatterChartFunction(),
        rawData,
        iterationCount
      )
    );

    // Page 3: TLS Comparison (Slope Chart)
    console.log('  📄 Generating tls-comparison.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'tls-comparison.html'),
      createPageTemplate(
        'TLS 1.2 vs 1.3 Comparison',
        'Slope chart comparing connection setup capacity between TLS 1.2 and TLS 1.3. Each line represents an OpenSSL version. <strong>Upward slopes</strong> indicate TLS 1.3 is faster, <strong>downward slopes</strong> show TLS 1.2 leading.',
        getTlsComparisonFunction(),
        rawData,
        iterationCount
      )
    );

    // Page 4: Bellingrath Matrix
    console.log('  📄 Generating bellingrath.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'bellingrath.html'),
      createBellingrathPage(rawData, iterationCount)
    );

    // Page 5: Schmatz Algorithms
    console.log('  📄 Generating schmatz.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'schmatz.html'),
      createSchmatzPage(rawData, iterationCount)
    );

    // Page 6: Mráz Optimization (only if data exists)
    if (hasOptimizedData) {
      console.log('  📄 Generating mraz.html...');
      await fs.writeFile(
        path.join(RESULTS_DIR, 'mraz.html'),
        createMrazPage(rawData, iterationCount)
      );
    } else {
      console.log('  ⊘ Skipping mraz.html (no optimized data available)');
    }

    // Page 7: PQC
    console.log('  📄 Generating pqc.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'pqc.html'),
      createPageTemplate(
        'Post-Quantum Cryptography',
        'ML-KEM-768 performance. Only available in OpenSSL 3.5+. These algorithms are computationally heavier than classical ECC but provide quantum resistance.',
        getPqcFunction(),
        rawData,
        iterationCount
      )
    );

    console.log('\n✅ Multi-page visualization generated successfully!');
    console.log(`   Generated files in ${RESULTS_DIR}:`);
    console.log('   - index.html');
    console.log('   - overview.html');
    console.log('   - tls-comparison.html');
    console.log('   - bellingrath.html');
    console.log('   - schmatz.html');
    if (hasOptimizedData) {
      console.log('   - mraz.html');
    }
    console.log('   - pqc.html');
    console.log('\n   Open index.html in your browser to explore!\n');
    
  } catch (error) {
    console.error('❌ Failed to generate visualizations:', error.message);
    process.exit(1);
  }
}

// Chart functions for each page
function getScatterChartFunction() {
  return `
function renderChart() {
    const container = d3.select("#chart-container");
    container.html("");
    const width = getWidth(container, 80);
    const height = 500;
    const margin = {top: 20, right: 100, bottom: 50, left: 60};

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const xVal = d => d.metrics.aes_256_gcm_8k_kbs;
    const yVal = d => d.metrics.tls1_3_rsa_new_cps || d.metrics.handshakes_new_per_sec;

    const xExtent = d3.extent(data, xVal);
    const yExtent = d3.extent(data, yVal);
    const xPad = (xExtent[1] - xExtent[0]) * 0.1;
    const yPad = (yExtent[1] - yExtent[0]) * 0.1;

    const x = d3.scaleLinear().domain([xExtent[0] - xPad, xExtent[1] + xPad]).range([0, width]);
    const y = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([height, 0]);

    // Grid
    svg.append("g").attr("class", "grid").attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x).tickSize(-height).tickFormat(""));
    svg.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    // Axes
    svg.append("g").attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x).tickFormat(d => (d/1024/1024).toFixed(1) + ' GB/s'));
    svg.append("g").call(d3.axisLeft(y));

    // Axis Labels
    svg.append("text").attr("x", width/2).attr("y", height + 40)
        .style("text-anchor", "middle").text("AES-256-GCM Throughput (Higher is Better →)");
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45)
        .style("text-anchor", "middle").text("TLS 1.3 Handshakes/sec (Higher is Better ↑)");

    // Error bars (if statistics available)
    if (hasStats) {
        svg.selectAll(".error-x").data(data).enter().append("line")
            .attr("class", "error-x")
            .attr("x1", d => x(Math.max(0, xVal(d) - (d.metrics.aes_256_gcm_8k_kbs_stddev || 0))))
            .attr("x2", d => x(xVal(d) + (d.metrics.aes_256_gcm_8k_kbs_stddev || 0)))
            .attr("y1", d => y(yVal(d)))
            .attr("y2", d => y(yVal(d)))
            .attr("stroke", d => colorScale(getSeries(d.config.version)))
            .attr("stroke-width", 2)
            .attr("opacity", 0.5);
        
        svg.selectAll(".error-y").data(data).enter().append("line")
            .attr("class", "error-y")
            .attr("x1", d => x(xVal(d)))
            .attr("x2", d => x(xVal(d)))
            .attr("y1", d => {
                const stddevKey = d.metrics.tls1_3_rsa_new_cps_stddev !== undefined ? 
                    'tls1_3_rsa_new_cps_stddev' : 'handshakes_new_per_sec_stddev';
                return y(Math.max(0, yVal(d) - (d.metrics[stddevKey] || 0)));
            })
            .attr("y2", d => {
                const stddevKey = d.metrics.tls1_3_rsa_new_cps_stddev !== undefined ? 
                    'tls1_3_rsa_new_cps_stddev' : 'handshakes_new_per_sec_stddev';
                return y(yVal(d) + (d.metrics[stddevKey] || 0));
            })
            .attr("stroke", d => colorScale(getSeries(d.config.version)))
            .attr("stroke-width", 2)
            .attr("opacity", 0.5);
    }

    // Dots
    svg.selectAll("circle").data(data).enter().append("circle")
        .attr("cx", d => x(xVal(d))).attr("cy", d => y(yVal(d)))
        .attr("r", 10)
        .style("fill", d => colorScale(getSeries(d.config.version)))
        .style("stroke", "white").style("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", (e, d) => {
            const statsNote = hasStats ? \`<br><small>±\${((d.metrics.aes_256_gcm_8k_kbs_stddev || 0)/1024/1024).toFixed(2)} GB/s, ±\${(d.metrics.tls1_3_rsa_new_cps_stddev || d.metrics.handshakes_new_per_sec_stddev || 0).toFixed(0)} cps</small>\` : '';
            showTooltip(e, \`<strong>\${d.config.version}</strong><br>AES-256-GCM: \${(xVal(d)/1024/1024).toFixed(2)} GB/s<br>TLS 1.3 Handshakes: \${yVal(d).toLocaleString()} cps\${statsNote}\`);
        })
        .on("mouseout", hideTooltip);

    // Labels
    const labels = data.map((d, i) => ({
        x: x(xVal(d)) + 14,
        y: y(yVal(d)) + 4,
        version: d.config.version
    }));

    svg.selectAll(".lbl").data(labels).enter().append("text")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .text(d => d.version)
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .style("fill", "#495057");
}
`;
}

function getTlsComparisonFunction() {
  return `
function renderChart() {
    const container = d3.select("#chart-container");
    container.html("");
    
    const getTls12 = d => d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps || d.metrics.handshakes_new_tls1_2_per_sec || 0;
    const getTls13 = d => d.metrics.tls1_3_rsa_new_cps || d.metrics.handshakes_new_per_sec || 0;
    
    const hasTlsData = data.some(d => getTls12(d) > 0 && getTls13(d) > 0 && getTls12(d) !== getTls13(d));
    
    if (!hasTlsData) {
        container.html('<div style="padding:60px; text-align:center; color:#999"><h3>TLS 1.2 vs 1.3 Comparison Data Not Available</h3><p>Run the full benchmark suite to generate separate TLS 1.2 and TLS 1.3 metrics.</p></div>');
        return;
    }

    const width = getWidth(container, 320);
    const height = 500;
    const margin = {top: 40, right: 150, bottom: 40, left: 150};

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);
    
    const slopeData = data.map(d => ({
        version: d.config.version,
        tls12: getTls12(d),
        tls13: getTls13(d),
        diff: getTls13(d) - getTls12(d),
        pctDiff: getTls12(d) > 0 ? ((getTls13(d) - getTls12(d)) / getTls12(d)) * 100 : 0,
        color: colorScale(getSeries(d.config.version))
    })).filter(d => d.tls12 > 0 && d.tls13 > 0);

    const allValues = slopeData.flatMap(d => [d.tls12, d.tls13]);
    const yMin = d3.min(allValues) * 0.95;
    const yMax = d3.max(allValues) * 1.05;
    
    const y = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);
    const x = d3.scalePoint().domain(['TLS 1.2', 'TLS 1.3']).range([0, width]);

    // Grid
    svg.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    // Protocol labels
    svg.append("text").attr("x", x('TLS 1.2')).attr("y", -15)
        .style("text-anchor", "middle").style("font-size", "16px").style("font-weight", "bold")
        .style("fill", "#868e96").text("TLS 1.2");

    svg.append("text").attr("x", x('TLS 1.3')).attr("y", -15)
        .style("text-anchor", "middle").style("font-size", "16px").style("font-weight", "bold")
        .style("fill", "#228be6").text("TLS 1.3");

    // Y-axis
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));

    // Slope lines
    svg.selectAll(".slope-line").data(slopeData).enter().append("line")
        .attr("class", "slope-line")
        .attr("x1", x('TLS 1.2'))
        .attr("y1", d => y(d.tls12))
        .attr("x2", x('TLS 1.3'))
        .attr("y2", d => y(d.tls13))
        .attr("stroke", d => d.color)
        .attr("stroke-width", 3)
        .attr("opacity", 0.7)
        .style("cursor", "pointer")
        .on("mouseover", function(e, d) {
            d3.select(this).attr("stroke-width", 5).attr("opacity", 1);
            showTooltip(e, \`<strong>\${d.version}</strong><br>TLS 1.2: \${d.tls12.toLocaleString()} cps<br>TLS 1.3: \${d.tls13.toLocaleString()} cps<br>Change: \${d.pctDiff > 0 ? '+' : ''}\${d.pctDiff.toFixed(1)}%\`);
        })
        .on("mouseout", function(e, d) {
            d3.select(this).attr("stroke-width", 3).attr("opacity", 0.7);
            hideTooltip();
        });

    // Dots
    slopeData.forEach(d => {
        svg.append("circle").attr("cx", x('TLS 1.2')).attr("cy", y(d.tls12))
            .attr("r", 5).attr("fill", d.color).attr("stroke", "white").attr("stroke-width", 2);
        svg.append("circle").attr("cx", x('TLS 1.3')).attr("cy", y(d.tls13))
            .attr("r", 5).attr("fill", d.color).attr("stroke", "white").attr("stroke-width", 2);
    });

    // Labels
    slopeData.forEach(d => {
        svg.append("text")
            .attr("x", x('TLS 1.2') - 10).attr("y", y(d.tls12) + 4)
            .style("text-anchor", "end").style("font-size", "11px").style("font-weight", "600")
            .style("fill", d.color).text(d.version);
        
        svg.append("text")
            .attr("x", x('TLS 1.3') + 10).attr("y", y(d.tls13) + 4)
            .style("text-anchor", "start").style("font-size", "11px").style("font-weight", "600")
            .style("fill", d.pctDiff > 0 ? "#40c057" : "#fa5252")
            .text(\`\${d.pctDiff > 0 ? '+' : ''}\${d.pctDiff.toFixed(1)}%\`);
    });
}
`;
}

function getPqcFunction() {
  return `
function renderChart() {
    const pqcData = data.filter(d => d.metrics.ml_kem_768_ops_sec > 0);
    const container = d3.select("#chart-container");
    container.html("");
    
    if (pqcData.length === 0) {
        container.html('<div style="padding:40px; text-align:center; color:#999">No Post-Quantum Data Available (requires OpenSSL 3.5+)</div>');
        return;
    }

    const width = getWidth(container, 60);
    const height = 400;
    const margin = {top: 20, right: 20, bottom: 40, left: 60};

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const x = d3.scaleBand().domain(pqcData.map(d => d.config.version)).range([0, width]).padding(0.4);
    const y = d3.scaleLinear().domain([0, d3.max(pqcData, d => d.metrics.ml_kem_768_ops_sec) * 1.2]).range([height, 0]);

    svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y));

    svg.selectAll("rect").data(pqcData).enter().append("rect")
        .attr("x", d => x(d.config.version))
        .attr("y", d => y(d.metrics.ml_kem_768_ops_sec))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.metrics.ml_kem_768_ops_sec))
        .attr("fill", "#7950f2")
        .on("mouseover", (e, d) => showTooltip(e, \`\${d.metrics.ml_kem_768_ops_sec.toLocaleString()} ops/sec\`))
        .on("mouseout", hideTooltip);
        
    svg.selectAll(".lbl").data(pqcData).enter().append("text")
        .attr("x", d => x(d.config.version) + x.bandwidth()/2)
        .attr("y", d => y(d.metrics.ml_kem_768_ops_sec) - 5)
        .text(d => d.metrics.ml_kem_768_ops_sec.toLocaleString())
        .style("text-anchor", "middle")
        .style("font-size", "12px");
}
`;
}

function createBellingrathPage(dataJson, iterationCount) {
  // Special page with multiple charts
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bellingrath Matrix - OpenSSL Benchmark</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>${SHARED_STYLES}</style>
</head>
<body>

${generateHeader('Bellingrath Test Matrix', iterationCount)}

<div class="container">
    <div class="card">
        <h2>RSA vs ECDSA Certificate Comparison</h2>
        <div class="card-desc">
            Aligned with <a href="https://www.youtube.com/watch?v=b01y5FDx-ao" target="_blank">W. Bellingrath's OpenSSL 3.x presentation</a> (Juniper Networks).
            Shows handshake performance for both RSA-2048 and ECDSA P-256 certificates.
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 20px;">
            <button id="btn-absolute" class="view-toggle active" onclick="toggleView('absolute')">Absolute Values</button>
            <button id="btn-relative" class="view-toggle" onclick="toggleView('relative')">% vs 1.1.1w</button>
        </div>
        <div id="rsa-ecdsa-chart"></div>
    </div>
    
    <div class="card">
        <h2>TLS 1.3 Session Resumption Performance</h2>
        <div class="card-desc">
            Comparison of new vs resumed <strong>TLS 1.3</strong> connections with RSA certificates. Resumed connections reuse cached session parameters for faster setup.
            <br><strong>Note:</strong> These are the deprecated <code>handshakes_new_per_sec</code> and <code>handshakes_resume_per_sec</code> metrics, which specifically measure TLS 1.3 (not TLS 1.2).
        </div>
        <div id="resumption-chart"></div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="index.html" style="padding: 12px 24px; background: #228be6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
            ← Back to Overview
        </a>
    </div>
</div>

<script>
const data = ${dataJson};
const hasStats = data.length > 0 && data[0].config && data[0].config.iterations_count > 1;
data.sort((a, b) => a.config.version.localeCompare(b.config.version, undefined, { numeric: true }));
const baseline = data.find(d => d.config.version === '1.1.1w') || data[0];

${SHARED_UTILS}

let viewMode = 'absolute';

function toggleView(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-toggle').forEach(el => el.classList.remove('active'));
    document.getElementById(\`btn-\${mode}\`).classList.add('active');
    renderRsaEcdsaChart();
}

function renderRsaEcdsaChart() {
    const container = d3.select("#rsa-ecdsa-chart");
    container.html("");
    
    const metrics = [
        {key: 'tls1_3_rsa_new_cps', label: 'TLS 1.3 RSA', color: '#228be6'},
        {key: 'tls1_3_ecdsa_new_cps', label: 'TLS 1.3 ECDSA', color: '#15aabf'},
        {key: 'tls1_2_ecdhe_rsa_aes128gcm_cps', label: 'TLS 1.2 RSA', color: '#fa5252'},
        {key: 'tls1_2_ecdhe_ecdsa_aes128gcm_cps', label: 'TLS 1.2 ECDSA', color: '#fd7e14'}
    ];

    const containerWidth = container.node().getBoundingClientRect().width;
    const margin = {top: 20, right: 120, bottom: 40, left: 70};
    const width = containerWidth - margin.left - margin.right;
    const height = 420;

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
    const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
    
    let yLabel, maxVal, minVal;
    if (viewMode === 'relative') {
        yLabel = "% Change vs 1.1.1w";
        const percentages = data.flatMap(d => metrics.map(m => {
            const baseVal = baseline.metrics[m.key] || 1;
            const currentVal = d.metrics[m.key] || 0;
            return ((currentVal - baseVal) / baseVal) * 100;
        }));
        maxVal = d3.max(percentages);
        minVal = d3.min(percentages);
        const range = Math.max(Math.abs(maxVal), Math.abs(minVal));
        maxVal = range * 1.1;
        minVal = -range * 1.1;
    } else {
        yLabel = "Connections/sec";
        maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0)) * 1.1;
        minVal = 0;
    }
    
    const y = d3.scaleLinear().domain([minVal, maxVal]).rangeRound([height, 0]);

    if (viewMode === 'relative') {
        svg.append("line").attr("class", "zero-line")
            .attr("x1", 0).attr("x2", width).attr("y1", y(0)).attr("y2", y(0));
    }

    svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => viewMode === 'relative' ? d + '%' : d));

    const versionGroups = svg.selectAll(".g").data(data).enter().append("g")
        .attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

    versionGroups.selectAll("rect").data(d => metrics.map(m => {
        const baseVal = baseline.metrics[m.key] || 1;
        const currentVal = d.metrics[m.key] || 0;
        const value = viewMode === 'relative' ? ((currentVal - baseVal) / baseVal) * 100 : currentVal;
        return {key: m.key, label: m.label, color: m.color, value: value, raw: currentVal};
    })).enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => viewMode === 'relative' ? (d.value >= 0 ? y(d.value) : y(0)) : y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => viewMode === 'relative' ? Math.abs(y(d.value) - y(0)) : height - y(d.value))
        .attr("fill", d => d.color)
        .attr("opacity", 0.9)
        .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.raw.toLocaleString()} conn/s\`))
        .on("mouseout", hideTooltip);

    // Legend
    const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
    metrics.forEach((m, i) => {
        const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
        g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
        g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
    });
}

function renderResumptionChart() {
    const container = d3.select("#resumption-chart");
    container.html("");
    
    const containerWidth = container.node().getBoundingClientRect().width;
    const margin = {top: 20, right: 120, bottom: 60, left: 70};
    const width = containerWidth - margin.left - margin.right;
    const height = 360;

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const metrics = [
        {key: 'handshakes_new_per_sec', label: 'TLS 1.3 New Connections', color: '#228be6'},
        {key: 'handshakes_resume_per_sec', label: 'TLS 1.3 Resumed Connections', color: '#74c0fc'}
    ];

    const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.3);
    const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.1);
    const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

    svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0))
        .selectAll("text").style("text-anchor", "end").attr("dx", "-.8em").attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));

    const versionGroups = svg.selectAll(".g").data(data).enter().append("g")
        .attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

    versionGroups.selectAll("rect").data(d => metrics.map(m => 
        ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})
    )).enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => d.color)
        .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()} conn/sec\`))
        .on("mouseout", hideTooltip);

    const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
    metrics.forEach((m, i) => {
        const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
        g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
        g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
    });
}

renderRsaEcdsaChart();
renderResumptionChart();

window.addEventListener('resize', () => {
    renderRsaEcdsaChart();
    renderResumptionChart();
});
</script>

</body>
</html>`;
}

function createSchmatzPage(dataJson, iterationCount) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schmatz Algorithm Benchmarks - OpenSSL Benchmark</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>${SHARED_STYLES}
        .multiples-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
    </style>
</head>
<body>

${generateHeader('Schmatz Algorithm Benchmarks', iterationCount)}

<div class="container">
    <div class="card">
        <h2>RSA Key Size Comparison</h2>
        <div class="card-desc">
            Based on <a href="https://www.youtube.com/watch?v=69gUVhOEaVM" target="_blank">Martin Schmatz's (IBM) methodology</a>. 
            Tests RSA signing and verification at different key sizes (2048, 3072, 4096 bits).
        </div>
        <div class="multiples-grid">
            <div>
                <h3>RSA Sign Performance</h3>
                <div id="rsa-sign-chart" style="height: 350px;"></div>
            </div>
            <div>
                <h3>RSA Verify Performance</h3>
                <div id="rsa-verify-chart" style="height: 350px;"></div>
            </div>
        </div>
    </div>
    
    <div class="card">
        <h2>ECDSA Curve Comparison</h2>
        <div class="card-desc">
            Tests ECDSA performance across different curve sizes (P-256, P-384, P-521).
        </div>
        <div class="multiples-grid">
            <div>
                <h3>ECDSA Sign Performance</h3>
                <div id="ecdsa-sign-chart" style="height: 350px;"></div>
            </div>
            <div>
                <h3>ECDSA Verify Performance</h3>
                <div id="ecdsa-verify-chart" style="height: 350px;"></div>
            </div>
        </div>
    </div>
    
    <div class="card">
        <h2>Block Size Sensitivity (AES-256-GCM)</h2>
        <div class="card-desc">
            <p><strong>What This Chart Shows:</strong> This benchmark measures AES-256-GCM encryption throughput across different block sizes (16 bytes to 8KB) to reveal how cryptographic operations scale with data size.</p>
            
            <p><strong>Key Insights:</strong></p>
            <ul style="margin: 10px 0; padding-left: 25px;">
                <li><strong>Small blocks (16-64 bytes)</strong> stress initialization overhead - each encryption requires Provider setup, key scheduling, and context creation</li>
                <li><strong>Medium blocks (256 bytes - 1KB)</strong> show the transition point where throughput begins to increase</li>
                <li><strong>Large blocks (8KB+)</strong> achieve maximum throughput by amortizing initialization costs across more data</li>
                <li><strong>The gap between versions</strong> reveals Provider architecture overhead in OpenSSL 3.x compared to 1.1.1w</li>
            </ul>
            
            <p><strong>Real-World Impact:</strong> Applications encrypting small messages (e.g., individual database fields, IoT sensor data) will see much lower throughput than bulk encryption (file encryption, large API payloads).</p>
        </div>
        <div id="blocksize-chart" style="height: 400px;"></div>
        
        <div style="margin-top: 30px;">
            <h3 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 8px;">Performance Data (KB/s)</h3>
            <div id="blocksize-table" style="overflow-x: auto; margin-top: 15px;">
                <!-- Table will be generated by JavaScript -->
            </div>
        </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="index.html" style="padding: 12px 24px; background: #228be6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
            ← Back to Overview
        </a>
    </div>
</div>

<script>
const data = ${dataJson};
const hasStats = data.length > 0 && data[0].config && data[0].config.iterations_count > 1;
data.sort((a, b) => a.config.version.localeCompare(b.config.version, undefined, { numeric: true }));

${SHARED_UTILS}

// Render all Schmatz charts
function renderGroupedBarChart(containerId, metrics) {
    const container = d3.select(containerId);
    container.html("");
    
    // Check if we have any data for these metrics
    const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
    if (!maxVal || maxVal === 0) {
        const metricNames = metrics.map(m => m.label).join(', ');
        container.html(\`<div style='padding:40px; text-align:center; color:#999'><h3>Data Not Available</h3><p>No data found for: \${metricNames}</p><p style='margin-top:20px; font-size:0.9em;'>Run the full benchmark suite to generate these metrics.</p></div>\`);
        return;
    }
    
    const width = getWidth(container, 200);
    const height = 320;
    const margin = {top: 20, right: 120, bottom: 40, left: 60};

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
    const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

    svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));

    const versionGroups = svg.selectAll(".g").data(data).enter().append("g")
        .attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

    versionGroups.selectAll("rect").data(d => metrics.map(m => 
        ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})
    )).enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => d.color)
        .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()} ops/sec\`))
        .on("mouseout", hideTooltip);

    const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
    metrics.forEach((m, i) => {
        const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
        g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
        g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
    });
}

function renderBlockSizeChart() {
    const container = d3.select("#blocksize-chart");
    container.html("");
    const width = getWidth(container, 210);
    const height = 350;
    const margin = {top: 20, right: 120, bottom: 40, left: 70};

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const blockLabels = ['16B', '64B', '256B', '1KB', '8KB'];
    const getBlockData = (d) => [
        d.metrics.aes_256_gcm_16b_kbs || 0,
        d.metrics.aes_256_gcm_64b_kbs || 0,
        d.metrics.aes_256_gcm_256b_kbs || 0,
        d.metrics.aes_256_gcm_1k_kbs || 0,
        d.metrics.aes_256_gcm_8k_kbs || 0
    ];

    const x = d3.scalePoint().domain(blockLabels).range([0, width]);
    const maxVal = d3.max(data, d => d3.max(getBlockData(d)));
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([height, 0]);

    svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1024/1024).toFixed(1) + ' GB/s'));

    const line = d3.line().x((d, i) => x(blockLabels[i])).y(d => y(d));

    data.forEach(version => {
        const blockData = getBlockData(version);
        const color = colorScale(getSeries(version.config.version));
        
        svg.append("path")
            .datum(blockData)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("d", line);

        svg.selectAll(\`.dot-\${version.config.version}\`)
            .data(blockData)
            .enter().append("circle")
            .attr("cx", (d, i) => x(blockLabels[i]))
            .attr("cy", d => y(d))
            .attr("r", 4)
            .attr("fill", color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${version.config.version}: \${(d/1024/1024).toFixed(2)} GB/s\`))
            .on("mouseout", hideTooltip);
    });

    // Legend
    const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
    data.forEach((d, i) => {
        const g = legend.append("g").attr("transform", \`translate(0, \${i * 18})\`);
        g.append("rect").attr("width", 12).attr("height", 12).attr("fill", colorScale(getSeries(d.config.version)));
        g.append("text").attr("x", 16).attr("y", 10).text(d.config.version).style("font-size", "10px");
    });
}

function renderBlockSizeTable() {
    const container = document.getElementById('blocksize-table');
    if (!container) return;
    
    const blockSizes = [
        { key: 'aes_256_gcm_16b_kbs', label: '16 Bytes' },
        { key: 'aes_256_gcm_64b_kbs', label: '64 Bytes' },
        { key: 'aes_256_gcm_256b_kbs', label: '256 Bytes' },
        { key: 'aes_256_gcm_1k_kbs', label: '1024 Bytes (1KB)' },
        { key: 'aes_256_gcm_8k_kbs', label: '8192 Bytes (8KB)' }
    ];
    
    let tableHTML = \`
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Version</th>
                    \${blockSizes.map(bs => \`<th style="padding: 12px; text-align: right; font-weight: 600; color: #495057;">\${bs.label}</th>\`).join('')}
                </tr>
            </thead>
            <tbody>
    \`;
    
    data.forEach((version, idx) => {
        const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
        tableHTML += \`
            <tr style="background: \${bgColor}; border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px; font-weight: 600; color: \${colorScale(getSeries(version.config.version))};">
                    \${version.config.version}
                </td>
        \`;
        
        blockSizes.forEach(bs => {
            const value = version.metrics[bs.key] || 0;
            const displayValue = value === 0 ? '—' : 
                                value >= 1024 * 1024 ? (value / (1024 * 1024)).toFixed(2) + ' GB/s' :
                                value >= 1024 ? (value / 1024).toFixed(2) + ' MB/s' :
                                value.toFixed(2) + ' KB/s';
            
            tableHTML += \`<td style="padding: 10px; text-align: right; font-family: 'Monaco', 'Courier New', monospace;">\${displayValue}</td>\`;
        });
        
        tableHTML += \`</tr>\`;
    });
    
    tableHTML += \`
            </tbody>
        </table>
        <div style="margin-top: 10px; font-size: 12px; color: #6c757d; font-style: italic;">
            Note: Values show encryption throughput. Higher is better. "—" indicates data not captured for that block size.
        </div>
    \`;
    
    container.innerHTML = tableHTML;
}

// Render charts
renderGroupedBarChart("#rsa-sign-chart", [
    {key: 'rsa_2048_sign_per_sec', label: 'RSA-2048', color: '#228be6'},
    {key: 'rsa_4096_sign_per_sec', label: 'RSA-4096', color: '#fa5252'}
]);

renderGroupedBarChart("#rsa-verify-chart", [
    {key: 'rsa_2048_verify_per_sec', label: 'RSA-2048', color: '#74c0fc'},
    {key: 'rsa_4096_verify_per_sec', label: 'RSA-4096', color: '#ffa8a8'}
]);

renderGroupedBarChart("#ecdsa-sign-chart", [
    {key: 'ecdsa_p256_sign_per_sec', label: 'P-256', color: '#40c057'},
    {key: 'ecdsa_p384_sign_per_sec', label: 'P-384', color: '#fab005'},
    {key: 'ecdsa_p521_sign_per_sec', label: 'P-521', color: '#7950f2'}
]);

renderGroupedBarChart("#ecdsa-verify-chart", [
    {key: 'ecdsa_p256_verify_per_sec', label: 'P-256', color: '#8ce99a'},
    {key: 'ecdsa_p384_verify_per_sec', label: 'P-384', color: '#ffe066'},
    {key: 'ecdsa_p521_verify_per_sec', label: 'P-521', color: '#b197fc'}
]);

renderBlockSizeChart();
renderBlockSizeTable();

window.addEventListener('resize', () => {
    renderGroupedBarChart("#rsa-sign-chart", [
        {key: 'rsa_2048_sign_per_sec', label: 'RSA-2048', color: '#228be6'},
        {key: 'rsa_4096_sign_per_sec', label: 'RSA-4096', color: '#fa5252'}
    ]);
    renderGroupedBarChart("#rsa-verify-chart", [
        {key: 'rsa_2048_verify_per_sec', label: 'RSA-2048', color: '#74c0fc'},
        {key: 'rsa_4096_verify_per_sec', label: 'RSA-4096', color: '#ffa8a8'}
    ]);
    renderGroupedBarChart("#ecdsa-sign-chart", [
        {key: 'ecdsa_p256_sign_per_sec', label: 'P-256', color: '#40c057'},
        {key: 'ecdsa_p384_sign_per_sec', label: 'P-384', color: '#fab005'},
        {key: 'ecdsa_p521_sign_per_sec', label: 'P-521', color: '#7950f2'}
    ]);
    renderGroupedBarChart("#ecdsa-verify-chart", [
        {key: 'ecdsa_p256_verify_per_sec', label: 'P-256', color: '#8ce99a'},
        {key: 'ecdsa_p384_verify_per_sec', label: 'P-384', color: '#ffe066'},
        {key: 'ecdsa_p521_verify_per_sec', label: 'P-521', color: '#b197fc'}
    ]);
    renderBlockSizeChart();
});
</script>

</body>
</html>`;
}

function createMrazPage(dataJson, iterationCount) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mráz Optimization - OpenSSL Benchmark</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>${SHARED_STYLES}</style>
</head>
<body>

${generateHeader('Mráz Optimization Analysis', iterationCount)}

<div class="container">
    <div class="card">
        <h2>Default vs Optimized Configuration</h2>
        <div class="card-desc">
            Based on <a href="https://www.youtube.com/watch?v=Cv-43gJJFIs" target="_blank">Tomáš Mráz's OpenSSL 3.x Performance Tuning</a> talk.
            Shows handshake performance with default vs. optimized config (minimal provider loading, explicit properties).
        </div>
        <div id="comparison-chart" style="height: 450px;"></div>
    </div>
    
    <div class="card">
        <h2>Improvement Percentage</h2>
        <div class="card-desc">
            Shows the percentage improvement from applying Mráz's recommendations. Green bars = positive improvement.
        </div>
        <div id="improvement-chart" style="height: 350px;"></div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="index.html" style="padding: 12px 24px; background: #228be6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
            ← Back to Overview
        </a>
    </div>
</div>

<script>
const data = ${dataJson};
const hasStats = data.length > 0 && data[0].config && data[0].config.iterations_count > 1;
data.sort((a, b) => a.config.version.localeCompare(b.config.version, undefined, { numeric: true }));

${SHARED_UTILS}

function renderComparisonChart() {
    const mrazData = data.filter(d => d.metrics.optimized_tls1_3_rsa_new_cps > 0);
    const container = d3.select("#comparison-chart");
    container.html("");
    
    if (mrazData.length === 0) {
        container.html('<div style="padding:40px; text-align:center; color:#999">No optimization data available. Run benchmark with OpenSSL 3.x.</div>');
        return;
    }

    const containerWidth = container.node().getBoundingClientRect().width || 1000;
    const margin = {top: 30, right: 180, bottom: 60, left: 80};
    const width = containerWidth - margin.left - margin.right;
    const height = 420;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const metrics = [
        {key: 'tls1_3_rsa_new_cps', label: 'TLS 1.3 Default', color: '#adb5bd'},
        {key: 'optimized_tls1_3_rsa_new_cps', label: 'TLS 1.3 Optimized', color: '#40c057'}
    ];

    const x0 = d3.scaleBand().domain(mrazData.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
    const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
    const maxVal = d3.max(mrazData, d => d3.max(metrics, m => d.metrics[m.key] || 0));
    const y = d3.scaleLinear().domain([0, maxVal * 1.15]).rangeRound([height, 0]);

    // X-axis with larger font
    svg.append("g")
        .attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .style("font-size", "14px")
        .style("font-weight", "500");

    // Y-axis
    svg.append("g").call(d3.axisLeft(y));
    
    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#495057")
        .text("Connections per Second");

    const versionGroups = svg.selectAll(".g").data(mrazData).enter().append("g")
        .attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

    versionGroups.selectAll("rect").data(d => {
        const defaultVal = d.metrics.tls1_3_rsa_new_cps || 0;
        const optimizedVal = d.metrics.optimized_tls1_3_rsa_new_cps || 0;
        const improvement = ((optimizedVal - defaultVal) / defaultVal * 100).toFixed(1);
        return metrics.map(m => ({
            key: m.key, 
            label: m.label, 
            color: m.color, 
            value: d.metrics[m.key] || 0,
            improvement: improvement,
            version: d.config.version
        }));
    }).enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => d.color)
        .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()}\`))
        .on("mouseout", hideTooltip);

    // Add percentage improvement labels on the optimized bars
    mrazData.forEach(d => {
        const defaultVal = d.metrics.tls1_3_rsa_new_cps || 0;
        const optimizedVal = d.metrics.optimized_tls1_3_rsa_new_cps || 0;
        const improvement = ((optimizedVal - defaultVal) / defaultVal * 100).toFixed(1);
        
        svg.append("text")
            .attr("x", x0(d.config.version) + x1('optimized_tls1_3_rsa_new_cps') + x1.bandwidth() / 2)
            .attr("y", y(optimizedVal) - 8)
            .attr("text-anchor", "middle")
            .style("font-size", "13px")
            .style("font-weight", "bold")
            .style("fill", "#2f9e44")
            .text(\`+\${improvement}%\`);
    });

    const legend = svg.append("g").attr("transform", \`translate(\${width + 20}, 0)\`);
    metrics.forEach((m, i) => {
        const g = legend.append("g").attr("transform", \`translate(0, \${i * 25})\`);
        g.append("rect").attr("width", 18).attr("height", 18).attr("fill", m.color);
        g.append("text")
            .attr("x", 25)
            .attr("y", 14)
            .text(m.label)
            .style("font-size", "13px")
            .style("font-weight", "500");
    });
}

function renderImprovementChart() {
    const mrazData = data.filter(d => d.metrics.optimized_tls1_3_rsa_new_cps > 0);
    const container = d3.select("#improvement-chart");
    container.html("");
    
    if (mrazData.length === 0) return;

    const containerWidth = container.node().getBoundingClientRect().width || 1000;
    const margin = {top: 20, right: 20, bottom: 40, left: 60};
    const width = containerWidth - margin.left - margin.right;
    const height = 320;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const improvementData = mrazData.map(d => ({
        version: d.config.version,
        improvement: ((d.metrics.optimized_tls1_3_rsa_new_cps - d.metrics.tls1_3_rsa_new_cps) / d.metrics.tls1_3_rsa_new_cps) * 100
    }));

    const x = d3.scaleBand().domain(improvementData.map(d => d.version)).range([0, width]).padding(0.3);
    const yDomain = d3.extent(improvementData, d => d.improvement);
    const absMax = Math.max(Math.abs(yDomain[0] || 0), Math.abs(yDomain[1] || 0), 10);
    const y = d3.scaleLinear().domain([-absMax, absMax]).range([height, 0]);

    svg.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(0)).attr("y2", y(0))
        .attr("stroke", "#333").attr("stroke-dasharray", "4,4");

    svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => d + "%"));

    svg.selectAll("rect").data(improvementData).enter().append("rect")
        .attr("x", d => x(d.version))
        .attr("y", d => d.improvement >= 0 ? y(d.improvement) : y(0))
        .attr("height", d => Math.abs(y(d.improvement) - y(0)))
        .attr("width", x.bandwidth())
        .attr("fill", d => d.improvement >= 0 ? "#40c057" : "#fa5252")
        .on("mouseover", (e, d) => showTooltip(e, \`\${d.version}: \${d.improvement.toFixed(1)}%\`))
        .on("mouseout", hideTooltip);

    svg.selectAll(".lbl").data(improvementData).enter().append("text")
        .attr("x", d => x(d.version) + x.bandwidth()/2)
        .attr("y", d => d.improvement >= 0 ? y(d.improvement) - 5 : y(d.improvement) + 15)
        .text(d => (d.improvement >= 0 ? "+" : "") + d.improvement.toFixed(1) + "%")
        .style("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "bold");
}

renderComparisonChart();
renderImprovementChart();

window.addEventListener('resize', () => {
    renderComparisonChart();
    renderImprovementChart();
});
</script>

</body>
</html>`;
}

main();

