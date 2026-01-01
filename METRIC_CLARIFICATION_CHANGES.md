# Handshake Metric Clarification Changes

## Problem
The benchmark was using ambiguous metric names `handshakes_new_per_sec` and `handshakes_resume_per_sec` that didn't indicate these were **TLS 1.3** handshakes (not TLS 1.2). This caused confusion when viewing reports and charts.

## Root Cause
Looking at `src/benchmark.sh` lines 541-543:
```bash
# Legacy metric names for backward compatibility
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS13_RSA_NEW:-0}" '.metrics.handshakes_new_per_sec = ...')
RESULTS=$(echo "$RESULTS" | jq --arg v "${HS_TLS13_RSA_RESUME:-0}" '.metrics.handshakes_resume_per_sec = ...')
```

These "legacy" metrics were copying values from `HS_TLS13_RSA_NEW` and `HS_TLS13_RSA_RESUME` (TLS 1.3 variables) but the metric names didn't indicate the protocol version.

## Changes Made

### 1. Benchmark Script Documentation (`src/benchmark.sh`)
- Added warning comments explaining these are TLS 1.3 metrics
- Marked them as DEPRECATED
- Recommended using explicit metric names instead

### 2. Visualization Labels (`scripts/generate-viz-multipage.js`)
Updated multiple locations:

**Overview Page (Scatter Plot):**
- ✅ Y-axis label: Changed "Handshakes/sec" → "**TLS 1.3** Handshakes/sec"
- ✅ Card description: Changed "Handshake Speed" → "**TLS 1.3** Handshake Speed"
- ✅ Tooltip: Changed "HS:" → "**TLS 1.3 Handshakes:**"

**Bellingrath Page (Resumption Chart):**
- ✅ Title: Changed "Session Resumption Performance" → "**TLS 1.3** Session Resumption Performance"
- ✅ Description: Added clarification that these measure TLS 1.3 with RSA certificates
- ✅ Legend labels: Changed "New Connections" → "**TLS 1.3** New Connections"
- ✅ Legend labels: Changed "Resumed Connections" → "**TLS 1.3** Resumed Connections"
- ✅ Added deprecation note explaining the metric names

### 3. README Documentation (`README.md`)
Added new section "⚠️ Important: Handshake Metric Naming" that:
- Lists the deprecated metrics and what they actually measure
- Explains why the naming is problematic
- Recommends explicit alternatives:
  - `tls1_3_rsa_new_cps`
  - `tls1_3_rsa_resume_cps`
  - `tls1_2_ecdhe_rsa_aes128gcm_cps`
  - `tls1_2_ecdhe_ecdsa_aes128gcm_cps`

## What Protocol Versions Are Actually Tested?

### TLS 1.3 Metrics (from benchmark.sh lines 427-458):
- `tls1_3_rsa_new_cps` - New connections with RSA certs
- `tls1_3_rsa_resume_cps` - Resumed connections with RSA certs
- `tls1_3_rsa_aes128gcm_cps` - With TLS_AES_128_GCM_SHA256 cipher
- `tls1_3_ecdsa_new_cps` - New connections with ECDSA certs
- `tls1_3_ecdsa_resume_cps` - Resumed connections with ECDSA certs

### TLS 1.2 Metrics (from benchmark.sh lines 470-534):
- `tls1_2_ecdhe_rsa_aes128gcm_cps` - ECDHE-RSA-AES128-GCM-SHA256
- `tls1_2_rsa_aes256gcm_cps` - AES256-GCM-SHA384
- `tls1_2_rsa_resume_cps` - Resumed connections
- `tls1_2_ecdhe_ecdsa_aes128gcm_cps` - ECDHE-ECDSA-AES128-GCM-SHA256
- `tls1_2_ecdsa_resume_cps` - Resumed connections with ECDSA

### Deprecated (Ambiguous) Metrics:
- `handshakes_new_per_sec` → Actually TLS 1.3 RSA new
- `handshakes_resume_per_sec` → Actually TLS 1.3 RSA resumed

## Impact

All visualizations now clearly indicate:
- Which TLS protocol version is being tested (1.2 vs 1.3)
- Which certificate type is being used (RSA vs ECDSA)
- Which cipher suite is being tested (where applicable)

No more confusion about "what the fuck is this graph" testing! 🎯

## Testing
Reports regenerated successfully with:
```bash
npm run report
```

All charts now display "TLS 1.3" labels where appropriate.

## Date
December 31, 2025

