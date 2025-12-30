# Benchmark Methodology: Critique & Validity

This document outlines the architectural decisions behind this benchmark, identifies potential weaknesses (the "Cynical View"), and provides the technical context required to interpret the results transparently.

## The Testing Architecture

*   **Environment**: Docker Containers (Debian Bookworm Slim).
*   **Compilation**: Source-compiled (default `./config`).
*   **Tools**: `openssl speed -evp` (Throughput) and `openssl s_time` (Handshake).
*   **Isolation**: Each version runs in a fresh container to prevent library conflict.

---

## The Cynical View: Potential Criticisms

If I were a skeptic reviewing these results, here is where I would poke holes, and how we answer them.

### 1. "Synthetic benchmarks don't reflect real-world application performance."
**Critique:** `openssl speed` measures raw algorithm performance in a tight loop. Real-world applications (like Nginx, Node.js, or Python) spend time parsing HTTP, managing TCP sockets, and writing logs. A 15% regression in OpenSSL might only result in a 1% regression in a real web server.
**Transparency:** This is correct. This benchmark measures the **library overhead ceiling**. It isolates the cryptographic component. If the library is slower, the application *cannot* be faster, but the impact will be diluted by other application logic. We are measuring the engine, not the whole car.

### 2. "Testing on Localhost (loopback) ignores network latency."
**Critique:** The `s_time` test connects to `s_server` on `localhost`. In a production environment, network latency (RTT) often dominates the connection time. A 0.5ms CPU regression in the handshake might be invisible against a 50ms network round-trip.
**Transparency:** We purposefully test on localhost to **eliminate network jitter**. If we tested over a real network, the variance in packet delivery would hide the CPU efficiency differences we are trying to measure. We are testing the CPU cost of the handshake, not the network cost.

### 3. "Default compilation flags are not production-ready."
**Critique:** Linux distributions (Debian, RHEL) apply heavy patching and specific compiler flags (`-O3`, `-march=native`) when packaging OpenSSL. Compiling from source with defaults might miss optimizations that exist in `apt-get install openssl`.
**Transparency:** We use the upstream default `./config` for all versions. This ensures we are comparing the **codebase changes** (OpenSSL 1.1 vs 3.x) rather than the **packager's optimization skills**. While absolute numbers might differ from a distro package, the *relative* regression between versions remains valid.

### 4. "Docker adds overhead."
**Critique:** Running inside Docker (especially on macOS or Windows) involves virtualization overhead. The CPU scheduling inside the VM might skew the results compared to bare metal.
**Transparency:**
*   **On Linux:** Docker overhead is negligible (syscall isolation).
*   **On macOS/Windows:** There is virtualization overhead.
*   **Defense:** Since *every* version (1.1.1 through 3.5) runs inside the *exact same* Docker environment, the environment cancels out. We are looking for the *trend* across versions, not the absolute "max requests per second" of the hardware.

### 5. "s_server is single-threaded."
**Critique:** `openssl s_server` is a simple test tool, not a production server. It is single-threaded. If the client (`s_time`) generates load faster than `s_server` can accept it, we are benchmarking the single-core limit of the server tool, not the handshake efficiency of the library.
**Transparency:** This is a valid constraint. However, since the `s_server` is running the *same version* of OpenSSL as the client in our test, a regression in the server code (which is part of the library) is still a valid finding. If OpenSSL 3.x makes `s_server` slower to accept connections, that is part of the performance regression we are measuring.

---

## Technical Assumptions

1.  **EVP vs Low-level:** We use `openssl speed -evp` (Envelope). This is crucial because it allows OpenSSL to use hardware acceleration (AES-NI) if available. Testing without `-evp` would test the software implementation, which is irrelevant for 99% of production use cases.
2.  **Session Resumption:** We strictly separate "New Connections" (Full Handshake) from "Resumed Connections". The "New Connection" metric is the most critical for public-facing web servers where users are visiting for the first time.
3.  **Payload Size:** We test 1KB and 8KB blocks. 1KB approximates small API responses; 8KB approximates larger static assets or bulk data transfers.

## Summary for Publication

> "While this benchmark is synthetic and isolates the library from real-world network noise, it confirms that the CPU cost of establishing a secure connection has increased significantly in the 3.x series. This 'tax' is paid on every new connection, regardless of how fast your network is."

