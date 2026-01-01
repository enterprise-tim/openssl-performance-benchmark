# Multi-Page Visualization - Implementation Summary

## Overview

The visualization system has been refactored from a single-page application (SPA) to **multiple separate HTML pages** for better deep linking, shareability, and performance.

---

## Why Multi-Page?

### Before (Single-Page App)

```
One file: visualizations.html
  ├─ Tab 1: Overview (with # routing)
  ├─ Tab 2: TLS Comparison
  ├─ Tab 3: Bellingrath
  ... (all on same page)
```

**Problems:**
- - Can't deep link to specific charts
- - Can't share URL to specific section
- - Loads all chart code at once
- - Browser back/forward doesn't work well

### After (Multi-Page)

```
results/
├── index.html (dashboard with links)
├── overview.html (scatter plot)
├── tls-comparison.html (slope chart)
├── bellingrath.html (RSA vs ECDSA)
├── schmatz.html (algorithm benchmarks)
├── mraz.html (optimization comparison)
└── pqc.html (post-quantum)
```

**Benefits:**
- - **Deep linking:** Share `overview.html` directly
- - **Bookmarkable:** Bookmark specific charts
- - **Faster loading:** Each page loads only its code
- - **Browser navigation:** Back/forward works naturally
- - **SEO friendly:** Each page has unique title
- - **Easier maintenance:** Separate concerns

---

## Page Structure

### 1. `index.html` - Dashboard/Home

**Purpose:** Navigation hub with links to all charts

**Contents:**
- Overview of benchmark system
- Grid of chart links with descriptions
- Download links (REPORT.md, summary.json, etc.)
- Iteration count display
- Generation timestamp

**URL:** `https://your-site.github.io/index.html`

---

### 2. `overview.html` - Scatter Plot

**Chart:** Throughput vs Handshakes with error bars

**Purpose:** Shows performance tradeoffs across versions

**Features:**
- X-axis error bars (throughput stddev)
- Y-axis error bars (handshake stddev)
- Color-coded by series
- Interactive tooltips with statistics

**URL:** `https://your-site.github.io/overview.html`

---

### 3. `tls-comparison.html` - Slope Chart

**Chart:** TLS 1.2 vs TLS 1.3 comparison

**Purpose:** Shows protocol performance differences

**Features:**
- Slope lines connecting TLS versions
- Percentage change labels
- Color-coded by improvement/regression
- Interactive tooltips

**URL:** `https://your-site.github.io/tls-comparison.html`

---

### 4. `bellingrath.html` - Test Matrix

**Charts:** 
- RSA vs ECDSA grouped bar chart
- Session resumption comparison

**Purpose:** Certificate type and resumption analysis

**Features:**
- Toggle between absolute and relative views
- Multiple charts on one page
- Aligned with Bellingrath's methodology

**URL:** `https://your-site.github.io/bellingrath.html`

---

### 5. `schmatz.html` - Algorithm Benchmarks

**Charts:**
- RSA sign/verify performance
- ECDSA sign/verify performance
- Block size sensitivity line chart

**Purpose:** Detailed algorithm performance

**Features:**
- Multiple charts in grid layout
- Comparison across key sizes
- Curve performance comparison

**URL:** `https://your-site.github.io/schmatz.html`

---

### 6. `mraz.html` - Optimization Analysis

**Charts:**
- Default vs optimized comparison
- Improvement percentage

**Purpose:** Shows Mráz optimization impact

**Features:**
- Side-by-side comparison
- Percentage improvement visualization
- Only for OpenSSL 3.x

**URL:** `https://your-site.github.io/mraz.html`

---

### 7. `pqc.html` - Post-Quantum Cryptography

**Chart:** ML-KEM-768 performance

**Purpose:** Post-quantum readiness testing

**Features:**
- Simple bar chart
- Only shows OpenSSL 3.5+ data
- Fallback message if no data

**URL:** `https://your-site.github.io/pqc.html`

---

## Deep Linking Examples

### Share Specific Chart

```
Email: "Check out the TLS comparison results:"
Link: https://your-org.github.io/openssl-benchmark/tls-comparison.html
```

### Link from Documentation

```markdown
For RSA vs ECDSA comparison, see [Bellingrath Matrix](./bellingrath.html).
```

### Bookmark Specific Section

```
Browser Bookmark:
  Title: "OpenSSL - Mráz Optimization"
  URL: https://your-org.github.io/openssl-benchmark/mraz.html
```

### Reference in Report

```markdown
## Performance Analysis

The scatter plot shows clear tradeoffs between throughput and handshakes:
[View Interactive Chart](overview.html)

For TLS protocol comparison:
[View TLS 1.2 vs 1.3 Analysis](tls-comparison.html)
```

---

## Implementation

### Generator Script

**File:** `scripts/generate-viz-multipage.js`

**Features:**
- Creates 7 separate HTML files
- Shared CSS and utilities
- Consistent styling
- Embedded data in each file
- Breadcrumb navigation
- Back buttons

### Usage

```bash
# Generate multi-page visualizations
npm run generate-viz

# Output: 7 HTML files in results/
```

### Backward Compatibility

The old single-page version is still available:

```bash
# Generate single-page version
npm run generate-viz:single

# Output: results/visualizations.html
```

---

## File Structure

```
results/
├── index.html                    # Dashboard (navigation)
├── overview.html                 # Scatter plot
├── tls-comparison.html           # Slope chart
├── bellingrath.html              # Bellingrath matrix (2 charts)
├── schmatz.html                  # Schmatz algorithms (5 charts)
├── mraz.html                     # Mráz optimization (2 charts)
├── pqc.html                      # Post-quantum
├── legacy-single-page.html       # Old SPA (backup)
├── REPORT.md                     # Markdown report
├── summary.json                  # Aggregated data
└── detailed-iterations.json      # Raw iterations
```

---

## Navigation Flow

```
User visits: index.html
  ↓
Sees grid of 6 chart links
  ↓
Clicks: "1. Overview"
  ↓
Navigates to: overview.html (scatter plot)
  ↓
Views chart, can:
  - Share URL (deep link!)
  - Bookmark page
  - Use browser back button
  ↓
Click "← Back to Overview" or use browser back
  ↓
Returns to: index.html
  ↓
Clicks: "2. TLS 1.2 vs 1.3"
  ↓
Navigates to: tls-comparison.html
```

---

## Benefits

### 1. Deep Linking

**Before:**
```
URL: benchmark/visualizations.html#tls
Problem: Hash routing, not shareable
```

**After:**
```
URL: benchmark/tls-comparison.html
Benefit: Direct link, bookmarkable, shareable
```

### 2. Performance

**Before:**
- Loads all 7 charts' code at once
- ~200KB JavaScript
- Slower initial load

**After:**
- Loads only current chart's code
- ~30-50KB per page
- Faster page loads

### 3. Browser Navigation

**Before:**
- Back button may not work as expected
- History API required

**After:**
- Browser back/forward works naturally
- Standard HTML navigation

### 4. SEO

**Before:**
- One title for all content
- Hard for search engines to index sections

**After:**
- Unique title per page
- Better search engine indexing
- More descriptive page titles

### 5. Sharing

**Before:**
```
"Check out the optimization results!"
Link: visualizations.html (but which tab?)
```

**After:**
```
"Check out the optimization results!"
Link: mraz.html (direct to content!)
```

---

## Technical Details

### Shared Resources

Each page includes:
- Same CSS styles
- Same D3.js utilities
- Same color scales
- Same tooltip functions

**Implementation:**
```javascript
const SHARED_STYLES = `/* CSS */`;
const SHARED_UTILS = `/* D3 utilities */`;

// Inject into each page template
```

### Data Embedding

Each page embeds the full dataset:
```html
<script>
    const data = [/* all benchmark results */];
</script>
```

**Why full dataset?**
- Each page is self-contained
- No CORS issues
- Works offline
- Simple deployment

**Size impact:**
- summary.json: ~50-100KB
- Compressed in HTML: ~30-60KB
- Acceptable for 7 separate files

### Navigation Consistency

**Every content page has:**
1. Breadcrumb: `Home › Page Title`
2. Header: Consistent branding
3. Back button: `← Back to Overview`

**Index page has:**
- Grid of all pages
- Description of each chart
- Download links

---

## Deployment

### GitHub Pages

The workflow automatically deploys all 7 files:

```yaml
- name: Deploy to GitHub Pages
  uses: actions/deploy-pages@v4
  with:
    path: ./gh-pages
```

**Result:**
- `https://your-org.github.io/project/index.html`
- `https://your-org.github.io/project/overview.html`
- `https://your-org.github.io/project/tls-comparison.html`
- ... (all pages)

### Local Preview

```bash
# Generate pages
npm run generate-viz

# Open in browser
open results/index.html

# Or serve with local server
cd results
python3 -m http.server 8000
# Visit: http://localhost:8000
```

---

## Testing

### Multi-Page Structure Tests

**File:** `tests/multipage-viz.test.js`

**Tests:**
- - All required pages defined
- - Unique URLs for deep linking
- - Navigation links correct
- - Breadcrumb navigation
- - Back buttons
- - Unique page titles
- - File generation

**Run tests:**
```bash
npm run test:viz
```

---

## Migration Notes

### For Users

**No action required!** The system automatically uses multi-page.

**To access:**
1. Run: `npm run generate-viz`
2. Open: `results/index.html`
3. Click any chart link

### For Developers

**Old single-page still available:**
```bash
npm run generate-viz:single
# Creates: results/visualizations.html
```

**New multi-page (default):**
```bash
npm run generate-viz
# Creates: 7 HTML files in results/
```

### For CI/CD

**No changes needed!** Workflow uses new multi-page generator automatically.

---

## Examples

### Deep Link in Email

```
Subject: OpenSSL 3.5.3 Performance Results

Hi team,

The latest benchmark results are in. 

Optimization Analysis:
https://our-org.github.io/openssl-benchmark/mraz.html

Key finding: 12% improvement with Mráz config!

-Tim
```

### Link in README

```markdown
## Results

Latest benchmark results available at:
- [Dashboard](https://our-org.github.io/benchmark/)
- [TLS Protocol Comparison](https://our-org.github.io/benchmark/tls-comparison.html)
- [Algorithm Benchmarks](https://our-org.github.io/benchmark/schmatz.html)
```

### Social Media Sharing

```
Tweet: "OpenSSL 3.5.3 shows improved performance! 
Check out the interactive comparison: 
https://our-org.github.io/benchmark/overview.html 
#OpenSSL #Performance"
```

---

## Summary

**Changed:**
- - Single-page app → Multi-page site
- - Tab navigation → Direct links
- - Hash routing → Real URLs

**Benefits:**
- - Deep linking enabled
- - Better shareability
- - Faster page loads
- - Browser navigation works
- - SEO friendly

**Files:**
- 7 HTML pages generated
- 1 new generator script
- 1 test file added
- Old SPA available as fallback

**Compatibility:**
- - Works with existing data
- - Same visualizations
- - All features preserved
- - Tests updated

---

## Quick Commands

```bash
# Generate multi-page visualizations
npm run generate-viz

# Generate old single-page (backup)
npm run generate-viz:single

# Test multi-page structure
npm run test:viz

# Preview locally
open results/index.html
```

---

**Deep linking is now fully supported! Share specific chart URLs with confidence.**

