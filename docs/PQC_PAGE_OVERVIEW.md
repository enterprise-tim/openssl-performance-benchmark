# Post-Quantum Cryptography Page Overview

## Visual Layout

The enhanced PQC page (`pqc.html`) provides comprehensive explanatory content to help users understand quantum-resistant cryptography.

### Page Structure

```
┌──────────────────────────────────────────────────────────┐
│  🔐 Quantum-Resistant vs Classical Key Exchange         │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 📊 What This Chart Shows                       │    │
│  │                                                 │    │
│  │ ML-KEM-768 (purple) is post-quantum crypto     │    │
│  │ designed to resist quantum computer attacks.   │    │
│  │ Compared against ECDH P-256/P-384 (green/      │    │
│  │ yellow) which are classical algorithms used    │    │
│  │ today but vulnerable to quantum attacks.       │    │
│  │                                                 │    │
│  │ Key Insight: Higher bars = more key exchanges  │    │
│  │ per second. ML-KEM provides quantum resistance │    │
│  │ with competitive performance!                  │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │         INTERACTIVE BAR CHART                   │    │
│  │  With annotations, tooltips, and labels        │    │
│  │                                                 │    │
│  │  [Purple bars] ML-KEM-768 🛡️                   │    │
│  │  [Green bars]  ECDH P-256 ⚠️                    │    │
│  │  [Yellow bars] ECDH P-384 ⚠️                    │    │
│  │                                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────┬──────────┬──────────┐                    │
│  │ 🛡️ ML-KEM │ ⚠️ ECDH  │ ⚠️ ECDH  │                    │
│  │   768    │  P-256   │  P-384   │                    │
│  ├──────────┼──────────┼──────────┤                    │
│  │ Quantum  │ Quantum  │ Quantum  │                    │
│  │Resistant │Vulnerable│Vulnerable│                    │
│  │          │          │          │                    │
│  │ Lattice- │ Elliptic │ Elliptic │                    │
│  │  based   │  Curve   │  Curve   │                    │
│  │          │          │          │                    │
│  │ 1,184 B  │  32 B    │  48 B    │                    │
│  │  keys    │  keys    │  keys    │                    │
│  └──────────┴──────────┴──────────┘                    │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  🎯 Key Takeaways                                        │
│                                                          │
│  ✅ Performance is Production-Ready                     │
│     ML-KEM-768 is competitive with classical ECDH.      │
│     Performance overhead is minimal.                    │
│                                                          │
│  ⚠️  The Real Tradeoff: Bandwidth, Not Speed            │
│     ML-KEM keys are ~37x larger than ECDH P-256         │
│     (1,184 bytes vs 32 bytes). Adds 1-2 KB to TLS.     │
│                                                          │
│  🔮 Why This Matters: The Quantum Threat                │
│     "Harvest now, decrypt later" attacks happening      │
│     today. Adversaries capture encrypted traffic to     │
│     decrypt once quantum computers exist.               │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  🔄 Migration Recommendations                            │
│                                                          │
│  Recommended Approach: Hybrid Mode                      │
│  • X25519MLKEM768 - X25519 + ML-KEM-768                │
│  • SecP256r1MLKEM768 - ECDH P-256 + ML-KEM-768         │
│                                                          │
│  Why hybrid? You get security if either algorithm is    │
│  broken. Provides quantum resistance + confidence from  │
│  battle-tested classical crypto.                        │
│                                                          │
│  ┌─────────────────────┬──────────────┬────────────┐   │
│  │ Use Case            │ Recommendation│ Timeline   │   │
│  ├─────────────────────┼──────────────┼────────────┤   │
│  │ Government/Defense  │ Start now    │ 2025-2026  │   │
│  │ Financial Services  │ Plan & test  │ 2026-2027  │   │
│  │ Healthcare          │ Evaluate     │ 2026-2028  │   │
│  │ General Web         │ Monitor      │ 2027-2030  │   │
│  └─────────────────────┴──────────────┴────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Key Features

### 1. **Contextual Info Boxes**

Three types of info boxes provide educational content:

- **Blue Info Boxes**: Explanatory content about the chart and quantum threats
- **Yellow Warning Boxes**: Important tradeoffs and considerations
- **Green Success Boxes**: Positive takeaways about production-readiness

### 2. **Algorithm Comparison Cards**

Three side-by-side cards showing:
- **Security Badge**: 🛡️ Quantum Resistant or ⚠️ Quantum Vulnerable
- **Algorithm Details**: Type, standard, key size
- **Use Case**: When to use each algorithm

### 3. **Interactive Chart**

- **Grouped bars**: Easy visual comparison of all three algorithms
- **Color coding**: Purple (PQC), Green (ECDH-256), Yellow (ECDH-384)
- **Hover tooltips**: Detailed information on mouseover
- **Value labels**: Performance numbers directly on bars
- **Legend with icons**: Clear indication of security status

### 4. **Key Takeaways Section**

Distills complex information into actionable insights:
- Performance is competitive ✅
- Bandwidth is the real tradeoff ⚠️
- Quantum threat is real 🔮

### 5. **Migration Guidance**

Practical recommendations:
- **Hybrid mode explanation**: Best of both worlds
- **Timeline table**: When to migrate by industry
- **Code examples**: Actual OpenSSL algorithm names

## Educational Goals

The page is designed to answer:

1. **What is ML-KEM?** → Post-quantum key exchange algorithm
2. **Why does it matter?** → Classical crypto will be broken by quantum computers
3. **How fast is it?** → Competitive with classical algorithms (chart shows this)
4. **What's the tradeoff?** → Larger keys (~37x), not slower operations
5. **When should I migrate?** → Depends on your use case (table shows timeline)
6. **How do I migrate?** → Use hybrid mode (examples provided)

## Visual Design Principles

### Color Scheme

- **Purple (#7950f2)**: Post-quantum (ML-KEM) - futuristic, secure
- **Green (#40c057)**: Classical ECDH P-256 - currently secure
- **Yellow (#fab005)**: Classical ECDH P-384 - higher security today
- **Blue (#228be6)**: Info and guidance boxes
- **Red (#fa5252)**: Vulnerability warnings

### Badge System

- **🛡️ QUANTUM RESISTANT** (Purple badge): ML-KEM-768
- **⚠️ QUANTUM VULNERABLE** (Red badge): ECDH algorithms

### Typography

- **Headers**: Clear hierarchy (H2 → H3 → H4)
- **Info boxes**: Slightly larger text for readability
- **Code elements**: Monospace font with light gray background
- **Tables**: Striped rows for easy scanning

## Content Strategy

### Layered Information

1. **Quick scan**: Info boxes and key takeaways (30 seconds)
2. **Visual learner**: Chart with annotations (2 minutes)
3. **Detail seeker**: Algorithm cards and migration guide (5 minutes)
4. **Deep dive**: Link to PQC_CONTEXT.md (15+ minutes)

### Tone

- **Educational**: Explaining complex concepts clearly
- **Practical**: Providing actionable recommendations
- **Balanced**: Acknowledging tradeoffs, not fear-mongering
- **Forward-looking**: Preparing for quantum future

## Accessibility

- **Color + Icons**: Not relying on color alone (badges use icons)
- **Alt text**: Descriptive labels on all visual elements
- **Semantic HTML**: Proper heading hierarchy
- **Keyboard navigation**: All interactive elements accessible

## Mobile Responsiveness

- **Flexible grid**: Algorithm cards stack on narrow screens
- **Responsive chart**: D3.js adapts to container width
- **Touch-friendly**: Large touch targets for mobile

## User Journey

```
Entry → Info Box (context) → Chart (data) → Algorithm Cards (details) 
     → Key Takeaways (insights) → Migration Guide (action)
```

Each section builds on the previous, creating a complete narrative from "what" to "why" to "how."

## Success Metrics

The page is successful if users can answer:
- ✅ "Is ML-KEM fast enough for production?" (Yes, chart shows it)
- ✅ "What's the downside?" (Larger keys, not slower)
- ✅ "Should I migrate now?" (Depends on industry, table shows timeline)
- ✅ "How do I start?" (Use hybrid mode, examples provided)

---

**Version**: 1.0.13  
**Last Updated**: January 1, 2026  
**Author**: OpenSSL Performance Benchmark Project

