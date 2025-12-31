import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');

// HTML Template with embedded D3
const HTML_TEMPLATE = (dataJson) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenSSL Benchmark: Deep Dive</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f8f9fa; color: #333; }
        
        /* Layout */
        .header { background: white; padding: 20px 40px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; font-size: 1.5rem; }
        .container { max-width: 1400px; margin: 0 auto; padding: 30px; }
        
        /* Tabs */
        .tabs { display: flex; gap: 5px; background: #e9ecef; padding: 5px; border-radius: 8px; width: fit-content; margin-bottom: 30px; }
        .tab { padding: 8px 16px; cursor: pointer; border-radius: 6px; font-weight: 500; font-size: 14px; color: #666; transition: all 0.2s; }
        .tab.active { background: white; color: #228be6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .view-section { display: none; animation: fadeIn 0.3s; }
        .view-section.active { display: block; }
        
        /* Cards */
        .card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); margin-bottom: 30px; }
        .card h2 { margin-top: 0; font-size: 1.2rem; color: #495057; border-bottom: 1px solid #f1f3f5; padding-bottom: 15px; margin-bottom: 20px; }
        .card-desc { font-size: 0.9rem; color: #868e96; margin-bottom: 20px; }

        /* Small Multiples Grid */
        .multiples-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
        .mini-chart { height: 250px; }
        
        /* Tooltip */
        .tooltip { position: absolute; background: rgba(33, 37, 41, 0.95); color: white; padding: 8px 12px; border-radius: 4px; pointer-events: none; opacity: 0; font-size: 12px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        
        /* D3 Styling */
        .grid line { stroke: #f1f3f5; }
        .grid path { stroke: none; }
        .axis text { fill: #868e96; font-size: 11px; }
        .axis path, .axis line { stroke: #dee2e6; }
        .baseline-line { stroke: #333; stroke-dasharray: 4,4; stroke-width: 1.5; opacity: 0.5; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>

<div class="header">
    <h1>OpenSSL Performance Benchmark</h1>
    <div style="font-size: 0.9rem; color: #868e96;">Generated: ${new Date().toISOString().split('T')[0]}</div>
</div>

<div class="container">
    <div class="tabs">
        <div class="tab active" onclick="switchTab('overview')">1. Overview</div>
        <div class="tab" onclick="switchTab('tls')">2. TLS 1.2/1.3</div>
        <div class="tab" onclick="switchTab('bellingrath')">3. Bellingrath</div>
        <div class="tab" onclick="switchTab('schmatz')">4. Schmatz Algos</div>
        <div class="tab" onclick="switchTab('mraz')">5. Mráz Tuning</div>
        <div class="tab" onclick="switchTab('multiples')">6. Small Multiples</div>
        <div class="tab" onclick="switchTab('pqc')">7. PQC</div>
    </div>

    <!-- VIEW 1: OVERVIEW -->
    <div id="overview" class="view-section active">
        <div class="card">
            <h2>The "Bang for Buck" Tradeoff (Zoomed)</h2>
            <div class="card-desc">
                Scatter plot showing <strong>Handshake Speed</strong> (Y) vs <strong>Encryption Throughput</strong> (X). 
                We have zoomed the axes to focus on the differences. <br>
                <span style="color: #228be6">● 1.1.1w</span> is the baseline. Note how 3.x moves ↘️ (Slower Handshake, Faster Throughput).
            </div>
            <div id="scatter-chart" style="height: 500px; width: 100%;"></div>
        </div>
    </div>

    <!-- VIEW 2: TLS COMPARISON -->
    <div id="tls" class="view-section">
        <div class="card">
            <h2>Protocol Battle: TLS 1.2 vs 1.3</h2>
            <div class="card-desc">Comparison of connection setup capacity (connections/sec) for legacy vs modern protocols.</div>
            <div id="tls-chart" style="height: 500px; width: 100%;"></div>
        </div>
    </div>

    <!-- VIEW 3: BELLINGRATH MATRIX -->
    <div id="bellingrath" class="view-section">
        <div class="card">
            <h2>Bellingrath Test Matrix: RSA vs ECDSA Certificates</h2>
            <div class="card-desc">
                Aligned with <a href="https://www.youtube.com/watch?v=b01y5FDx-ao" target="_blank">W. Bellingrath's OpenSSL 3.x presentation</a> (Juniper Networks). 
                Shows handshake performance for both RSA-2048 and ECDSA P-256 certificates.
            </div>
            <div id="rsa-vs-ecdsa-chart" style="height: 450px; width: 100%;"></div>
        </div>
        <div class="card">
            <h2>Session Resumption Performance</h2>
            <div class="card-desc">
                New connections require full cryptographic handshake. Resumed connections reuse session keys (3-10x faster). This was part of Bellingrath's test matrix.
            </div>
            <div id="resume-chart" style="height: 400px; width: 100%;"></div>
        </div>
    </div>

    <!-- VIEW 4: SCHMATZ ALGORITHM BENCHMARKS -->
    <div id="schmatz" class="view-section">
        <div class="card">
            <h2>RSA Key Size Impact: Sign vs Verify</h2>
            <div class="card-desc">
                Based on <a href="https://www.youtube.com/watch?v=69gUVhOEaVM" target="_blank">Martin Schmatz's (IBM) methodology</a>. 
                RSA signing is slow (private key), verification is fast (public key). Larger keys = slower operations.
            </div>
            <div id="rsa-chart" style="height: 400px; width: 100%;"></div>
        </div>
        <div class="card">
            <h2>ECDSA Curve Comparison</h2>
            <div class="card-desc">
                P-256 is fastest and most common. P-384/P-521 offer more security at significant performance cost.
            </div>
            <div id="ecdsa-chart" style="height: 400px; width: 100%;"></div>
        </div>
        <div class="card">
            <h2>Block Size Sensitivity: AES-256-GCM</h2>
            <div class="card-desc">
                Small blocks (16-64 bytes) stress initialization overhead. Large blocks (8KB+) show maximum throughput. 
                The gap between small and large block performance reveals Provider architecture overhead.
            </div>
            <div id="blocksize-chart" style="height: 350px; width: 100%;"></div>
        </div>
    </div>

    <!-- VIEW 5: MRÁZ OPTIMIZATIONS -->
    <div id="mraz" class="view-section">
        <div class="card">
            <h2>Mráz Optimization Impact: Default vs Tuned Configuration</h2>
            <div class="card-desc">
                Based on <a href="https://www.youtube.com/watch?v=Cv-43gJJFIs" target="_blank">Tomáš Mráz's OpenSSL 3.x Performance Tuning</a> talk. 
                Shows handshake performance with default config vs. optimized config (minimal provider loading, explicit properties).
                <br><strong>Note:</strong> Only applies to OpenSSL 3.x versions.
            </div>
            <div id="mraz-chart" style="height: 450px; width: 100%;"></div>
        </div>
        <div class="card">
            <h2>Recovery Potential: How Much Can Tuning Help?</h2>
            <div class="card-desc">
                Shows the percentage improvement from applying Mráz's recommendations. Green bars = positive improvement.
            </div>
            <div id="mraz-improvement-chart" style="height: 350px; width: 100%;"></div>
        </div>
    </div>

    <!-- VIEW 5: SMALL MULTIPLES -->
    <div id="multiples" class="view-section">
        <div class="multiples-grid">
            <div class="card">
                <h2>AES-256-GCM (Throughput)</h2>
                <div id="sm-aes" class="mini-chart"></div>
            </div>
            <div class="card">
                <h2>SHA256 (Hashing)</h2>
                <div id="sm-sha" class="mini-chart"></div>
            </div>
            <div class="card">
                <h2>TLS 1.3 Handshake (New)</h2>
                <div id="sm-hs-new" class="mini-chart"></div>
            </div>
            <div class="card">
                <h2>TLS 1.2 Handshake (Legacy)</h2>
                <div id="sm-hs-12" class="mini-chart"></div>
            </div>
        </div>
    </div>

    <!-- VIEW 6: PQC -->
    <div id="pqc" class="view-section">
        <div class="card">
            <h2>Post-Quantum Readiness</h2>
            <div class="card-desc">Performance of ML-KEM-768 operations. Only available in OpenSSL 3.5+.</div>
            <div id="pqc-chart" style="height: 400px; width: 100%;"></div>
        </div>
    </div>
</div>

<script>
    const data = ${dataJson};
    
    // Sort data: 1.1.1 first, then numeric sort
    data.sort((a, b) => a.config.version.localeCompare(b.config.version, undefined, { numeric: true }));
    const baseline = data.find(d => d.config.version === '1.1.1w') || data[0];

    // Colors
    const colorScale = d3.scaleOrdinal()
        .domain(['1.1.1', '3.0', '3.1', '3.2', '3.3', '3.4', '3.5'])
        .range(['#228be6', '#fa5252', '#fd7e14', '#fab005', '#40c057', '#15aabf', '#7950f2']);
    
    const getSeries = (ver) => {
        if (ver.startsWith('1.1.1')) return '1.1.1';
        return ver.split('.').slice(0, 2).join('.');
    };

    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    // --- CHART 1: SCATTER (Zoomed) ---
    function renderScatter() {
        const container = d3.select("#scatter-chart");
        const width = container.node().getBoundingClientRect().width - 80;
        const height = 460;
        const margin = {top: 20, right: 100, bottom: 50, left: 60};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const xVal = d => d.metrics.aes_256_gcm_8k_kbs;
        // Use new metric name if available, fall back to legacy
        const yVal = d => d.metrics.tls1_3_rsa_new_cps || d.metrics.handshakes_new_per_sec;

        // Dynamic Domain (Zoomed)
        // We find the min/max and add 5% padding so dots aren't on the edge
        const xExtent = d3.extent(data, xVal);
        const yExtent = d3.extent(data, yVal);
        const xPad = (xExtent[1] - xExtent[0]) * 0.1;
        const yPad = (yExtent[1] - yExtent[0]) * 0.1;

        const x = d3.scaleLinear()
            .domain([xExtent[0] - xPad, xExtent[1] + xPad])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([yExtent[0] - yPad, yExtent[1] + yPad])
            .range([height, 0]);

        // Grid
        svg.append("g").attr("class", "grid").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x).tickSize(-height).tickFormat(""));
        svg.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

        // Axes
        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x).tickFormat(d => (d/1024/1024).toFixed(1) + ' GB/s'));
        svg.append("g").call(d3.axisLeft(y));

        // Axis Labels
        svg.append("text").attr("x", width/2).attr("y", height + 40).style("text-anchor", "middle").text("AES-256-GCM Throughput (Higher is Better →)");
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("Handshakes/sec (Higher is Better ↑)");

        // Quadrant Line (Baseline)
        svg.append("line").attr("x1", x(xVal(baseline))).attr("x2", x(xVal(baseline)))
            .attr("y1", 0).attr("y2", height).attr("class", "baseline-line");
        svg.append("line").attr("x1", 0).attr("x2", width)
            .attr("y1", y(yVal(baseline))).attr("y2", y(yVal(baseline))).attr("class", "baseline-line");

        // Dots
        svg.selectAll("circle").data(data).enter().append("circle")
            .attr("cx", d => x(xVal(d))).attr("cy", d => y(yVal(d)))
            .attr("r", 10)
            .style("fill", d => colorScale(getSeries(d.config.version)))
            .style("stroke", "white").style("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", (e, d) => showTooltip(e, \`<strong>\${d.config.version}</strong><br>TP: \${(xVal(d)/1024/1024).toFixed(2)} GB/s<br>HS: \${yVal(d).toLocaleString()}\`))
            .on("mouseout", hideTooltip);

        // Labels
        svg.selectAll(".lbl").data(data).enter().append("text")
            .attr("x", d => x(xVal(d)) + 14).attr("y", d => y(yVal(d)) + 4)
            .text(d => d.config.version).style("font-size", "11px").style("font-weight", "bold").style("fill", "#495057");
    }

    // --- CHART 2: TLS 1.2 vs 1.3 (Grouped Bar) ---
    function renderTlsChart() {
        const container = d3.select("#tls-chart");
        const width = container.node().getBoundingClientRect().width - 60;
        const height = 450;
        const margin = {top: 20, right: 20, bottom: 40, left: 50};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
        const x1 = d3.scaleBand().domain(['TLS 1.2', 'TLS 1.3']).rangeRound([0, x0.bandwidth()]).padding(0.05);
        
        // Use new metric names if available, fall back to legacy
        const getTls12 = d => d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps || d.metrics.handshakes_new_tls1_2_per_sec || 0;
        const getTls13 = d => d.metrics.tls1_3_rsa_new_cps || d.metrics.handshakes_new_per_sec || 0;
        
        // Find max of both metrics
        const maxVal = d3.max(data, d => Math.max(getTls13(d), getTls12(d)));
        const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

        const color = d3.scaleOrdinal().domain(['TLS 1.2', 'TLS 1.3']).range(['#adb5bd', '#228be6']);

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
        svg.append("g").call(d3.axisLeft(y));
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -40).style("text-anchor", "middle").text("Connections/sec");

        const versionGroups = svg.selectAll(".g").data(data).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => [
                {key: 'TLS 1.2', value: getTls12(d)},
                {key: 'TLS 1.3', value: getTls13(d)}
            ])
            .enter().append("rect")
            .attr("x", d => x1(d.key)).attr("y", d => y(d.value))
            .attr("width", x1.bandwidth()).attr("height", d => height - y(d.value))
            .attr("fill", d => color(d.key))
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.key}: \${d.value.toLocaleString()}\`))
            .on("mouseout", hideTooltip);

        // Legend
        const legend = svg.append("g").attr("transform", \`translate(\${width - 150}, 0)\`);
        ['TLS 1.2', 'TLS 1.3'].forEach((key, i) => {
            const g = legend.append("g").attr("transform", \`translate(0, \${i * 20})\`);
            g.append("rect").attr("width", 15).attr("height", 15).attr("fill", color(key));
            g.append("text").attr("x", 20).attr("y", 12).text(key).style("font-size", "12px");
        });
    }

    // --- CHART 3: BELLINGRATH RSA vs ECDSA ---
    function renderBellingrathRsaEcdsa() {
        const container = d3.select("#rsa-vs-ecdsa-chart");
        const width = container.node().getBoundingClientRect().width - 60;
        const height = 420;
        const margin = {top: 20, right: 120, bottom: 40, left: 60};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const metrics = [
            {key: 'tls1_3_rsa_new_cps', label: 'TLS 1.3 RSA', color: '#228be6'},
            {key: 'tls1_3_ecdsa_new_cps', label: 'TLS 1.3 ECDSA', color: '#15aabf'},
            {key: 'tls1_2_ecdhe_rsa_aes128gcm_cps', label: 'TLS 1.2 ECDHE-RSA', color: '#fa5252'},
            {key: 'tls1_2_ecdhe_ecdsa_aes128gcm_cps', label: 'TLS 1.2 ECDHE-ECDSA', color: '#fd7e14'}
        ];

        const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
        const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
        
        const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
        const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
        svg.append("g").call(d3.axisLeft(y));
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("Connections/sec");

        const versionGroups = svg.selectAll(".g").data(data).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})))
            .enter().append("rect")
            .attr("x", d => x1(d.key)).attr("y", d => y(d.value))
            .attr("width", x1.bandwidth()).attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()}\`))
            .on("mouseout", hideTooltip);

        // Legend
        const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
        metrics.forEach((m, i) => {
            const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
            g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
            g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
        });
    }

    function renderBellingrathResume() {
        const container = d3.select("#resume-chart");
        const width = container.node().getBoundingClientRect().width - 60;
        const height = 360;
        const margin = {top: 20, right: 120, bottom: 40, left: 60};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const metrics = [
            {key: 'tls1_3_rsa_new_cps', label: 'TLS 1.3 New', color: '#228be6'},
            {key: 'tls1_3_rsa_resume_cps', label: 'TLS 1.3 Resume', color: '#74c0fc'},
            {key: 'tls1_2_ecdhe_rsa_aes128gcm_cps', label: 'TLS 1.2 New', color: '#fa5252'},
            {key: 'tls1_2_rsa_resume_cps', label: 'TLS 1.2 Resume', color: '#ffa8a8'}
        ];

        const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
        const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
        
        const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
        const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
        svg.append("g").call(d3.axisLeft(y));
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("Connections/sec");

        const versionGroups = svg.selectAll(".g").data(data).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})))
            .enter().append("rect")
            .attr("x", d => x1(d.key)).attr("y", d => y(d.value))
            .attr("width", x1.bandwidth()).attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()}\`))
            .on("mouseout", hideTooltip);

        // Legend
        const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
        metrics.forEach((m, i) => {
            const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
            g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
            g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
        });
    }

    // --- CHART 4: SCHMATZ RSA COMPARISON ---
    function renderRsaChart() {
        const container = d3.select("#rsa-chart");
        const width = container.node().getBoundingClientRect().width - 60;
        const height = 360;
        const margin = {top: 20, right: 150, bottom: 40, left: 60};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const metrics = [
            {key: 'rsa_2048_sign_per_sec', label: 'RSA-2048 Sign', color: '#228be6'},
            {key: 'rsa_2048_verify_per_sec', label: 'RSA-2048 Verify', color: '#74c0fc'},
            {key: 'rsa_4096_sign_per_sec', label: 'RSA-4096 Sign', color: '#fa5252'},
            {key: 'rsa_4096_verify_per_sec', label: 'RSA-4096 Verify', color: '#ffa8a8'}
        ];

        const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
        const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
        
        const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
        const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
        svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("Operations/sec");

        const versionGroups = svg.selectAll(".g").data(data).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})))
            .enter().append("rect")
            .attr("x", d => x1(d.key)).attr("y", d => y(d.value))
            .attr("width", x1.bandwidth()).attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()}\`))
            .on("mouseout", hideTooltip);

        // Legend
        const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
        metrics.forEach((m, i) => {
            const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
            g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
            g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
        });
    }

    function renderEcdsaChart() {
        const container = d3.select("#ecdsa-chart");
        const width = container.node().getBoundingClientRect().width - 60;
        const height = 360;
        const margin = {top: 20, right: 140, bottom: 40, left: 60};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const metrics = [
            {key: 'ecdsa_p256_sign_per_sec', label: 'P-256 Sign', color: '#40c057'},
            {key: 'ecdsa_p256_verify_per_sec', label: 'P-256 Verify', color: '#8ce99a'},
            {key: 'ecdsa_p384_sign_per_sec', label: 'P-384 Sign', color: '#fab005'},
            {key: 'ecdsa_p384_verify_per_sec', label: 'P-384 Verify', color: '#ffe066'},
            {key: 'ecdsa_p521_sign_per_sec', label: 'P-521 Sign', color: '#7950f2'},
            {key: 'ecdsa_p521_verify_per_sec', label: 'P-521 Verify', color: '#b197fc'}
        ];

        const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
        const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.02);
        
        const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
        const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
        svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("Operations/sec");

        const versionGroups = svg.selectAll(".g").data(data).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})))
            .enter().append("rect")
            .attr("x", d => x1(d.key)).attr("y", d => y(d.value))
            .attr("width", x1.bandwidth()).attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()}\`))
            .on("mouseout", hideTooltip);

        // Legend
        const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
        metrics.forEach((m, i) => {
            const g = legend.append("g").attr("transform", \`translate(0, \${i * 20})\`);
            g.append("rect").attr("width", 12).attr("height", 12).attr("fill", m.color);
            g.append("text").attr("x", 16).attr("y", 10).text(m.label).style("font-size", "10px");
        });
    }

    function renderBlockSizeChart() {
        const container = d3.select("#blocksize-chart");
        const width = container.node().getBoundingClientRect().width - 60;
        const height = 320;
        const margin = {top: 20, right: 120, bottom: 40, left: 70};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        // Line chart showing block size sensitivity per version
        const blockSizes = ['16b', '64b', '256b', '1k', '8k'];
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
        svg.append("text").attr("x", width/2).attr("y", height + 35).style("text-anchor", "middle").text("Block Size");

        const line = d3.line()
            .x((d, i) => x(blockLabels[i]))
            .y(d => y(d));

        data.forEach(version => {
            const blockData = getBlockData(version);
            const color = colorScale(getSeries(version.config.version));
            
            svg.append("path")
                .datum(blockData)
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 2)
                .attr("d", line);

            // Add dots
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

    // --- CHART 5: MRÁZ OPTIMIZATION COMPARISON ---
    function renderMrazChart() {
        const container = d3.select("#mraz-chart");
        
        // Filter to only 3.x versions with optimized data
        const mrazData = data.filter(d => d.metrics.optimized_tls1_3_rsa_new_cps > 0);
        
        if (mrazData.length === 0) {
            container.html("<div style='padding:40px; text-align:center; color:#999'>No optimization data available. Run benchmark with OpenSSL 3.x to see results.</div>");
            return;
        }

        const width = container.node().getBoundingClientRect().width - 60;
        const height = 420;
        const margin = {top: 20, right: 120, bottom: 40, left: 60};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const metrics = [
            {key: 'tls1_3_rsa_new_cps', label: 'TLS 1.3 Default', color: '#adb5bd'},
            {key: 'optimized_tls1_3_rsa_new_cps', label: 'TLS 1.3 Optimized', color: '#40c057'},
            {key: 'tls1_2_ecdhe_rsa_aes128gcm_cps', label: 'TLS 1.2 Default', color: '#868e96'},
            {key: 'optimized_tls1_2_ecdhe_rsa_cps', label: 'TLS 1.2 Optimized', color: '#51cf66'}
        ];

        const x0 = d3.scaleBand().domain(mrazData.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
        const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
        
        const maxVal = d3.max(mrazData, d => d3.max(metrics, m => d.metrics[m.key] || 0));
        const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
        svg.append("g").call(d3.axisLeft(y));
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("Connections/sec");

        const versionGroups = svg.selectAll(".g").data(mrazData).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})))
            .enter().append("rect")
            .attr("x", d => x1(d.key)).attr("y", d => y(d.value))
            .attr("width", x1.bandwidth()).attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()}\`))
            .on("mouseout", hideTooltip);

        // Legend
        const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
        metrics.forEach((m, i) => {
            const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
            g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
            g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
        });
    }

    function renderMrazImprovement() {
        const container = d3.select("#mraz-improvement-chart");
        
        // Filter to only 3.x versions with optimized data
        const mrazData = data.filter(d => d.metrics.optimized_tls1_3_rsa_new_cps > 0);
        
        if (mrazData.length === 0) {
            container.html("<div style='padding:40px; text-align:center; color:#999'>No optimization data available.</div>");
            return;
        }

        const width = container.node().getBoundingClientRect().width - 60;
        const height = 320;
        const margin = {top: 20, right: 20, bottom: 40, left: 60};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        // Calculate improvement percentages
        const improvementData = mrazData.map(d => {
            const defaultVal = d.metrics.tls1_3_rsa_new_cps || 1;
            const optimizedVal = d.metrics.optimized_tls1_3_rsa_new_cps || 0;
            return {
                version: d.config.version,
                improvement: ((optimizedVal - defaultVal) / defaultVal) * 100
            };
        });

        const x = d3.scaleBand().domain(improvementData.map(d => d.version)).range([0, width]).padding(0.3);
        
        const yDomain = d3.extent(improvementData, d => d.improvement);
        const absMax = Math.max(Math.abs(yDomain[0] || 0), Math.abs(yDomain[1] || 0), 10);
        const y = d3.scaleLinear().domain([-absMax, absMax]).range([height, 0]);

        // Zero line
        svg.append("line")
            .attr("x1", 0).attr("x2", width)
            .attr("y1", y(0)).attr("y2", y(0))
            .attr("stroke", "#333").attr("stroke-dasharray", "4,4");

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x));
        svg.append("g").call(d3.axisLeft(y).tickFormat(d => d + "%"));
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("% Improvement vs Default");

        svg.selectAll("rect").data(improvementData).enter().append("rect")
            .attr("x", d => x(d.version))
            .attr("y", d => d.improvement >= 0 ? y(d.improvement) : y(0))
            .attr("height", d => Math.abs(y(d.improvement) - y(0)))
            .attr("width", x.bandwidth())
            .attr("fill", d => d.improvement >= 0 ? "#40c057" : "#fa5252")
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.version}: \${d.improvement.toFixed(1)}%\`))
            .on("mouseout", hideTooltip);

        // Value labels
        svg.selectAll(".lbl").data(improvementData).enter().append("text")
            .attr("x", d => x(d.version) + x.bandwidth()/2)
            .attr("y", d => d.improvement >= 0 ? y(d.improvement) - 5 : y(d.improvement) + 15)
            .text(d => (d.improvement >= 0 ? "+" : "") + d.improvement.toFixed(1) + "%")
            .style("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold");
    }

    // --- CHART 5: SMALL MULTIPLES (Normalized) ---
    function renderSmallMultiple(divId, metricKey) {
        const container = d3.select(divId);
        const width = container.node().getBoundingClientRect().width - 50;
        const height = 220;
        const margin = {top: 20, right: 10, bottom: 30, left: 40};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const getPct = (d) => {
            if (!d.metrics[metricKey]) return 0;
            const base = baseline.metrics[metricKey];
            return ((d.metrics[metricKey] - base) / base) * 100;
        };

        const x = d3.scaleBand().domain(data.map(d => d.config.version)).range([0, width]).padding(0.2);
        
        const yDomain = d3.extent(data, getPct);
        const absMax = Math.max(Math.abs(yDomain[0]), Math.abs(yDomain[1]), 10);
        const y = d3.scaleLinear().domain([-absMax, absMax]).range([height, 0]);

        svg.append("g").attr("transform", \`translate(0,\${y(0)})\`).call(d3.axisBottom(x).tickSize(0)).selectAll("text").attr("y", 10);
        svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"));

        svg.selectAll("rect").data(data).enter().append("rect")
            .attr("x", d => x(d.config.version))
            .attr("y", d => {
                const val = getPct(d);
                return val < 0 ? y(0) : y(val);
            })
            .attr("height", d => Math.abs(y(getPct(d)) - y(0)))
            .attr("width", x.bandwidth())
            .attr("fill", d => getPct(d) >= 0 ? "#40c057" : "#fa5252")
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.config.version}: \${getPct(d).toFixed(1)}%\`))
            .on("mouseout", hideTooltip);
    }

    function renderMultiples() {
        renderSmallMultiple("#sm-aes", "aes_256_gcm_8k_kbs");
        renderSmallMultiple("#sm-sha", "sha256_8k_kbs");
        // Use new metric name if available, fall back to legacy
        const hsMetric = data[0]?.metrics.tls1_3_rsa_new_cps ? "tls1_3_rsa_new_cps" : "handshakes_new_per_sec";
        const hs12Metric = data[0]?.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps ? "tls1_2_ecdhe_rsa_aes128gcm_cps" : "handshakes_new_tls1_2_per_sec";
        renderSmallMultiple("#sm-hs-new", hsMetric);
        renderSmallMultiple("#sm-hs-12", hs12Metric);
    }

    // --- CHART 4: PQC ---
    function renderPqc() {
        const pqcData = data.filter(d => d.metrics.ml_kem_768_ops_sec > 0);
        const container = d3.select("#pqc-chart");
        
        if (pqcData.length === 0) {
            container.html("<div style='padding:40px; text-align:center; color:#999'>No Post-Quantum Data Available (requires OpenSSL 3.5+)</div>");
            return;
        }

        const width = container.node().getBoundingClientRect().width - 60;
        const height = 350;
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
            
        // Label
        svg.selectAll(".lbl").data(pqcData).enter().append("text")
            .attr("x", d => x(d.config.version) + x.bandwidth()/2)
            .attr("y", d => y(d.metrics.ml_kem_768_ops_sec) - 5)
            .text(d => d.metrics.ml_kem_768_ops_sec.toLocaleString())
            .style("text-anchor", "middle")
            .style("font-size", "12px");
    }

    // --- UTILS ---
    function showTooltip(event, html) {
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(html)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    }
    
    function hideTooltip() {
        tooltip.transition().duration(500).style("opacity", 0);
    }

    // Tab Switcher
    window.switchTab = function(tabId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
        
        document.getElementById(tabId).classList.add('active');
        document.querySelector(\`[onclick="switchTab('\${tabId}')"]\`).classList.add('active');
    };

    // Init Charts
    renderScatter();
    renderTlsChart();
    renderBellingrathRsaEcdsa();
    renderBellingrathResume();
    renderRsaChart();
    renderEcdsaChart();
    renderBlockSizeChart();
    renderMrazChart();
    renderMrazImprovement();
    renderMultiples();
    renderPqc();

</script>
</body>
</html>`;

async function main() {
  const summaryPath = path.join(RESULTS_DIR, 'summary.json');
  const outputPath = path.join(RESULTS_DIR, 'visualizations.html');

  try {
    const rawData = await fs.readFile(summaryPath, 'utf8');
    const finalHtml = HTML_TEMPLATE(rawData);
    await fs.writeFile(outputPath, finalHtml);
    console.log(`📊 Visualization dashboard generated at: ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to generate visual report:', error.message);
  }
}

main();
