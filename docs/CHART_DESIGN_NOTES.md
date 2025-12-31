# Chart Design Notes

## RSA/ECDSA Sign vs Verify Separation

Following Martin Schmatz's (IBM) methodology from [his TLS performance presentation](https://www.youtube.com/watch?v=69gUVhOEaVM), RSA and ECDSA charts are split into separate Sign and Verify visualizations.

### Rationale

Combined charts showed both operations with vastly different scales:
- **Verify operations**: ~50,000-250,000 ops/sec (public key operations)
- **Sign operations**: ~1,000-13,000 ops/sec (private key operations)

This made version-to-version performance differences difficult to discern.

### Current Implementation

**Four separate charts:**

1. **RSA Sign** - Server-side operations (RSA-2048, RSA-4096)
2. **RSA Verify** - Client-side operations (RSA-2048, RSA-4096)
3. **ECDSA Sign** - Server-side operations (P-256, P-384, P-521)
4. **ECDSA Verify** - Client-side operations (P-256, P-384, P-521)

Each chart uses an appropriate Y-axis scale for its operation type, making performance differences across OpenSSL versions clearly visible.

**Reference:** Martin Schmatz (IBM), TLS Performance Analysis - https://www.youtube.com/watch?v=69gUVhOEaVM

---

## TLS Protocol Comparison (Slope Chart)

The TLS 1.2 vs 1.3 comparison uses a slope chart to show performance changes per version.

### Design

- **X-axis:** Protocol version (TLS 1.2 on left, TLS 1.3 on right)
- **Lines:** Each OpenSSL version connects its TLS 1.2 and TLS 1.3 performance
- **Slope direction:** Upward = TLS 1.3 faster, Downward = TLS 1.2 faster
- **Labels:** Percentage change shown on right side

### Interpretation

Upward slopes indicate TLS 1.3 outperforms TLS 1.2 for that OpenSSL version. Downward slopes show TLS 1.2 maintaining better performance. The slope angle and percentage labels quantify the difference.

---

## Multi-Page Structure

Visualizations are split across multiple HTML pages rather than tabs in a single-page app:

### Pages

- `index.html` - Dashboard with navigation
- `overview.html` - Scatter plot (throughput vs handshakes)
- `tls-comparison.html` - TLS 1.2 vs 1.3 slope chart
- `bellingrath.html` - RSA vs ECDSA matrix
- `schmatz.html` - Algorithm benchmarks (4 charts)
- `mraz.html` - Optimization analysis
- `pqc.html` - Post-quantum results

### Benefits

- Direct URLs for each chart (deep-linkable)
- Bookmarkable pages
- Faster page loads (only loads current chart's code)
- Natural browser navigation

**Implementation:** `scripts/generate-viz-multipage.js`

---

## Statistical Indicators

When multiple iterations are run, charts include:

- **Error bars:** ±1 standard deviation on scatter plots
- **Tooltips:** Show mean ± stddev
- **Header badge:** Displays iteration count
- **Labels:** Indicate statistical confidence

The error bar length visually represents measurement consistency - smaller bars indicate more reliable measurements.

