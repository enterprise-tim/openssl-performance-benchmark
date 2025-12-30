feat(benchmark): add OpenSSL performance benchmark suite (Docker, scripts, workflow, configs, and results)

Introduce a complete benchmark suite to evaluate OpenSSL versions (1.1.1 -> 3.x):
- Add GitHub Actions workflow to run matrix builds, collect results, and publish artifacts (.github/workflows/benchmark.yml)
- Add Dockerfile to build and run per-version OpenSSL images (docker/Dockerfile)
- Add Node.js runner and report/viz generators (scripts/run-benchmark.js, scripts/generate-report.js, scripts/generate-viz.js)
- Add shell benchmark harness and helper test (src/benchmark.sh, test_jq.sh)
- Add versions/config and an "optimized" OpenSSL runtime config (config/versions.json, config/openssl-optimized.cnf)
- Add package.json/npm scripts and lockfile for reporting tasks (package.json, package-lock.json)
- Add results, summary, visualizations and a human-readable REPORT (results/*.json, results/summary.json, results/visualizations.html, results/REPORT.md)
- Add comprehensive documentation and primers explaining methodology, critique and TLS background (README.md, docs/*)

This initial import provides reproducible containerized benchmarking, automated orchestration, reporting/visualization tools, and recorded result artifacts for the tested OpenSSL releases.