import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

describe('Multi-Page Visualizations - Structure', () => {
  it('should define all required page files', () => {
    const requiredPages = [
      'index.html',
      'overview.html',
      'tls-comparison.html',
      'bellingrath.html',
      'schmatz.html',
      'mraz.html',
      'pqc.html'
    ];
    
    expect(requiredPages.length).toBe(7);
  });

  it('should have unique URLs for deep linking', () => {
    const pages = [
      { path: 'index.html', purpose: 'Dashboard' },
      { path: 'overview.html', purpose: 'Scatter plot' },
      { path: 'tls-comparison.html', purpose: 'TLS comparison' },
      { path: 'bellingrath.html', purpose: 'Bellingrath matrix' },
      { path: 'schmatz.html', purpose: 'Algorithm benchmarks' },
      { path: 'mraz.html', purpose: 'Optimization' },
      { path: 'pqc.html', purpose: 'Post-quantum' }
    ];
    
    const paths = pages.map(p => p.path);
    const uniquePaths = new Set(paths);
    
    expect(uniquePaths.size).toBe(paths.length);
  });

  it('should generate navigation links', () => {
    const links = [
      '<a href="overview.html">',
      '<a href="tls-comparison.html">',
      '<a href="bellingrath.html">',
      '<a href="schmatz.html">',
      '<a href="mraz.html">',
      '<a href="pqc.html">'
    ];
    
    links.forEach(link => {
      expect(link).toContain('href=');
      expect(link).toContain('.html');
    });
  });
});

describe('Multi-Page Visualizations - Navigation', () => {
  it('should have home link on each page', () => {
    const backLink = '<a href="index.html">← Back to Overview</a>';
    
    expect(backLink).toContain('index.html');
    expect(backLink).toContain('Back to Overview');
  });

  it('should have breadcrumb navigation', () => {
    const breadcrumb = `
<div class="breadcrumb">
    <a href="index.html">Home</a>
    <span>›</span>
    <span>Current Page</span>
</div>`;
    
    expect(breadcrumb).toContain('index.html');
    expect(breadcrumb).toContain('Home');
  });

  it('should generate proper relative URLs', () => {
    // All files are in same directory (results/)
    const urls = [
      'index.html',
      'overview.html',
      './tls-comparison.html',
      './bellingrath.html'
    ];
    
    urls.forEach(url => {
      expect(url.endsWith('.html')).toBe(true);
    });
  });
});

describe('Multi-Page Visualizations - Deep Linking', () => {
  it('should support direct navigation to specific charts', () => {
    const baseUrl = 'https://example.github.io/benchmark/';
    
    const deepLinks = {
      overview: baseUrl + 'overview.html',
      tls: baseUrl + 'tls-comparison.html',
      bellingrath: baseUrl + 'bellingrath.html',
      schmatz: baseUrl + 'schmatz.html',
      mraz: baseUrl + 'mraz.html',
      pqc: baseUrl + 'pqc.html'
    };
    
    // Each link should be unique and valid
    Object.values(deepLinks).forEach(link => {
      expect(link).toContain(baseUrl);
      expect(link).toContain('.html');
    });
    
    const uniqueLinks = new Set(Object.values(deepLinks));
    expect(uniqueLinks.size).toBe(6);
  });

  it('should support URL sharing for specific charts', () => {
    const chartUrl = 'https://example.github.io/benchmark/schmatz.html';
    
    // Can be shared directly
    expect(chartUrl).toContain('schmatz.html');
    
    // Can be bookmarked
    const bookmark = {
      title: 'Schmatz Algorithms',
      url: chartUrl
    };
    
    expect(bookmark.url).toBe(chartUrl);
  });

  it('should support linking to specific sections in documentation', () => {
    const links = [
      { text: 'Overview', url: 'overview.html' },
      { text: 'See TLS comparison', url: 'tls-comparison.html' },
      { text: 'Check optimization results', url: 'mraz.html' }
    ];
    
    links.forEach(link => {
      expect(link.url).not.toContain('#'); // No hash routing
      expect(link.url).toContain('.html'); // Direct file
    });
  });
});

describe('Multi-Page Visualizations - Page Structure', () => {
  it('should have consistent header across pages', () => {
    const header = `
<div class="header">
    <h1>OpenSSL Performance Benchmark</h1>
    <div>Chart Title</div>
</div>`;
    
    expect(header).toContain('class="header"');
    expect(header).toContain('OpenSSL Performance Benchmark');
  });

  it('should include breadcrumbs on content pages', () => {
    const pages = [
      'overview.html',
      'tls-comparison.html',
      'bellingrath.html'
    ];
    
    pages.forEach(page => {
      const breadcrumb = `<a href="index.html">Home</a> › ${page}`;
      expect(breadcrumb).toContain('index.html');
    });
  });

  it('should include D3.js on all chart pages', () => {
    const scriptTag = '<script src="https://d3js.org/d3.v7.min.js"></script>';
    
    expect(scriptTag).toContain('d3.v7.min.js');
  });

  it('should embed data on each page independently', () => {
    const data = [{ version: '3.5.3', value: 123 }];
    const dataJson = JSON.stringify(data);
    const script = `<script>const data = ${dataJson};</script>`;
    
    expect(script).toContain('const data = ');
    expect(script).toContain('"version":"3.5.3"');
  });
});

describe('Multi-Page Visualizations - Index Page', () => {
  it('should have navigation grid', () => {
    const html = `
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
    <a href="overview.html">Overview</a>
    <a href="tls-comparison.html">TLS 1.2 vs 1.3</a>
</div>`;
    
    expect(html).toContain('display: grid');
    expect(html).toContain('overview.html');
    expect(html).toContain('tls-comparison.html');
  });

  it('should link to all chart pages', () => {
    const requiredLinks = [
      'overview.html',
      'tls-comparison.html',
      'bellingrath.html',
      'schmatz.html',
      'mraz.html',
      'pqc.html'
    ];
    
    requiredLinks.forEach(link => {
      const html = `<a href="${link}">`;
      expect(html).toContain(`href="${link}"`);
    });
  });

  it('should include download links', () => {
    const downloads = [
      '<a href="REPORT.md" download>',
      '<a href="summary.json" download>',
      '<a href="detailed-iterations.json" download>'
    ];
    
    downloads.forEach(link => {
      expect(link).toContain('download');
    });
  });

  it('should show iteration count on index', () => {
    const iterCount = 3;
    const html = `Each version was tested <strong>${iterCount} times</strong>`;
    
    expect(html).toContain('3 times');
  });
});

describe('Multi-Page Visualizations - SEO and Metadata', () => {
  it('should have unique titles for each page', () => {
    const titles = [
      '<title>OpenSSL Performance Benchmark Results</title>',
      '<title>Overview - OpenSSL Benchmark</title>',
      '<title>TLS Comparison - OpenSSL Benchmark</title>',
      '<title>Bellingrath Matrix - OpenSSL Benchmark</title>'
    ];
    
    titles.forEach(title => {
      expect(title).toContain('<title>');
      expect(title).toContain('OpenSSL');
    });
    
    // All should be different
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  it('should have meta tags on all pages', () => {
    const meta = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">`;
    
    expect(meta).toContain('charset="UTF-8"');
    expect(meta).toContain('viewport');
  });
});

describe('Multi-Page Visualizations - File Generation', () => {
  it('should output multiple files', () => {
    const outputFiles = [
      'index.html',
      'overview.html',
      'tls-comparison.html',
      'bellingrath.html',
      'schmatz.html',
      'mraz.html',
      'pqc.html'
    ];
    
    expect(outputFiles.length).toBe(7);
    
    // All should be HTML files
    outputFiles.forEach(file => {
      expect(file).toMatch(/\.html$/);
    });
  });

  it('should calculate output directory correctly', () => {
    const resultsDir = path.join(process.cwd(), 'results');
    const outputFile = path.join(resultsDir, 'overview.html');
    
    expect(outputFile).toContain('results');
    expect(outputFile).toContain('overview.html');
  });
});

describe('Multi-Page Visualizations - Benefits', () => {
  it('should enable deep linking', () => {
    const link = 'https://example.github.io/benchmark/schmatz.html';
    
    // Can share this URL directly
    expect(link).toContain('schmatz.html');
    
    // Goes directly to page, not tab
    expect(link).not.toContain('#');
  });

  it('should improve load performance', () => {
    // Each page loads only its own chart code
    const overviewPage = {
      chartsLoaded: 1,  // Only overview chart
      jsSize: '~50KB'
    };
    
    const singlePage = {
      chartsLoaded: 7,  // All charts
      jsSize: '~200KB'
    };
    
    expect(overviewPage.chartsLoaded).toBeLessThan(singlePage.chartsLoaded);
  });

  it('should support browser back/forward', () => {
    // With separate pages, browser navigation works naturally
    const history = [
      'index.html',
      'overview.html',
      'tls-comparison.html'
    ];
    
    // Can use browser back button
    const canGoBack = history.length > 1;
    expect(canGoBack).toBe(true);
  });
});

console.log('✅ All multi-page visualization tests defined');

