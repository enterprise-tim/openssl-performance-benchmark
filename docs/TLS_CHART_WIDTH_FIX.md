# TLS 1.2 vs 1.3 Chart Width Fix

## Problem
The TLS 1.2 vs 1.3 slope chart was too narrow - the SVG was overflowing its container, making the chart appear cramped and the slope lines too vertical.

## Root Cause
The chart was using incorrect padding in the `getWidth()` call:

```javascript
const width = getWidth(container, 60);  // ❌ Wrong
const margin = {top: 40, right: 150, bottom: 40, left: 150};  // 300px total horizontal margins
```

The `getWidth()` function returns `containerWidth - pad`. So with a 1400px container:
- Width returned: `1400 - 60 = 1340px`
- Total SVG width: `1340 + 150 (left) + 150 (right) = 1640px`
- **Result: SVG overflow** (1640px > 1400px container)

## Solution
Increased the padding parameter to account for the left and right margins:

```javascript
const width = getWidth(container, 320);  // ✅ Fixed
const margin = {top: 40, right: 150, bottom: 40, left: 150};
```

Now with a 1400px container:
- Width returned: `1400 - 320 = 1080px`
- Total SVG width: `1080 + 150 (left) + 150 (right) = 1380px`
- **Result: Proper fit** (1380px fits in 1400px container with 20px breathing room)

## Files Modified
1. `scripts/generate-viz-multipage.js` - Updated `getTlsComparisonFunction()` at line 471
2. `scripts/generate-viz.js` - Updated `renderTlsChart()` at line 579

## Regenerated Files
- `results/tls-comparison.html` (multi-page)
- `results/visualizations.html` (single-page)
- All other HTML files via `npm run generate-viz` and `npm run generate-viz:single`

## Impact
The TLS comparison chart now has proper horizontal spacing, making the slope lines easier to read and compare. The chart fits correctly within its container without overflow.

## Testing
To verify the fix, open `results/tls-comparison.html` or `results/visualizations.html` in a browser and check that:
1. The chart fills the container appropriately
2. The slope lines have proper horizontal spacing
3. No horizontal scrollbar appears
4. Version labels and percentage changes are clearly visible on both sides

## Date
December 31, 2025

