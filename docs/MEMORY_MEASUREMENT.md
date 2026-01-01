# Handshake Memory Measurement

## Overview

This feature measures **RAM consumption** (RSS - Resident Set Size) of OpenSSL's `s_server` process during TLS handshakes. This addresses concerns about memory usage differences between OpenSSL 1.1.1w and 3.x versions.

## What's Measured

The benchmark now captures memory consumption for:

### TLS 1.3 Handshakes
- **New connections** (RSA certificates): `tls1_3_rsa_new_memory_kb`
- **Resumed connections** (RSA certificates): `tls1_3_rsa_resume_memory_kb`
- **New connections** (ECDSA certificates): `tls1_3_ecdsa_new_memory_kb`
- **Resumed connections** (ECDSA certificates): `tls1_3_ecdsa_resume_memory_kb`

### TLS 1.2 Handshakes
- **ECDHE-RSA-AES128-GCM-SHA256**: `tls1_2_ecdhe_rsa_memory_kb`
- **RSA resumed connections**: `tls1_2_rsa_resume_memory_kb`
- **ECDHE-ECDSA-AES128-GCM-SHA256**: `tls1_2_ecdhe_ecdsa_memory_kb`
- **ECDSA resumed connections**: `tls1_2_ecdsa_resume_memory_kb`

## How It Works

### Memory Measurement Script
The `src/measure_memory.sh` script:
1. Accepts a process ID (PID) and duration
2. Samples RSS memory 20 times during the test period
3. Calculates and returns the average memory in KB

### Integration
During each handshake test, the benchmark script:
1. Starts memory monitoring in the background for the `s_server` process
2. Runs the handshake test (`openssl s_time`)
3. Waits for memory measurement to complete
4. Stores the result in the JSON output

### Example Benchmark Output
```json
{
  "metrics": {
    "tls1_3_rsa_new_cps": 5200,
    "tls1_3_rsa_new_memory_kb": 9500,
    "tls1_2_ecdhe_rsa_aes128gcm_cps": 5800,
    "tls1_2_ecdhe_rsa_memory_kb": 9200
  }
}
```

## Visualization

The new **Memory Consumption** page (`memory.html`) provides two interactive charts:

### Chart 1: Complete Memory Profile
Shows all measured memory metrics across OpenSSL versions:
- Grouped bar chart
- Separate bars for each test type (TLS 1.3 RSA, TLS 1.2 ECDHE-RSA, etc.)
- Y-axis in MB for easy interpretation

### Chart 2: Protocol Comparison
Direct comparison between TLS 1.2 and TLS 1.3 memory usage:
- Side-by-side bars for each version
- Highlights protocol-level differences
- Useful for migration planning

## Accessing the Charts

After running benchmarks:
```bash
npm run benchmark  # Collect data with memory measurements
npm run report     # Generate visualizations
```

Then open:
- `results/index.html` → Click "8. Memory Consumption"
- Or directly: `results/memory.html`

## Technical Details

### Measurement Accuracy
- Samples taken every 0.5 seconds during 10-second tests
- Uses `/proc/<pid>/status` VmRSS field (Linux only)
- Returns average RSS to smooth out spikes

### Platform Compatibility
- **Linux**: Full support (uses `/proc` filesystem)
- **macOS/BSD**: Not supported (different proc interface)
- **Docker**: Works perfectly (Linux containers)

### Overhead
- Negligible impact on benchmark performance
- Memory monitoring runs in separate process
- Uses standard shell tools (`grep`, `awk`, `bc`)

## Interpreting Results

### What RSS Measures
- **Physical RAM** actually used by the process
- Includes code, stack, heap, and loaded libraries
- **Excludes** swapped-out pages

### Expected Patterns
- **New connections** use more memory than resumed (session cache)
- **TLS 1.3** may differ from TLS 1.2 due to protocol complexity
- **OpenSSL 3.x** may show higher memory due to provider architecture

### Example Analysis
If OpenSSL 3.2.3 shows:
- TLS 1.3 New: 9.3 MB
- TLS 1.2 ECDHE-RSA: 9.0 MB

vs OpenSSL 1.1.1w:
- TLS 1.3 New: 8.0 MB
- TLS 1.2 ECDHE-RSA: 7.7 MB

**Interpretation**: ~15% memory increase in 3.x versions, consistent with provider overhead.

## FAQ

### Q: Why are some memory values 0?
A: Either the test failed, or the platform doesn't support `/proc` memory measurement.

### Q: How accurate is this?
A: Averages 20 samples over 10 seconds, providing good statistical accuracy for steady-state memory usage.

### Q: Does this measure peak memory?
A: No, it measures **average** RSS during the test period. Peak memory could be higher during individual operations.

### Q: Can I change the sampling rate?
A: Yes, edit `measure_memory.sh` and adjust `SAMPLES` and `INTERVAL` variables.

## Troubleshooting

### Memory values are all 0
```bash
# Check if /proc filesystem is available
cat /proc/self/status | grep VmRSS

# If not available, you're on an unsupported platform (likely macOS)
```

### Script permission errors
```bash
# Make measurement script executable
chmod +x src/measure_memory.sh
```

### bc command not found
```bash
# Install bc (basic calculator)
apt-get install bc  # Debian/Ubuntu
yum install bc      # RHEL/CentOS
```

## Future Enhancements

Potential improvements:
- [ ] Peak memory tracking
- [ ] Memory breakdown by component
- [ ] Client-side memory measurement
- [ ] macOS support via `ps` or Activity Monitor
- [ ] Memory leak detection (long-running tests)

## Testing the Feature

### Quick Validation

Run the quick test suite:
```bash
./test-memory-quick.sh
```

This validates:
- Scripts exist and are executable
- Syntax is valid (bash + JavaScript)
- Memory measurements properly integrated
- All 8 metrics present in code
- Visualization generation works
- Backward compatibility with old data

### Manual Testing

Test memory script directly:
```bash
# Start a test process
sleep 60 &
TEST_PID=$!

# Run memory measurement
./src/measure_memory.sh $TEST_PID 10

# Should output memory in KB
# Kill test process
kill $TEST_PID
```

### Verify Integration

```bash
# Check memory measurements in benchmark script
grep -c "measure_memory.sh" src/benchmark.sh
# Should output: 17 (16 measurements + 1 chmod)

# Check visualization function exists
grep -q "createMemoryPage" scripts/generate-viz-multipage.js && echo "OK"

# Generate and check output
node scripts/generate-viz-multipage.js
ls -lh results/memory.html
```

### Test with Real Benchmark

```bash
# Run full benchmark (takes 30-60 minutes)
npm run benchmark

# Verify memory metrics in output
grep "memory_kb" results/summary.json

# Generate visualizations
npm run report

# Open memory page
open results/memory.html
```

## References

- [Linux /proc Documentation](https://www.kernel.org/doc/Documentation/filesystems/proc.txt)
- [Understanding Process Memory](https://techtalk.intersec.com/2013/07/memory-part-1-memory-types/)
- [OpenSSL 3.x Architecture](https://www.openssl.org/docs/man3.0/man7/ossl-guide-libraries-introduction.html)

