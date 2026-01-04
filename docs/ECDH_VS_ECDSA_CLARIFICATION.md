# ECDH vs ECDSA Clarification

## Version 1.0.14 - January 4, 2026

## Purpose

This document explains the distinction between ECDH (Elliptic Curve Diffie-Hellman) and ECDSA (Elliptic Curve Digital Signature Algorithm) that was added to the PQC page to prevent visitor confusion.

## The Problem

Users were confused about whether:
- The ECDH metrics on the PQC page should match the ECDSA metrics on the Schmatz page
- ECDH and ECDSA are the same thing
- The performance numbers should be comparable

## The Answer: They're Different Cryptographic Operations

### ECDH (Elliptic Curve Diffie-Hellman)
- **Purpose:** Key exchange / Key agreement
- **Operation:** Two parties establish a shared secret over an insecure channel
- **Process:** 
  1. Each party generates a key pair (private + public)
  2. They exchange public keys
  3. Each derives the same shared secret using their private key + other's public key
- **Used for:** TLS handshakes, establishing session keys
- **Measured on:** PQC page (comparing with ML-KEM-768)
- **Metric:** Operations per second (full key exchange cycle)

### ECDSA (Elliptic Curve Digital Signature Algorithm)
- **Purpose:** Digital signatures / Authentication
- **Operation:** Create and verify cryptographic signatures
- **Process:**
  1. **Sign:** Create a signature on a message using private key
  2. **Verify:** Verify signature authenticity using public key
- **Used for:** Code signing, certificate chains, message authentication
- **Measured on:** Schmatz page
- **Metrics:** Sign operations/sec and Verify operations/sec (measured separately)

## Why Both Use Elliptic Curves But Are Different

| Aspect | ECDH | ECDSA |
|--------|------|-------|
| **Mathematical Basis** | Elliptic Curve Discrete Log Problem | Elliptic Curve Discrete Log Problem |
| **Curve Used** | Same curves (P-256, P-384, etc.) | Same curves (P-256, P-384, etc.) |
| **Operation** | Key agreement | Sign/Verify |
| **Output** | Shared secret (symmetric key) | Digital signature |
| **Quantum Vulnerability** | Yes (vulnerable) | Yes (vulnerable) |
| **Post-Quantum Replacement** | ML-KEM (Key Encapsulation) | ML-DSA (Digital Signatures) |

## The Clarifications Added

### 1. ECDH vs ECDSA Distinction
We added this note to the PQC page's "What This Chart Shows" section:

> **Important:** This chart measures **key exchange operations** (establishing shared secrets for encryption). This is different from **digital signature operations** (signing/verifying) shown on the Schmatz page. While both ECDH and ECDSA use elliptic curves, they perform fundamentally different cryptographic operations and their performance metrics are not directly comparable.

### 2. Real-World Impact Section
We added a new section "🌐 Real-World Impact: When Does Key Exchange Happen?" that explains:

- Key exchange only happens on **new TLS connections**, not every HTTP request
- Modern browsers reuse connections via HTTP keep-alive
- One key exchange can secure hundreds of requests
- **Who needs high performance:** High-traffic servers processing many NEW connections per second (e-commerce during sales, news sites, API gateways, CDN edge servers)
- **For typical websites:** The ML-KEM performance (31K ops/sec) is more than sufficient
- Real-world example: 10,000 concurrent users = only 100-500 key exchanges/sec needed

### 3. Technical TLS Explanation
We added a detailed technical explanation "🔧 How TLS Works (with ML-KEM or ECDH)" that covers:

**Initial TLS Handshake:**
1. Key Exchange: ML-KEM-768 or ECDH establishes shared secret
2. Key Derivation: Both sides derive symmetric keys
3. Handshake Complete: Connection ready

**Every HTTP Request After:**
- Only symmetric encryption (AES-256-GCM, ChaCha20-Poly1305)
- Uses keys from step 2
- No more ML-KEM operations
- ~1000x faster than asymmetric crypto

**Key Point:** ML-KEM vs ECDH only affects the initial handshake. After that, there's zero performance difference for ongoing requests.

## Why Performance Numbers Don't Match

The performance characteristics are different because:

1. **Different math operations:**
   - ECDH: Point multiplication + shared secret derivation
   - ECDSA: Sign uses random k-value, hash, and modular arithmetic
   - ECDSA: Verify uses double scalar multiplication

2. **Different computational costs:**
   - ECDH is typically faster (single scalar multiplication)
   - ECDSA Sign requires secure random generation (slower)
   - ECDSA Verify requires multiple operations (slower)

3. **Different use cases:**
   - ECDH happens once per TLS connection
   - ECDSA happens multiple times (cert chain validation)

## Post-Quantum Equivalents

| Classical | Post-Quantum | Purpose | Standard |
|-----------|--------------|---------|----------|
| ECDH | **ML-KEM** (CRYSTALS-Kyber) | Key exchange | NIST FIPS 203 |
| ECDSA | **ML-DSA** (CRYSTALS-Dilithium) | Digital signatures | NIST FIPS 204 |
| - | **SLH-DSA** (SPHINCS+) | Stateless signatures | NIST FIPS 205 |

## Files Modified

1. **`results/pqc.html`** - Added ECDH vs ECDSA clarification + real-world impact section + bandwidth cost analysis
2. **`scripts/generate-viz-multipage.js`** - Added all clarifications to generator template
3. **`docs/ECDH_VS_ECDSA_CLARIFICATION.md`** - This document

## Bandwidth Cost Analysis Added

Replaced the generic "negligible on modern networks" statement with **real math** showing actual bandwidth costs:

### Cost Table for Different Traffic Levels:
- **🔴 E-commerce Peak** (40K conn/sec): 640 Mbps → 6.9 TB/day → **$345-1,035/day** in cloud egress costs
- **🔴 Busy CDN Edge** (10K conn/sec): 160 Mbps → 1.7 TB/day
- **🟡 Popular Website** (1K conn/sec): 16 Mbps → 173 GB/day
- **🟢 Typical Website** (100 conn/sec): 1.6 Mbps → 17 GB/day

### Red Flag Scenarios Identified:
1. High-traffic sites: Hundreds of Mbps to Gbps = real money
2. **DDoS amplification:** 37x more bandwidth per handshake flood
3. Mobile networks: 2G/3G with limited bandwidth
4. Satellite/IoT: Expensive per-byte costs ($5-50/MB)
5. Geographic regions with expensive internet infrastructure

### Context Provided:
For most sites, ML-KEM overhead is <1% of total bandwidth, but for the busiest sites processing tens of thousands of new connections/sec, this is hundreds of Mbps to Gbps of sustained cost.

## Latency Impact Analysis Added

Added comprehensive section "⏱️ Latency Impact: How 2 KB Affects Page Load Times" showing real transmission delays across network types:

### Latency Table by Network Type:
- **🟢 Fiber/Cable (100 Mbps):** +0.16ms - Imperceptible
- **🟢 5G Sub-6 (150 Mbps):** +0.11ms - Imperceptible
- **🟡 LTE/Fast 4G (30 Mbps):** +0.5ms - Barely noticeable
- **🟡 Average 4G (10 Mbps):** +1.6ms - Minor
- **🟠 Slow 4G/Rural (3 Mbps):** +5.5ms - Noticeable on slow sites
- **🔴 3G/HSPA+ (1.5 Mbps):** +11ms - Noticeable delay
- **🔴 2G/EDGE (250 Kbps):** +65ms - Significant delay
- **🔴 Satellite (2 Mbps):** +8ms - Adds to existing 500-700ms latency

### Regional Impact Analysis:
- **Developing markets:** 2G/3G still common (Africa, rural Asia, Latin America) = 10-65ms extra per connection
- **Mobile-first regions:** India, Southeast Asia where mobile is primary = 5-11ms added latency
- **Rural areas globally:** Limited infrastructure = more noticeable delays
- **Network congestion:** Overloaded towers (events, emergencies) multiply the problem

### User Experience Context:
For **2+ billion users** still on 2G/3G or slow 4G, ML-KEM adds meaningful delay to every new connection. Combined with typical mobile latency (50-200ms), this compounds the "slow web" problem.

### Mitigation Strategies Provided:
1. TLS session resumption (latency hit only on first connection)
2. Connection pooling (HTTP keep-alive)
3. CDN edge nodes (reduce base latency)
4. Hybrid mode (X25519+MLKEM768)
5. Gradual rollout (start with fast-connection markets first)

## Testing

To verify the clarification appears correctly:

```bash
# Regenerate the visualization
npm run generate-viz

# Check the generated file
open results/pqc.html

# Look for the "Important:" paragraph in the blue info box
```

## Future Considerations

When we add ML-DSA (post-quantum signatures) benchmarks in the future, we should:
1. Create a separate page or section for signature operations
2. Compare ML-DSA against RSA/ECDSA (not against ML-KEM/ECDH)
3. Add similar clarifications to prevent confusion

## References

- [NIST Post-Quantum Cryptography Standards](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [RFC 8446 - TLS 1.3](https://datatracker.ietf.org/doc/html/rfc8446) (uses both ECDH and ECDSA)
- [ML-KEM (FIPS 203)](https://csrc.nist.gov/publications/detail/fips/203/final)
- [ML-DSA (FIPS 204)](https://csrc.nist.gov/publications/detail/fips/204/final)

## Summary

**Key Takeaway:** ECDH ≠ ECDSA. They use similar mathematics (elliptic curves) but serve completely different purposes. ECDH is for key exchange, ECDSA is for signatures. The performance metrics should not be compared directly.

