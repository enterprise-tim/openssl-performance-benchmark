# Post-Quantum Cryptography Context

## What is ML-KEM?

**ML-KEM** (Module-Lattice-Based Key Encapsulation Mechanism) is a post-quantum cryptographic algorithm standardized by NIST as part of their Post-Quantum Cryptography project. It was previously known as CRYSTALS-Kyber.

### Key Facts

- **Purpose**: Secure key exchange resistant to quantum computer attacks
- **Security Level**: ML-KEM-768 provides security equivalent to AES-192
- **Standardization**: NIST FIPS 203 (finalized August 2024)
- **OpenSSL Support**: Available in OpenSSL 3.5.0+ (September 2024)

## Why Post-Quantum Cryptography?

### The Quantum Threat

Classical key exchange algorithms like **ECDH (Elliptic Curve Diffie-Hellman)** are vulnerable to attacks from large-scale quantum computers using Shor's algorithm. While such computers don't exist yet, organizations need to prepare now because:

1. **"Harvest Now, Decrypt Later"**: Adversaries can capture encrypted traffic today and decrypt it once quantum computers become available
2. **Long-lived Data**: Some data needs protection for decades
3. **Migration Time**: Transitioning cryptographic infrastructure takes years

### Classical vs Post-Quantum

| Algorithm | Type | Quantum Resistant? | Key Size | Performance |
|-----------|------|-------------------|----------|-------------|
| **ECDH P-256** | Classical ECC | ❌ No | 32 bytes | Fast (~20K ops/sec) |
| **ECDH P-384** | Classical ECC | ❌ No | 48 bytes | Medium (~5K ops/sec) |
| **ML-KEM-768** | Post-Quantum Lattice | ✅ Yes | 1,184 bytes public key | Slower (~37K ops/sec) |

## Performance Comparison

### What the Benchmark Measures

The benchmark compares **key exchange operations per second**:

- **ECDH P-256/P-384**: Classical elliptic curve key agreement
- **ML-KEM-768**: Post-quantum key encapsulation

### Expected Performance Characteristics

**ML-KEM-768** typically shows:
- ✅ **Faster than ECDH P-384** in many implementations
- ⚠️ **Comparable to or slower than ECDH P-256** depending on hardware
- ⚠️ **Larger key sizes**: ~37x larger public keys than ECDH P-256
- ⚠️ **Higher bandwidth**: More data transmitted during handshake

### Real-World Impact

For TLS connections:
- **Handshake Size**: ML-KEM adds ~1-2 KB to handshake (vs ~32 bytes for ECDH P-256)
- **Latency**: Minimal impact on modern networks
- **CPU**: Slightly higher CPU usage per connection
- **Throughput**: Bulk encryption speed unaffected (uses AES-GCM)

## Hybrid Approaches

OpenSSL 3.5+ also supports **hybrid key exchange**:
- `X25519MLKEM768`: Combines classical X25519 + ML-KEM-768
- `SecP256r1MLKEM768`: Combines ECDH P-256 + ML-KEM-768

This provides:
- ✅ Security if either algorithm is broken
- ✅ Quantum resistance from ML-KEM
- ✅ Confidence from battle-tested classical crypto
- ⚠️ Slightly larger handshakes

## Benchmark Interpretation

### When ECDH Shows 0 ops/sec

If the benchmark shows ECDH values as 0, it means:
1. The Schmatz algorithm tests didn't run (older benchmark version)
2. The test was skipped
3. There was a parsing error

The comparison is most meaningful when both values are present.

### Performance Trends

Across OpenSSL versions:
- **3.5.0-3.5.3**: First versions with ML-KEM support
- **Expected**: ML-KEM performance will improve in future releases as implementations mature
- **Hardware**: Some CPUs have instructions that accelerate lattice operations

## Migration Strategy

### Current Recommendations (2025)

1. **Test Now**: Benchmark ML-KEM in your environment
2. **Hybrid Mode**: Use hybrid key exchange (classical + PQC)
3. **Monitor Standards**: NIST standards are still evolving
4. **Plan Timeline**: Budget 2-5 years for full migration

### When to Migrate

- **High-security systems**: Start migration now
- **Long-lived data**: Prioritize systems handling sensitive data
- **General use**: Wait for broader ecosystem support

## References

- [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [NIST FIPS 203 (ML-KEM)](https://csrc.nist.gov/pubs/fips/203/final)
- [OpenSSL 3.5.0 Release Notes](https://www.openssl.org/news/openssl-3.5-notes.html)
- [Cloudflare: Post-Quantum TLS](https://blog.cloudflare.com/post-quantum-for-all/)

## Benchmark Data

### Sample Results (OpenSSL 3.5.3)

From the GitHub Actions benchmark run (2026-01-01):

```
ML-KEM-768:     36,763 ops/sec
ECDH P-256:     21,081 ops/sec (if collected)
ECDH P-384:      4,744 ops/sec (if collected)
```

**Interpretation**: 
- ML-KEM-768 is performing well, showing competitive throughput
- The larger key sizes are the main tradeoff, not computational speed
- For most applications, the performance difference is negligible compared to network latency

---

**Last Updated**: January 1, 2026  
**OpenSSL Version**: 3.5.3  
**Benchmark Version**: 1.0.13

