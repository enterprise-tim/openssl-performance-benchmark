# Small Multiples Chart Improvements

## Changes Made

### 1. **Dynamic Y-Axis Scaling**
**Problem**: The Y-axis had a minimum range of 10% (from -10% to +10%), which made small performance differences (< 5%) barely visible.

**Solution**: 
- Changed from fixed minimum 10% range to dynamic scaling based on actual data
- Added 20% padding to the data range for better label visibility
- Minimum range is now 2% (±1%) when differences are very small
- The scale automatically adjusts to highlight the actual performance differences

**Code Change** (line ~1298):
```javascript
// Before: Fixed minimum 10%
const absMax = Math.max(Math.abs(yDomain[0]), Math.abs(yDomain[1]), 10);

// After: Dynamic scaling with 20% padding
const range = Math.max(Math.abs(yDomain[0]), Math.abs(yDomain[1]));
const absMax = range > 0 ? range * 1.2 : 2;  // Minimum 2% range, with 20% padding
```

### 2. **Enhanced Percentage Labels**
**Improvements**:
- Increased font size from 10px to 11px for better readability
- Changed precision from 0 decimals to 1 decimal place (e.g., "+0.7%" instead of "+1%")
- Color-coded labels: Green for improvements, Red for regressions
- Better positioning with more spacing from bars

**Before**: 
```javascript
.style("font-size", "10px")
.text(d => (val > 0 ? "+" : "") + val.toFixed(0) + "%");
```

**After**:
```javascript
.style("font-size", "11px")
.style("fill", d => val >= 0 ? "#2f9e44" : "#c92a2a")
.text(d => (val > 0 ? "+" : "") + val.toFixed(1) + "%");
```

### 3. **Increased Chart Height**
- Chart height increased from 220px to 280px
- More vertical space to display data and labels clearly
- Top margin increased from 20px to 30px
- Left margin increased from 40px to 50px

### 4. **Added Zero Reference Line**
- Added a dashed horizontal line at 0% for visual reference
- Helps quickly identify which versions improved vs. regressed
- Subtle gray color to avoid visual clutter

### 5. **Improved Documentation**
- Added explanatory text in the Small Multiples section
- Explains how the Y-axis auto-scaling works
- Clarifies that even small differences can be meaningful at scale

## Visual Impact

### Before
- Small differences (0.5% - 2%) were barely visible as tiny bars
- Hard to distinguish between versions
- Percentage labels were small and low-contrast
- Large empty space above/below bars

### After
- All differences are clearly visible with appropriate scaling
- Each bar's performance change is immediately apparent
- Percentage labels are prominent and color-coded
- Charts use vertical space efficiently
- Zero line provides clear visual reference

## Example: SHA256 Hashing Chart

For SHA256 hashing with small differences (< 2%), the chart now:
1. **Scales Y-axis** from approximately -2% to +2% (not -10% to +10%)
2. **Shows percentage labels** like "+0.7%", "-0.4%" directly on bars
3. **Uses green/red colors** to indicate improvement/regression
4. **Displays zero line** to separate positive from negative changes

## Usage

The changes are automatically applied to all Small Multiples charts:
- AES-256-GCM Throughput
- SHA256 Hashing
- TLS 1.3 Handshake (New)
- TLS 1.2 Handshake (Legacy)

To regenerate with new data:
```bash
node scripts/generate-viz.js
```

Then open `results/visualizations.html` and navigate to "6. Small Multiples" tab.

## Technical Details

### Chart Dimensions
- **Width**: Dynamic based on container (min 260px with 50px margins)
- **Height**: 280px (up from 220px)
- **Grid**: Auto-fit columns with minimum 350px per chart
- **Card Height**: 320px (up from 250px)

### Styling
- **Bar colors**: Green (#40c057) for positive, Red (#fa5252) for negative
- **Label colors**: Dark green (#2f9e44) for positive, Dark red (#c92a2a) for negative
- **Zero line**: Gray (#868e96), dashed, 70% opacity
- **Font**: 11px bold for labels, 11px regular for axis

## Benefits

1. **Better Insights**: Small performance differences (0.1% - 5%) are now clearly visible
2. **Faster Analysis**: Color-coded labels and zero line enable quick pattern recognition
3. **More Accurate**: One decimal place shows true performance differences
4. **Professional**: Cleaner design with appropriate use of space and color
5. **Accessible**: Larger text and better contrast improve readability

## Related Files

- **Chart Generation**: `scripts/generate-viz.js` (lines 1276-1350)
- **Multipage Version**: `scripts/generate-viz-multipage.js` (same function)
- **Tests**: `tests/visualizations.test.js` (may need updates for new dimensions)

