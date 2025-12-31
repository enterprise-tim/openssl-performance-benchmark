# Changelog

## 2025-12-31 - Visualization Robustness Improvements

### Fixed: Missing Data Handling in Charts

**Problem:** When benchmark data was incomplete (e.g., RSA/ECDSA metrics missing from older test runs), D3 charts would render with collapsed Y-axes showing "0K" at the top and zero-height bars, making it appear as if the charts were broken.

**Solution:** Added graceful missing data detection to all Schmatz algorithm charts:
- RSA Sign Performance
- RSA Verify Performance  
- ECDSA Sign Performance
- ECDSA Verify Performance
- Block Size Sensitivity

When data is missing, charts now display a helpful message like:

```
RSA Verify Performance Data Not Available

Run the full benchmark suite to generate RSA verification metrics.

The benchmark script tests RSA-2048 and RSA-4096 verification operations 
using openssl speed rsa2048 and openssl speed rsa4096. Verification is 
typically 10-50x faster than signing since it uses the public key.
```

**Files Modified:**
- `scripts/generate-viz.js` - Single-page dashboard charts
- `scripts/generate-viz-multipage.js` - Multi-page report charts

**Impact:** Server deployments will now show clear error messages instead of broken charts when data is missing, making it obvious what needs to be run to complete the benchmark suite.

### Technical Details

The fix checks if the maximum value across all metrics is zero or undefined before rendering:

```javascript
const maxVal = d3.max(data, d => d3.max(metrics, m => d.metrics[m.key] || 0));
if (!maxVal || maxVal === 0) {
    container.html("<div>...helpful message...</div>");
    return;
}
```

This prevents D3 from creating invalid scales like `domain([0, 0])` which caused the collapsed Y-axis issue.

