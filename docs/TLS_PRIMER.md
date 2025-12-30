# TLS & Cryptography Primer

This document provides a basic overview of the concepts tested in this benchmark, intended for readers who may not be cryptography experts.

## 1. TLS Versions: A Brief History

Transport Layer Security (TLS), formerly known as SSL, is the protocol that encrypts communication over the internet (e.g., HTTPS).

*   **TLS 1.0 & 1.1 (Deprecated):** Old, insecure, and disabled by modern browsers. They used older algorithms (like SHA-1 and MD5) that are now considered broken.
*   **TLS 1.2 (The Workhorse):** Released in 2008. Still widely used. It is secure but has a slower "handshake" process (requires 2 round-trips to establish a connection) and supports many legacy algorithms that can be misconfigured.
*   **TLS 1.3 (The Modern Standard):** Released in 2018.
    *   **Faster:** Requires only 1 round-trip (1-RTT) to establish a connection.
    *   **Safer:** Removed all insecure legacy algorithms.
    *   **Simpler:** Encrypts more of the handshake itself, hiding certificates from snooping.

## 2. TLS Support in OpenSSL Versions

Not every version of OpenSSL supports every version of TLS. This is a key reason why upgrading is mandatory, even if performance regressions exist.

*   **OpenSSL 1.0.2 (EOL):** Supported TLS 1.2, but **not** TLS 1.3.
*   **OpenSSL 1.1.1 (EOL):** The first release to support **TLS 1.3**. This version became the standard for modern secure web servers.
*   **OpenSSL 3.x (Current):** Fully supports TLS 1.3 and all modern algorithms. It also introduces the architecture needed for upcoming Post-Quantum standards.

> **Why did OpenSSL jump from 1.1 to 3.0?**
> There was never an OpenSSL 2.0. The version number 2.x was used internally for the FIPS module. To avoid confusion and signify the massive architectural rewrite (unifying FIPS and non-FIPS code), the project jumped straight to 3.0.

**The Trade-off:**
When moving from 1.1.1 to 3.x, you are keeping the same TLS 1.3 protocol support, but swapping the underlying engine. The new engine is more modular (for future-proofing) but currently less efficient at the handshake "setup" phase.

## 3. What is a "Handshake"?

The "Handshake" is the expensive part of a secure connection. When you visit `https://google.com`, your browser and the server must:
1.  Agree on a version (TLS 1.3).
2.  Agree on algorithms (e.g., AES-256).
3.  **Authenticate:** The server sends a Certificate. Your browser checks the digital signature to prove it's really Google.
4.  **Key Exchange:** Both sides do heavy math (Diffie-Hellman) to generate a shared secret key.

**Why benchmark it?**
This process happens for *every new visitor*. If a server takes 1ms to handshake instead of 0.5ms, its capacity is cut in half. This is pure CPU load.

### New vs. Resumed Connections

Our benchmark tests two scenarios:

1.  **New Connections (Full Handshake):**
    *   **Scenario:** A user visits your site for the first time (or after their session expires).
    *   **Cost:** High. Requires full public-key cryptography (RSA/ECC certificates), which is CPU intensive.
    *   **Relevance:** Critical for public-facing web servers, load balancers, and APIs.

2.  **Resumed Connections:**
    *   **Scenario:** A user clicks a second link on your site shortly after the first.
    *   **Cost:** Low. The server remembers the user (via Session ID or Ticket) and skips the heavy crypto.
    *   **Relevance:** Important for returning users, but less sensitive to the specific OpenSSL version's efficiency than a full handshake.

## 3. Throughput (AES-GCM & SHA256)

Once the handshake is done, the browser and server have a "Session Key." They use this key to encrypt the actual data (HTML, images, JSON).
*   **AES-256-GCM:** The industry standard for this "bulk encryption." It's incredibly fast because modern CPUs have dedicated instructions (AES-NI) to run it.
*   **SHA256:** A "hashing" algorithm. It creates a unique fingerprint of data. It's used to sign certificates and verify that data hasn't been tampered with.

## 4. The Quantum Future (PQC)

"Post-Quantum Cryptography" (PQC) refers to new algorithms designed to resist attack by future Quantum Computers.
*   **The Threat:** A sufficiently powerful quantum computer could solve the math problems behind RSA and Elliptic Curves (ECC), breaking almost all current internet security.
*   **The Solution:** New math problems (like Lattice-based cryptography) that quantum computers are essentially bad at solving.
*   **Hybrid:** Using *both* a classic algorithm (ECC) and a new one (PQC) together. If the new one breaks, the old one saves you. If the old one breaks (via Quantum), the new one saves you.

**OpenSSL 3.5+** introduces support for these new standards (ML-KEM, ML-DSA). Our benchmark tests these to see how much slower (or larger) they are compared to today's standard cryptography.

