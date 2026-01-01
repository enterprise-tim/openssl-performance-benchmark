# View Chart Improvements

## Quick View

Open the updated visualization:

```bash
open /Users/tobrien/gitw/tobrien/openssl-performance-benchmark/results/visualizations.html
```

Then click on the **"6. Small Multiples"** tab.

## What You'll See

### SHA256 Hashing Chart (and all Small Multiples)

#### ✅ Dynamic Y-Axis Scaling
- The Y-axis now shows a range appropriate to your data
- Instead of -10% to +10%, you'll see something like -2% to +2% (depending on your data)
- This makes small differences clearly visible

#### ✅ Percentage Labels
Each bar now displays its exact percentage change:
- **One decimal place**: "+0.7%", "-0.3%", etc. (not "+1%", "0%")
- **Color-coded**:
  - 🟢 Green text for improvements (positive values)
  - 🔴 Red text for regressions (negative values)
- **Larger and bolder**: 11px bold font (up from 10px)
- **Better positioned**: More space between label and bar

#### ✅ Zero Reference Line
- Subtle gray dashed line at 0%
- Helps visually separate improvements from regressions
- Makes it easy to scan which versions are faster/slower

#### ✅ Taller Charts
- Charts are now 280px tall (up from 220px)
- More vertical space = better readability
- Labels have room to breathe

#### ✅ Better Documentation
- New explanatory text at the top of the section
- Explains how the Y-axis auto-scaling works
- Clarifies that even small differences matter

## Example Interpretation

If you see these labels on your SHA256 chart:

| Version | Label | Meaning |
|---------|-------|---------|
| 1.1.1w | _(no label)_ | This is the baseline (0%) |
| 3.0.15 | `+0.7%` 🟢 | 0.7% faster than baseline |
| 3.1.7 | `-0.3%` 🔴 | 0.3% slower than baseline |
| 3.2.3 | `+0.5%` 🟢 | 0.5% faster than baseline |
| 3.3.2 | `-0.1%` 🔴 | 0.1% slower than baseline |
| 3.4.0 | `+0.2%` 🟢 | 0.2% faster than baseline |
| 3.5.3 | `+0.9%` 🟢 | 0.9% faster than baseline |

## Before vs After Comparison

### Before (Old Chart)
```
Problem: Y-axis from -10% to +10%
┌─────────────────────────┐
│  10% │                  │
│      │                  │
│      │                  │
│      │                  │
│   0% ├──────────────────┤
│      │ ▎ ▎ ▎ ▎ ▎ ▎ ▎   │ ← Barely visible bars
│      │                  │
│ -10% │                  │
└─────────────────────────┘
  No percentage labels visible
  Can't tell differences
```

### After (New Chart)
```
Solution: Y-axis auto-scales to data range
┌─────────────────────────┐
│  +1.2% │      +0.9%      │ ← Green labels
│        │   █▌     ▌      │
│        │        ▌         │
│    0%  ├══════════════════┤ ← Zero line
│        │  ▄    ▄   ▄      │
│        │ -0.8% -0.3% -0.1%│ ← Red labels  
│ -1.2%  │                  │
└─────────────────────────┘
  Clear bars
  Prominent percentage labels
  Color-coded for quick reading
```

## Technical Verification

Check the generated HTML has these features:

```bash
# 1. Check chart height increased
grep "mini-chart { height:" results/visualizations.html
# Should show: .mini-chart { height: 320px; }

# 2. Check dynamic scaling is applied  
grep "const absMax = range" results/visualizations.html
# Should show: range * 1.25 (not fixed at 10)

# 3. Check one decimal place for labels
grep "toFixed(1)" results/visualizations.html | grep "%"
# Should find multiple instances in Small Multiples section
```

## All Affected Charts

These charts in the "Small Multiples" section all have the improvements:

1. **AES-256-GCM Throughput** - Shows encryption performance changes
2. **SHA256 Hashing** - Shows hashing performance changes  
3. **TLS 1.3 Handshake (New)** - Shows handshake capacity changes
4. **TLS 1.2 Handshake (Legacy)** - Shows legacy protocol changes

## Next Steps

### If You Like the Changes
No action needed! The improvements are already applied.

### If You Want to Adjust Further
Edit `scripts/generate-viz.js`:

**Line 1281** - Chart height:
```javascript
const height = 280;  // Change this number
```

**Line 1305** - Y-axis padding:
```javascript
const absMax = range > 0 ? range * 1.25 : 2;  // Change 1.25 for more/less padding
```

**Line 2740** - Label font size:
```javascript
.style("font-size", "11px")  // Change to "12px" etc.
```

Then regenerate:
```bash
node scripts/generate-viz.js
```

## Documentation

- Full technical details: `docs/SMALL_MULTIPLES_IMPROVEMENTS.md`
- Quick summary: `CHART_IMPROVEMENTS_SUMMARY.md`
- Original chart design notes: `docs/CHART_DESIGN_NOTES.md`

## Feedback

The changes are designed to:
- ✅ Make small differences visible
- ✅ Provide precise numerical data
- ✅ Enable quick visual analysis
- ✅ Maintain professional appearance
- ✅ Scale automatically to any data range

If you have suggestions for further improvements, they can be added to the `renderSmallMultiple()` function in `scripts/generate-viz.js` (lines 1276-1350).

