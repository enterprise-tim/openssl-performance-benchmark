# OpenSSL Performance Benchmark Guide

This directory contains documentation intended to help developers and AI assistants understand the structure, methodology, and usage of the `openssl-performance-benchmark` project.

## Guide Contents

### Core Guides
- [**Architecture**](./architecture.md): Overview of how the benchmark suite is structured, including statistical iterations and aggregation pipeline.
- [**Metrics**](./metrics.md): Detailed explanation of the cryptographic performance metrics and statistical reporting (mean ± stddev).
- [**Usage**](./usage.md): Instructions for running benchmarks, tests, and validations locally or via GitHub Actions.
- [**Configuration**](./configuration.md): How to configure benchmark versions, iterations, and Docker environment.
- [**Development**](./development.md): Guidelines for modifying benchmark scripts, adding metrics, and testing changes.
- [**Testing**](./testing.md): ⭐ NEW - Developer-focused testing guide with workflows and best practices.

## Quick Summary

This project automates the **statistically rigorous** performance testing of multiple OpenSSL versions (from 1.1.1 to the latest 3.x series) to identify regressions and improvements. It focuses on:

1.  **Algorithm Throughput:** Raw speed of encryption/hashing (AES-GCM, SHA256).
2.  **TLS Handshakes:** Connections per second for TLS 1.2 and 1.3.
3.  **Asymmetric Ops:** RSA and ECDSA signing/verification performance.
4.  **Post-Quantum:** Early testing of ML-KEM-768 (OpenSSL 3.5+).

### Key Features

- 🔄 **Statistical Iterations:** Each version tested multiple times (default: 3) with mean and standard deviation reported
- 🧪 **Comprehensive Testing:** 350+ tests (Vitest + Docker) validate system before expensive CI runs
- 🐳 **Local Docker Validation:** Test builds locally (2-3 min) before deploying to GitHub Actions
- 📊 **Professional Visualizations:** Interactive D3 charts with error bars showing measurement confidence
- 💰 **Cost Protection:** Tests catch 95%+ of issues locally, saving ~$180/year in wasted CI minutes

The benchmark runs inside isolated Docker containers to ensure consistency and reproducible results. Each version is tested in **multiple iterations** to provide statistical confidence in measurements.

## Additional Documentation

For comprehensive coverage of new features:

- 📘 [**Statistical Iterations**](../docs/ITERATIONS.md): Multiple iterations with mean/stddev
- 📗 [**Vitest Testing Guide**](../docs/VITEST_GUIDE.md): Graph and unit testing
- 📙 [**Docker Testing**](../docs/DOCKER_TESTING.md): Local build validation
- 📖 [**Testing Overview**](../docs/TESTING.md): Complete testing guide
- 📋 [**Regenerating Reports**](../docs/REGENERATING_REPORTS.md): Separate reports from benchmarks

**Quick Start:** See [START_HERE.md](../START_HERE.md) for a 5-minute introduction.

