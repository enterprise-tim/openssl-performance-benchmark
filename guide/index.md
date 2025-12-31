# OpenSSL Performance Benchmark Guide

This directory contains documentation intended to help developers and AI assistants understand the structure, methodology, and usage of the `openssl-performance-benchmark` project.

## Guide Contents

- [**Architecture**](./architecture.md): Overview of how the benchmark suite is structured, from the Node.js orchestrator to the Dockerized containers.
- [**Metrics**](./metrics.md): Detailed explanation of the specific cryptographic performance metrics collected (Throughput, Handshake CPS, Latency).
- [**Usage**](./usage.md): Instructions for running the benchmark locally or via GitHub Actions.
- [**Configuration**](./configuration.md): How to configure the benchmark versions and Docker environment.
- [**Development**](./development.md): Guidelines for modifying the benchmark scripts or adding new metrics.

## Quick Summary

This project automates the performance testing of multiple OpenSSL versions (from 1.1.1 to the latest 3.x series) to identify regressions and improvements. It focuses on:

1.  **Algorithm Throughput:** Raw speed of encryption/hashing (AES-GCM, SHA256).
2.  **TLS Handshakes:** Connections per second for TLS 1.2 and 1.3.
3.  **Asymmetric Ops:** RSA and ECDSA signing/verification performance.
4.  **Post-Quantum:** Early testing of ML-KEM-768 (OpenSSL 3.5+).

The benchmark runs inside isolated Docker containers to ensure consistency and reproducible results.

