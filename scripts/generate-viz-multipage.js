import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');

// Load package.json for version info
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
const VERSION = packageJson.version;

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
    .domain(['1.1.1', '3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6'])
    .range(['#228be6', '#fa5252', '#fd7e14', '#fab005', '#40c057', '#15aabf', '#7950f2', '#e64980']);

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

function generateHeader(title, iterationCount, lastRunDate = null, versionIterations = null) {
  const iterNote = iterationCount > 1 ? 
    `<span style="color: #40c057; margin-left: 20px;">${iterationCount} iterations per version</span>` : 
    '';
  
  let timestampNote = '';
  if (lastRunDate) {
    timestampNote = `<div style="font-size: 0.85rem; color: #adb5bd; margin-top: 4px;">Last run: ${lastRunDate}`;
    
    if (versionIterations && versionIterations.length > 0) {
      const iterInfo = versionIterations.map(v => `${v.version} (${v.count}x)`).join(', ');
      timestampNote += ` • Iterations: ${iterInfo}`;
    }
    
    timestampNote += `</div>`;
  }
  
  return `
<div style="background: linear-gradient(90deg, #fff3bf 0%, #ffe066 100%); padding: 10px 40px; border-bottom: 2px solid #fab005; text-align: center;">
    <strong style="color: #e67700;">PRELIMINARY RESULT</strong>
    <span style="color: #495057; margin-left: 15px; font-size: 0.85rem;">Benchmark Suite v${VERSION} - Results subject to change</span>
</div>
<div class="breadcrumb">
    <a href="index.html">Home</a>
    <span>›</span>
    <span>${title}</span>
</div>
<div class="header">
    <h1>OpenSSL Performance Benchmark</h1>
    <div style="font-size: 0.9rem; color: #868e96;">
        ${title}${iterNote}
        ${timestampNote}
    </div>
</div>`;
}

function generateFooter() {
  return `
<div style="border-top: 1px solid #e9ecef; padding: 30px 0; margin-top: 50px; text-align: center; background: #f8f9fa;">
    <div style="max-width: 800px; margin: 0 auto; padding: 0 20px;">
        <div style="margin-bottom: 15px;">
            <a href="https://github.com/enterprise-tim/openssl-performance-benchmark" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: #24292f; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background 0.2s;">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                View on GitHub
            </a>
        </div>
        <div style="font-size: 0.85rem; color: #868e96; line-height: 1.6;">
            <strong style="color: #495057;">Open Source Benchmark</strong><br>
            Found a problem? Have an improvement?<br>
            <a href="https://github.com/enterprise-tim/openssl-performance-benchmark/fork" target="_blank" rel="noopener" style="color: #228be6; text-decoration: none; font-weight: 500;">Fork the repository</a> and submit a pull request!
        </div>
        <div style="margin-top: 15px; font-size: 0.75rem; color: #adb5bd;">
            Licensed under Apache 2.0 • Community-driven development • v${VERSION}
        </div>
    </div>
</div>`;
}

function generateNavigation(hasOptimizedData) {
  return `
<div class="container">
    <div class="card">
        <h2>Available Charts</h2>
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
            <a href="hw-accel.html" style="display: block; padding: 20px; background: #fff9db; border-radius: 8px; text-decoration: none; color: #5c5f00; border: 2px solid #ffe066;">
                <h3 style="margin: 0 0 10px 0;">6. Hardware Acceleration</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #495057;">AVX/NEON impact on crypto performance (with vs without)</p>
            </a>
            <a href="pqc.html" style="display: block; padding: 20px; background: #f0f9ff; border-radius: 8px; text-decoration: none; color: #0c8599; border: 2px solid #99e9f2;">
                <h3 style="margin: 0 0 10px 0;">7. Post-Quantum (PQC)</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #495057;">ML-KEM-768 vs Classical ECDH comparison (OpenSSL 3.5+)</p>
            </a>
            <a href="memory.html" style="display: block; padding: 20px; background: #f3e5f5; border-radius: 8px; text-decoration: none; color: #7b1fa2; border: 2px solid #e1bee7;">
                <h3 style="margin: 0 0 10px 0;">8. Memory Consumption</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #495057;">RAM usage during TLS handshakes across versions</p>
            </a>
            <a href="openssl_version_analysis.html" style="display: block; padding: 20px; background: #ffe8cc; border-radius: 8px; text-decoration: none; color: #d9480f; border: 2px solid #ffc078;">
                <h3 style="margin: 0 0 10px 0;">Version Analysis</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #495057;">What changed in OpenSSL 3.5/3.6 from 3.4? Deep dive into performance impacts</p>
            </a>
        </div>
    </div>
    
    <div class="card">
        <h2>Downloads</h2>
        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <a href="REPORT.md" download style="padding: 12px 24px; background: #228be6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
                Markdown Report
            </a>
            <a href="summary.json" download style="padding: 12px 24px; background: #40c057; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
                JSON Data
            </a>
            <a href="detailed-iterations.json" download style="padding: 12px 24px; background: #fab005; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
                Raw Iterations
            </a>
        </div>
    </div>
    
    <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
        <h2 style="color: white; border-bottom-color: rgba(255,255,255,0.3);">Open Source Project</h2>
        <div style="font-size: 1rem; line-height: 1.8; margin-bottom: 20px;">
            This benchmark suite is <strong>open source</strong> and community-driven. 
            Found an issue? Have an idea for improvement? Contributions are welcome!
        </div>
        <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
            <a href="https://github.com/enterprise-tim/openssl-performance-benchmark" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: white; color: #667eea; text-decoration: none; border-radius: 6px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                View on GitHub
            </a>
            <a href="https://github.com/enterprise-tim/openssl-performance-benchmark/fork" target="_blank" rel="noopener" style="padding: 12px 24px; background: rgba(255,255,255,0.2); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; border: 2px solid white;">
                Fork & Contribute
            </a>
            <a href="https://github.com/enterprise-tim/openssl-performance-benchmark/issues" target="_blank" rel="noopener" style="padding: 12px 24px; background: rgba(255,255,255,0.2); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; border: 2px solid white;">
                Report Issues
            </a>
        </div>
    </div>
</div>`;
}

// Generate individual page templates
function createPageTemplate(title, description, chartFunction, dataJson, iterationCount, lastRunDate = null, versionIterations = null) {
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

${generateHeader(title, iterationCount, lastRunDate, versionIterations)}

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

${generateFooter()}

</body>
</html>`;
}

async function main() {
  const summaryPath = path.join(RESULTS_DIR, 'summary.json');
  
  try {
    console.log('Generating multi-page visualizations...\n');
    
    const rawData = await fs.readFile(summaryPath, 'utf8');
    const jsonData = JSON.parse(rawData);

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error('summary.json contains no results.');
    }
    
    // Get the file modification time to show when tests were last run
    const stats = await fs.stat(summaryPath);
    const lastRunDate = new Date(stats.mtime).toISOString().split('T')[0];
    
    const iterationCount = jsonData[0]?.config?.iterations_count || 1;
    
    // Get iteration counts per version for display
    const versionIterations = jsonData.map(d => ({
      version: d.config.version,
      count: d.config.iterations_count || 1
    }));
    
    // Check if we have optimized data for Mráz page
    const hasOptimizedData = jsonData.some(d => d.metrics?.optimized_tls1_3_rsa_new_cps > 0);
    
    // Extract version range from the data for dynamic display
    const sortedVersions = jsonData.map(d => d.config.version)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const firstVersion = sortedVersions[0];
    const lastVersion = sortedVersions[sortedVersions.length - 1];
    const versionRangeText = `${firstVersion} through ${lastVersion}`;
    
    // Find the latest 3.5+ version for ML-DSA/PQC documentation examples
    const pqcVersion = sortedVersions.filter(v => v.startsWith('3.5') || v.startsWith('3.6')).pop() || '3.5.0';

    // Page 1: Index/Navigation
    console.log('  Generating index.html...');
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

${generateHeader('Dashboard', iterationCount, lastRunDate, versionIterations)}

${generateNavigation(hasOptimizedData)}

<div class="container">
    <div class="card">
        <h2>About This Benchmark</h2>
        <p>
            This benchmark suite tests OpenSSL performance across versions ${versionRangeText}.
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

${generateFooter()}

</body>
</html>`;
    
    await fs.writeFile(path.join(RESULTS_DIR, 'index.html'), indexHtml);

    // Page 2: Overview (Scatter Plot)
    console.log('  Generating overview.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'overview.html'),
      createPageTemplate(
        'Overview: Performance Tradeoffs',
        'Scatter plot showing <strong>TLS 1.3 Handshake Speed</strong> (Y) vs <strong>AES-256-GCM Encryption Throughput</strong> (X). Handshake metrics use the deprecated <code>handshakes_new_per_sec</code> (TLS 1.3 with RSA certificates). Error bars show ±1 standard deviation when multiple iterations were run.',
        getScatterChartFunction(),
        rawData,
        iterationCount,
        lastRunDate,
        versionIterations
      )
    );

    // Page 3: TLS Comparison (Table)
    console.log('  Generating tls-comparison.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'tls-comparison.html'),
      createPageTemplate(
        'TLS 1.2 vs 1.3 Comparison',
        'Comparison of connection setup capacity between TLS 1.2 and TLS 1.3 across OpenSSL versions. Shows connections per second and the percentage difference between protocols.',
        getTlsComparisonFunction(),
        rawData,
        iterationCount,
        lastRunDate,
        versionIterations
      )
    );

    // Page 4: Bellingrath Matrix
    console.log('  Generating bellingrath.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'bellingrath.html'),
      createBellingrathPage(rawData, iterationCount, lastRunDate, versionIterations)
    );

    // Page 5: Schmatz Algorithms
    console.log('  Generating schmatz.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'schmatz.html'),
      createSchmatzPage(rawData, iterationCount, lastRunDate, versionIterations, pqcVersion)
    );

    // Page 6: Mráz Optimization (only if data exists)
    if (hasOptimizedData) {
      console.log('  Generating mraz.html...');
      await fs.writeFile(
        path.join(RESULTS_DIR, 'mraz.html'),
        createMrazPage(rawData, iterationCount, lastRunDate, versionIterations)
      );
    } else {
      console.log('  Skipping mraz.html (no optimized data available)');
    }

    // Page 7: Hardware Acceleration (AVX/NEON impact)
    console.log('  Generating hw-accel.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'hw-accel.html'),
      createHwAccelPage(rawData, iterationCount, lastRunDate, versionIterations)
    );

    // Page 8: PQC
    console.log('  Generating pqc.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'pqc.html'),
      createPqcPage(rawData, iterationCount, lastRunDate, versionIterations, pqcVersion)
    );

    // Page 9: Memory Consumption
    console.log('  Generating memory.html...');
    await fs.writeFile(
      path.join(RESULTS_DIR, 'memory.html'),
      createMemoryPage(rawData, iterationCount, lastRunDate, versionIterations)
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
    console.log('   - hw-accel.html');
    console.log('   - pqc.html');
    console.log('   - memory.html');
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

    const tableData = data.map(d => ({
        version: d.config.version,
        series: getSeries(d.config.version),
        tls12: getTls12(d),
        tls13: getTls13(d),
        diff: getTls13(d) - getTls12(d),
        pctDiff: getTls12(d) > 0 ? ((getTls13(d) - getTls12(d)) / getTls12(d)) * 100 : 0
    })).filter(d => d.tls12 > 0 && d.tls13 > 0);

    // Build HTML table
    let html = \`
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #495057;">Version</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #868e96;">TLS 1.2 (conn/sec)</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #228be6;">TLS 1.3 (conn/sec)</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #495057;">Difference</th>
                </tr>
            </thead>
            <tbody>
    \`;

    tableData.forEach((d, i) => {
        const bgColor = i % 2 === 0 ? 'white' : '#f8f9fa';
        const diffColor = d.pctDiff > 0 ? '#40c057' : d.pctDiff < 0 ? '#fa5252' : '#868e96';
        const diffSign = d.pctDiff > 0 ? '+' : '';
        const versionColor = colorScale(d.series);
        
        html += \`
            <tr style="background: \${bgColor}; border-bottom: 1px solid #e9ecef;">
                <td style="padding: 12px 16px;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: \${versionColor}; margin-right: 8px;"></span>
                    <strong style="color: #333;">\${d.version}</strong>
                </td>
                <td style="padding: 12px 16px; text-align: right; font-family: 'SF Mono', Monaco, monospace; color: #868e96;">
                    \${d.tls12.toLocaleString()}
                </td>
                <td style="padding: 12px 16px; text-align: right; font-family: 'SF Mono', Monaco, monospace; color: #228be6; font-weight: 500;">
                    \${d.tls13.toLocaleString()}
                </td>
                <td style="padding: 12px 16px; text-align: right;">
                    <span style="color: \${diffColor}; font-weight: 600;">
                        \${diffSign}\${d.pctDiff.toFixed(1)}%
                    </span>
                    <span style="color: #adb5bd; font-size: 12px; margin-left: 8px;">
                        (\${diffSign}\${d.diff.toLocaleString()})
                    </span>
                </td>
            </tr>
        \`;
    });

    html += \`
            </tbody>
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 6px; font-size: 13px; color: #868e96;">
            <strong style="color: #495057;">Reading this table:</strong> 
            <span style="color: #40c057; font-weight: 600;">Positive percentages</span> mean TLS 1.3 is faster than TLS 1.2.
            <span style="color: #fa5252; font-weight: 600;">Negative percentages</span> mean TLS 1.2 is faster.
        </div>
    \`;

    container.html(html);
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

    const width = getWidth(container, 180);
    const height = 400;
    const margin = {top: 20, right: 140, bottom: 60, left: 70};

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    // Prepare comparison data: ML-KEM vs Classical ECDH
    const comparisonMetrics = [
        {key: 'ml_kem_768_ops_sec', label: 'ML-KEM-768 (PQC)', color: '#7950f2', description: 'Post-Quantum Key Encapsulation'},
        {key: 'ecdh_p256_per_sec', label: 'ECDH P-256', color: '#40c057', description: 'Classical Key Exchange (vulnerable to quantum)'},
        {key: 'ecdh_p384_per_sec', label: 'ECDH P-384', color: '#fab005', description: 'Classical Key Exchange (vulnerable to quantum)'}
    ];

    const x0 = d3.scaleBand().domain(pqcData.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
    const x1 = d3.scaleBand().domain(comparisonMetrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
    
    const maxVal = d3.max(pqcData, d => d3.max(comparisonMetrics, m => d.metrics[m.key] || 0));
    const y = d3.scaleLinear().domain([0, maxVal * 1.15]).rangeRound([height, 0]);

    // Axes
    svg.append("g").attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .style("font-size", "12px");
    
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));
    
    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -55)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#495057")
        .text("Operations per Second");

    // Grouped bars
    const versionGroups = svg.selectAll(".g").data(pqcData).enter().append("g")
        .attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

    versionGroups.selectAll("rect").data(d => comparisonMetrics.map(m => ({
        key: m.key,
        label: m.label,
        color: m.color,
        description: m.description,
        value: d.metrics[m.key] || 0,
        version: d.config.version
    }))).enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => d.value > 0 ? y(d.value) : y(0))
        .attr("width", x1.bandwidth())
        .attr("height", d => d.value > 0 ? height - y(d.value) : 0)
        .attr("fill", d => d.color)
        .attr("opacity", 0.9)
        .on("mouseover", (e, d) => {
            const tooltip = d.value > 0 
                ? \`<strong>\${d.label}</strong><br>\${d.value.toLocaleString()} ops/sec<br><small>\${d.description}</small>\`
                : \`<strong>\${d.label}</strong><br>No data available\`;
            showTooltip(e, tooltip);
        })
        .on("mouseout", hideTooltip);

    // Value labels on bars
    versionGroups.selectAll(".value-label").data(d => comparisonMetrics.map(m => ({
        key: m.key,
        value: d.metrics[m.key] || 0,
        version: d.config.version
    }))).enter().append("text")
        .attr("class", "value-label")
        .attr("x", d => x1(d.key) + x1.bandwidth() / 2)
        .attr("y", d => d.value > 0 ? y(d.value) - 5 : y(0))
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("fill", "#495057")
        .text(d => d.value > 0 ? (d.value/1000).toFixed(1) + 'K' : '');

    // Legend
    const legend = svg.append("g").attr("transform", \`translate(\${width + 15}, 0)\`);
    comparisonMetrics.forEach((m, i) => {
        const g = legend.append("g").attr("transform", \`translate(0, \${i * 50})\`);
        g.append("rect").attr("width", 18).attr("height", 18).attr("fill", m.color);
        g.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .text(m.label)
            .style("font-size", "11px")
            .style("font-weight", "600");
        g.append("text")
            .attr("x", 24)
            .attr("y", 22)
            .text(m.description)
            .style("font-size", "9px")
            .style("fill", "#868e96");
    });
}
`;
}

function createBellingrathPage(dataJson, iterationCount, lastRunDate = null, versionIterations = null) {
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

${generateHeader('Bellingrath Test Matrix', iterationCount, lastRunDate, versionIterations)}

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
        
        <!-- OpenSSL 3.2 RSA/ECDSA Performance Jump Explanation -->
        <div style="background: #e7f5ff; border-left: 4px solid #228be6; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
            <strong>📈 Why OpenSSL 3.2+ Shows a Major Performance Jump</strong>
            <p style="margin: 10px 0 0 0;">The dramatic improvement from OpenSSL 3.1.x to 3.2.x (~2-2.5× for RSA, ~1.5× for ECDSA) is <strong>real and expected</strong>. OpenSSL 3.2 (released November 2023) included significant optimizations:</p>
            <ul style="margin: 10px 0; padding-left: 25px;">
                <li><strong>Provider Architecture Overhead Reduction:</strong> OpenSSL 3.0/3.1 introduced a provider-based architecture with significant per-operation dispatch overhead. Version 3.2 dramatically reduced this overhead.</li>
                <li><strong>RSA Operations:</strong> RSA signing (the bottleneck in RSA handshakes) benefited from reduced context setup and provider lookups per operation.</li>
                <li><strong>ECDSA/ECDH Operations:</strong> Elliptic curve operations saw improvements in both the provider layer and underlying implementations.</li>
                <li><strong>TLS Path Optimizations:</strong> Streamlined the full handshake code path, reducing CPU cycles per connection.</li>
            </ul>
            <p style="margin: 10px 0 0 0;"><strong>Note:</strong> The 3.0/3.1 performance regression vs 1.1.1w was a known issue. OpenSSL 3.2 marked the beginning of recovery, with 3.4+ often matching or exceeding 1.1.1w performance.</p>
            <p style="margin: 10px 0 0 0;">👉 <a href="openssl_3.2_version_analysis.html" style="color: #228be6; font-weight: 500;">See full analysis of the 3.1 → 3.2 performance improvement →</a></p>
        </div>
    </div>
    
    <div class="card">
        <h2>TLS 1.3 Session Resumption Performance</h2>
        <div class="card-desc">
            Comparison of new vs resumed <strong>TLS 1.3</strong> connections with RSA certificates. Resumed connections reuse cached session parameters for faster setup.
            <br><strong>Note:</strong> These are the deprecated <code>handshakes_new_per_sec</code> and <code>handshakes_resume_per_sec</code> metrics, which specifically measure TLS 1.3 (not TLS 1.2).
        </div>
        <div id="resumption-chart"></div>
        
        <!-- OpenSSL 3.2 Performance Jump Explanation -->
        <div style="background: #e7f5ff; border-left: 4px solid #228be6; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
            <strong>📈 Why OpenSSL 3.2+ Shows Significantly Higher Handshake Performance</strong>
            <p style="margin: 10px 0 0 0;">The dramatic performance improvement from OpenSSL 3.1.x to 3.2.x (~2-2.5× in some configurations) is <strong>real and expected</strong>. OpenSSL 3.2 (released November 2023) included major optimizations:</p>
            <ul style="margin: 10px 0; padding-left: 25px;">
                <li><strong>Provider Architecture Optimizations:</strong> Reduced per-operation dispatch overhead that accumulated in the 3.0/3.1 transition from the legacy API</li>
                <li><strong>Context Caching Improvements:</strong> Better reuse of cryptographic contexts, reducing repeated initialization costs during handshakes</li>
                <li><strong>TLS Session Handling:</strong> Streamlined session ticket processing and key derivation paths</li>
                <li><strong>General Performance Work:</strong> Accumulated fixes addressing performance regressions identified since 3.0</li>
            </ul>
            <p style="margin: 10px 0 0 0;"><strong>Bottom Line:</strong> The 3.2 release marked a turning point where OpenSSL 3.x handshake performance began approaching—and in some cases exceeding—1.1.1w levels. This improvement is consistent across independent benchmarks.</p>
            <p style="margin: 10px 0 0 0;">👉 <a href="openssl_3.2_version_analysis.html" style="color: #228be6; font-weight: 500;">See full analysis of the 3.1 → 3.2 performance improvement →</a></p>
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
    const margin = {top: 20, right: 120, bottom: 60, left: 70};
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

    svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0))
        .selectAll("text").style("text-anchor", "end").attr("dx", "-.8em").attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
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

${generateFooter()}

</body>
</html>`;
}

function createSchmatzPage(dataJson, iterationCount, lastRunDate = null, versionIterations = null, pqcVersion = '3.5.0') {
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

${generateHeader('Schmatz Algorithm Benchmarks', iterationCount, lastRunDate, versionIterations)}

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
    
    <div class="card" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9f5ff 100%); border-left: 4px solid #228be6;">
        <h2>🔬 Post-Quantum: ML-DSA (Dilithium) Considerations</h2>
        <div class="card-desc">
            <p>In his presentation, <strong>Martin Schmatz</strong> raised important concerns about <strong>Dilithium's (ML-DSA) k-values</strong> and the <strong>rejection sampling retry mechanism</strong>. This is a critical consideration for stress testing post-quantum signature algorithms.</p>
            
            <div style="background: #fff3bf; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #fab005;">
                <h4 style="margin-top: 0; color: #e67700;">⚠️ Schmatz's Concern: Variable Signing Latency</h4>
                <p style="margin-bottom: 0;">Unlike classical algorithms (RSA, ECDSA) where signing time is deterministic, <strong>Dilithium uses rejection sampling</strong> that may require multiple internal retries. This creates <strong>timing variance</strong> that could impact systems under high load, particularly for latency-sensitive applications.</p>
            </div>
            
            <p><strong>We've implemented dedicated testing for this:</strong> See the <a href="pqc.html" style="color: #228be6; font-weight: 600;">Post-Quantum Cryptography page</a> for detailed ML-DSA rejection sampling analysis, including:</p>
            <ul style="margin: 10px 0; padding-left: 25px;">
                <li><strong>Coefficient of Variation (CV%)</strong> - Measures signing time variance</li>
                <li><strong>P99, P99.9, P99.99 latencies</strong> - Tail latency analysis for capacity planning</li>
                <li><strong>Outlier detection</strong> - Operations taking &gt;2× the mean time (indicating many retries)</li>
            </ul>
            
            <p style="margin-bottom: 0;"><em>The benchmark runs for 90 seconds to collect ~108,000 samples for statistically robust P99.99 measurements.</em></p>
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

        svg.selectAll(null)
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

${generateFooter()}

</body>
</html>`;
}

function createPqcPage(dataJson, iterationCount, lastRunDate = null, versionIterations = null, pqcVersion = '3.5.0') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Post-Quantum Cryptography - OpenSSL Benchmark</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
${SHARED_STYLES}
.info-box { background: #e7f5ff; border-left: 4px solid #228be6; padding: 15px; margin: 20px 0; border-radius: 4px; }
.info-box h3 { margin-top: 0; color: #1971c2; font-size: 1rem; }
.info-box p { margin: 8px 0; line-height: 1.6; color: #495057; }
.warning-box { background: #fff3bf; border-left: 4px solid #fab005; padding: 15px; margin: 20px 0; border-radius: 4px; }
.warning-box h3 { margin-top: 0; color: #f08c00; font-size: 1rem; }
.success-box { background: #d3f9d8; border-left: 4px solid #40c057; padding: 15px; margin: 20px 0; border-radius: 4px; }
.success-box h3 { margin-top: 0; color: #2f9e44; font-size: 1rem; }
.comparison-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; margin: 20px 0; }
.algo-card { background: white; border: 2px solid #dee2e6; border-radius: 8px; padding: 15px; }
.algo-card h4 { margin-top: 0; font-size: 0.95rem; }
.algo-card .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; }
.badge-quantum { background: #7950f2; color: white; }
.badge-vulnerable { background: #fa5252; color: white; }
.algo-card p { margin: 6px 0; font-size: 0.85rem; color: #495057; }
.algo-card .metric { font-size: 1.2rem; font-weight: bold; color: #228be6; margin: 10px 0; }
    </style>
</head>
<body>

${generateHeader('Post-Quantum Cryptography', iterationCount, lastRunDate, versionIterations)}

<div class="container">
    <div class="card">
        <h2>Quantum-Resistant vs Classical Key Exchange</h2>
        
        <div class="info-box">
            <h3>What This Chart Shows</h3>
            <p><strong>ML-KEM-768</strong> (purple bars) is a <strong>post-quantum cryptographic algorithm</strong> designed to resist attacks from quantum computers. It's compared against <strong>ECDH P-256 and P-384</strong> (green/yellow bars), which are the <strong>classical algorithms</strong> used today but vulnerable to quantum attacks.</p>
            <p><strong>Key Insight:</strong> Higher bars = more key exchanges per second. ML-KEM provides quantum resistance with competitive performance!</p>
            <p><strong>Important:</strong> This chart measures <strong>key exchange operations</strong> (establishing shared secrets for encryption). This is different from <strong>digital signature operations</strong> (signing/verifying) shown on the Schmatz page. While both ECDH and ECDSA use elliptic curves, they perform fundamentally different cryptographic operations and their performance metrics are not directly comparable.</p>
        </div>

        <div id="pqc-chart" style="min-height: 450px;"></div>
        
        <div class="comparison-grid">
            <div class="algo-card">
                <span class="badge badge-quantum">QUANTUM RESISTANT</span>
                <h4>ML-KEM-768 (Post-Quantum)</h4>
                <p><strong>Security:</strong> Resistant to quantum computer attacks</p>
                <p><strong>Algorithm:</strong> Lattice-based cryptography (CRYSTALS-Kyber)</p>
                <p><strong>Standard:</strong> NIST FIPS 203 (August 2024)</p>
                <p><strong>Key Size:</strong> 1,184 bytes public key</p>
                <p><strong>Use Case:</strong> Future-proof key exchange</p>
            </div>
            
            <div class="algo-card">
                <span class="badge badge-vulnerable">QUANTUM VULNERABLE</span>
                <h4>ECDH P-256 (Classical)</h4>
                <p><strong>Security:</strong> Secure today, vulnerable to quantum</p>
                <p><strong>Algorithm:</strong> Elliptic curve cryptography</p>
                <p><strong>Standard:</strong> NIST P-256 curve</p>
                <p><strong>Key Size:</strong> 32 bytes public key</p>
                <p><strong>Use Case:</strong> Current standard for TLS</p>
            </div>
            
            <div class="algo-card">
                <span class="badge badge-vulnerable">QUANTUM VULNERABLE</span>
                <h4>ECDH P-384 (Classical)</h4>
                <p><strong>Security:</strong> Secure today, vulnerable to quantum</p>
                <p><strong>Algorithm:</strong> Elliptic curve cryptography</p>
                <p><strong>Standard:</strong> NIST P-384 curve</p>
                <p><strong>Key Size:</strong> 48 bytes public key</p>
                <p><strong>Use Case:</strong> High-security applications today</p>
            </div>
        </div>
    </div>
    
    <div class="card">
        <h2>Key Takeaways</h2>
        
        <div class="success-box">
            <h3>Performance is Production-Ready</h3>
            <p><strong>ML-KEM-768 is competitive</strong> with classical ECDH algorithms. The performance overhead is minimal—often faster than ECDH P-384 and comparable to P-256.</p>
            <p><strong>Bottom line:</strong> You can adopt post-quantum cryptography without significant performance penalties.</p>
        </div>
        
        <div class="warning-box">
            <h3>The Real Tradeoff: Bandwidth, Not Speed</h3>
            
            <p><strong>ML-KEM-768 adds ~2 KB per TLS handshake</strong> (1,184-byte public key + 1,088-byte ciphertext vs. 32 bytes for ECDH P-256).</p>
            
            <p style="margin-top: 15px;"><strong>Let's do the math for different scenarios:</strong></p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.85rem;">
                <thead style="background: #fff3bf;">
                    <tr>
                        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fab005;">Scenario</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fab005;">New Connections/sec</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fab005;">Extra Bandwidth</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fab005;">Per Day</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background: #ffe8cc;">
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[HIGH] E-commerce Peak</strong><br><span style="font-size: 0.8em; color: #666;">(Black Friday, major sale)</span></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">40,000</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>640 Mbps</strong><br>(80 MB/sec)</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>6.9 TB</strong></td>
                    </tr>
                    <tr style="background: #ffe8cc;">
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[HIGH] Busy CDN Edge</strong><br><span style="font-size: 0.8em; color: #666;">(Major content distributor)</span></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">10,000</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>160 Mbps</strong><br>(20 MB/sec)</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>1.7 TB</strong></td>
                    </tr>
                    <tr style="background: #fff5e6;">
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[MEDIUM] Popular Website</strong><br><span style="font-size: 0.8em; color: #666;">(News site, SaaS platform)</span></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">1,000</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>16 Mbps</strong><br>(2 MB/sec)</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>173 GB</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[LOW] Typical Website</strong><br><span style="font-size: 0.8em; color: #666;">(Small business, blog)</span></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">100</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>1.6 Mbps</strong><br>(200 KB/sec)</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>17 GB</strong></td>
                    </tr>
                </tbody>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background: #ffe3e3; border-left: 4px solid #fa5252; border-radius: 4px;">
                <p style="margin: 0; color: #c92a2a;"><strong>When ML-KEM Bandwidth Becomes a Problem:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                    <li><strong>High-traffic sites:</strong> Extra 100s of Mbps to multi-Gbps bandwidth costs real money (at $0.05-0.15/GB for cloud egress, 6.9 TB/day = $345-1,035/day)</li>
                    <li><strong>DDoS amplification:</strong> Connection floods now consume 37x more bandwidth per handshake</li>
                    <li><strong>Mobile networks:</strong> 2G/3G connections with limited bandwidth budgets</li>
                    <li><strong>Satellite/IoT:</strong> Expensive per-byte costs (satellite can be $5-50/MB)</li>
                    <li><strong>Geographic regions:</strong> Countries with expensive or limited internet infrastructure</li>
                </ul>
            </div>
            
            <div style="margin-top: 15px; padding: 12px; background: #e7f5ff; border-radius: 4px;">
                <p style="margin: 0;"><strong>Context:</strong> For most sites, ML-KEM handshake overhead is still <1% of total bandwidth (images, videos, and application data dominate). But for the busiest sites processing tens of thousands of new connections per second, this is hundreds of Mbps to Gbps of additional sustained bandwidth cost.</p>
            </div>
        </div>
        
        <div class="warning-box">
            <h3>Latency Impact: How 2 KB Affects Page Load Times</h3>
            
            <p><strong>Bandwidth isn't just about cost—it's about user experience.</strong> That extra 2 KB must be transmitted during the TLS handshake, adding latency before your application data can flow.</p>
            
            <p style="margin-top: 15px;"><strong>Transmission time for 2 KB by network type:</strong></p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.85rem;">
                <thead style="background: #fff3bf;">
                    <tr>
                        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fab005;">Network Type</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fab005;">Typical Speed</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fab005;">Extra Latency</th>
                        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fab005;">Impact</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[FAST] Fiber/Cable Broadband</strong></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">100 Mbps</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>+0.16 ms</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;">Imperceptible</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[FAST] 5G (Sub-6 GHz)</strong></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">150 Mbps</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>+0.11 ms</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;">Imperceptible</td>
                    </tr>
                    <tr style="background: #fff5e6;">
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[MODERATE] LTE / Fast 4G</strong></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">30 Mbps</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>+0.5 ms</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;">Barely noticeable</td>
                    </tr>
                    <tr style="background: #fff5e6;">
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[MODERATE] Average 4G</strong></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">10 Mbps</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>+1.6 ms</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;">Minor</td>
                    </tr>
                    <tr style="background: #ffe8cc;">
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>🟠 Slow 4G / Rural</strong></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">3 Mbps</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>+5.5 ms</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;">Noticeable on slow sites</td>
                    </tr>
                    <tr style="background: #ffe8cc;">
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[SLOW] 3G / HSPA+</strong></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">1.5 Mbps</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>+11 ms</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;">Noticeable delay</td>
                    </tr>
                    <tr style="background: #ffe8cc;">
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[SLOW] 2G / EDGE</strong></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">250 Kbps</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>+65 ms</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;">Significant delay</td>
                    </tr>
                    <tr style="background: #ffe8cc;">
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;"><strong>[SLOW] Satellite / High Latency</strong></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;">2 Mbps</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ffd8a8;"><strong>+8 ms</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ffd8a8;">Adds to existing latency (500-700ms typical)</td>
                    </tr>
                </tbody>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background: #ffe3e3; border-left: 4px solid #fa5252; border-radius: 4px;">
                <p style="margin: 0; color: #c92a2a;"><strong>Real-World Latency Impact by Region:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                    <li><strong>Developing markets:</strong> Where 2G/3G is still common (parts of Africa, rural Asia, Latin America), the extra 10-65ms is felt on every new connection</li>
                    <li><strong>Mobile-first regions:</strong> In markets where mobile is primary internet access (India, Southeast Asia), slow 4G/3G means 5-11ms added latency</li>
                    <li><strong>Rural areas globally:</strong> Limited infrastructure = slower connections = more noticeable delays</li>
                    <li><strong>Network congestion:</strong> When towers are overloaded (concerts, stadiums, emergencies), effective bandwidth drops and latency multiplies</li>
                </ul>
            </div>
            
            <div style="margin-top: 15px; padding: 12px; background: #e7f5ff; border-radius: 4px;">
                <p style="margin: 0;"><strong>Mobile User Experience Impact:</strong></p>
                <p style="margin: 10px 0 0 0;">For users on fast connections (LTE+, broadband), the <2ms latency is imperceptible. But for the <strong>2+ billion users</strong> still on 2G/3G or slow 4G connections, ML-KEM adds meaningful delay to every new connection. Combined with typical mobile latency (50-200ms), this compounds the "slow web" problem in bandwidth-constrained regions.</p>
            </div>
            
            <div style="margin-top: 15px; padding: 12px; background: #fff3bf; border-radius: 4px;">
                <p style="margin: 0;"><strong>Mitigation Strategies:</strong></p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; line-height: 1.6;">
                    <li><strong>TLS session resumption:</strong> Reuse sessions to avoid repeated handshakes (latency hit only on first connection)</li>
                    <li><strong>Connection pooling:</strong> Keep connections alive longer (HTTP keep-alive, connection: keep-alive headers)</li>
                    <li><strong>CDN edge nodes:</strong> Place content closer to users to reduce base latency</li>
                    <li><strong>Hybrid mode (X25519+MLKEM768):</strong> Slightly larger but maintains security if either algorithm fails</li>
                    <li><strong>Gradual rollout:</strong> Start with fast-connection markets, delay adoption for 2G/3G-heavy regions</li>
                </ul>
            </div>
        </div>
        
        <div class="info-box">
            <h3>Why This Matters: The Quantum Threat</h3>
            <p><strong>"Harvest Now, Decrypt Later" attacks:</strong> Adversaries are capturing encrypted traffic today to decrypt once quantum computers become available.</p>
            <p><strong>Timeline:</strong> While large-scale quantum computers don't exist yet, the cryptographic community recommends migrating now, as infrastructure changes take years.</p>
            <p><strong>Your data:</strong> If it needs protection beyond 2030, consider post-quantum cryptography today.</p>
        </div>
    </div>
    
    <div class="card">
        <h2>Real-World Impact: When Does Key Exchange Happen?</h2>
        
        <div class="info-box">
            <h3>Understanding "Operations Per Second"</h3>
            <p><strong>Key exchange is NOT performed on every HTTP request.</strong> It only happens during the initial TLS handshake when establishing a new connection:</p>
            
            <ul style="margin: 10px 0; padding-left: 25px; line-height: 1.8;">
                <li><strong>First connection to a server</strong> (full handshake with key exchange)</li>
                <li><strong>After session expiration</strong> (typically hours or days later)</li>
                <li><strong>New browser tab/window</strong> (sometimes, depends on browser session cache)</li>
            </ul>
            
            <p><strong>What happens on every request:</strong> Only fast symmetric encryption (AES-256-GCM) using the keys established during the initial handshake. Modern browsers reuse TLS connections for multiple HTTP requests (HTTP keep-alive), so one key exchange can secure hundreds of requests.</p>
        </div>
        
        <div class="info-box">
            <h3>How TLS Works (with ML-KEM or ECDH)</h3>
            
            <p><strong>Initial TLS Handshake (happens once per connection):</strong></p>
            <ol style="margin: 10px 0; padding-left: 25px; line-height: 1.8;">
                <li><strong>Key Exchange:</strong> ML-KEM-768 (or ECDH) establishes a shared secret between client and server</li>
                <li><strong>Key Derivation:</strong> Both sides derive symmetric encryption keys from that shared secret</li>
                <li><strong>Handshake Complete:</strong> Secure connection is ready for application data</li>
            </ol>
            
            <p style="margin-top: 15px;"><strong>Every HTTP Request After That:</strong></p>
            <ul style="margin: 10px 0; padding-left: 25px; line-height: 1.8;">
                <li><strong>Only symmetric encryption</strong> (AES-256-GCM, ChaCha20-Poly1305, etc.)</li>
                <li>Uses the keys established in step 2 above</li>
                <li><strong>No more ML-KEM operations</strong> - key exchange is done</li>
                <li>Very fast (symmetric crypto is ~1000x faster than asymmetric)</li>
            </ul>
            
            <p style="margin-top: 15px; padding: 12px; background: #e7f5ff; border-radius: 4px;"><strong>The Key Point:</strong> ML-KEM vs ECDH only affects the initial key exchange. Once you have symmetric keys, there's <strong>zero difference</strong> in ongoing performance between a connection established with ML-KEM vs ECDH.</p>
            
            <p style="margin-top: 15px;"><strong>So when we say "31,600 ML-KEM operations per second," we're talking about:</strong></p>
            <ul style="margin: 10px 0; padding-left: 25px; line-height: 1.8;">
                <li>31,600 <strong>new TLS connections</strong> per second</li>
                <li>Each connection can then serve hundreds or thousands of requests using symmetric crypto</li>
                <li>The ongoing requests are all the same speed regardless of whether ML-KEM or ECDH was used</li>
            </ul>
            
            <p style="margin-top: 15px; font-style: italic; color: #495057;">This is why the performance overhead of ML-KEM is so minimal - it only affects the initial handshake, which is a tiny fraction of overall traffic!</p>
        </div>
        
        <div class="info-box" style="background: #fff3bf; border-left-color: #fab005;">
            <h3>Who Needs High Key Exchange Performance?</h3>
            <p><strong>ML-KEM's performance matters most for high-traffic servers processing many NEW connections per second:</strong></p>
            
            <ul style="margin: 10px 0; padding-left: 25px; line-height: 1.8;">
                <li><strong>E-commerce sites during peak sales</strong> (thousands of new shoppers/second)</li>
                <li><strong>News sites during breaking events</strong> (traffic spikes)</li>
                <li><strong>API gateways and load balancers</strong> (many service-to-service connections)</li>
                <li><strong>CDN edge servers</strong> (serving millions of unique users)</li>
            </ul>
            
            <p><strong>Example:</strong> A server handling 10,000 concurrent users might only need <strong>100-500 key exchanges per second</strong> (for new arrivals and expired sessions), while serving 50,000+ HTTP requests per second using existing connections. Both ML-KEM (31K ops/sec) and ECDH (16K ops/sec) easily handle this load.</p>
            
            <p style="margin-top: 15px;"><strong>For typical websites:</strong> The ML-KEM performance is more than sufficient. The 1-2ms added to initial connection time is negligible compared to network latency (50-200ms) and is barely noticeable to end users.</p>
        </div>
    </div>
    
    <div class="card">
        <h2>Migration Recommendations</h2>
        
        <div style="margin: 20px 0;">
            <h3 style="color: #495057; font-size: 1rem; margin-bottom: 10px;">Recommended Approach: Hybrid Mode</h3>
            <p style="margin-bottom: 15px; line-height: 1.6;">OpenSSL 3.5+ supports <strong>hybrid key exchange</strong> that combines classical + post-quantum:</p>
            
            <ul style="line-height: 1.8; color: #495057;">
                <li><code style="background: #f1f3f5; padding: 2px 6px; border-radius: 3px;">X25519MLKEM768</code> - X25519 + ML-KEM-768</li>
                <li><code style="background: #f1f3f5; padding: 2px 6px; border-radius: 3px;">SecP256r1MLKEM768</code> - ECDH P-256 + ML-KEM-768</li>
            </ul>
            
            <p style="margin-top: 15px; padding: 12px; background: #e7f5ff; border-radius: 4px; line-height: 1.6;">
                <strong>Why hybrid?</strong> You get security if <em>either</em> algorithm is broken. It provides quantum resistance from ML-KEM while maintaining confidence from battle-tested classical crypto.
            </p>
        </div>
        
        <div style="margin: 20px 0;">
            <h3 style="color: #495057; font-size: 1rem; margin-bottom: 10px;">When to Migrate</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                        <th style="padding: 10px; text-align: left; font-size: 0.9rem;">Use Case</th>
                        <th style="padding: 10px; text-align: left; font-size: 0.9rem;">Recommendation</th>
                        <th style="padding: 10px; text-align: left; font-size: 0.9rem;">Timeline</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #e9ecef;">
                        <td style="padding: 10px; font-size: 0.85rem;">Government/Defense</td>
                        <td style="padding: 10px; font-size: 0.85rem;">Start migration now</td>
                        <td style="padding: 10px; font-size: 0.85rem;"><strong>2025-2026</strong></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e9ecef;">
                        <td style="padding: 10px; font-size: 0.85rem;">Financial Services</td>
                        <td style="padding: 10px; font-size: 0.85rem;">Plan migration, test now</td>
                        <td style="padding: 10px; font-size: 0.85rem;"><strong>2026-2027</strong></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e9ecef;">
                        <td style="padding: 10px; font-size: 0.85rem;">Healthcare/Long-term Data</td>
                        <td style="padding: 10px; font-size: 0.85rem;">Evaluate and pilot</td>
                        <td style="padding: 10px; font-size: 0.85rem;"><strong>2026-2028</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-size: 0.85rem;">General Web Services</td>
                        <td style="padding: 10px; font-size: 0.85rem;">Monitor and prepare</td>
                        <td style="padding: 10px; font-size: 0.85rem;"><strong>2027-2030</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <div class="card">
        <h2>🔬 ML-DSA (Dilithium) Rejection Sampling Analysis</h2>
        
        <div class="info-box">
            <h3>What is Rejection Sampling?</h3>
            <p>Unlike classical signature algorithms like ECDSA, <strong>ML-DSA (Dilithium)</strong> uses <strong>rejection sampling</strong> during signature generation. The algorithm may need to <strong>retry internally</strong> if certain mathematical conditions aren't met—this is a critical security feature that prevents private key leakage through side-channel attacks.</p>
            <p><strong>Why it matters for stress testing:</strong> Under high load, the retry mechanism can cause timing variance. Operations that require multiple retries take longer, potentially causing latency spikes.</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">🔄 How Dilithium Signing Works</h3>
            <div style="display: grid; grid-template-columns: 40px 1fr; gap: 15px; margin: 15px 0;">
                <div style="background: #228be6; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">1</div>
                <div><strong>Generate random masking:</strong> The signer generates a random masking polynomial <code>y</code></div>
                
                <div style="background: #228be6; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">2</div>
                <div><strong>Compute candidate:</strong> Calculate <code>z = y + c·s</code> (where <code>c</code> is the challenge, <code>s</code> is the secret key)</div>
                
                <div style="background: #fa5252; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">3</div>
                <div><strong>Rejection check:</strong> If <code>z</code> is "too close" to <code>s</code> (would leak secret key information), <strong>REJECT and restart from step 1</strong></div>
                
                <div style="background: #40c057; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">4</div>
                <div><strong>Success:</strong> On average, this takes <strong>4-7 attempts</strong> to produce a valid signature</div>
            </div>
            <p style="margin-bottom: 0; color: #868e96; font-size: 0.9rem;"><em>This retry mechanism is fundamental to Dilithium's security—it ensures signatures don't leak information about the private key.</em></p>
        </div>
        
        <div id="mldsa-chart" style="min-height: 400px;"></div>
        
        <div id="mldsa-stats" style="margin-top: 20px;"></div>
        
        <div class="warning-box">
            <h3>📊 Understanding the Metrics</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.9rem;">
                <thead style="background: #fff3bf;">
                    <tr>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #fab005;">Metric</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #fab005;">Description</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #fab005;">Why It Matters</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #ffd8a8;">
                        <td style="padding: 10px;"><strong>CV%</strong></td>
                        <td style="padding: 10px;">Coefficient of Variation (stddev/mean × 100)</td>
                        <td style="padding: 10px;">Normalized variance metric. &gt;10% = significant retry activity</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ffd8a8;">
                        <td style="padding: 10px;"><strong>Outliers</strong></td>
                        <td style="padding: 10px;">Operations taking &gt;2× the mean time</td>
                        <td style="padding: 10px;">Multi-retry scenarios causing latency spikes</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ffd8a8;">
                        <td style="padding: 10px;"><strong>P99</strong></td>
                        <td style="padding: 10px;">99th percentile latency</td>
                        <td style="padding: 10px;">Tail latency for capacity planning</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ffd8a8;">
                        <td style="padding: 10px;"><strong>P99.9</strong></td>
                        <td style="padding: 10px;">99.9th percentile (1 in 1,000)</td>
                        <td style="padding: 10px;">Extreme tail latency for high-traffic systems</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ffd8a8;">
                        <td style="padding: 10px;"><strong>P99.99</strong></td>
                        <td style="padding: 10px;">99.99th percentile (1 in 10,000)</td>
                        <td style="padding: 10px;">Worst-case latency for SLA guarantees</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px;"><strong>Max/Min</strong></td>
                        <td style="padding: 10px;">Ratio of slowest to fastest operation</td>
                        <td style="padding: 10px;">Large ratio = high variance in retry counts</td>
                    </tr>
                </tbody>
            </table>
            
            <h4 style="margin-top: 20px; color: #f08c00;">Interpreting Results</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 10px;">
                <div style="background: #d3f9d8; padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-weight: bold; color: #2f9e44;">CV &lt; 5%</div>
                    <div style="font-size: 0.85rem; color: #495057;">Exceptionally stable</div>
                </div>
                <div style="background: #d3f9d8; padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-weight: bold; color: #2f9e44;">CV 5-10%</div>
                    <div style="font-size: 0.85rem; color: #495057;">Normal variance</div>
                </div>
                <div style="background: #fff3bf; padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-weight: bold; color: #f08c00;">CV 10-20%</div>
                    <div style="font-size: 0.85rem; color: #495057;">Moderate variance</div>
                </div>
                <div style="background: #ffe3e3; padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-weight: bold; color: #c92a2a;">CV &gt; 20%</div>
                    <div style="font-size: 0.85rem; color: #495057;">High variance - investigate</div>
                </div>
            </div>
        </div>
        
        <div class="success-box">
            <h3>✅ Expected Behavior</h3>
            <p>Dilithium is designed to average <strong>4-7 internal retries</strong> per signature. This is normal and expected. The benchmark measures whether this variability causes problematic latency spikes under real workloads.</p>
            <p style="margin-top: 15px;"><strong>Note:</strong> Verification is deterministic—it doesn't use rejection sampling, so verification timing should be very consistent (low CV%).</p>
        </div>
        
        <div style="background: #f1f3f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">🆚 ML-DSA vs ECDSA: Timing Characteristics</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead style="background: #e9ecef;">
                    <tr>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Algorithm</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Signing Behavior</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Timing Variance</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Security Note</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 10px;"><strong style="color: #7950f2;">ML-DSA (Dilithium)</strong></td>
                        <td style="padding: 10px;">Rejection sampling with retries</td>
                        <td style="padding: 10px;">Higher variance (expected)</td>
                        <td style="padding: 10px;">Variance is a security feature</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px;"><strong style="color: #40c057;">ECDSA (RFC 6979)</strong></td>
                        <td style="padding: 10px;">Deterministic, no retries</td>
                        <td style="padding: 10px;">Very consistent timing</td>
                        <td style="padding: 10px;">Constant-time implementation</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="info-box">
            <h3>🧪 Stress Testing Recommendations</h3>
            <p>To further analyze the retry mechanism under stress:</p>
            <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>CPU contention:</strong> Run concurrent signing operations to see if contention affects retry rates</li>
                <li><strong>Extended duration:</strong> Longer test runs can catch rare high-retry edge cases</li>
                <li><strong>Compare security levels:</strong> ML-DSA-44 vs ML-DSA-65 vs ML-DSA-87 (higher levels = more retries on average)</li>
                <li><strong>Memory pressure:</strong> Test under memory constraints to see if it affects variance</li>
            </ul>
            <p style="margin-top: 15px;"><strong>Run the standalone test:</strong> <code>./scripts/test-mldsa-retry.sh ${pqcVersion}</code></p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #e7f5ff; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #1971c2;">📚 Further Reading</h4>
            <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                <li><a href="https://csrc.nist.gov/pubs/fips/204/final" target="_blank" style="color: #228be6;">NIST FIPS 204 (ML-DSA Standard)</a></li>
                <li><a href="https://pq-crystals.org/dilithium/" target="_blank" style="color: #228be6;">CRYSTALS-Dilithium Paper</a></li>
                <li><a href="https://github.com/openssl/openssl/tree/master/crypto/ml_dsa" target="_blank" style="color: #228be6;">OpenSSL ML-DSA Implementation</a></li>
            </ul>
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

function renderMldsaChart() {
    const mldsaData = data.filter(d => d.metrics.ml_dsa_available === true && d.metrics.ml_dsa_65_sign_ops_sec > 0);
    const container = d3.select("#mldsa-chart");
    const statsContainer = d3.select("#mldsa-stats");
    container.html("");
    statsContainer.html("");
    
    if (mldsaData.length === 0) {
        container.html(\`
            <div style="padding:60px 40px; text-align:center; background: #fff3bf; border-radius: 8px; border: 2px dashed #fab005;">
                <h3 style="color: #f08c00; margin-top: 0;">No ML-DSA (Dilithium) Data Available</h3>
                <p style="color: #495057; line-height: 1.6;">ML-DSA benchmarks require <strong>OpenSSL 3.5.0 or later</strong>.</p>
                <p style="color: #495057; margin-top: 10px;">This test specifically analyzes the rejection sampling retry mechanism in Dilithium signature generation.</p>
            </div>
        \`);
        return;
    }

    const containerWidth = container.node().getBoundingClientRect().width || 1000;
    const margin = {top: 40, right: 200, bottom: 60, left: 80};
    const width = containerWidth - margin.left - margin.right;
    const height = 350;

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#495057")
        .text("ML-DSA-65 Signing Timing Variance (Rejection Sampling Analysis)");

    // Metrics to display as grouped bars: mean, P50, P95, P99, max
    const timingMetrics = [
        {key: 'ml_dsa_65_sign_min_ms', label: 'Min', color: '#40c057'},
        {key: 'ml_dsa_65_sign_p50_ms', label: 'P50 (Median)', color: '#228be6'},
        {key: 'ml_dsa_65_sign_mean_ms', label: 'Mean', color: '#7950f2'},
        {key: 'ml_dsa_65_sign_p95_ms', label: 'P95', color: '#fd7e14'},
        {key: 'ml_dsa_65_sign_p99_ms', label: 'P99', color: '#fa5252'},
        {key: 'ml_dsa_65_sign_p999_ms', label: 'P99.9', color: '#be4bdb'},
        {key: 'ml_dsa_65_sign_p9999_ms', label: 'P99.99', color: '#c92a2a'},
        {key: 'ml_dsa_65_sign_max_ms', label: 'Max', color: '#e64980'}
    ];

    const x0 = d3.scaleBand().domain(mldsaData.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
    const x1 = d3.scaleBand().domain(timingMetrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
    
    const maxVal = d3.max(mldsaData, d => d3.max(timingMetrics, m => d.metrics[m.key] || 0));
    const y = d3.scaleLinear().domain([0, maxVal * 1.2]).rangeRound([height, 0]);

    // Grid
    svg.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    // Axes
    svg.append("g").attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .style("font-size", "13px")
        .style("font-weight", "500");
    
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => d.toFixed(2) + ' ms'));
    
    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#495057")
        .text("Signing Time (ms) - Lower is Better");

    // Grouped bars
    const versionGroups = svg.selectAll(".g").data(mldsaData).enter().append("g")
        .attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

    versionGroups.selectAll("rect").data(d => timingMetrics.map(m => ({
        key: m.key,
        label: m.label,
        color: m.color,
        value: d.metrics[m.key] || 0,
        version: d.config.version
    }))).enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => d.value > 0 ? y(d.value) : y(0))
        .attr("width", x1.bandwidth())
        .attr("height", d => d.value > 0 ? height - y(d.value) : 0)
        .attr("fill", d => d.color)
        .attr("opacity", 0.9)
        .attr("rx", 2)
        .on("mouseover", function(e, d) {
            d3.select(this).attr("opacity", 1).attr("stroke", "#333").attr("stroke-width", 2);
            showTooltip(e, \`<strong>\${d.label}</strong>: \${d.value.toFixed(4)} ms\`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.9).attr("stroke", "none");
            hideTooltip();
        });

    // Legend
    const legend = svg.append("g").attr("transform", \`translate(\${width + 20}, 0)\`);
    timingMetrics.forEach((m, i) => {
        const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
        g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color).attr("rx", 2);
        g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px").style("fill", "#495057");
    });

    // Build stats table
    let statsHtml = \`
        <h3 style="color: #495057; margin-bottom: 15px;">Rejection Sampling Statistics</h3>
        <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 900px;">
            <thead style="background: #f8f9fa;">
                <tr>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Version</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Sign ops/sec</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">CV%</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">P99</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">P99.9</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">P99.99</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Outliers</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Max/Min</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Analysis</th>
                </tr>
            </thead>
            <tbody>
    \`;
    
    mldsaData.forEach((d, idx) => {
        const cv = d.metrics.ml_dsa_65_sign_cv_percent || 0;
        const outlierPct = d.metrics.ml_dsa_65_sign_outlier_percent || 0;
        const minMs = d.metrics.ml_dsa_65_sign_min_ms || 0.001;
        const maxMs = d.metrics.ml_dsa_65_sign_max_ms || 0;
        const p99 = d.metrics.ml_dsa_65_sign_p99_ms || 0;
        const p999 = d.metrics.ml_dsa_65_sign_p999_ms || 0;
        const p9999 = d.metrics.ml_dsa_65_sign_p9999_ms || 0;
        const ratio = minMs > 0 ? (maxMs / minMs).toFixed(1) : 'N/A';
        const signOps = d.metrics.ml_dsa_65_sign_ops_sec || 0;
        
        let analysis = '';
        let analysisColor = '#40c057';
        if (cv > 20 || outlierPct > 10) {
            analysis = '⚠️ High variance';
            analysisColor = '#fa5252';
        } else if (cv > 10 || outlierPct > 5) {
            analysis = '🔶 Moderate';
            analysisColor = '#fd7e14';
        } else {
            analysis = '✓ Stable';
        }
        
        const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
        
        statsHtml += \`
            <tr style="background: \${bgColor};">
                <td style="padding: 10px; border-bottom: 1px solid #e9ecef; font-weight: 600;">\${d.config.version}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e9ecef;">\${signOps.toLocaleString()}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e9ecef; font-weight: 600; color: \${cv > 10 ? '#fa5252' : '#495057'};">\${cv.toFixed(1)}%</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e9ecef;">\${p99.toFixed(3)}ms</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e9ecef; color: \${p999 > p99 * 2 ? '#fa5252' : '#495057'};">\${p999.toFixed(3)}ms</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e9ecef; color: \${p9999 > p99 * 3 ? '#c92a2a' : '#495057'};">\${p9999.toFixed(3)}ms</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e9ecef;">\${outlierPct.toFixed(1)}%</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e9ecef;">\${ratio}x</td>
                <td style="padding: 10px; border-bottom: 1px solid #e9ecef; color: \${analysisColor};">\${analysis}</td>
            </tr>
        \`;
    });
    
    statsHtml += '</tbody></table></div>';
    statsContainer.html(statsHtml);
}

function renderPqcChart() {
    const pqcData = data.filter(d => d.metrics.ml_kem_768_ops_sec > 0);
    const container = d3.select("#pqc-chart");
    container.html("");
    
    if (pqcData.length === 0) {
        container.html(\`
            <div style="padding:60px 40px; text-align:center; background: #fff3bf; border-radius: 8px; border: 2px dashed #fab005;">
                <h3 style="color: #f08c00; margin-top: 0;">No Post-Quantum Data Available</h3>
                <p style="color: #495057; line-height: 1.6;">ML-KEM-768 benchmarks require <strong>OpenSSL 3.5.0 or later</strong>.</p>
                <p style="color: #495057; margin-top: 10px;">Post-quantum cryptography support was added in OpenSSL 3.5.0 (April 2025).</p>
                <p style="margin-top: 20px;"><a href="https://www.openssl.org/source/" style="color: #228be6; text-decoration: none; font-weight: 600;">Download OpenSSL 3.5+ →</a></p>
            </div>
        \`);
        return;
    }

    const containerWidth = container.node().getBoundingClientRect().width || 1000;
    const margin = {top: 40, right: 160, bottom: 60, left: 80};
    const width = containerWidth - margin.left - margin.right;
    const height = 420;

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    // Prepare comparison data
    const comparisonMetrics = [
        {key: 'ml_kem_768_ops_sec', label: 'ML-KEM-768', shortLabel: 'ML-KEM-768', color: '#7950f2', description: 'Post-Quantum (Quantum-Resistant)', icon: ''},
        {key: 'ecdh_p256_per_sec', label: 'ECDH P-256', shortLabel: 'ECDH P-256', color: '#40c057', description: 'Classical (Quantum-Vulnerable)', icon: ''},
        {key: 'ecdh_p384_per_sec', label: 'ECDH P-384', shortLabel: 'ECDH P-384', color: '#fab005', description: 'Classical (Quantum-Vulnerable)', icon: ''}
    ];

    const x0 = d3.scaleBand().domain(pqcData.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
    const x1 = d3.scaleBand().domain(comparisonMetrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
    
    const maxVal = d3.max(pqcData, d => d3.max(comparisonMetrics, m => d.metrics[m.key] || 0));
    const y = d3.scaleLinear().domain([0, maxVal * 1.2]).rangeRound([height, 0]);

    // Title annotation
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#495057")
        .text("Key Exchange Performance: Post-Quantum vs Classical");

    // Grid
    svg.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    // Axes
    svg.append("g").attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .style("font-size", "13px")
        .style("font-weight", "500");
    
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));
    
    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#495057")
        .text("Operations per Second (Higher is Better)");

    // Grouped bars
    const versionGroups = svg.selectAll(".g").data(pqcData).enter().append("g")
        .attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

    versionGroups.selectAll("rect").data(d => comparisonMetrics.map(m => ({
        key: m.key,
        label: m.label,
        color: m.color,
        description: m.description,
        icon: m.icon,
        value: d.metrics[m.key] || 0,
        version: d.config.version
    }))).enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => d.value > 0 ? y(d.value) : y(0))
        .attr("width", x1.bandwidth())
        .attr("height", d => d.value > 0 ? height - y(d.value) : 0)
        .attr("fill", d => d.color)
        .attr("opacity", 0.9)
        .attr("rx", 3)
        .on("mouseover", function(e, d) {
            d3.select(this).attr("opacity", 1).attr("stroke", "#333").attr("stroke-width", 2);
            const tooltip = d.value > 0 
                ? \`<div style="text-align: left;"><strong>\${d.icon} \${d.label}</strong><br><span style="font-size: 1.2em; font-weight: bold; color: \${d.color};">\${d.value.toLocaleString()} ops/sec</span><br><small style="color: #868e96;">\${d.description}</small></div>\`
                : \`<strong>\${d.label}</strong><br><span style="color: #868e96;">No data available</span>\`;
            showTooltip(e, tooltip);
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.9).attr("stroke", "none");
            hideTooltip();
        });

    // Value labels on bars
    versionGroups.selectAll(".value-label").data(d => comparisonMetrics.map(m => ({
        key: m.key,
        value: d.metrics[m.key] || 0,
        version: d.config.version
    }))).enter().append("text")
        .attr("class", "value-label")
        .attr("x", d => x1(d.key) + x1.bandwidth() / 2)
        .attr("y", d => d.value > 0 ? y(d.value) - 8 : y(0))
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .style("fill", "#495057")
        .text(d => d.value > 0 ? (d.value/1000).toFixed(1) + 'K' : '—');

    // Legend with enhanced descriptions
    const legend = svg.append("g").attr("transform", \`translate(\${width + 20}, 20)\`);
    comparisonMetrics.forEach((m, i) => {
        const g = legend.append("g").attr("transform", \`translate(0, \${i * 60})\`);
        
        g.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", m.color)
            .attr("rx", 3);
        
        g.append("text")
            .attr("x", 28)
            .attr("y", 10)
            .text(\`\${m.icon} \${m.shortLabel}\`)
            .style("font-size", "12px")
            .style("font-weight", "700");
        
        g.append("text")
            .attr("x", 28)
            .attr("y", 26)
            .text(m.description)
            .style("font-size", "9px")
            .style("fill", "#868e96");
    });
}

renderPqcChart();
renderMldsaChart();

window.addEventListener('resize', () => {
    renderPqcChart();
    renderMldsaChart();
});
</script>

${generateFooter()}

</body>
</html>`;
}

function createMrazPage(dataJson, iterationCount, lastRunDate = null, versionIterations = null) {
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

${generateHeader('Mráz Optimization Analysis', iterationCount, lastRunDate, versionIterations)}

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

${generateFooter()}

</body>
</html>`;
}

// Memory consumption page
function createMemoryPage(dataJson, iterationCount, lastRunDate = null, versionIterations = null) {
  // dataJson is already a JSON string, don't double-stringify it
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Handshake Memory Consumption</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>${SHARED_STYLES}</style>
</head>
<body>

${generateHeader('Memory Consumption Analysis', iterationCount, lastRunDate, versionIterations)}

<div class="container">
    <div class="card">
        <h2>🧠 Handshake Memory Consumption (RAM)</h2>
        <div class="card-desc">
            Memory consumption (RSS) of OpenSSL s_server during TLS handshakes. This measures the Resident Set Size 
            (physical RAM used) during connection establishment for different OpenSSL versions. Lower is better.
            <br><br>
            <strong>Why This Matters:</strong> Memory consumption differences between 1.1.1w and 3.x versions were raised 
            as a concern. This data shows actual RAM impact during TLS 1.2 and TLS 1.3 handshakes.
        </div>
        <div id="memory-chart" style="height: 500px; width: 100%;"></div>
    </div>
    
    <div class="card">
        <h2>Memory Comparison: TLS 1.3 vs TLS 1.2</h2>
        <div class="card-desc">
            Comparing memory consumption between TLS protocols. Shows how protocol version affects memory footprint.
        </div>
        <div id="memory-protocol-chart" style="height: 400px; width: 100%;"></div>
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

function renderMemoryChart() {
    const container = d3.select("#memory-chart");
    container.html("");
    
    // Check if we have memory data
    const hasMemData = data.some(d => 
        (d.metrics.tls1_3_rsa_new_memory_kb || 0) > 0 ||
        (d.metrics.tls1_2_ecdhe_rsa_memory_kb || 0) > 0
    );
    
    if (!hasMemData) {
        container.html('<div style="padding:60px; text-align:center; color:#999"><h3>Memory Data Not Available</h3><p>Run benchmarks with the updated benchmark script to collect memory metrics.</p></div>');
        return;
    }
    
    const metrics = [
        {key: 'tls1_3_rsa_new_memory_kb', label: 'TLS 1.3 RSA New', color: '#228be6'},
        {key: 'tls1_3_rsa_resume_memory_kb', label: 'TLS 1.3 RSA Resume', color: '#74c0fc'},
        {key: 'tls1_2_ecdhe_rsa_memory_kb', label: 'TLS 1.2 ECDHE-RSA', color: '#fa5252'},
        {key: 'tls1_2_rsa_resume_memory_kb', label: 'TLS 1.2 RSA Resume', color: '#ffa8a8'},
        {key: 'tls1_3_ecdsa_new_memory_kb', label: 'TLS 1.3 ECDSA New', color: '#40c057'},
        {key: 'tls1_2_ecdhe_ecdsa_memory_kb', label: 'TLS 1.2 ECDHE-ECDSA', color: '#fab005'}
    ];
    
    const containerWidth = container.node().getBoundingClientRect().width || 1000;
    const margin = {top: 40, right: 200, bottom: 60, left: 80};
    const width = containerWidth - margin.left - margin.right;
    const height = 450;
    
    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);
    
    const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
    const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
    
    const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);
    
    // Grid
    svg.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));
    
    // Axes
    svg.append("g").attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x0))
        .selectAll("text").style("font-size", "11px");
    
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => (d/1024).toFixed(1) + ' MB'))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -height/2)
        .attr("fill", "#495057")
        .style("text-anchor", "middle")
        .style("font-weight", "600")
        .text("Memory Consumption (MB)");
    
    // Bars
    const versionGroups = svg.selectAll(".version-group")
        .data(data).enter().append("g")
        .attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);
    
    versionGroups.selectAll("rect")
        .data(d => metrics.map(m => ({
            key: m.key,
            label: m.label,
            color: m.color,
            value: d.metrics[m.key] || 0,
            version: d.config.version
        })))
        .enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => Math.max(0, height - y(d.value)))
        .attr("fill", d => d.color)
        .on("mouseover", (event, d) => {
            if (d.value > 0) {
                showTooltip(event, \`
                    <strong>\${d.version}</strong><br/>
                    \${d.label}<br/>
                    <strong>\${(d.value/1024).toFixed(2)} MB</strong>
                \`);
            }
        })
        .on("mouseout", hideTooltip);
    
    // Legend
    const legend = svg.append("g")
        .attr("transform", \`translate(\${width + 20}, 0)\`);
    
    metrics.forEach((m, i) => {
        const lg = legend.append("g")
            .attr("transform", \`translate(0, \${i * 22})\`);
        
        lg.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", m.color);
        
        lg.append("text")
            .attr("x", 20)
            .attr("y", 11)
            .style("font-size", "11px")
            .style("fill", "#495057")
            .text(m.label);
    });
}

function renderMemoryProtocolChart() {
    const container = d3.select("#memory-protocol-chart");
    container.html("");
    
    const hasMemData = data.some(d => 
        (d.metrics.tls1_3_rsa_new_memory_kb || 0) > 0 &&
        (d.metrics.tls1_2_ecdhe_rsa_memory_kb || 0) > 0
    );
    
    if (!hasMemData) {
        container.html('<div style="padding:40px; text-align:center; color:#999"><p>Protocol comparison requires both TLS 1.2 and TLS 1.3 memory data.</p></div>');
        return;
    }
    
    const containerWidth = container.node().getBoundingClientRect().width || 1000;
    const margin = {top: 40, right: 150, bottom: 60, left: 80};
    const width = containerWidth - margin.left - margin.right;
    const height = 350;
    
    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);
    
    const protocolData = data.map(d => ({
        version: d.config.version,
        tls12: (d.metrics.tls1_2_ecdhe_rsa_memory_kb || 0) / 1024,
        tls13: (d.metrics.tls1_3_rsa_new_memory_kb || 0) / 1024,
        diff: ((d.metrics.tls1_3_rsa_new_memory_kb || 0) - (d.metrics.tls1_2_ecdhe_rsa_memory_kb || 0)) / 1024
    })).filter(d => d.tls12 > 0 && d.tls13 > 0);
    
    const x = d3.scaleBand().domain(protocolData.map(d => d.version)).rangeRound([0, width]).padding(0.3);
    const maxVal = d3.max(protocolData, d => Math.max(d.tls12, d.tls13));
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);
    
    // Grid
    svg.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));
    
    // Axes
    svg.append("g").attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x))
        .selectAll("text").style("font-size", "11px");
    
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d.toFixed(1) + ' MB'))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -height/2)
        .attr("fill", "#495057")
        .style("text-anchor", "middle")
        .style("font-weight", "600")
        .text("Memory (MB)");
    
    // TLS 1.2 bars
    svg.selectAll(".bar-tls12")
        .data(protocolData).enter().append("rect")
        .attr("class", "bar-tls12")
        .attr("x", d => x(d.version))
        .attr("y", d => y(d.tls12))
        .attr("width", x.bandwidth() / 2.2)
        .attr("height", d => height - y(d.tls12))
        .attr("fill", "#fa5252")
        .on("mouseover", (event, d) => {
            showTooltip(event, \`<strong>\${d.version}</strong><br/>TLS 1.2: <strong>\${d.tls12.toFixed(2)} MB</strong>\`);
        })
        .on("mouseout", hideTooltip);
    
    // TLS 1.3 bars
    svg.selectAll(".bar-tls13")
        .data(protocolData).enter().append("rect")
        .attr("class", "bar-tls13")
        .attr("x", d => x(d.version) + x.bandwidth() / 2.2 + 2)
        .attr("y", d => y(d.tls13))
        .attr("width", x.bandwidth() / 2.2)
        .attr("height", d => height - y(d.tls13))
        .attr("fill", "#228be6")
        .on("mouseover", (event, d) => {
            showTooltip(event, \`<strong>\${d.version}</strong><br/>TLS 1.3: <strong>\${d.tls13.toFixed(2)} MB</strong>\`);
        })
        .on("mouseout", hideTooltip);
    
    // Legend
    const legend = svg.append("g")
        .attr("transform", \`translate(\${width + 20}, 0)\`);
    
    [['TLS 1.2', '#fa5252'], ['TLS 1.3', '#228be6']].forEach((item, i) => {
        const lg = legend.append("g")
            .attr("transform", \`translate(0, \${i * 22})\`);
        
        lg.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", item[1]);
        
        lg.append("text")
            .attr("x", 20)
            .attr("y", 11)
            .style("font-size", "12px")
            .style("fill", "#495057")
            .text(item[0]);
    });
}

renderMemoryChart();
renderMemoryProtocolChart();

window.addEventListener('resize', () => {
    renderMemoryChart();
    renderMemoryProtocolChart();
});
</script>

${generateFooter()}

</body>
</html>`;
}

function createHwAccelPage(dataJson, iterationCount, lastRunDate = null, versionIterations = null) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hardware Acceleration Impact - OpenSSL Benchmark</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
${SHARED_STYLES}
.info-box { background: #fff9db; border-left: 4px solid #fab005; padding: 15px; margin: 20px 0; border-radius: 4px; }
.info-box h3 { margin-top: 0; color: #5c5f00; font-size: 1rem; }
.info-box p { margin: 8px 0; line-height: 1.6; color: #495057; }
.cpu-info { background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
.cpu-info h3 { margin-top: 0; color: #495057; }
.cpu-info table { width: 100%; border-collapse: collapse; }
.cpu-info td { padding: 8px 12px; border-bottom: 1px solid #e9ecef; }
.cpu-info td:first-child { font-weight: 600; color: #495057; width: 40%; }
.feature-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin: 2px; }
.badge-enabled { background: #d3f9d8; color: #2f9e44; }
.badge-disabled { background: #ffe3e3; color: #c92a2a; }
.comparison-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 15px 0; }
.comparison-card { background: white; border: 2px solid #dee2e6; border-radius: 8px; padding: 15px; text-align: center; }
.comparison-card h4 { margin: 0 0 10px 0; font-size: 0.9rem; color: #495057; }
.comparison-card .value { font-size: 1.5rem; font-weight: bold; color: #228be6; }
.comparison-card .label { font-size: 0.8rem; color: #868e96; }
.improvement { color: #2f9e44; font-weight: bold; }
.no-data { color: #868e96; font-style: italic; }
    </style>
</head>
<body>

${generateHeader('Hardware Acceleration Impact', iterationCount, lastRunDate, versionIterations)}

<div class="container">
    <div class="card">
        <h2>⚡ Hardware Acceleration Impact on Cryptographic Performance</h2>
        
        <div class="info-box">
            <h3>What This Page Shows</h3>
            <p>This benchmark measures the performance difference when hardware acceleration (AVX/AVX2 on x86, NEON/Crypto on ARM) is <strong>enabled vs disabled</strong>.</p>
            <p><strong>Testing Method:</strong> Each algorithm is benchmarked twice - once with hardware acceleration enabled (default), and once with it disabled using OpenSSL's capability masking (\`OPENSSL_ia32cap\` on x86, \`OPENSSL_armcap\` on ARM).</p>
            <p><strong>Why This Matters:</strong> Post-quantum algorithms like ML-KEM heavily rely on SIMD vectorization. Understanding the impact helps with hardware selection and performance planning.</p>
        </div>
        
        <div id="cpu-info-container"></div>
    </div>
    
    <div class="card">
        <h2>Symmetric Cryptography Impact</h2>
        <p style="color: #868e96; margin-bottom: 20px;">AES-256-GCM and SHA256 throughput with and without hardware acceleration</p>
        <div id="symmetric-chart" style="min-height: 400px;"></div>
    </div>
    
    <div class="card">
        <h2>ML-KEM-768 (Post-Quantum) Impact</h2>
        <p style="color: #868e96; margin-bottom: 20px;">Post-quantum key encapsulation performance with and without SIMD acceleration</p>
        <div id="mlkem-chart" style="min-height: 400px;"></div>
        
        <div class="info-box" style="background: #e7f5ff; border-left-color: #228be6;">
            <h3>Why ML-KEM Benefits Most from SIMD</h3>
            <p>ML-KEM (Kyber) is a lattice-based algorithm that involves:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Matrix-vector multiplications</strong> - parallelizable across SIMD lanes</li>
                <li><strong>Number Theoretic Transform (NTT)</strong> - butterfly operations map perfectly to AVX2</li>
                <li><strong>Polynomial arithmetic</strong> - coefficient operations are independent</li>
            </ul>
            <p>This makes ML-KEM an ideal candidate for 50-100%+ performance gains with AVX2/NEON acceleration.</p>
        </div>
    </div>
    
    <div class="card">
        <h2>📈 Improvement Summary</h2>
        <div id="improvement-summary"></div>
    </div>
</div>

<script>
const data = ${dataJson};

// Extract CPU information from first result
const firstResult = data[0] || {};
const metadata = firstResult.metadata || {};
const cpuArch = metadata.cpu_architecture || 'unknown';
const isARM = cpuArch === 'aarch64';
const accelName = isARM ? 'NEON/Crypto' : 'AVX';

// Render CPU info
function renderCpuInfo() {
    const container = d3.select("#cpu-info-container");
    
    const cpuFeatures = metadata.cpu_features || {};
    const features = [];
    
    if (isARM) {
        const flags = metadata.cpu_flags || '';
        if (flags.includes('asimd') || flags.includes('neon')) features.push({name: 'NEON/ASIMD', enabled: true});
        if (flags.includes('aes')) features.push({name: 'AES', enabled: true});
        if (flags.includes('sha')) features.push({name: 'SHA', enabled: true});
        if (flags.includes('sve')) features.push({name: 'SVE', enabled: true});
    } else {
        features.push({name: 'AES-NI', enabled: cpuFeatures.aes_ni || false});
        features.push({name: 'AVX', enabled: cpuFeatures.avx || false});
        features.push({name: 'AVX2', enabled: cpuFeatures.avx2 || false});
        features.push({name: 'AVX-512', enabled: cpuFeatures.avx512 || false});
        features.push({name: 'SHA-NI', enabled: cpuFeatures.sha_ni || false});
    }
    
    const featureBadges = features.map(f => 
        \`<span class="feature-badge \${f.enabled ? 'badge-enabled' : 'badge-disabled'}">\${f.name}: \${f.enabled ? '✓' : '✗'}</span>\`
    ).join('');
    
    container.html(\`
        <div class="cpu-info">
            <h3>🖥️ System Information</h3>
            <table>
                <tr>
                    <td>CPU Model</td>
                    <td>\${metadata.cpu_model || 'Unknown'}</td>
                </tr>
                <tr>
                    <td>Architecture</td>
                    <td>\${cpuArch} (\${isARM ? 'ARM' : 'x86'})</td>
                </tr>
                <tr>
                    <td>CPU Cores</td>
                    <td>\${metadata.cpu_cores || 'N/A'}</td>
                </tr>
                <tr>
                    <td>Hardware Features</td>
                    <td>\${featureBadges || '<span class="no-data">Not detected</span>'}</td>
                </tr>
                <tr>
                    <td>OS</td>
                    <td>\${metadata.os_distribution || 'Unknown'} - \${metadata.kernel_version || ''}</td>
                </tr>
            </table>
        </div>
    \`);
}

// Filter data to versions with hardware accel data
const hwAccelData = data.filter(d => 
    d.metrics.avx_available === true || 
    (d.metrics.aes_256_gcm_with_avx_kbs && d.metrics.aes_256_gcm_with_avx_kbs > 0)
);

function renderSymmetricChart() {
    const container = d3.select("#symmetric-chart");
    container.html("");
    
    if (hwAccelData.length === 0) {
        container.html('<div style="padding: 40px; text-align: center; color: #868e96;">No hardware acceleration comparison data available. Run benchmarks with the AVX impact tests enabled.</div>');
        return;
    }
    
    const width = Math.max(container.node().getBoundingClientRect().width - 60, 400);
    const height = 400;
    const margin = {top: 40, right: 120, bottom: 80, left: 80};
    
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", \`translate(\${margin.left},\${margin.top})\`);
    
    // Prepare data for grouped bar chart
    const metrics = [
        {key: 'aes_with', label: \`AES (\${accelName})\`, color: '#40c057'},
        {key: 'aes_without', label: \`AES (No \${accelName})\`, color: '#868e96'},
        {key: 'sha_with', label: \`SHA256 (\${accelName})\`, color: '#228be6'},
        {key: 'sha_without', label: \`SHA256 (No \${accelName})\`, color: '#adb5bd'}
    ];
    
    const chartData = hwAccelData.map(d => ({
        version: d.config.version,
        aes_with: d.metrics.aes_256_gcm_with_avx_kbs || 0,
        aes_without: d.metrics.aes_256_gcm_without_avx_kbs || 0,
        sha_with: d.metrics.sha256_with_avx_kbs || 0,
        sha_without: d.metrics.sha256_without_avx_kbs || 0
    }));
    
    const x0 = d3.scaleBand()
        .domain(chartData.map(d => d.version))
        .rangeRound([0, width])
        .paddingInner(0.2);
    
    const x1 = d3.scaleBand()
        .domain(metrics.map(m => m.key))
        .rangeRound([0, x0.bandwidth()])
        .padding(0.05);
    
    const maxVal = d3.max(chartData, d => d3.max(metrics, m => d[m.key]));
    const y = d3.scaleLinear()
        .domain([0, maxVal * 1.1])
        .rangeRound([height, 0]);
    
    // Axes
    svg.append("g")
        .attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
    
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d3.format(".2s")(d)));
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -height/2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#495057")
        .text("Throughput (KB/s)");
    
    // Bars
    const versionGroups = svg.selectAll(".version-group")
        .data(chartData)
        .enter()
        .append("g")
        .attr("class", "version-group")
        .attr("transform", d => \`translate(\${x0(d.version)},0)\`);
    
    versionGroups.selectAll("rect")
        .data(d => metrics.map(m => ({key: m.key, value: d[m.key], color: m.color, label: m.label, version: d.version})))
        .enter()
        .append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => d.color)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(\`<strong>\${d.version}</strong><br>\${d.label}<br>\${d3.format(",")(Math.round(d.value))} KB/s\`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(500).style("opacity", 0);
        });
    
    // Legend
    const legend = svg.append("g")
        .attr("transform", \`translate(\${width + 20}, 0)\`);
    
    metrics.forEach((m, i) => {
        const lg = legend.append("g")
            .attr("transform", \`translate(0, \${i * 22})\`);
        lg.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", m.color);
        lg.append("text")
            .attr("x", 20)
            .attr("y", 11)
            .style("font-size", "11px")
            .style("fill", "#495057")
            .text(m.label);
    });
}

function renderMlkemChart() {
    const container = d3.select("#mlkem-chart");
    container.html("");
    
    const mlkemData = hwAccelData.filter(d => 
        d.metrics.ml_kem_768_with_avx_ops > 0 || d.metrics.ml_kem_768_ops_sec > 0
    );
    
    if (mlkemData.length === 0) {
        container.html('<div style="padding: 40px; text-align: center; color: #868e96;">No ML-KEM hardware acceleration data available. This requires OpenSSL 3.5+ with ML-KEM support.</div>');
        return;
    }
    
    const width = Math.max(container.node().getBoundingClientRect().width - 60, 400);
    const height = 350;
    const margin = {top: 40, right: 150, bottom: 80, left: 80};
    
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", \`translate(\${margin.left},\${margin.top})\`);
    
    const chartData = mlkemData.map(d => ({
        version: d.config.version,
        with_hw: d.metrics.ml_kem_768_with_avx_ops || 0,
        without_hw: d.metrics.ml_kem_768_without_avx_ops || 0,
        improvement: d.metrics.ml_kem_768_avx_improvement_percent || 0
    }));
    
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.version))
        .rangeRound([0, width])
        .padding(0.3);
    
    const maxVal = d3.max(chartData, d => Math.max(d.with_hw, d.without_hw));
    const y = d3.scaleLinear()
        .domain([0, maxVal * 1.15])
        .rangeRound([height, 0]);
    
    // Axes
    svg.append("g")
        .attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x));
    
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d3.format(".2s")(d)));
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -height/2)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#495057")
        .text("ML-KEM-768 Operations/sec");
    
    // Grouped bars
    const barWidth = x.bandwidth() / 2.5;
    
    // With hardware acceleration
    svg.selectAll(".bar-with")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar-with")
        .attr("x", d => x(d.version))
        .attr("y", d => y(d.with_hw))
        .attr("width", barWidth)
        .attr("height", d => height - y(d.with_hw))
        .attr("fill", "#7950f2")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(\`<strong>\${d.version}</strong><br>With \${accelName}: \${d3.format(",")(Math.round(d.with_hw))} ops/s<br><span style="color:#2f9e44">+\${d.improvement.toFixed(1)}% improvement</span>\`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(500).style("opacity", 0);
        });
    
    // Without hardware acceleration
    svg.selectAll(".bar-without")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar-without")
        .attr("x", d => x(d.version) + barWidth + 5)
        .attr("y", d => y(d.without_hw))
        .attr("width", barWidth)
        .attr("height", d => height - y(d.without_hw))
        .attr("fill", "#868e96")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(\`<strong>\${d.version}</strong><br>Without \${accelName}: \${d3.format(",")(Math.round(d.without_hw))} ops/s\`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(500).style("opacity", 0);
        });
    
    // Improvement labels
    svg.selectAll(".improvement-label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "improvement-label")
        .attr("x", d => x(d.version) + x.bandwidth() / 2)
        .attr("y", d => y(d.with_hw) - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .style("fill", "#2f9e44")
        .text(d => d.improvement > 0 ? \`+\${d.improvement.toFixed(0)}%\` : '');
    
    // Legend
    const legend = svg.append("g")
        .attr("transform", \`translate(\${width + 20}, 0)\`);
    
    [[\`With \${accelName}\`, '#7950f2'], [\`No \${accelName}\`, '#868e96']].forEach((item, i) => {
        const lg = legend.append("g")
            .attr("transform", \`translate(0, \${i * 22})\`);
        lg.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", item[1]);
        lg.append("text")
            .attr("x", 20)
            .attr("y", 11)
            .style("font-size", "11px")
            .style("fill", "#495057")
            .text(item[0]);
    });
}

function renderImprovementSummary() {
    const container = d3.select("#improvement-summary");
    
    if (hwAccelData.length === 0) {
        container.html('<div class="no-data">No hardware acceleration data available</div>');
        return;
    }
    
    // Calculate average improvements across all versions
    let totalAes = 0, totalSha = 0, totalMlkem = 0;
    let countAes = 0, countSha = 0, countMlkem = 0;
    
    hwAccelData.forEach(d => {
        if (d.metrics.aes_256_gcm_avx_improvement_percent) {
            totalAes += d.metrics.aes_256_gcm_avx_improvement_percent;
            countAes++;
        }
        if (d.metrics.sha256_avx_improvement_percent) {
            totalSha += d.metrics.sha256_avx_improvement_percent;
            countSha++;
        }
        if (d.metrics.ml_kem_768_avx_improvement_percent) {
            totalMlkem += d.metrics.ml_kem_768_avx_improvement_percent;
            countMlkem++;
        }
    });
    
    const avgAes = countAes > 0 ? (totalAes / countAes).toFixed(1) : 'N/A';
    const avgSha = countSha > 0 ? (totalSha / countSha).toFixed(1) : 'N/A';
    const avgMlkem = countMlkem > 0 ? (totalMlkem / countMlkem).toFixed(1) : 'N/A';
    
    container.html(\`
        <div class="comparison-row">
            <div class="comparison-card">
                <h4>AES-256-GCM</h4>
                <div class="value improvement">+\${avgAes}%</div>
                <div class="label">Average \${accelName} improvement</div>
            </div>
            <div class="comparison-card">
                <h4>SHA-256</h4>
                <div class="value improvement">+\${avgSha}%</div>
                <div class="label">Average \${accelName} improvement</div>
            </div>
            <div class="comparison-card">
                <h4>ML-KEM-768</h4>
                <div class="value improvement">+\${avgMlkem}%</div>
                <div class="label">Average \${accelName} improvement</div>
            </div>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #fff9db; border-radius: 8px;">
            <p style="margin: 0; font-size: 0.9rem;">
                <strong>Key Insight:</strong> \${countMlkem > 0 ? 
                    'ML-KEM (post-quantum) shows the largest improvement from hardware acceleration, often 50-100%+. This is because lattice-based cryptography maps extremely well to SIMD instructions.' :
                    'ML-KEM data not available. Run benchmarks with OpenSSL 3.5+ to see post-quantum hardware acceleration impact.'}
            </p>
        </div>
    \`);
}

// Tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Render all
renderCpuInfo();
renderSymmetricChart();
renderMlkemChart();
renderImprovementSummary();

window.addEventListener('resize', () => {
    renderSymmetricChart();
    renderMlkemChart();
});
</script>

${generateFooter()}

</body>
</html>`;
}

main();

