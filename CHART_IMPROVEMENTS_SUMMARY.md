# Chart Improvements Summary

## What Changed

I've improved the **Small Multiples** charts (including the SHA256 Hashing chart) to better show small performance differences.

### Key Improvements

#### 1. **Smart Y-Axis Scaling** ✨
- **Before**: Fixed -10% to +10% range made small differences invisible
- **After**: Y-axis now auto-scales to your actual data range with 20% padding
- **Example**: If your data ranges from -0.8% to +1.2%, the chart will show approximately -1.4% to +1.4%

#### 2. **Prominent Percentage Labels** 📊
- **Before**: Small (10px), rounded to whole numbers, black text
- **After**: 
  - Larger (11px) and bolder
  - Shows one decimal place (e.g., "+0.7%" instead of "+1%")
  - Color-coded: Green for improvements, Red for regressions
  - Better positioning above/below bars

#### 3. **Taller Charts** 📏
- Charts are 60px taller (220px → 280px)
- More space for labels and data visualization
- Better readability

#### 4. **Zero Reference Line** ➖
- Added subtle dashed line at 0%
- Makes it easier to see which versions improved vs regressed
- Gray color, doesn't distract from data

#### 5. **Better Documentation** 📖
- Added explanation in the UI about how to read the charts
- Notes that Y-axis auto-scales to highlight differences
- Clarifies that small differences can be meaningful

## Visual Comparison

### Before
```
 10% |                  
     |                  
     |                  
     |                  
  0% |═══════════════════
     | ▎ ▎ ▎ ▎ ▎ ▎ ▎    (barely visible bars)
     |                  
-10% |                  
```

### After  
```
  2% |                  
     |    █▌   ▌        (+1.2%, +0.5%)
     |                  
  0% |═══════════════════ (zero line)
     |  ▄    ▄   ▄       (-0.8%, -0.4%, -0.3%)
     |                  
 -2% |                  
```

## How to View

1. **Open the visualization**:
   ```bash
   open results/visualizations.html
   ```

2. **Navigate to "6. Small Multiples" tab**

3. **Look at the SHA256 Hashing chart**:
   - Y-axis now scales to show your actual differences
   - Percentage labels appear directly on each bar
   - Green labels = improvements over 1.1.1w baseline
   - Red labels = regressions

## Files Modified

- `scripts/generate-viz.js` - Main visualization generator
  - Lines 37-39: Updated mini-chart height styling
  - Lines 1276-1350: Enhanced renderSmallMultiple function
  - Lines 327-376: Improved Small Multiples section description

## Regenerating Charts

Anytime you have new benchmark data:

```bash
node scripts/generate-viz.js
```

The improvements will automatically apply to all Small Multiples charts:
- ✅ AES-256-GCM Throughput
- ✅ SHA256 Hashing
- ✅ TLS 1.3 Handshake (New)
- ✅ TLS 1.2 Handshake (Legacy)

## Example: Reading SHA256 Chart

If you see:
- **1.1.1w**: (baseline, no label)
- **3.0.15**: `+0.7%` (green) - SHA256 is 0.7% faster than 1.1.1w
- **3.1.7**: `-0.3%` (red) - SHA256 is 0.3% slower than 1.1.1w
- **3.2.3**: `+0.5%` (green) - SHA256 is 0.5% faster than 1.1.1w

## Technical Details

### Dynamic Scaling Algorithm
```javascript
// Get the actual range of data
const yDomain = d3.extent(data, getPct);  // e.g., [-0.8, 1.2]

// Find the maximum absolute value
const range = Math.max(Math.abs(yDomain[0]), Math.abs(yDomain[1]));  // 1.2

// Add 20% padding and ensure minimum 2% range
const absMax = range > 0 ? range * 1.2 : 2;  // 1.44

// Scale is now [-1.44, +1.44] instead of [-10, +10]
```

### Color Scheme
- **Positive bars**: `#40c057` (green)
- **Negative bars**: `#fa5252` (red)
- **Positive labels**: `#2f9e44` (dark green)
- **Negative labels**: `#c92a2a` (dark red)
- **Zero line**: `#868e96` (gray, dashed)

## Benefits

1. **See Small Differences**: Changes as small as 0.1% are now clearly visible
2. **Quick Analysis**: Color coding and prominent labels speed up interpretation
3. **Accurate Data**: One decimal place shows true performance impact
4. **Professional Look**: Clean, modern design with appropriate use of space
5. **Better Context**: Zero line and auto-scaling provide immediate perspective

## Questions?

- See full technical details in `docs/SMALL_MULTIPLES_IMPROVEMENTS.md`
- Chart design philosophy in `docs/CHART_DESIGN_NOTES.md`
- Testing workflows in `docs/TESTING_WORKFLOWS.md`

