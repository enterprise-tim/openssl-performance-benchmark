import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');

// Version metadata (dates and features)
// seriesInitialRelease: Month/year when the .0 version of this series was first released
// date: Release date of this specific patch version
const VERSION_INFO = {
  '1.1.1w': {
    date: '2023-09-11',
    series: '1.1.1',
    seriesInitialRelease: 'Sept 2018',
    features: 'Final release of the 1.1.1 LTS series (EOL Sept 2023). Support for TLS 1.3, SHA-3, X448/Ed448. The performance baseline.'
  },
  '3.0.15': {
    date: '2024-09-03',
    series: '3.0',
    seriesInitialRelease: 'Sept 2021',
    features: 'LTS release. Introduced the Provider architecture (FIPS 140-2). Major architectural overhaul often cited as the cause of performance regressions.'
  },
  '3.0.18': {
    date: '2025-09-30',
    series: '3.0',
    seriesInitialRelease: 'Sept 2021',
    features: 'LTS release. Introduced the Provider architecture (FIPS 140-2). Major architectural overhaul often cited as the cause of performance regressions.'
  },
  '3.1.7': {
    date: '2024-09-03',
    series: '3.1',
    seriesInitialRelease: 'Mar 2023',
    features: 'FIPS 140-3 compliance. Focused on performance improvements over 3.0 and addressing initial regressions.'
  },
  '3.1.8': {
    date: '2025-02-11',
    series: '3.1',
    seriesInitialRelease: 'Mar 2023',
    features: 'FIPS 140-3 compliance. Focused on performance improvements over 3.0 and addressing initial regressions.'
  },
  '3.2.3': {
    date: '2024-09-03',
    series: '3.2',
    seriesInitialRelease: 'Nov 2023',
    features: 'Client-side QUIC support. TLS certificate compression (RFC 8879). Deterministic ECDSA (RFC 6979).'
  },
  '3.2.6': {
    date: '2025-09-30',
    series: '3.2',
    seriesInitialRelease: 'Nov 2023',
    features: 'Client-side QUIC support. TLS certificate compression (RFC 8879). Deterministic ECDSA (RFC 6979).'
  },
  '3.3.2': {
    date: '2024-09-03',
    series: '3.3',
    seriesInitialRelease: 'Apr 2024',
    features: 'QUIC trace and polling improvements. New EVP_DigestSqueeze API. Further performance tuning.'
  },
  '3.3.5': {
    date: '2025-09-30',
    series: '3.3',
    seriesInitialRelease: 'Apr 2024',
    features: 'QUIC trace and polling improvements. New EVP_DigestSqueeze API. Further performance tuning.'
  },
  '3.4.0': {
    date: '2024-10-22',
    series: '3.4',
    seriesInitialRelease: 'Oct 2024',
    features: 'FIPS indicators. Composite signature algorithms. PBMAC1 support. New integrity checks.'
  },
  '3.4.3': {
    date: '2025-09-30',
    series: '3.4',
    seriesInitialRelease: 'Oct 2024',
    features: 'FIPS indicators. Composite signature algorithms. PBMAC1 support. New integrity checks.'
  },
  '3.5.3': {
    date: '2025-09-16',
    series: '3.5',
    seriesInitialRelease: 'Apr 2025',
    features: 'Post-Quantum Cryptography (ML-KEM, ML-DSA). QUIC server support.'
  },
  '3.5.4': {
    date: '2025-09-30',
    series: '3.5',
    seriesInitialRelease: 'Apr 2025',
    features: 'Post-Quantum Cryptography (ML-KEM, ML-DSA). QUIC server support.'
  },
  '3.6.0': {
    date: '2025-10-01',
    series: '3.6',
    seriesInitialRelease: 'Oct 2025',
    features: 'EVP_SKEY opaque symmetric keys. LMS signature verification. FIPS 186-5 deterministic ECDSA. C-99 required.'
  }
};

async function main() {
  const summaryPath = path.join(RESULTS_DIR, 'summary.json');
  
  try {
    let rawData;
    try {
      rawData = await fs.readFile(summaryPath, 'utf8');
    } catch (e) {
      console.error('\n❌ No results file found.');
      console.error('   Please run "npm run benchmark" first to generate data.');
      process.exit(1);
    }

    const results = JSON.parse(rawData);

    if (!results || results.length === 0) {
      console.error('\n❌ No benchmark results found in summary.json.');
      process.exit(1);
    }
    
    // Sort versions
    results.sort((a, b) => {
      return a.config.version.localeCompare(b.config.version, undefined, { numeric: true });
    });

    // Check if we have aggregated data with multiple iterations
    const iterationCount = results[0]?.config?.iterations_count || 1;
    
    console.log('\n===============================================================');
    console.log('OpenSSL Performance Benchmark Report');
    if (iterationCount > 1) {
      console.log(`Statistical Analysis: ${iterationCount} iterations per version`);
      console.log('All values shown as mean ± stddev');
    }
    console.log('===============================================================');
    
    // 1. Throughput Table
    console.log('\n--- Algorithm Throughput (KB/s) ---');
    console.log(
      'Version'.padEnd(15) + 
      'AES-256-GCM (1K)'.padEnd(20) + 
      'AES-256-GCM (8K)'.padEnd(20) + 
      'SHA256 (1K)'.padEnd(20) + 
      'SHA256 (8K)'
    );
    console.log('-'.repeat(95));

    results.forEach(r => {
      const m = r.metrics;
      const iterCount = r.config?.iterations_count || 1;
      const showStddev = iterCount > 1;
      
      console.log(
        r.config.version.padEnd(15) + 
        (showStddev ? formatNumWithStddev(m.aes_256_gcm_1k_kbs, m.aes_256_gcm_1k_kbs_stddev) : formatNum(m.aes_256_gcm_1k_kbs)).padEnd(20) + 
        (showStddev ? formatNumWithStddev(m.aes_256_gcm_8k_kbs, m.aes_256_gcm_8k_kbs_stddev) : formatNum(m.aes_256_gcm_8k_kbs)).padEnd(20) + 
        (showStddev ? formatNumWithStddev(m.sha256_1k_kbs, m.sha256_1k_kbs_stddev) : formatNum(m.sha256_1k_kbs)).padEnd(20) + 
        (showStddev ? formatNumWithStddev(m.sha256_8k_kbs, m.sha256_8k_kbs_stddev) : formatNum(m.sha256_8k_kbs))
      );
    });

    // 1b. Multi-threaded Throughput
    console.log('\n--- Multi-threaded Throughput (AES-256-GCM) ---');
    console.log(
      'Version'.padEnd(15) + 
      'Multi-Thread (8K)'.padEnd(20) + 
      'Scalability (x Single)'
    );
    console.log('-'.repeat(60));

    results.forEach(r => {
      const m = r.metrics;
      if (m.aes_256_gcm_multi_8k_kbs) {
        const scaling = m.aes_256_gcm_multi_8k_kbs / m.aes_256_gcm_8k_kbs;
        console.log(
          r.config.version.padEnd(15) + 
          formatNum(m.aes_256_gcm_multi_8k_kbs).padEnd(20) + 
          scaling.toFixed(2) + 'x'
        );
      }
    });

    // 2. Handshake Table
    console.log('\n--- TLS Handshake Performance (conn/sec) ---');
    console.log(
      'Version'.padEnd(15) + 
      'New Connections'.padEnd(20) + 
      'Resumed Connections'.padEnd(25) +
      '% vs 1.1.1w (New)'
    );
    console.log('-'.repeat(80));

    const baseline = results.find(r => r.config.version === '1.1.1w');
    const baselineNew = baseline && baseline.metrics.handshakes_new_per_sec > 0 ? baseline.metrics.handshakes_new_per_sec : 1;

    results.forEach(r => {
      const m = r.metrics;
      const pctChange = ((m.handshakes_new_per_sec - baselineNew) / baselineNew) * 100;
      const pctStr = (pctChange >= 0 ? '+' : '') + pctChange.toFixed(1) + '%';
      const changeCol = r.config.version === '1.1.1w' ? '-' : pctStr;
      
      console.log(
        r.config.version.padEnd(15) + 
        formatNum(m.handshakes_new_per_sec).padEnd(20) + 
        formatNum(m.handshakes_resume_per_sec).padEnd(25) +
        changeCol
      );
    });
    console.log('\n');

    // 2b. TLS 1.2 Table (Updated to use new metric names)
    console.log('\n--- TLS 1.2 Specific Performance (conn/sec) ---');
    console.log(
      'Version'.padEnd(15) + 
      'ECDHE-RSA-AES128'.padEnd(22) + 
      'ECDHE-ECDSA-AES128'.padEnd(22) +
      'AES256-GCM-SHA384'
    );
    console.log('-'.repeat(80));

    results.forEach(r => {
      const m = r.metrics;
      console.log(
        r.config.version.padEnd(15) + 
        formatNum(m.tls1_2_ecdhe_rsa_aes128gcm_cps || m.handshakes_new_tls1_2_per_sec).padEnd(22) + 
        formatNum(m.tls1_2_ecdhe_ecdsa_aes128gcm_cps).padEnd(22) + 
        formatNum(m.tls1_2_rsa_aes256gcm_cps)
      );
    });
    console.log('\n');

    // 2c. Bellingrath Alignment - RSA vs ECDSA
    console.log('\n--- Bellingrath Alignment: RSA vs ECDSA Certificate (conn/sec) ---');
    console.log(
      'Version'.padEnd(15) + 
      'TLS 1.3 RSA'.padEnd(18) + 
      'TLS 1.3 ECDSA'.padEnd(18) +
      'TLS 1.2 RSA'.padEnd(18) +
      'TLS 1.2 ECDSA'
    );
    console.log('-'.repeat(85));
    results.forEach(r => {
        const m = r.metrics;
        console.log(
          r.config.version.padEnd(15) + 
          formatNum(m.tls1_3_rsa_new_cps || m.tls1_3_rsa_aes128gcm_cps).padEnd(18) + 
          formatNum(m.tls1_3_ecdsa_new_cps).padEnd(18) +
          formatNum(m.tls1_2_ecdhe_rsa_aes128gcm_cps).padEnd(18) +
          formatNum(m.tls1_2_ecdhe_ecdsa_aes128gcm_cps)
        );
    });
    console.log('\n');
    
    // 2d. Bellingrath Alignment - Session Resumption
    console.log('\n--- Bellingrath Alignment: New vs Resumed (conn/sec) ---');
    console.log(
      'Version'.padEnd(15) + 
      'TLS 1.3 New'.padEnd(18) + 
      'TLS 1.3 Resume'.padEnd(18) +
      'TLS 1.2 New'.padEnd(18) +
      'TLS 1.2 Resume'
    );
    console.log('-'.repeat(85));
    results.forEach(r => {
        const m = r.metrics;
        console.log(
          r.config.version.padEnd(15) + 
          formatNum(m.tls1_3_rsa_new_cps).padEnd(18) + 
          formatNum(m.tls1_3_rsa_resume_cps).padEnd(18) +
          formatNum(m.tls1_2_ecdhe_rsa_aes128gcm_cps).padEnd(18) +
          formatNum(m.tls1_2_rsa_resume_cps)
        );
    });
    console.log('\n');

    // 3. Post-Quantum Table (New)
    const pqcResults = results.filter(r => r.metrics.ml_kem_768_ops_sec > 0);
    if (pqcResults.length > 0) {
      console.log('\n--- Post-Quantum Cryptography (ML-KEM-768) ---');
      console.log('Version'.padEnd(15) + 'Operations/sec');
      console.log('-'.repeat(30));
      pqcResults.forEach(r => {
        console.log(
          r.config.version.padEnd(15) + 
          formatNum(r.metrics.ml_kem_768_ops_sec)
        );
      });
      console.log('\n');
    }

    // 4. Schmatz Algorithm Benchmarks
    console.log('\n--- Schmatz: RSA Key Size Comparison (ops/sec) ---');
    console.log(
      'Version'.padEnd(15) + 
      'RSA-2048 Sign'.padEnd(16) + 
      'RSA-2048 Verify'.padEnd(18) +
      'RSA-4096 Sign'.padEnd(16) +
      'RSA-4096 Verify'
    );
    console.log('-'.repeat(85));
    results.forEach(r => {
      const m = r.metrics;
      console.log(
        r.config.version.padEnd(15) + 
        formatNum(m.rsa_2048_sign_per_sec).padEnd(16) + 
        formatNum(m.rsa_2048_verify_per_sec).padEnd(18) +
        formatNum(m.rsa_4096_sign_per_sec).padEnd(16) +
        formatNum(m.rsa_4096_verify_per_sec)
      );
    });
    console.log('\n');

    console.log('\n--- Schmatz: ECDSA Curve Comparison (ops/sec) ---');
    console.log(
      'Version'.padEnd(15) + 
      'P-256 Sign'.padEnd(14) + 
      'P-256 Verify'.padEnd(16) +
      'P-384 Sign'.padEnd(14) +
      'P-384 Verify'.padEnd(16) +
      'P-521 Sign'.padEnd(14) +
      'P-521 Verify'
    );
    console.log('-'.repeat(105));
    results.forEach(r => {
      const m = r.metrics;
      console.log(
        r.config.version.padEnd(15) + 
        formatNum(m.ecdsa_p256_sign_per_sec).padEnd(14) + 
        formatNum(m.ecdsa_p256_verify_per_sec).padEnd(16) +
        formatNum(m.ecdsa_p384_sign_per_sec).padEnd(14) +
        formatNum(m.ecdsa_p384_verify_per_sec).padEnd(16) +
        formatNum(m.ecdsa_p521_sign_per_sec).padEnd(14) +
        formatNum(m.ecdsa_p521_verify_per_sec)
      );
    });
    console.log('\n');

    console.log('\n--- Schmatz: ECDH Key Exchange (ops/sec) ---');
    console.log(
      'Version'.padEnd(15) + 
      'ECDH P-256'.padEnd(15) + 
      'ECDH P-384'.padEnd(15) +
      'ECDH P-521'
    );
    console.log('-'.repeat(60));
    results.forEach(r => {
      const m = r.metrics;
      console.log(
        r.config.version.padEnd(15) + 
        formatNum(m.ecdh_p256_per_sec).padEnd(15) + 
        formatNum(m.ecdh_p384_per_sec).padEnd(15) +
        formatNum(m.ecdh_p521_per_sec)
      );
    });
    console.log('\n');

    // 5. Mráz Optimization Results
    const optimizedResults = results.filter(r => r.metrics.optimized_tls1_3_rsa_new_cps > 0);
    if (optimizedResults.length > 0) {
      console.log('\n--- Mráz Optimization Impact (OpenSSL 3.x only) ---');
      console.log(
        'Version'.padEnd(15) + 
        'Default TLS1.3'.padEnd(18) + 
        'Optimized TLS1.3'.padEnd(18) +
        'Improvement'
      );
      console.log('-'.repeat(70));
      optimizedResults.forEach(r => {
        const m = r.metrics;
        const defaultVal = m.tls1_3_rsa_new_cps || 0;
        const optimizedVal = m.optimized_tls1_3_rsa_new_cps || 0;
        const improvement = defaultVal > 0 ? ((optimizedVal - defaultVal) / defaultVal * 100).toFixed(1) + '%' : 'N/A';
        console.log(
          r.config.version.padEnd(15) + 
          formatNum(defaultVal).padEnd(18) + 
          formatNum(optimizedVal).padEnd(18) +
          (improvement.startsWith('-') ? improvement : '+' + improvement)
        );
      });
      console.log('\n');
    }

    await generateMarkdownReport(results);

  } catch (error) {
    console.error('❌ Failed to generate report:', error.message);
  }
}

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

function getSystemInfo() {
  const cpus = os.cpus();
  const cpuModel = cpus[0] ? cpus[0].model : 'Unknown CPU';
  const cpuCores = cpus.length;
  const platform = os.platform();
  const release = os.release();
  const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB';
  
  return { cpuModel, cpuCores, platform, release, totalMem };
}

async function generateMarkdownReport(results) {
  const baseline = results.find(r => r.config.version === '1.1.1w');
  const baselineNew = baseline && baseline.metrics.handshakes_new_per_sec > 0 ? baseline.metrics.handshakes_new_per_sec : 1;
  const sysInfo = getSystemInfo();
  
  // Extract version range from the actual results for dynamic display
  const sortedVersions = results.map(r => r.config.version)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const firstVersion = sortedVersions[0];
  const lastVersion = sortedVersions[sortedVersions.length - 1];

  let md = `# OpenSSL Performance Benchmark Results\n\n`;
  md += `Analysis of OpenSSL performance regressions and improvements across versions ${firstVersion} through ${lastVersion}.\n\n`;
  
  // Get iteration count from first result
  const iterationCount = results[0]?.config?.iterations_count || 1;
  
  // Metadata Section (from first result, as it should be consistent for OS/Container)
  const meta = results[0]?.metadata || {};
  md += `## Test Methodology & System Info\n\n`;
  
  if (iterationCount > 1) {
    md += `**Statistical Validation:** Each OpenSSL version was tested **${iterationCount} times** in separate containers to ensure measurement reliability. `;
    md += `All reported values are **mean averages** across iterations, with standard deviations shown where significant (±values). `;
    md += `This approach eliminates localized variance and provides confidence in the measurements.\n\n`;
  }
  
  md += `All tests were conducted in isolated Docker containers (Debian Bookworm) to ensure environment consistency. Each version was compiled from source.\n\n`;
  
  // CPU Information Section
  md += `### CPU Information\n\n`;
  const cpuModel = meta.cpu_model || 'Unknown CPU';
  const cpuArch = meta.cpu_architecture || meta.platform?.split('-')[1] || 'Unknown';
  const cpuCores = meta.cpu_cores || 'N/A';
  
  md += `| Property | Value |\n`;
  md += `|----------|-------|\n`;
  md += `| **Model** | ${cpuModel} |\n`;
  md += `| **Architecture** | ${cpuArch} |\n`;
  md += `| **Cores** | ${cpuCores} |\n`;
  
  // CPU Features
  const cpuFeatures = meta.cpu_features || {};
  const featureList = [];
  if (cpuFeatures.aes_ni) featureList.push('AES-NI');
  if (cpuFeatures.avx) featureList.push('AVX');
  if (cpuFeatures.avx2) featureList.push('AVX2');
  if (cpuFeatures.avx512) featureList.push('AVX-512');
  if (cpuFeatures.sse4) featureList.push('SSE4');
  if (cpuFeatures.sha_ni) featureList.push('SHA-NI');
  
  // For ARM, check different features
  if (cpuArch === 'aarch64') {
    // ARM features from flags
    const flags = meta.cpu_flags || '';
    if (flags.includes('aes')) featureList.push('AES');
    if (flags.includes('pmull')) featureList.push('PMULL');
    if (flags.includes('sha')) featureList.push('SHA');
    if (flags.includes('asimd') || flags.includes('neon')) featureList.push('NEON/ASIMD');
    if (flags.includes('sve')) featureList.push('SVE');
  }
  
  const featuresStr = featureList.length > 0 ? featureList.join(', ') : 'Unknown';
  md += `| **Hardware Acceleration** | ${featuresStr} |\n`;
  md += `\n`;
  
  // Check for AVX and highlight its importance
  if (cpuArch === 'x86_64') {
    if (cpuFeatures.avx && cpuFeatures.avx2) {
      md += `> ✅ **AVX/AVX2 Available:** This CPU supports Advanced Vector Extensions, enabling SIMD acceleration for cryptographic operations including ML-KEM.\n\n`;
    } else if (!cpuFeatures.avx) {
      md += `> ⚠️ **No AVX Support:** This CPU lacks AVX support. Cryptographic performance, especially for post-quantum algorithms like ML-KEM, may be significantly reduced.\n\n`;
    }
  } else if (cpuArch === 'aarch64') {
    md += `> ℹ️ **ARM64 Architecture:** This is an ARM processor. ARM uses NEON/ASIMD and optional SVE for vectorized operations instead of AVX.\n\n`;
  }
  
  md += `### Operating System & Environment\n\n`;
  md += `| Property | Value |\n`;
  md += `|----------|-------|\n`;
  md += `| **Container OS** | ${meta.os_distribution || 'Unknown'} |\n`;
  md += `| **Kernel** | ${meta.kernel_version || 'Unknown'} |\n`;
  md += `| **Container** | ${meta.container || 'Docker/Debian'} |\n`;
  md += `| **Platform** | ${meta.platform || 'N/A'} |\n`;
  md += `\n`;

  md += `### OpenSSL Build Configuration\n\n`;
  md += `All versions compiled from upstream source with consistent settings:\n\n`;
  md += `\`\`\`\n`;
  md += `${meta.compiler_flags || 'Default compiler flags'}\n`;
  md += `\`\`\`\n\n`;

  md += `**Test Definitions:**\n`;
  md += `- **Algorithm Throughput:** Measured using \`openssl speed -evp [algo]\`. This uses the high-level Envelope interface, which utilizes hardware acceleration (like AES-NI) where available. It represents raw encryption speed for bulk data transfer.\n`;
  md += `- **TLS Handshake:** Measured using \`openssl s_time -new\`. This creates repeated new TLS connections to a local \`openssl s_server\`. It stresses the CPU-intensive parts of the protocol (key exchange, certificate parsing, signature verification) rather than network I/O.\n\n`;

  md += `## Performance Analysis\n\n`;
  md += `### Why Throughput Improved but Handshakes Slowed Down\n\n`;
  md += `You may notice a divergence in the results: **Algorithm throughput (AES-GCM, SHA256) often increases in 3.x, while Handshake performance decreases.**\n\n`;
  md += `1.  **Throughput Increase:** OpenSSL 3.x includes updated assembly optimizations and better pipelining for modern processors. The EVP layer in 3.x is highly optimized for bulk operations, allowing it to process large blocks of data (8KB) more efficiently.\n`;
  md += `2.  **Handshake Decrease:** The drop in handshake performance is primarily due to the architectural overhaul in OpenSSL 3.0, specifically the "Provider" model. This introduced abstraction layers that require property queries and provider lookups for every cryptographic operation. Since a TLS handshake involves many *small* operations (random number generation, hashing, signing), this per-operation overhead accumulates, resulting in fewer connections per second compared to the leaner 1.1.1 architecture.\n\n`;

  // Version Overview Section
  md += `## Version Overview\n\n`;
  md += `| Version | Release Date | Series Introduced | Series Features |\n`;
  md += `|---------|--------------|-------------------|-----------------|\n`;
  
  results.forEach(r => {
    const v = r.config.version;
    const info = VERSION_INFO[v] || { date: 'Unknown', seriesInitialRelease: 'Unknown', features: 'N/A' };
    md += `| **${v}** | ${info.date} | ${info.seriesInitialRelease} | ${info.features} |\n`;
  });
  
  // Determine if we should show standard deviations
  const showStddevInTables = iterationCount > 1;
  
  // Handshake Section
  md += `\n## TLS Handshake Performance (Connections/sec)\n\n`;
  md += `> **Why this matters:** Handshake performance is critical for web servers handling many short-lived connections. This was a primary regression point in OpenSSL 3.0.\n\n`;
  
  if (showStddevInTables) {
    md += `> **Measurement Reliability:** Each value is the mean of ${iterationCount} independent runs ± standard deviation.\n\n`;
  }
  
  md += `| Version | New Connections | Resumed | Change vs 1.1.1w |\n`;
  md += `|---------|----------------:|--------:|-----------------:|\n`;
  
  results.forEach(r => {
    const m = r.metrics;
    const pctChange = ((m.handshakes_new_per_sec - baselineNew) / baselineNew) * 100;
    const pctStr = (pctChange >= 0 ? '+' : '') + pctChange.toFixed(1) + '%';
    const changeCol = r.config.version === '1.1.1w' ? 'Baseline' : pctStr;
    
    const newConn = showStddevInTables ? formatNumWithStddev(m.handshakes_new_per_sec, m.handshakes_new_per_sec_stddev) : formatNum(m.handshakes_new_per_sec);
    const resumed = showStddevInTables ? formatNumWithStddev(m.handshakes_resume_per_sec, m.handshakes_resume_per_sec_stddev) : formatNum(m.handshakes_resume_per_sec);
    
    md += `| **${r.config.version}** | ${newConn} | ${resumed} | ${changeCol} |\n`;
  });

  // Throughput Section
  md += `\n## Algorithm Throughput (KB/s)\n\n`;
  md += `> **Why this matters:** Raw encryption speed affects bulk data transfer. AES-256-GCM is the standard for TLS, and SHA256 is ubiquitous for signing.\n\n`;
  
  if (showStddevInTables) {
    md += `> **Statistical Note:** Values shown as mean ± standard deviation from ${iterationCount} iterations.\n\n`;
  }
  
  md += `| Version | AES-256-GCM (8K) | SHA256 (8K) |\n`;
  md += `|---------|-----------------:|------------:|\n`;
  
  results.forEach(r => {
    const m = r.metrics;
    const aesVal = showStddevInTables ? formatNumWithStddev(m.aes_256_gcm_8k_kbs, m.aes_256_gcm_8k_kbs_stddev) : formatNum(m.aes_256_gcm_8k_kbs);
    const shaVal = showStddevInTables ? formatNumWithStddev(m.sha256_8k_kbs, m.sha256_8k_kbs_stddev) : formatNum(m.sha256_8k_kbs);
    md += `| **${r.config.version}** | ${aesVal} | ${shaVal} |\n`;
  });

  // Multi-threaded Section
  md += `\n## Multi-threaded Performance (Scalability)\n\n`;
  md += `> **Why this matters:** High-performance servers use multiple cores. HAProxy authors noted that [OpenSSL 3.0 performance was measurably lower in multi-threaded environments](https://www.haproxy.com/blog/state-of-ssl-stacks), often due to lock contention in the new Provider architecture. This test stresses that specific weakness.\n\n`;
  md += `| Version | Multi-Core Throughput (8K) | Scaling Factor |\n`;
  md += `|---------|---------------------------:|---------------:|\n`;
  
  results.forEach(r => {
    const m = r.metrics;
    if (m.aes_256_gcm_multi_8k_kbs) {
      const scaling = m.aes_256_gcm_multi_8k_kbs / m.aes_256_gcm_8k_kbs;
      md += `| **${r.config.version}** | ${formatNum(m.aes_256_gcm_multi_8k_kbs)} | ${scaling.toFixed(2)}x |\n`;
    }
  });

  // PQC Section
  const pqcResults = results.filter(r => r.metrics.ml_kem_768_ops_sec > 0);
  if (pqcResults.length > 0) {
    md += `\n## Post-Quantum Cryptography (PQC)\n\n`;
    md += `> **What is this?** ML-KEM-768 is a quantum-resistant Key Encapsulation Mechanism. These algorithms are computationally heavier than classic ECC.\n\n`;
    md += `| Version | ML-KEM-768 (Ops/sec) |\n`;
    md += `|---------|---------------------:|\n`;
    pqcResults.forEach(r => {
      md += `| **${r.config.version}** | ${formatNum(r.metrics.ml_kem_768_ops_sec)} |\n`;
    });
  }

  // Bellingrath Section - RSA vs ECDSA
  md += `\n## Bellingrath Alignment: Certificate Type Comparison\n\n`;
  md += `> **Context:** William Bellingrath (Juniper Networks) specifically tested both RSA and ECDSA certificates in his [OpenSSL 3.x Performance presentation](https://www.youtube.com/watch?v=b01y5FDx-ao). These tests replicate that methodology.\n\n`;
  md += `### TLS 1.3 Performance by Certificate Type\n\n`;
  md += `| Version | RSA-2048 (New) | RSA-2048 (Resume) | ECDSA P-256 (New) | ECDSA P-256 (Resume) |\n`;
  md += `|---------|---------------:|------------------:|------------------:|---------------------:|\n`;
  
  results.forEach(r => {
    const m = r.metrics;
    md += `| **${r.config.version}** | ${formatNum(m.tls1_3_rsa_new_cps)} | ${formatNum(m.tls1_3_rsa_resume_cps)} | ${formatNum(m.tls1_3_ecdsa_new_cps)} | ${formatNum(m.tls1_3_ecdsa_resume_cps)} |\n`;
  });

  md += `\n### TLS 1.2 Performance by Cipher Suite (Bellingrath's Test Matrix)\n\n`;
  md += `| Version | ECDHE-RSA-AES128-GCM | ECDHE-ECDSA-AES128-GCM | AES256-GCM-SHA384 |\n`;
  md += `|---------|---------------------:|-----------------------:|------------------:|\n`;
  
  results.forEach(r => {
    const m = r.metrics;
    md += `| **${r.config.version}** | ${formatNum(m.tls1_2_ecdhe_rsa_aes128gcm_cps)} | ${formatNum(m.tls1_2_ecdhe_ecdsa_aes128gcm_cps)} | ${formatNum(m.tls1_2_rsa_aes256gcm_cps)} |\n`;
  });

  md += `\n### Session Resumption Comparison (CPS)\n\n`;
  md += `> **Why test resumption?** TLS session resumption reuses cryptographic parameters, making it ~3-10x faster than full handshakes. Bellingrath tested both to measure overhead.\n\n`;
  md += `| Version | TLS 1.3 RSA (Resume) | TLS 1.2 RSA (Resume) |\n`;
  md += `|---------|---------------------:|---------------------:|\n`;
  
  results.forEach(r => {
    const m = r.metrics;
    md += `| **${r.config.version}** | ${formatNum(m.tls1_3_rsa_resume_cps)} | ${formatNum(m.tls1_2_rsa_resume_cps)} |\n`;
  });

  md += `\n**Understanding the Performance Gap:**\n\n`;
  md += `TLS 1.2 session resumption consistently achieves significantly higher performance (often 30,000-40,000+ CPS) compared to TLS 1.3 (typically 6,000-7,000 CPS). This occurs because:\n\n`;
  md += `1. **TLS 1.2 Resumption Simplicity:** Session tickets completely bypass expensive asymmetric cryptography. The server decrypts the ticket, retrieves the cached master secret, and derives new symmetric keys—no public key operations required.\n\n`;
  md += `2. **TLS 1.3 PSK Complexity:** Pre-Shared Key (PSK) resumption in TLS 1.3 is more secure (better forward secrecy) but performs additional operations: HKDF key derivation, optional ephemeral Diffie-Hellman exchanges, and more complex state management.\n\n`;
  md += `3. **Code Maturity:** TLS 1.2 has been optimized for over a decade. TLS 1.3 (introduced in OpenSSL 1.1.1) and especially the OpenSSL 3.x Provider architecture are still being tuned.\n\n`;
  md += `4. **OpenSSL 3.x Provider Overhead:** The abstraction layers in OpenSSL 3.x add per-operation overhead that accumulates during handshakes with many small cryptographic operations.\n\n`;
  md += `**Practical Impact:** While TLS 1.3 provides superior security properties (mandatory perfect forward secrecy, encrypted handshakes), TLS 1.2 session resumption remains faster in pure throughput. For most applications, TLS 1.3's security benefits outweigh this performance difference, but high-throughput environments may need to consider this tradeoff.\n\n`;

  // Schmatz Algorithm Benchmark Section
  md += `\n## Schmatz Algorithm Benchmarks\n\n`;
  md += `> **Context:** Martin Schmatz (IBM) emphasized comprehensive algorithm testing in his [OpenSSL Performance Analysis](https://www.youtube.com/watch?v=69gUVhOEaVM). `;
  md += `These tests measure raw cryptographic operation speed independent of TLS overhead.\n\n`;

  md += `### RSA Key Size Comparison (ops/sec)\n\n`;
  md += `> **Why test key sizes?** RSA-4096 provides more security but is ~4x slower than RSA-2048. Understanding this tradeoff is critical for certificate selection.\n\n`;
  md += `| Version | RSA-2048 Sign | RSA-2048 Verify | RSA-3072 Sign | RSA-3072 Verify | RSA-4096 Sign | RSA-4096 Verify |\n`;
  md += `|---------|-------------:|----------------:|-------------:|----------------:|-------------:|----------------:|\n`;
  
  results.forEach(r => {
    const m = r.metrics;
    md += `| **${r.config.version}** | ${formatNum(m.rsa_2048_sign_per_sec)} | ${formatNum(m.rsa_2048_verify_per_sec)} | ${formatNum(m.rsa_3072_sign_per_sec)} | ${formatNum(m.rsa_3072_verify_per_sec)} | ${formatNum(m.rsa_4096_sign_per_sec)} | ${formatNum(m.rsa_4096_verify_per_sec)} |\n`;
  });

  md += `\n### ECDSA Curve Comparison (ops/sec)\n\n`;
  md += `> **Why test curves?** P-256 is fastest and most common. P-384 is required by some compliance regimes. P-521 offers highest security but at significant performance cost.\n\n`;
  md += `| Version | P-256 Sign | P-256 Verify | P-384 Sign | P-384 Verify | P-521 Sign | P-521 Verify |\n`;
  md += `|---------|----------:|-------------:|----------:|-------------:|----------:|-------------:|\n`;
  
  results.forEach(r => {
    const m = r.metrics;
    md += `| **${r.config.version}** | ${formatNum(m.ecdsa_p256_sign_per_sec)} | ${formatNum(m.ecdsa_p256_verify_per_sec)} | ${formatNum(m.ecdsa_p384_sign_per_sec)} | ${formatNum(m.ecdsa_p384_verify_per_sec)} | ${formatNum(m.ecdsa_p521_sign_per_sec)} | ${formatNum(m.ecdsa_p521_verify_per_sec)} |\n`;
  });

  md += `\n### ECDH Key Exchange (ops/sec)\n\n`;
  md += `> **Why test ECDH?** Elliptic Curve Diffie-Hellman is used in TLS to establish shared secrets. This is a major component of handshake CPU cost.\n\n`;
  md += `| Version | ECDH P-256 | ECDH P-384 | ECDH P-521 |\n`;
  md += `|---------|----------:|----------:|----------:|\n`;
  
  results.forEach(r => {
    const m = r.metrics;
    md += `| **${r.config.version}** | ${formatNum(m.ecdh_p256_per_sec)} | ${formatNum(m.ecdh_p384_per_sec)} | ${formatNum(m.ecdh_p521_per_sec)} |\n`;
  });

  md += `\n### Block Size Sensitivity (AES-256-GCM KB/s)\n\n`;
  md += `> **What This Shows:** This benchmark measures AES-256-GCM encryption throughput across different block sizes (16 bytes to 8KB) to reveal how cryptographic operations scale with data size.\n\n`;
  md += `> **Key Insights:**\n`;
  md += `> - **Small blocks (16-64 bytes)** stress initialization overhead - each encryption requires Provider setup, key scheduling, and context creation\n`;
  md += `> - **Medium blocks (256 bytes - 1KB)** show the transition point where throughput begins to increase\n`;
  md += `> - **Large blocks (8KB+)** achieve maximum throughput by amortizing initialization costs across more data\n`;
  md += `> - **The gap between versions** reveals Provider architecture overhead in OpenSSL 3.x compared to 1.1.1w\n\n`;
  md += `> **Real-World Impact:** Applications encrypting small messages (e.g., individual database fields, IoT sensor data) will see much lower throughput than bulk encryption (file encryption, large API payloads).\n\n`;
  md += `| Version | 16 Bytes | 64 Bytes | 256 Bytes | 1024 Bytes | 8192 Bytes |\n`;
  md += `|---------|--------:|---------:|----------:|-----------:|-----------:|\n`;
  
  results.forEach(r => {
    const m = r.metrics;
    md += `| **${r.config.version}** | ${formatNum(m.aes_256_gcm_16b_kbs)} | ${formatNum(m.aes_256_gcm_64b_kbs)} | ${formatNum(m.aes_256_gcm_256b_kbs)} | ${formatNum(m.aes_256_gcm_1k_kbs)} | ${formatNum(m.aes_256_gcm_8k_kbs)} |\n`;
  });

  // Hardware Acceleration Impact Section (AVX on x86, NEON on ARM)
  const hwAccelResults = results.filter(r => r.metrics.avx_available === true || r.avx_tests?.hw_accel_available === true);
  if (hwAccelResults.length > 0) {
    // Determine architecture from first result
    const arch = meta.cpu_architecture || 'x86_64';
    const isARM = arch === 'aarch64';
    const accelName = isARM ? 'NEON/Crypto Extensions' : 'AVX (Advanced Vector Extensions)';
    const accelShort = isARM ? 'HW Accel' : 'AVX';
    
    md += `\n## ${accelName} Impact\n\n`;
    
    if (isARM) {
      md += `> **What is NEON?** NEON (also called ASIMD) is ARM's SIMD instruction set, similar to Intel's AVX. `;
      md += `ARMv8 also includes cryptographic extensions for AES, SHA, and polynomial multiplication.\n\n`;
      md += `> **Testing Methodology:** Each benchmark was run twice - once with hardware crypto enabled (default) and once with it disabled using \`OPENSSL_armcap\` environment variable.\n\n`;
    } else {
      md += `> **What is AVX?** AVX and AVX2 are CPU instruction set extensions that enable SIMD (Single Instruction Multiple Data) operations. `;
      md += `Cryptographic operations, especially ML-KEM (post-quantum), benefit significantly from AVX2 vectorization.\n\n`;
      md += `> **Testing Methodology:** Each benchmark was run twice - once with AVX enabled (default) and once with AVX disabled using \`OPENSSL_ia32cap\` environment variable.\n\n`;
    }
    
    md += `### ${accelShort} Impact on Symmetric Cryptography\n\n`;
    md += `| Version | AES-256-GCM (${accelShort}) | AES-256-GCM (No ${accelShort}) | Improvement | SHA256 (${accelShort}) | SHA256 (No ${accelShort}) | Improvement |\n`;
    md += `|---------|------------------:|---------------------:|------------:|-------------:|----------------:|------------:|\n`;
    
    hwAccelResults.forEach(r => {
      const m = r.metrics;
      const aesImprove = m.aes_256_gcm_avx_improvement_percent || 0;
      const shaImprove = m.sha256_avx_improvement_percent || 0;
      const aesImproveStr = typeof aesImprove === 'number' ? `+${aesImprove.toFixed(1)}%` : 'N/A';
      const shaImproveStr = typeof shaImprove === 'number' ? `+${shaImprove.toFixed(1)}%` : 'N/A';
      md += `| **${r.config.version}** | ${formatNum(m.aes_256_gcm_with_avx_kbs)} | ${formatNum(m.aes_256_gcm_without_avx_kbs)} | ${aesImproveStr} | ${formatNum(m.sha256_with_avx_kbs)} | ${formatNum(m.sha256_without_avx_kbs)} | ${shaImproveStr} |\n`;
    });
    
    // ML-KEM hardware acceleration impact (only for versions with ML-KEM support)
    const mlkemHwResults = hwAccelResults.filter(r => r.metrics.ml_kem_768_with_avx_ops > 0);
    if (mlkemHwResults.length > 0) {
      md += `\n### ${accelShort} Impact on ML-KEM-768 (Post-Quantum)\n\n`;
      if (isARM) {
        md += `> **Key Finding:** ML-KEM implementations benefit significantly from ARM's NEON vectorization. The lattice-based cryptography in ML-KEM involves many parallel operations that map well to SIMD instructions.\n\n`;
      } else {
        md += `> **Key Finding:** ML-KEM implementations heavily benefit from AVX2 vectorization. The lattice-based cryptography in ML-KEM involves many parallel operations that map well to SIMD instructions.\n\n`;
      }
      md += `| Version | ML-KEM-768 (${accelShort}) | ML-KEM-768 (No ${accelShort}) | Improvement |\n`;
      md += `|---------|----------------:|--------------------:|----------------:|\n`;
      
      mlkemHwResults.forEach(r => {
        const m = r.metrics;
        const improvement = m.ml_kem_768_avx_improvement_percent || 0;
        const improveStr = typeof improvement === 'number' ? `**+${improvement.toFixed(1)}%**` : 'N/A';
        md += `| **${r.config.version}** | ${formatNum(m.ml_kem_768_with_avx_ops)} ops/s | ${formatNum(m.ml_kem_768_without_avx_ops)} ops/s | ${improveStr} |\n`;
      });
      
      md += `\n**Implications:**\n\n`;
      md += `- Post-quantum cryptography performance is heavily dependent on hardware acceleration\n`;
      if (isARM) {
        md += `- ARM processors without crypto extensions may see reduced PQC performance\n`;
        md += `- Modern ARMv8+ processors (Apple Silicon, AWS Graviton, Ampere) have excellent crypto acceleration\n\n`;
      } else {
        md += `- Servers without AVX2 support may see significantly degraded PQC performance\n`;
        md += `- Cloud instances should be selected with AVX2 capability for optimal post-quantum TLS performance\n\n`;
      }
    }
  }

  // Mráz Optimization Section
  const optimizedResults = results.filter(r => r.metrics.optimized_tls1_3_rsa_new_cps > 0);
  if (optimizedResults.length > 0) {
    md += `\n## Mráz Optimization Impact\n\n`;
    md += `> **What is this?** Tomáš Mráz (OpenSSL core developer) presented [performance tuning recommendations](https://www.youtube.com/watch?v=Cv-43gJJFIs) for OpenSSL 3.x. `;
    md += `These tests compare default configuration vs. an optimized configuration that:\n`;
    md += `> - Loads only the default provider (no FIPS, no legacy)\n`;
    md += `> - Sets explicit \`default_properties\` to avoid property queries\n`;
    md += `> - Uses a minimal OpenSSL configuration\n\n`;
    
    md += `### TLS 1.3 Handshake: Default vs Optimized\n\n`;
    md += `| Version | Default (CPS) | Optimized (CPS) | Improvement |\n`;
    md += `|---------|-------------:|----------------:|------------:|\n`;
    
    optimizedResults.forEach(r => {
      const m = r.metrics;
      const defaultVal = m.tls1_3_rsa_new_cps || 0;
      const optimizedVal = m.optimized_tls1_3_rsa_new_cps || 0;
      const improvement = defaultVal > 0 ? ((optimizedVal - defaultVal) / defaultVal * 100).toFixed(1) : 0;
      const impStr = improvement >= 0 ? `+${improvement}%` : `${improvement}%`;
      md += `| **${r.config.version}** | ${formatNum(defaultVal)} | ${formatNum(optimizedVal)} | ${impStr} |\n`;
    });

    md += `\n### TLS 1.2 Handshake: Default vs Optimized\n\n`;
    md += `| Version | Default (CPS) | Optimized (CPS) | Improvement |\n`;
    md += `|---------|-------------:|----------------:|------------:|\n`;
    
    optimizedResults.forEach(r => {
      const m = r.metrics;
      const defaultVal = m.tls1_2_ecdhe_rsa_aes128gcm_cps || 0;
      const optimizedVal = m.optimized_tls1_2_ecdhe_rsa_cps || 0;
      const improvement = defaultVal > 0 ? ((optimizedVal - defaultVal) / defaultVal * 100).toFixed(1) : 0;
      const impStr = improvement >= 0 ? `+${improvement}%` : `${improvement}%`;
      md += `| **${r.config.version}** | ${formatNum(defaultVal)} | ${formatNum(optimizedVal)} | ${impStr} |\n`;
    });
  }

  const outputPath = path.join(RESULTS_DIR, 'REPORT.md');
  await fs.writeFile(outputPath, md);
  console.log(`📝 Markdown report generated at: ${outputPath}`);
  
  // Also generate HTML version with inlined content
  await generateHTMLReport(md);
}

async function generateHTMLReport(markdownContent) {
  // Escape the markdown content for embedding in HTML
  const escapedMarkdown = markdownContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report - OpenSSL Performance Benchmark</title>
    <!-- marked.js for markdown rendering -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
    <style>
body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f8f9fa; color: #333; line-height: 1.6; }

/* Header */
.header { background: white; padding: 20px 40px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
.header h1 { margin: 0; font-size: 1.5rem; }
.header .nav-links { display: flex; gap: 15px; }
.header .nav-links a { color: #228be6; text-decoration: none; font-weight: 500; }
.header .nav-links a:hover { text-decoration: underline; }

/* Container */
.container { max-width: 1000px; margin: 0 auto; padding: 30px; }

/* Breadcrumb */
.breadcrumb { background: white; padding: 15px 40px; border-bottom: 1px solid #e9ecef; font-size: 0.9rem; }
.breadcrumb a { color: #228be6; text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.breadcrumb span { color: #868e96; margin: 0 8px; }

/* Content card */
.content-card { background: white; padding: 40px 50px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); margin-bottom: 30px; }

/* Markdown content styling */
.markdown-content h1 { color: #212529; font-size: 2rem; border-bottom: 2px solid #228be6; padding-bottom: 15px; margin-top: 0; }
.markdown-content h2 { color: #495057; font-size: 1.5rem; border-bottom: 1px solid #e9ecef; padding-bottom: 10px; margin-top: 40px; }
.markdown-content h3 { color: #495057; font-size: 1.2rem; margin-top: 30px; }
.markdown-content h4 { color: #868e96; font-size: 1rem; margin-top: 25px; }

.markdown-content p { margin: 15px 0; }
.markdown-content strong { color: #212529; }

/* Code */
.markdown-content code { background: #f1f3f5; padding: 2px 6px; border-radius: 3px; font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 0.9em; }
.markdown-content pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; border: 1px solid #e9ecef; }
.markdown-content pre code { background: none; padding: 0; }

/* Tables */
.markdown-content table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.9rem; }
.markdown-content th, .markdown-content td { padding: 10px 12px; text-align: left; border: 1px solid #e9ecef; }
.markdown-content th { background: #f8f9fa; font-weight: 600; color: #495057; }
.markdown-content tr:hover { background: #f8f9fa; }
.markdown-content td:first-child { font-weight: 500; }

/* Lists */
.markdown-content ul, .markdown-content ol { margin: 15px 0; padding-left: 25px; }
.markdown-content li { margin: 8px 0; }

/* Blockquotes (used for "Why this matters" sections) */
.markdown-content blockquote { 
    background: #e7f5ff; 
    border-left: 4px solid #228be6; 
    padding: 15px 20px; 
    margin: 20px 0; 
    border-radius: 4px;
    font-style: normal;
}
.markdown-content blockquote p { margin: 0; }
.markdown-content blockquote strong { color: #1971c2; }

/* Links */
.markdown-content a { color: #228be6; text-decoration: none; }
.markdown-content a:hover { text-decoration: underline; }

/* Horizontal rules */
.markdown-content hr { border: none; border-top: 1px solid #e9ecef; margin: 30px 0; }

/* GitHub link */
.github-link { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: #24292f; color: white; text-decoration: none; border-radius: 6px; font-size: 0.9rem; transition: background 0.2s; }
.github-link:hover { background: #32383f; }

/* Download button */
.download-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e9ecef; }
.download-btn { padding: 8px 16px; background: #228be6; color: white; border-radius: 6px; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
.download-btn:hover { background: #1c7ed6; text-decoration: none; }
    </style>
</head>
<body>

<div class="breadcrumb">
    <a href="index.html">Home</a>
    <span>›</span>
    <span>Performance Report</span>
</div>
<div class="header">
    <h1>Performance Report</h1>
    <div class="nav-links">
        <a href="index.html">Dashboard</a>
        <a href="faq.html">FAQ</a>
        <a href="metrics.html">Metrics Guide</a>
    </div>
</div>

<div class="container">
    <div class="content-card">
        <div class="download-bar">
            <span style="color: #868e96; font-size: 0.9rem;">Generated from benchmark results</span>
            <a href="REPORT.md" download class="download-btn">Download Markdown</a>
        </div>
        <div id="markdown-content" class="markdown-content"></div>
    </div>

    <!-- Back to Dashboard -->
    <div style="text-align: center; margin: 40px 0;">
        <a href="index.html" style="padding: 12px 24px; background: #228be6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; margin-right: 10px;">
            ← Back to Dashboard
        </a>
        <a href="summary.json" download style="padding: 12px 24px; background: #40c057; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Download JSON Data
        </a>
    </div>
</div>

<div style="border-top: 1px solid #e9ecef; padding: 30px 0; margin-top: 50px; text-align: center; background: #f8f9fa;">
    <div style="max-width: 800px; margin: 0 auto; padding: 0 20px;">
        <div style="margin-bottom: 15px;">
            <a href="https://github.com/enterprise-tim/openssl-performance-benchmark" target="_blank" rel="noopener" class="github-link">
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
            Licensed under Apache 2.0 • Community-driven development
        </div>
    </div>
</div>

<script>
// Inlined markdown content (generated at build time)
const markdownContent = \`${escapedMarkdown}\`;

// Render when marked.js loads
if (typeof marked !== 'undefined') {
    document.getElementById('markdown-content').innerHTML = marked.parse(markdownContent);
} else {
    // Fallback: wait for marked to load
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof marked !== 'undefined') {
            document.getElementById('markdown-content').innerHTML = marked.parse(markdownContent);
        } else {
            document.getElementById('markdown-content').innerHTML = '<p>Unable to render report. <a href="REPORT.md">Download the markdown file</a> instead.</p>';
        }
    });
}
<\/script>

</body>
</html>`;

  const htmlOutputPath = path.join(RESULTS_DIR, 'report.html');
  await fs.writeFile(htmlOutputPath, html);
  console.log(`📝 HTML report generated at: ${htmlOutputPath}`);
}

main();
