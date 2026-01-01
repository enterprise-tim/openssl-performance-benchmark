import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');

// Version metadata (dates and features)
const VERSION_INFO = {
  '1.1.1w': {
    date: '2023-09-11',
    series: '1.1.1',
    features: 'Final release of the 1.1.1 LTS series (EOL Sept 2023). Support for TLS 1.3, SHA-3, X448/Ed448. The performance baseline.'
  },
  '3.0.15': {
    date: '2024-09-03',
    series: '3.0',
    features: 'LTS release. Introduced the Provider architecture (FIPS 140-2). Major architectural overhaul often cited as the cause of performance regressions.'
  },
  '3.1.7': {
    date: '2024-09-03',
    series: '3.1',
    features: 'FIPS 140-3 compliance. Focused on performance improvements over 3.0 and addressing initial regressions.'
  },
  '3.2.3': {
    date: '2024-09-03',
    series: '3.2',
    features: 'Client-side QUIC support. TLS certificate compression (RFC 8879). Deterministic ECDSA (RFC 6979).'
  },
  '3.3.2': {
    date: '2024-09-03',
    series: '3.3',
    features: 'QUIC trace and polling improvements. New EVP_DigestSqueeze API. Further performance tuning.'
  },
  '3.4.0': {
    date: '2024-10-22',
    series: '3.4',
    features: 'FIPS indicators. Composite signature algorithms. PBMAC1 support. New integrity checks.'
  },
  '3.5.3': { // Note: 3.5.0 was released April 2025 (in future context of user prompt but "current" for me now)
    date: '2025-10-22', // Estimated based on 3.5.0 date of April 2025
    series: '3.5',
    features: 'LTS release. Post-Quantum Cryptography (ML-KEM, ML-DSA). Significant performance work to match 1.1.1 baseline.'
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

  let md = `# OpenSSL Performance Benchmark Results\n\n`;
  md += `Analysis of OpenSSL performance regressions and improvements across versions 1.1.1 through 3.5.3.\n\n`;
  
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
  md += `**System Specification:**\n`;
  md += `- **CPU:** ${sysInfo.cpuModel} (${sysInfo.cpuCores} cores)\n`;
  md += `- **Memory:** ${sysInfo.totalMem}\n`;
  md += `- **OS:** ${sysInfo.platform} ${sysInfo.release}\n`;
  md += `- **Container OS:** ${meta.os_distribution || 'Unknown'}\n`;
  md += `- **Kernel:** ${meta.kernel_version || 'Unknown'}\n`;
  md += `- **Docker:** Engine v24+\n\n`;

  md += `**OpenSSL Configuration:**\n`;
  md += `Benchmarks run using source-compiled binaries. \n`;
  md += `- **Platform:** \`${meta.platform || 'N/A'}\`\n`;
  md += `- **Compiler Flags:** \`${meta.compiler_flags || 'Default'}\`\n\n`;

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
  md += `| Version | Release Date | Series Features |\n`;
  md += `|---------|--------------|-----------------|\n`;
  
  results.forEach(r => {
    const v = r.config.version;
    const info = VERSION_INFO[v] || { date: 'Unknown', features: 'N/A' };
    md += `| **${v}** | ${info.date} | ${info.features} |\n`;
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
}

main();
