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
        .mini-chart { height: 320px; }  /* Increased to accommodate taller charts */
        
        /* Tooltip */
        .tooltip { position: absolute; background: rgba(33, 37, 41, 0.95); color: white; padding: 8px 12px; border-radius: 4px; pointer-events: none; opacity: 0; font-size: 12px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        
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
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>

<div class="header">
    <h1>OpenSSL Performance Benchmark</h1>
    <div style="font-size: 0.9rem; color: #868e96;">
        Generated: ${new Date().toISOString().split('T')[0]}
        <span id="iterations-note" style="margin-left: 20px;"></span>
    </div>
</div>

<script type="text/javascript">
    // This will be populated after data is loaded
    const dataForHeader = ${dataJson};
    const iterCount = dataForHeader[0]?.config?.iterations_count || 1;
    if (iterCount > 1) {
        document.getElementById('iterations-note').innerHTML = 
            '<strong style="color: #40c057;">● ' + iterCount + ' iterations per version</strong> (mean ± stddev shown)';
    }
</script>

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
            <div class="card-desc">
                Interactive slope chart comparing connection setup capacity (connections/sec) between legacy and modern protocols. 
                Each line represents an OpenSSL version, connecting its TLS 1.2 performance (left) to TLS 1.3 performance (right).
                <strong>Upward slopes</strong> indicate TLS 1.3 is faster, while <strong>downward slopes</strong> show TLS 1.2 leading. 
                The percentage change is shown on the right side.
            </div>
            <div id="tls-chart" style="height: 580px; width: 100%;"></div>
        </div>
    </div>

    <!-- VIEW 3: BELLINGRATH MATRIX -->
    <div id="bellingrath" class="view-section">
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; padding-bottom: 10px;">Bellingrath Test Matrix: RSA vs ECDSA Certificates</h2>
                    <div class="card-desc" style="margin-bottom: 0;">
                        Aligned with <a href="https://www.youtube.com/watch?v=b01y5FDx-ao" target="_blank">W. Bellingrath's OpenSSL 3.x presentation</a> (Juniper Networks). 
                        Shows handshake performance for both RSA-2048 and ECDSA P-256 certificates.
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="btn-absolute" class="view-toggle active" onclick="toggleBellingrathView('absolute')">Absolute</button>
                    <button id="btn-relative" class="view-toggle" onclick="toggleBellingrathView('relative')">% vs 1.1.1w</button>
                </div>
            </div>
            <div id="rsa-vs-ecdsa-chart" style="height: 450px; width: 100%;"></div>
        </div>
        <div class="card">
            <h2>Session Resumption Performance</h2>
            <div class="card-desc">
                <p><strong>New connections</strong> require a full cryptographic handshake with all asymmetric operations (key exchange, certificate verification, signing). <strong>Resumed connections</strong> reuse cached session parameters, achieving significantly faster connection setup. This test was part of Bellingrath's test matrix.</p>
                
                <p><strong>Key Observations:</strong> Session resumption is consistently faster than new connections, but the speedup varies by OpenSSL version. The chart shows the actual measured performance for TLS 1.3 connections (the default in modern OpenSSL). Note that TLS 1.2 session resumption typically achieves even higher throughput (30-40K+ connections/sec) than TLS 1.3 (6-7K connections/sec shown here) because TLS 1.2's resumption completely bypasses asymmetric cryptography, while TLS 1.3's PSK-based resumption still performs HKDF key derivation and potentially ephemeral Diffie-Hellman operations for enhanced forward secrecy.</p>
                
                <p><strong>Performance Impact of OpenSSL 3.x:</strong> The Provider architecture introduced in OpenSSL 3.0 adds per-operation overhead that affects handshake performance more than bulk encryption. This explains why even resumed connections show some regression compared to 1.1.1w, though the relative benefit of resumption over new connections remains significant.</p>
            </div>
            <div id="resume-chart" style="height: 450px; width: 100%;"></div>
        </div>
    </div>

    <!-- VIEW 4: SCHMATZ ALGORITHM BENCHMARKS -->
    <div id="schmatz" class="view-section">
        <div class="card">
            <h2>RSA Sign Performance (Server-Side)</h2>
            <div class="card-desc">
                Based on <a href="https://www.youtube.com/watch?v=69gUVhOEaVM" target="_blank">Martin Schmatz's (IBM) methodology</a>. 
                RSA signing uses the <strong>private key</strong> and is computationally expensive. Larger keys = significantly slower operations.
            </div>
            <div id="rsa-sign-chart" style="height: 400px; width: 100%;"></div>
        </div>
        <div class="card">
            <h2>RSA Verify Performance (Client-Side)</h2>
            <div class="card-desc">
                RSA verification uses the <strong>public key</strong> and is much faster than signing. 
                Note the different scale: verification can be 10-50x faster than signing operations.
            </div>
            <div id="rsa-verify-chart" style="height: 400px; width: 100%;"></div>
        </div>
        <div class="card">
            <h2>ECDSA Sign Performance (Server-Side)</h2>
            <div class="card-desc">
                ECDSA signing with different curve sizes. P-256 is fastest and most common. P-384/P-521 offer more security at significant performance cost.
            </div>
            <div id="ecdsa-sign-chart" style="height: 400px; width: 100%;"></div>
        </div>
        <div class="card">
            <h2>ECDSA Verify Performance (Client-Side)</h2>
            <div class="card-desc">
                ECDSA verification is generally faster than signing, with P-256 offering the best performance.
            </div>
            <div id="ecdsa-verify-chart" style="height: 400px; width: 100%;"></div>
        </div>
        <div class="card">
            <h2>Block Size Sensitivity: AES-256-GCM</h2>
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
            <div id="blocksize-chart" style="height: 350px; width: 100%;"></div>
            
            <div style="margin-top: 30px;">
                <h3 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 8px;">Performance Data (KB/s)</h3>
                <div id="blocksize-table" style="overflow-x: auto; margin-top: 15px;">
                    <!-- Table will be generated by JavaScript -->
                </div>
            </div>
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

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #228be6;">
                <h3 style="margin-top: 0; color: #495057; font-size: 1.1rem;">📋 Optimization Configuration Details</h3>
                
                <p style="margin-bottom: 15px; color: #495057;">
                    The <strong>"Optimized"</strong> configuration applies the following tuning parameters to minimize Provider overhead in OpenSSL 3.x:
                </p>

                <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <h4 style="margin-top: 0; color: #228be6; font-size: 1rem;">1. Minimal Provider Loading</h4>
                    <ul style="margin: 10px 0; padding-left: 25px; color: #495057;">
                        <li><strong>Only default provider loaded</strong> – FIPS provider disabled, legacy provider disabled</li>
                        <li>Reduces initialization overhead and memory footprint</li>
                        <li>Configuration: <code>providers = default_sect</code> in <code>openssl.cnf</code></li>
                    </ul>
                </div>

                <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <h4 style="margin-top: 0; color: #228be6; font-size: 1rem;">2. Explicit Algorithm Properties</h4>
                    <ul style="margin: 10px 0; padding-left: 25px; color: #495057;">
                        <li><strong>Property queries eliminated</strong> – Algorithms explicitly specify <code>provider=default</code></li>
                        <li>Avoids expensive property string parsing and provider searches</li>
                        <li>Configuration: <code>default_properties = provider=default</code></li>
                    </ul>
                </div>

                <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <h4 style="margin-top: 0; color: #228be6; font-size: 1rem;">3. Runtime Optimizations</h4>
                    <ul style="margin: 10px 0; padding-left: 25px; color: #495057;">
                        <li><strong>Client renegotiation disabled</strong> – Security + performance benefit</li>
                        <li><strong>Direct entropy source</strong> – Uses <code>/dev/urandom</code> without overhead</li>
                        <li>Configuration applied via <code>OPENSSL_CONF</code> environment variable</li>
                    </ul>
                </div>

                <div style="background: #fff3bf; padding: 12px; border-radius: 6px; border-left: 3px solid #fab005;">
                    <p style="margin: 0; color: #495057; font-size: 0.95rem;">
                        <strong>💡 Key Insight:</strong> The Provider architecture in OpenSSL 3.x introduces abstraction layers that add CPU overhead. 
                        These optimizations reduce that overhead by "short-circuiting" unnecessary lookups and loading only what's needed.
                    </p>
                </div>
            </div>

            <div style="background: #e7f5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1971c2;">
                <h3 style="margin-top: 0; color: #1971c2; font-size: 1.1rem;">📊 How to Read This Chart</h3>
                
                <div style="margin-bottom: 12px;">
                    <strong style="color: #1971c2;">Blue Bars (Default):</strong> 
                    <span style="color: #495057;">Performance with standard OpenSSL 3.x configuration (out-of-the-box)</span>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <strong style="color: #40c057;">Green Bars (Optimized):</strong> 
                    <span style="color: #495057;">Performance with Mráz tuning applied (minimal providers, explicit properties)</span>
                </div>

                <div style="margin-bottom: 12px;">
                    <strong style="color: #495057;">Height Difference:</strong> 
                    <span style="color: #495057;">Larger green bars indicate successful optimization. The gap shows recoverable performance.</span>
                </div>

                <div style="background: white; padding: 12px; border-radius: 6px; margin-top: 15px;">
                    <p style="margin: 0; color: #495057; font-size: 0.95rem;">
                        <strong>Expected Results:</strong> OpenSSL 3.0-3.2 typically show 10-25% improvement. 
                        OpenSSL 3.3+ has internal optimizations that reduce the default overhead, so gains may be smaller (5-15%).
                        If green bars are shorter than blue, the optimization config may not be loading correctly.
                    </p>
                </div>
            </div>

            <div id="mraz-chart" style="height: 450px; width: 100%;"></div>
        </div>
        <div class="card">
            <h2>Recovery Potential: How Much Can Tuning Help?</h2>
            <div class="card-desc">
                Shows the percentage improvement from applying Mráz's recommendations. Green bars = positive improvement.
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #495057; font-size: 1.1rem;">📈 Understanding the Improvement Chart</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="background: white; padding: 15px; border-radius: 6px; border-top: 3px solid #40c057;">
                        <strong style="color: #40c057;">✅ Positive % (Green)</strong>
                        <p style="margin: 8px 0 0 0; color: #495057; font-size: 0.9rem;">
                            Optimization improved performance. Higher percentages indicate more Provider overhead was eliminated.
                        </p>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 6px; border-top: 3px solid #fa5252;">
                        <strong style="color: #fa5252;">❌ Negative % (Red)</strong>
                        <p style="margin: 8px 0 0 0; color: #495057; font-size: 0.9rem;">
                            Optimization decreased performance (unusual). May indicate config loading issues or measurement variance.
                        </p>
                    </div>
                </div>

                <div style="background: white; padding: 15px; border-radius: 6px;">
                    <h4 style="margin-top: 0; color: #228be6; font-size: 1rem;">What the Numbers Mean</h4>
                    <ul style="margin: 10px 0; padding-left: 25px; color: #495057; line-height: 1.6;">
                        <li><strong>0-5% improvement:</strong> Minimal overhead in default config, or already optimized internally</li>
                        <li><strong>5-15% improvement:</strong> Moderate Provider overhead; typical for OpenSSL 3.3+ with internal optimizations</li>
                        <li><strong>15-25% improvement:</strong> Significant Provider overhead; common in OpenSSL 3.0-3.2</li>
                        <li><strong>25%+ improvement:</strong> Substantial overhead recovery; indicates heavy property query costs</li>
                    </ul>
                </div>

                <div style="background: #d3f9d8; padding: 12px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #40c057;">
                    <p style="margin: 0; color: #495057; font-size: 0.95rem;">
                        <strong>🎯 Production Recommendation:</strong> If you see 10%+ improvement here, you should implement these 
                        configuration changes in production. The settings are safe, well-supported, and provide measurable performance gains.
                    </p>
                </div>

                <div style="background: #fff3bf; padding: 12px; border-radius: 6px; margin-top: 12px; border-left: 3px solid #fab005;">
                    <p style="margin: 0; color: #495057; font-size: 0.95rem;">
                        <strong>⚠️ Beyond Configuration:</strong> For even more gains, consider build-time optimizations like 
                        <code>enable-ec_nistp_64_gcc_128</code>, disabling unused modules (<code>no-engines</code>, <code>no-dh</code>), 
                        and ensuring assembly optimizations are enabled. See the full 
                        <a href="https://www.youtube.com/watch?v=Cv-43gJJFIs" target="_blank">Mráz talk</a> for details.
                    </p>
                </div>
            </div>

            <div id="mraz-improvement-chart" style="height: 350px; width: 100%;"></div>
        </div>
    </div>

    <!-- VIEW 5: SMALL MULTIPLES -->
    <div id="multiples" class="view-section">
        <div class="card">
            <div class="card-desc" style="margin-bottom: 25px;">
                <p style="margin-top: 0;">These charts show <strong>percentage change versus 1.1.1w baseline</strong>. 
                Green bars indicate performance improvements (faster), red bars indicate regressions (slower).
                Each metric is normalized to make cross-version comparisons easier.</p>
                
                <p style="margin-bottom: 0; padding: 10px; background: #e7f5ff; border-radius: 4px; font-size: 0.9rem;">
                <strong>📊 Reading the Charts:</strong> The Y-axis is automatically scaled to highlight the actual differences in your data. 
                Percentage labels show the exact change from baseline. Even small differences (< 5%) can indicate meaningful performance impacts at scale.
                </p>
            </div>
        </div>
        <div class="multiples-grid">
            <div class="card">
                <h2>AES-256-GCM Throughput</h2>
                <div class="card-desc" style="font-size: 0.85rem; margin-bottom: 10px;">
                    % change in encryption throughput (8KB blocks)
                </div>
                <div id="sm-aes" class="mini-chart"></div>
            </div>
            <div class="card">
                <h2>SHA256 Hashing</h2>
                <div class="card-desc" style="font-size: 0.85rem; margin-bottom: 10px;">
                    % change in hashing throughput (8KB blocks)
                </div>
                <div id="sm-sha" class="mini-chart"></div>
            </div>
            <div class="card">
                <h2>TLS 1.3 Handshake (New)</h2>
                <div class="card-desc" style="font-size: 0.85rem; margin-bottom: 10px;">
                    % change in new connection capacity
                </div>
                <div id="sm-hs-new" class="mini-chart"></div>
            </div>
            <div class="card">
                <h2>TLS 1.2 Handshake (Legacy)</h2>
                <div class="card-desc" style="font-size: 0.85rem; margin-bottom: 10px;">
                    % change in TLS 1.2 connection capacity
                </div>
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
    
    // Check if we have statistical data (multiple iterations)
    const hasStats = data.length > 0 && data[0].config && data[0].config.iterations_count > 1;
    const iterationCount = data[0]?.config?.iterations_count || 1;
    
    // View state for Bellingrath chart
    let bellingrathViewMode = 'absolute';

    // Colors
    const colorScale = d3.scaleOrdinal()
        .domain(['1.1.1', '3.0', '3.1', '3.2', '3.3', '3.4', '3.5'])
        .range(['#228be6', '#fa5252', '#fd7e14', '#fab005', '#40c057', '#15aabf', '#7950f2']);
    
    const getSeries = (ver) => {
        if (ver.startsWith('1.1.1')) return '1.1.1';
        return ver.split('.').slice(0, 2).join('.');
    };

    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    // Helper to get a reasonable width even if the tab was hidden (fallbacks to parent)
    function getWidth(container, pad = 60, minWidth = 320) {
        const rect = container.node().getBoundingClientRect();
        const parentRect = container.node().parentNode ? container.node().parentNode.getBoundingClientRect() : { width: 1200 };
        // Prefer container width, fall back to parent width, but don't use window.innerWidth as it's too wide
        const rawWidth = rect.width > 0 ? rect.width : parentRect.width;
        return Math.max(rawWidth - pad, minWidth);
    }

    // --- CHART 1: SCATTER (Zoomed) ---
    function renderScatter() {
        const container = d3.select("#scatter-chart");
        container.html("");
        const width = getWidth(container, 80);
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

        // Error bars (if we have stddev data)
        if (hasStats) {
            // X-axis error bars
            svg.selectAll(".error-x").data(data).enter().append("line")
                .attr("class", "error-x")
                .attr("x1", d => {
                    const stddev = d.metrics.aes_256_gcm_8k_kbs_stddev || 0;
                    return x(Math.max(0, xVal(d) - stddev));
                })
                .attr("x2", d => {
                    const stddev = d.metrics.aes_256_gcm_8k_kbs_stddev || 0;
                    return x(xVal(d) + stddev);
                })
                .attr("y1", d => y(yVal(d)))
                .attr("y2", d => y(yVal(d)))
                .attr("stroke", d => colorScale(getSeries(d.config.version)))
                .attr("stroke-width", 2)
                .attr("opacity", 0.5);
            
            // Y-axis error bars
            svg.selectAll(".error-y").data(data).enter().append("line")
                .attr("class", "error-y")
                .attr("x1", d => x(xVal(d)))
                .attr("x2", d => x(xVal(d)))
                .attr("y1", d => {
                    // Use new metric name if available, fall back to legacy
                    const stddevKey = d.metrics.tls1_3_rsa_new_cps_stddev !== undefined ? 'tls1_3_rsa_new_cps_stddev' : 'handshakes_new_per_sec_stddev';
                    const stddev = d.metrics[stddevKey] || 0;
                    return y(Math.max(0, yVal(d) - stddev));
                })
                .attr("y2", d => {
                    const stddevKey = d.metrics.tls1_3_rsa_new_cps_stddev !== undefined ? 'tls1_3_rsa_new_cps_stddev' : 'handshakes_new_per_sec_stddev';
                    const stddev = d.metrics[stddevKey] || 0;
                    return y(yVal(d) + stddev);
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
                const xStddev = d.metrics.aes_256_gcm_8k_kbs_stddev || 0;
                const yStddevKey = d.metrics.tls1_3_rsa_new_cps_stddev !== undefined ? 'tls1_3_rsa_new_cps_stddev' : 'handshakes_new_per_sec_stddev';
                const yStddev = d.metrics[yStddevKey] || 0;
                const statsNote = hasStats ? \`<br><small>±\${(xStddev/1024/1024).toFixed(2)} GB/s, ±\${yStddev.toFixed(0)} cps</small>\` : '';
                showTooltip(e, \`<strong>\${d.config.version}</strong><br>TP: \${(xVal(d)/1024/1024).toFixed(2)} GB/s<br>HS: \${yVal(d).toLocaleString()}\${statsNote}\`);
            })
            .on("mouseout", hideTooltip);

        // Smart Label Positioning (Force Simulation to avoid overlap)
        const labels = data.map(d => ({
            x: x(xVal(d)) + 14,
            y: y(yVal(d)) + 4,
            originalY: y(yVal(d)) + 4,
            version: d.config.version
        }));

        const simulation = d3.forceSimulation(labels)
            .force("x", d3.forceX(d => d.x).strength(1))
            .force("y", d3.forceY(d => d.originalY).strength(0.1))
            .force("collide", d3.forceCollide(12)) // Radius for text height/spacing
            .stop();

        for (let i = 0; i < 100; ++i) simulation.tick();

        svg.selectAll(".lbl").data(labels).enter().append("text")
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .text(d => d.version).style("font-size", "11px").style("font-weight", "bold").style("fill", "#495057");
    }

    // --- CHART 2: TLS 1.2 vs 1.3 (Slope Chart) ---
    function renderTlsChart() {
        const container = d3.select("#tls-chart");
        container.html("");
        
        // Use new metric names if available, fall back to legacy
        const getTls12 = d => d.metrics.tls1_2_ecdhe_rsa_aes128gcm_cps || d.metrics.handshakes_new_tls1_2_per_sec || 0;
        const getTls13 = d => d.metrics.tls1_3_rsa_new_cps || d.metrics.handshakes_new_per_sec || 0;
        
        // Check if we have proper TLS 1.2 vs 1.3 data
        const hasTlsData = data.some(d => getTls12(d) > 0 && getTls13(d) > 0 && getTls12(d) !== getTls13(d));
        
        if (!hasTlsData) {
            container.html("<div style='padding:60px; text-align:center; color:#999'><h3>TLS 1.2 vs 1.3 Comparison Data Not Available</h3><p>Run the full benchmark suite to generate separate TLS 1.2 and TLS 1.3 metrics.</p><p style='margin-top:20px; font-size:0.9em;'>The current data only contains generic handshake metrics. For detailed protocol comparison, the benchmark needs to test both TLS 1.2 (ECDHE-RSA-AES128-GCM-SHA256) and TLS 1.3 (with RSA certificates) separately.</p></div>");
            return;
        }

        const width = getWidth(container, 60);
        const height = 500;
        const margin = {top: 40, right: 150, bottom: 40, left: 150};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);
        
        // Prepare slope data
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

        // Grid lines
        svg.append("g").attr("class", "grid")
            .call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
            .style("opacity", 0.1);

        // Axis labels
        svg.append("text")
            .attr("x", x('TLS 1.2'))
            .attr("y", -15)
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .style("fill", "#868e96")
            .text("TLS 1.2");

        svg.append("text")
            .attr("x", x('TLS 1.3'))
            .attr("y", -15)
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .style("fill", "#228be6")
            .text("TLS 1.3");

        // Y-axis
        svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));

        // Draw slope lines with gradient effect
        const lines = svg.selectAll(".slope-line")
            .data(slopeData)
            .enter().append("line")
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
                const dir = d.diff > 0 ? "↑" : "↓";
                const sign = d.pctDiff > 0 ? "+" : "";
                showTooltip(e, \`<strong>\${d.version}</strong><br>TLS 1.2: \${d.tls12.toLocaleString()} cps<br>TLS 1.3: \${d.tls13.toLocaleString()} cps<br>Change: \${sign}\${d.pctDiff.toFixed(1)}% \${dir}\`);
            })
            .on("mouseout", function(e, d) {
                d3.select(this).attr("stroke-width", 3).attr("opacity", 0.7);
                hideTooltip();
            });

        // Add dots at endpoints
        svg.selectAll(".dot-left")
            .data(slopeData)
            .enter().append("circle")
            .attr("class", "dot-left")
            .attr("cx", x('TLS 1.2'))
            .attr("cy", d => y(d.tls12))
            .attr("r", 5)
            .attr("fill", d => d.color)
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", (e, d) => {
                showTooltip(e, \`<strong>\${d.version}</strong><br>TLS 1.2: \${d.tls12.toLocaleString()} cps\`);
            })
            .on("mouseout", hideTooltip);

        svg.selectAll(".dot-right")
            .data(slopeData)
            .enter().append("circle")
            .attr("class", "dot-right")
            .attr("cx", x('TLS 1.3'))
            .attr("cy", d => y(d.tls13))
            .attr("r", 5)
            .attr("fill", d => d.color)
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", (e, d) => {
                showTooltip(e, \`<strong>\${d.version}</strong><br>TLS 1.3: \${d.tls13.toLocaleString()} cps\`);
            })
            .on("mouseout", hideTooltip);

        // Add version labels on the left
        svg.selectAll(".label-left")
            .data(slopeData)
            .enter().append("text")
            .attr("class", "label-left")
            .attr("x", x('TLS 1.2') - 10)
            .attr("y", d => y(d.tls12) + 4)
            .style("text-anchor", "end")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("fill", d => d.color)
            .text(d => d.version);

        // Add percentage change labels on the right
        svg.selectAll(".label-right")
            .data(slopeData)
            .enter().append("text")
            .attr("class", "label-right")
            .attr("x", x('TLS 1.3') + 10)
            .attr("y", d => y(d.tls13) + 4)
            .style("text-anchor", "start")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("fill", d => d.pctDiff > 0 ? "#40c057" : "#fa5252")
            .text(d => {
                const sign = d.pctDiff > 0 ? "+" : "";
                return \`\${sign}\${d.pctDiff.toFixed(1)}%\`;
            });

        // Add subtle annotation
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 35)
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "#868e96")
            .style("font-style", "italic")
            .text("Upward slopes indicate TLS 1.3 outperforms TLS 1.2 • Downward slopes show TLS 1.2 is faster");
    }

    // --- CHART 3: BELLINGRATH RSA vs ECDSA ---
    function renderBellingrathRsaEcdsa() {
        const container = d3.select("#rsa-vs-ecdsa-chart");
        container.html("");
        
        // Fixed width calculation - subtract margins from container width
        const containerWidth = container.node().getBoundingClientRect().width;
        const margin = {top: 20, right: 120, bottom: 40, left: 70};
        const width = Math.max(containerWidth - margin.left - margin.right, 400);
        const height = 420;

        const svg = container.append("svg")
            .attr("width", containerWidth)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        // Use specific Bellingrath metrics if available, otherwise fall back to generic handshake metrics
        const hasDetailedMetrics = data.some(d => d.metrics.tls1_3_rsa_new_cps > 0);
        
        const metrics = hasDetailedMetrics ? [
            {key: 'tls1_3_rsa_new_cps', label: 'TLS 1.3 RSA', color: '#228be6'},
            {key: 'tls1_3_ecdsa_new_cps', label: 'TLS 1.3 ECDSA', color: '#15aabf'},
            {key: 'tls1_2_ecdhe_rsa_aes128gcm_cps', label: 'TLS 1.2 ECDHE-RSA', color: '#fa5252'},
            {key: 'tls1_2_ecdhe_ecdsa_aes128gcm_cps', label: 'TLS 1.2 ECDHE-ECDSA', color: '#fd7e14'}
        ] : [
            {key: 'handshakes_new_per_sec', label: 'New Handshakes', color: '#228be6'},
            {key: 'handshakes_resume_per_sec', label: 'Resumed Handshakes', color: '#15aabf'}
        ];

        // Filter to show only 3.x versions plus baseline for relative view
        const displayData = bellingrathViewMode === 'relative' 
            ? data.filter(d => d.config.version.startsWith('3.') || d.config.version === '1.1.1w')
            : data;

        const x0 = d3.scaleBand().domain(displayData.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
        const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.05);
        
        // Calculate values based on view mode
        let yLabel, maxVal, minVal;
        if (bellingrathViewMode === 'relative') {
            yLabel = "% Change vs 1.1.1w";
            const percentages = displayData.flatMap(d => 
                metrics.map(m => {
                    const baseVal = baseline.metrics[m.key] || 1;
                    const currentVal = d.metrics[m.key] || 0;
                    return ((currentVal - baseVal) / baseVal) * 100;
                })
            );
            maxVal = d3.max(percentages);
            minVal = d3.min(percentages);
            const range = Math.max(Math.abs(maxVal), Math.abs(minVal));
            maxVal = range * 1.1;
            minVal = -range * 1.1;
        } else {
            yLabel = "Connections/sec";
            maxVal = d3.max(displayData, d => d3.max(metrics, m => d.metrics[m.key] || 0)) * 1.1;
            minVal = 0;
        }
        
        const y = d3.scaleLinear().domain([minVal, maxVal]).rangeRound([height, 0]);

        // Add zero line for relative view
        if (bellingrathViewMode === 'relative') {
            svg.append("line")
                .attr("class", "zero-line")
                .attr("x1", 0).attr("x2", width)
                .attr("y1", y(0)).attr("y2", y(0));
        }

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
        svg.append("g").call(d3.axisLeft(y).tickFormat(d => bellingrathViewMode === 'relative' ? d + '%' : d));
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height/2)
            .attr("y", -55)
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "#495057")
            .text(yLabel);

        const versionGroups = svg.selectAll(".g").data(displayData).enter().append("g")
            .attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => {
                const baseVal = baseline.metrics[m.key] || 1;
                const currentVal = d.metrics[m.key] || 0;
                const value = bellingrathViewMode === 'relative' 
                    ? ((currentVal - baseVal) / baseVal) * 100
                    : currentVal;
                const displayValue = bellingrathViewMode === 'relative'
                    ? \`\${value.toFixed(1)}% (\${currentVal.toLocaleString()} conn/s)\`
                    : \`\${currentVal.toLocaleString()} conn/s\`;
                return {key: m.key, label: m.label, color: m.color, value: value, displayValue: displayValue};
            }))
            .enter().append("rect")
            .attr("x", d => x1(d.key))
            .attr("y", d => bellingrathViewMode === 'relative' ? (d.value >= 0 ? y(d.value) : y(0)) : y(d.value))
            .attr("width", x1.bandwidth())
            .attr("height", d => bellingrathViewMode === 'relative' ? Math.abs(y(d.value) - y(0)) : height - y(d.value))
            .attr("fill", d => d.color)
            .attr("opacity", 0.9)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.displayValue}\`))
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
        container.html("");
        const containerWidth = container.node().getBoundingClientRect().width;
        const margin = {top: 20, right: 120, bottom: 60, left: 70};
        const width = containerWidth - margin.left - margin.right;
        const height = 360;

        const svg = container.append("svg")
            .attr("width", containerWidth)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        // Use actual available metrics from the data
        const metrics = [
            {key: 'handshakes_new_per_sec', label: 'New Connections', color: '#228be6'},
            {key: 'handshakes_resume_per_sec', label: 'Resumed Connections', color: '#74c0fc'}
        ];

        const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.3);
        const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.1);
        
        const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
        const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

        svg.append("g")
            .attr("transform", \`translate(0,\${height})\`)
            .call(d3.axisBottom(x0))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");
            
        svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height/2)
            .attr("y", -50)
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "#495057")
            .text("Connections/sec");

        const versionGroups = svg.selectAll(".g").data(data).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})))
            .enter().append("rect")
            .attr("x", d => x1(d.key))
            .attr("y", d => y(d.value))
            .attr("width", x1.bandwidth())
            .attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()} conn/sec\`))
            .on("mouseout", hideTooltip);

        // Legend
        const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
        metrics.forEach((m, i) => {
            const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
            g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
            g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
        });
    }

    // --- CHART 4: SCHMATZ RSA SIGN ---
    function renderRsaSignChart() {
        const container = d3.select("#rsa-sign-chart");
        container.html("");
        
        const metrics = [
            {key: 'rsa_2048_sign_per_sec', label: 'RSA-2048 Sign', color: '#228be6'},
            {key: 'rsa_4096_sign_per_sec', label: 'RSA-4096 Sign', color: '#fa5252'}
        ];
        
        // Check if we have any data
        const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
        if (!maxVal || maxVal === 0) {
            container.html("<div style='padding:60px; text-align:center; color:#999'><h3>RSA Sign Performance Data Not Available</h3><p>Run the full benchmark suite to generate RSA signing metrics.</p><p style='margin-top:20px; font-size:0.9em;'>The benchmark script tests RSA-2048 and RSA-4096 signing operations using <code>openssl speed rsa2048</code> and <code>openssl speed rsa4096</code>.</p></div>");
            return;
        }
        
        const width = getWidth(container, 200);  // Account for legend + margins
        const height = 360;
        const margin = {top: 20, right: 120, bottom: 40, left: 60};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
        const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.1);
        
        const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
        svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("Sign Operations/sec");

        const versionGroups = svg.selectAll(".g").data(data).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})))
            .enter().append("rect")
            .attr("x", d => x1(d.key)).attr("y", d => y(d.value))
            .attr("width", x1.bandwidth()).attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()} ops/sec\`))
            .on("mouseout", hideTooltip);

        // Legend
        const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
        metrics.forEach((m, i) => {
            const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
            g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
            g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
        });
    }

    // --- CHART 4B: SCHMATZ RSA VERIFY ---
    function renderRsaVerifyChart() {
        const container = d3.select("#rsa-verify-chart");
        container.html("");
        
        const metrics = [
            {key: 'rsa_2048_verify_per_sec', label: 'RSA-2048 Verify', color: '#74c0fc'},
            {key: 'rsa_4096_verify_per_sec', label: 'RSA-4096 Verify', color: '#ffa8a8'}
        ];
        
        // Check if we have any data
        const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
        if (!maxVal || maxVal === 0) {
            container.html("<div style='padding:60px; text-align:center; color:#999'><h3>RSA Verify Performance Data Not Available</h3><p>Run the full benchmark suite to generate RSA verification metrics.</p><p style='margin-top:20px; font-size:0.9em;'>The benchmark script tests RSA-2048 and RSA-4096 verification operations using <code>openssl speed rsa2048</code> and <code>openssl speed rsa4096</code>. Verification is typically 10-50x faster than signing since it uses the public key.</p></div>");
            return;
        }
        
        const width = getWidth(container, 200);  // Account for legend + margins
        const height = 360;
        const margin = {top: 20, right: 120, bottom: 40, left: 60};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const x0 = d3.scaleBand().domain(data.map(d => d.config.version)).rangeRound([0, width]).paddingInner(0.2);
        const x1 = d3.scaleBand().domain(metrics.map(m => m.key)).rangeRound([0, x0.bandwidth()]).padding(0.1);
        
        const y = d3.scaleLinear().domain([0, maxVal * 1.1]).rangeRound([height, 0]);

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x0));
        svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1000).toFixed(0) + 'K'));
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("Verify Operations/sec");

        const versionGroups = svg.selectAll(".g").data(data).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})))
            .enter().append("rect")
            .attr("x", d => x1(d.key)).attr("y", d => y(d.value))
            .attr("width", x1.bandwidth()).attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()} ops/sec\`))
            .on("mouseout", hideTooltip);

        // Legend
        const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
        metrics.forEach((m, i) => {
            const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
            g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
            g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
        });
    }

    // --- CHART 4C: SCHMATZ ECDSA SIGN ---
    function renderEcdsaSignChart() {
        const container = d3.select("#ecdsa-sign-chart");
        container.html("");
        
        const metrics = [
            {key: 'ecdsa_p256_sign_per_sec', label: 'P-256 Sign', color: '#40c057'},
            {key: 'ecdsa_p384_sign_per_sec', label: 'P-384 Sign', color: '#fab005'},
            {key: 'ecdsa_p521_sign_per_sec', label: 'P-521 Sign', color: '#7950f2'}
        ];
        
        // Check if we have any data
        const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
        if (!maxVal || maxVal === 0) {
            container.html("<div style='padding:60px; text-align:center; color:#999'><h3>ECDSA Sign Performance Data Not Available</h3><p>Run the full benchmark suite to generate ECDSA signing metrics.</p><p style='margin-top:20px; font-size:0.9em;'>The benchmark script tests ECDSA signing with P-256, P-384, and P-521 curves. P-256 offers the best performance and is the most widely deployed curve.</p></div>");
            return;
        }
        
        const width = getWidth(container, 200);  // Account for legend + margins
        const height = 360;
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
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("Sign Operations/sec");

        const versionGroups = svg.selectAll(".g").data(data).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})))
            .enter().append("rect")
            .attr("x", d => x1(d.key)).attr("y", d => y(d.value))
            .attr("width", x1.bandwidth()).attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()} ops/sec\`))
            .on("mouseout", hideTooltip);

        // Legend
        const legend = svg.append("g").attr("transform", \`translate(\${width + 10}, 0)\`);
        metrics.forEach((m, i) => {
            const g = legend.append("g").attr("transform", \`translate(0, \${i * 22})\`);
            g.append("rect").attr("width", 15).attr("height", 15).attr("fill", m.color);
            g.append("text").attr("x", 20).attr("y", 12).text(m.label).style("font-size", "11px");
        });
    }

    // --- CHART 4D: SCHMATZ ECDSA VERIFY ---
    function renderEcdsaVerifyChart() {
        const container = d3.select("#ecdsa-verify-chart");
        container.html("");
        
        const metrics = [
            {key: 'ecdsa_p256_verify_per_sec', label: 'P-256 Verify', color: '#8ce99a'},
            {key: 'ecdsa_p384_verify_per_sec', label: 'P-384 Verify', color: '#ffe066'},
            {key: 'ecdsa_p521_verify_per_sec', label: 'P-521 Verify', color: '#b197fc'}
        ];
        
        // Check if we have any data
        const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
        if (!maxVal || maxVal === 0) {
            container.html("<div style='padding:60px; text-align:center; color:#999'><h3>ECDSA Verify Performance Data Not Available</h3><p>Run the full benchmark suite to generate ECDSA verification metrics.</p><p style='margin-top:20px; font-size:0.9em;'>The benchmark script tests ECDSA verification with P-256, P-384, and P-521 curves. Verification is generally faster than signing for ECDSA operations.</p></div>");
            return;
        }
        
        const width = getWidth(container, 200);  // Account for legend + margins
        const height = 360;
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
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", -45).style("text-anchor", "middle").text("Verify Operations/sec");

        const versionGroups = svg.selectAll(".g").data(data).enter().append("g").attr("transform", d => \`translate(\${x0(d.config.version)},0)\`);

        versionGroups.selectAll("rect")
            .data(d => metrics.map(m => ({key: m.key, label: m.label, color: m.color, value: d.metrics[m.key] || 0})))
            .enter().append("rect")
            .attr("x", d => x1(d.key)).attr("y", d => y(d.value))
            .attr("width", x1.bandwidth()).attr("height", d => height - y(d.value))
            .attr("fill", d => d.color)
            .on("mouseover", (e, d) => showTooltip(e, \`\${d.label}: \${d.value.toLocaleString()} ops/sec\`))
            .on("mouseout", hideTooltip);

        // Legend
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
        
        // Check if we have any data
        const maxVal = d3.max(data, d => d3.max(getBlockData(d)));
        if (!maxVal || maxVal === 0) {
            container.html("<div style='padding:60px; text-align:center; color:#999'><h3>Block Size Sensitivity Data Not Available</h3><p>Run the full benchmark suite to generate block size metrics.</p><p style='margin-top:20px; font-size:0.9em;'>The benchmark script tests AES-256-GCM throughput at different block sizes (16B, 64B, 256B, 1KB, 8KB) to measure initialization overhead vs maximum throughput.</p></div>");
            return;
        }
        
        const width = getWidth(container, 210);  // Account for legend + margins
        const height = 320;
        const margin = {top: 20, right: 120, bottom: 40, left: 70};

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const x = d3.scalePoint().domain(blockLabels).range([0, width]);
        const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([height, 0]);

        svg.append("g").attr("transform", \`translate(0,\${height})\`).call(d3.axisBottom(x));
        svg.append("g").call(d3.axisLeft(y).tickFormat(d => (d/1024/1024).toFixed(1) + ' GB/s'));
        svg.append("text").attr("x", width/2).attr("y", height + 35).style("text-anchor", "middle").text("Block Size");

        const line = d3.line()
            .x((d, i) => x(blockLabels[i]))
            .y(d => y(d));

        data.forEach((version, idx) => {
            const blockData = getBlockData(version);
            const color = colorScale(getSeries(version.config.version));
            
            svg.append("path")
                .datum(blockData)
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 2)
                .attr("d", line);

            // Add dots - use index-based class to avoid CSS selector issues with version strings containing dots
            const dotGroup = svg.append("g").attr("class", \`blocksize-dots-\${idx}\`);
            dotGroup.selectAll("circle")
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

    // --- CHART 5: MRÁZ OPTIMIZATION COMPARISON ---
    function renderMrazChart() {
        const container = d3.select("#mraz-chart");
        container.html("");
        
        // Filter to only 3.x versions with optimized data
        const mrazData = data.filter(d => d.metrics.optimized_tls1_3_rsa_new_cps > 0);
        
        if (mrazData.length === 0) {
            container.html("<div style='padding:40px; text-align:center; color:#999'>No optimization data available. Run benchmark with OpenSSL 3.x to see results.</div>");
            return;
        }

        const width = getWidth(container, 60);
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
        container.html("");
        
        // Filter to only 3.x versions with optimized data
        const mrazData = data.filter(d => d.metrics.optimized_tls1_3_rsa_new_cps > 0);
        
        if (mrazData.length === 0) {
            container.html("<div style='padding:40px; text-align:center; color:#999'>No optimization data available.</div>");
            return;
        }

        const width = getWidth(container, 60);
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
        container.html("");
        
        // Check if we have any non-zero data
        const hasData = data.some(d => d.metrics[metricKey] && d.metrics[metricKey] > 0);
        if (!hasData) {
            container.html("<div style='padding:40px; text-align:center; color:#999'>No data available for this metric</div>");
            return;
        }
        
        const width = getWidth(container, 50, 260);
        const height = 280;  // Increased height for better visibility
        const margin = {top: 35, right: 10, bottom: 45, left: 50};  // More space for labels at top and bottom

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        const getPct = (d) => {
            if (!d.metrics[metricKey] || d.metrics[metricKey] === 0) return 0;
            const base = baseline.metrics[metricKey];
            if (!base || base === 0) return 0;
            return ((d.metrics[metricKey] - base) / base) * 100;
        };

        const x = d3.scaleBand().domain(data.map(d => d.config.version)).range([0, width]).padding(0.2);
        
        const yDomain = d3.extent(data, getPct);
        // Add 25% padding to the range for better visibility and label space
        const range = Math.max(Math.abs(yDomain[0]), Math.abs(yDomain[1]));
        const absMax = range > 0 ? range * 1.25 : 2;  // Minimum 2% range, with 25% padding
        const y = d3.scaleLinear().domain([-absMax, absMax]).range([height, 0]);

        // X-axis at bottom of chart
        svg.append("g")
            .attr("transform", \`translate(0,\${height})\`)
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text")
            .attr("y", 8)
            .style("font-size", "11px")
            .style("font-weight", "600");
        
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

        // Add zero line for reference
        svg.append("line")
            .attr("x1", 0).attr("x2", width)
            .attr("y1", y(0)).attr("y2", y(0))
            .attr("stroke", "#868e96")
            .attr("stroke-dasharray", "2,2")
            .attr("stroke-width", 1)
            .attr("opacity", 0.7);

        // Add percentage labels on bars
        svg.selectAll(".pct-label").data(data).enter().append("text")
            .attr("class", "pct-label")
            .attr("x", d => x(d.config.version) + x.bandwidth() / 2)
            .attr("y", d => {
                const val = getPct(d);
                // Position label above bar if positive, below if negative with more space
                return val >= 0 ? y(val) - 6 : y(val) + 16;
            })
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "700")
            .style("fill", d => {
                const val = getPct(d);
                return val >= 0 ? "#2f9e44" : "#c92a2a";
            })
            .text(d => {
                const val = getPct(d);
                // Always show sign for non-zero values
                return val === 0 ? "0%" : (val > 0 ? "+" : "") + val.toFixed(1) + "%";
            });
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
        container.html("");
        
        if (pqcData.length === 0) {
            container.html("<div style='padding:40px; text-align:center; color:#999'>No Post-Quantum Data Available (requires OpenSSL 3.5+)</div>");
            return;
        }

        const width = getWidth(container, 60);
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
    
    // Helper to draw error bars on bar charts
    function drawErrorBars(svg, data, x, y, getValue, getStddev, xOffset = 0) {
        if (!hasStats) return;
        
        const errorBars = svg.selectAll(".error-bar")
            .data(data.filter(d => getStddev(d) > 0))
            .enter().append("g")
            .attr("class", "error-bar");
        
        // Vertical line
        errorBars.append("line")
            .attr("x1", d => x + xOffset)
            .attr("x2", d => x + xOffset)
            .attr("y1", d => y(Math.max(0, getValue(d) - getStddev(d))))
            .attr("y2", d => y(getValue(d) + getStddev(d)))
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5);
        
        // Top cap
        errorBars.append("line")
            .attr("x1", d => x + xOffset - 3)
            .attr("x2", d => x + xOffset + 3)
            .attr("y1", d => y(getValue(d) + getStddev(d)))
            .attr("y2", d => y(getValue(d) + getStddev(d)))
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5);
        
        // Bottom cap
        errorBars.append("line")
            .attr("x1", d => x + xOffset - 3)
            .attr("x2", d => x + xOffset + 3)
            .attr("y1", d => y(Math.max(0, getValue(d) - getStddev(d))))
            .attr("y2", d => y(Math.max(0, getValue(d) - getStddev(d))))
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5);
    }

    function renderForTab(tabId) {
        // Use requestAnimationFrame to allow the browser to perform layout (display: block) before measuring width
        const run = () => {
            if (tabId === 'overview') renderScatter();
            if (tabId === 'tls') renderTlsChart();
            if (tabId === 'bellingrath') { renderBellingrathRsaEcdsa(); renderBellingrathResume(); }
            if (tabId === 'schmatz') { renderRsaSignChart(); renderRsaVerifyChart(); renderEcdsaSignChart(); renderEcdsaVerifyChart(); renderBlockSizeChart(); renderBlockSizeTable(); }
            if (tabId === 'mraz') { renderMrazChart(); renderMrazImprovement(); }
            if (tabId === 'multiples') renderMultiples();
            if (tabId === 'pqc') renderPqc();
        };
        // Double rAF to ensure styles/layout are applied before measuring widths
        requestAnimationFrame(() => requestAnimationFrame(run));
    }

    // Tab Switcher
    window.switchTab = function(tabId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
        
        document.getElementById(tabId).classList.add('active');
        document.querySelector(\`[onclick="switchTab('\${tabId}')"]\`).classList.add('active');

        renderForTab(tabId);
    };
    
    // Bellingrath View Toggle
    window.toggleBellingrathView = function(mode) {
        bellingrathViewMode = mode;
        document.querySelectorAll('.view-toggle').forEach(el => el.classList.remove('active'));
        document.getElementById(\`btn-\${mode}\`).classList.add('active');
        renderBellingrathRsaEcdsa();
    };

    // Re-render active tab on window resize to pick up new widths
    window.addEventListener('resize', () => {
        const active = document.querySelector('.view-section.active');
        if (active) {
            renderForTab(active.id);
        }
    });

    // Init Charts (Overview is active by default)
    renderForTab('overview');

</script>
</body>
</html>`;

async function main() {
  const summaryPath = path.join(RESULTS_DIR, 'summary.json');
  const outputPath = path.join(RESULTS_DIR, 'visualizations.html');

  try {
    const rawData = await fs.readFile(summaryPath, 'utf8');
    
    // Validate data before generating HTML
    let jsonData;
    try {
        jsonData = JSON.parse(rawData);
    } catch (e) {
        throw new Error('summary.json is not valid JSON');
    }

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
        throw new Error('summary.json contains no results. Run benchmark first.');
    }

    const finalHtml = HTML_TEMPLATE(rawData);
    await fs.writeFile(outputPath, finalHtml);
    console.log(`📊 Visualization dashboard generated at: ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to generate visual report:', error.message);
  }
}

main();
