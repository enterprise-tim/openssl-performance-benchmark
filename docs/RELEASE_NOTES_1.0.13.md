# Release Notes - Version 1.0.13

**Release Date**: January 1, 2026

## Overview

This release enhances the Post-Quantum Cryptography (PQC) visualization with contextual comparisons to classical key exchange algorithms, helping users understand the performance tradeoffs between quantum-resistant and classical cryptography.

## What's New

### 🔐 Enhanced PQC Visualization

The Post-Quantum Cryptography page now provides **side-by-side comparison** of:

- **ML-KEM-768** (Post-Quantum, quantum-resistant)
- **ECDH P-256** (Classical, vulnerable to quantum attacks)
- **ECDH P-384** (Classical, vulnerable to quantum attacks)

### 📊 Improved Chart Design

- **Grouped bar chart** showing all three algorithms together
- **Color-coded legend** with algorithm descriptions
- **Interactive tooltips** with icons explaining each algorithm's security properties
- **Performance labels** showing operations per second
- **On-chart annotations** clarifying what the data means

### 📝 Extensive Explanatory Content

- **Info boxes** explaining the quantum threat and "harvest now, decrypt later" attacks
- **Algorithm comparison cards** with badges showing quantum-resistant vs vulnerable status
- **Key takeaways section** highlighting production-readiness
- **Migration recommendations** with timeline guidance by industry
- **Hybrid mode explanation** showing how to combine classical + post-quantum crypto

### 📚 Comprehensive Documentation

New documentation explaining:
- What ML-KEM is and why it matters
- The quantum computing threat to classical crypto
- Performance characteristics and tradeoffs
- Migration strategies for organizations
- Real-world impact on TLS connections

## Key Features

### Performance Context

The visualization now answers the critical question: **"How does post-quantum crypto compare to what we use today?"**

Example data from OpenSSL 3.5.3:
```
ML-KEM-768:     36,763 ops/sec  (Post-Quantum, quantum-resistant)
ECDH P-256:     21,081 ops/sec  (Classical, vulnerable to quantum)
ECDH P-384:      4,744 ops/sec  (Classical, vulnerable to quantum)
```

### Educational Value

The enhanced page helps users understand:
- ✅ ML-KEM is competitive with classical algorithms
- ✅ Performance is not the primary concern
- ⚠️ Larger key sizes are the main tradeoff
- ⚠️ Hybrid approaches provide best of both worlds

## Technical Details

### Files Changed

- `scripts/generate-viz-multipage.js` - Enhanced PQC chart with comparison
- `docs/PQC_CONTEXT.md` - New comprehensive PQC guide
- `docs/PQC_VISUALIZATION_FIX.md` - Updated with enhancement history
- `CHANGELOG.md` - New project changelog
- `package.json` - Version bump to 1.0.13

### Visualization Improvements

**Before (1.0.12)**:
- Single bar chart showing only ML-KEM-768
- No context for performance numbers
- Users couldn't assess relative performance

**After (1.0.13)**:
- Grouped bar chart with ML-KEM + ECDH P-256 + ECDH P-384
- Clear labels indicating quantum resistance
- Legend explaining each algorithm
- Educational description above chart

## Use Cases

### For Security Teams
- Assess ML-KEM performance impact before migration
- Compare post-quantum vs classical key exchange
- Plan quantum-safe transition timelines

### For Performance Engineers
- Understand computational overhead of PQC
- Identify bottlenecks in TLS handshakes
- Benchmark different OpenSSL versions

### For Researchers
- Compare algorithm implementations across versions
- Study performance trends in post-quantum crypto
- Validate optimization strategies

## Compatibility

- **OpenSSL Versions**: 3.5.0+ for ML-KEM data
- **Browsers**: Modern browsers with D3.js v7 support
- **Deployment**: GitHub Pages, static hosting

## Known Limitations

### ECDH Data Availability

If ECDH values show as 0 in the chart:
- The Schmatz algorithm tests may not have run
- Older benchmark results may not include ECDH
- Re-run the benchmark to collect complete data

The comparison is most meaningful when both ML-KEM and ECDH data are present.

## Migration from 1.0.12

No breaking changes. Simply:
1. Pull latest code
2. Run `npm install` (no new dependencies)
3. Regenerate visualizations with `npm run generate-viz`

Existing `summary.json` files are fully compatible.

## What's Next

### Planned for 1.0.14
- Hybrid key exchange benchmarks (X25519+ML-KEM-768)
- ML-DSA (post-quantum signatures) support
- Performance comparison tables

### Future Enhancements
- Additional PQC algorithms (ML-DSA, SLH-DSA)
- Historical trend analysis
- Hardware acceleration detection

## Documentation

### New Documentation
- `docs/PQC_CONTEXT.md` - Comprehensive PQC guide
- `CHANGELOG.md` - Project history

### Updated Documentation
- `docs/PQC_VISUALIZATION_FIX.md` - Enhancement history
- `README.md` - Updated feature list

## Acknowledgments

This enhancement was driven by user feedback asking for context around ML-KEM performance numbers. The comparison with classical ECDH provides the necessary baseline for understanding post-quantum cryptography tradeoffs.

## References

- [NIST Post-Quantum Cryptography Project](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [NIST FIPS 203 - ML-KEM Standard](https://csrc.nist.gov/pubs/fips/203/final)
- [OpenSSL 3.5.0 Release Notes](https://www.openssl.org/news/openssl-3.5-notes.html)

---

**Questions or Issues?**  
Please open an issue on [GitHub](https://github.com/enterprise-tim/openssl-performance-benchmark/issues)

**View the Live Demo:**  
https://enterprise-tim.github.io/openssl-performance-benchmark/pqc.html

