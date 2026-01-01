# TLS 1.2 Benchmark Fix for OpenSSL 1.1.1w

## Problem

The benchmark was showing `0` for all TLS 1.2 metrics for OpenSSL 1.1.1w:

```
--- Bellingrath Alignment: RSA vs ECDSA Certificate (conn/sec) ---
Version        TLS 1.3 RSA       TLS 1.3 ECDSA     TLS 1.2 RSA       TLS 1.2 ECDSA
-------------------------------------------------------------------------------------
1.1.1w         8,032             17,459            0                 0
3.0.15         5,966             10,492            6,145             10,227
```

## Root Cause

The `s_time` command in OpenSSL 1.1.1 **does not support the `-tls1_2` flag**.

From the benchmark execution logs:

```bash
TLS 1.2 RSA: ECDHE-RSA-AES128-GCM-SHA256...
WARNING: TLS 1.2 ECDHE-RSA test returned 0 or empty.
Raw output sample:
s_time: Option unknown option -tls1_2
s_time: Use -help for summary.
```

## Solution

Modified `src/benchmark.sh` to add conditional logic for OpenSSL 1.1.1:

### For OpenSSL 1.1.1
- **Omit** the `-tls1_2` flag
- **Use** only the `-cipher` flag to specify cipher suites
- Let the TLS version negotiate automatically (will default to TLS 1.2 when TLS 1.3 cipher suites aren't used)

### For OpenSSL 3.x
- **Keep** the explicit `-tls1_2` flag for precise version control

## Changes Made

### 1. TLS 1.2 ECDHE-RSA Test (lines 471-491)

```bash
if [ "$IS_OPENSSL_1_1" = "true" ]; then
    # For 1.1.1, use cipher suite without explicit version flag
    HS_TLS12_ECDHE_RSA=$(openssl s_time -connect localhost:4433 -new -cipher ECDHE-RSA-AES128-GCM-SHA256 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
else
    HS_TLS12_ECDHE_RSA=$(openssl s_time -connect localhost:4433 -new -tls1_2 -cipher ECDHE-RSA-AES128-GCM-SHA256 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
fi
```

### 2. TLS 1.2 AES256-GCM Test (lines 493-500)

```bash
if [ "$IS_OPENSSL_1_1" = "true" ]; then
    HS_TLS12_AES256=$(openssl s_time -connect localhost:4433 -new -cipher AES256-GCM-SHA384 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
else
    HS_TLS12_AES256=$(openssl s_time -connect localhost:4433 -new -tls1_2 -cipher AES256-GCM-SHA384 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
fi
```

### 3. TLS 1.2 RSA Resumed (lines 502-508)

```bash
if [ "$IS_OPENSSL_1_1" = "true" ]; then
    HS_TLS12_RSA_RESUME=$(openssl s_time -connect localhost:4433 -reuse -cipher ECDHE-RSA-AES128-GCM-SHA256 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
else
    HS_TLS12_RSA_RESUME=$(openssl s_time -connect localhost:4433 -reuse -tls1_2 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
fi
```

### 4. TLS 1.2 ECDHE-ECDSA Test (lines 543-549)

```bash
if [ "$IS_OPENSSL_1_1" = "true" ]; then
    HS_TLS12_ECDHE_ECDSA=$(openssl s_time -connect localhost:4434 -new -cipher ECDHE-ECDSA-AES128-GCM-SHA256 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
else
    HS_TLS12_ECDHE_ECDSA=$(openssl s_time -connect localhost:4434 -new -tls1_2 -cipher ECDHE-ECDSA-AES128-GCM-SHA256 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
fi
```

### 5. TLS 1.2 ECDSA Resumed (lines 551-557)

```bash
if [ "$IS_OPENSSL_1_1" = "true" ]; then
    HS_TLS12_EC_RESUME=$(openssl s_time -connect localhost:4434 -reuse -cipher ECDHE-ECDSA-AES128-GCM-SHA256 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
else
    HS_TLS12_EC_RESUME=$(openssl s_time -connect localhost:4434 -reuse -tls1_2 -time 10 2>&1 | grep "connections/user sec" | awk '{print $1}')
fi
```

## Testing

After this fix, re-running the benchmark for OpenSSL 1.1.1w should produce non-zero TLS 1.2 metrics.

## Next Steps

1. Commit these changes
2. Re-run the benchmark workflow for 1.1.1w
3. Verify that TLS 1.2 metrics are now populated
4. Compare 1.1.1w TLS 1.2 performance with 3.x versions

## Technical Note

This approach relies on cipher suite selection to force TLS 1.2 negotiation:
- `ECDHE-RSA-AES128-GCM-SHA256` is a TLS 1.2-specific cipher suite name
- `ECDHE-ECDSA-AES128-GCM-SHA256` is a TLS 1.2-specific cipher suite name
- TLS 1.3 uses different cipher suite naming (e.g., `TLS_AES_128_GCM_SHA256`)

When the server and client both support TLS 1.3, but the cipher suite specified is TLS 1.2-only, the connection will negotiate TLS 1.2.

