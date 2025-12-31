#!/bin/bash

# Regenerate Reports from Existing Results
# Use this when you want to tweak reports without re-running benchmarks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/results"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 Regenerate Reports from Existing Results"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if results exist
if [ ! -f "$RESULTS_DIR/summary.json" ]; then
    echo "❌ No summary.json found in results/"
    echo ""
    echo "You need to either:"
    echo "  1. Run benchmarks locally: npm run benchmark"
    echo "  2. Download from GitHub Actions: gh run download <run-id>"
    echo ""
    exit 1
fi

echo -e "${BLUE}📄 Found existing results:${NC}"
ls -lh "$RESULTS_DIR"/result-*.json 2>/dev/null | wc -l | xargs echo "  • Result files:"
ls -lh "$RESULTS_DIR/summary.json" 2>/dev/null || echo "  • summary.json: Not found"
echo ""

# Check if we need to re-aggregate
ITERATION_FILES=$(ls "$RESULTS_DIR"/result-*-iter*.json 2>/dev/null | wc -l | tr -d ' ')

if [ "$ITERATION_FILES" -gt 0 ]; then
    echo -e "${YELLOW}Found $ITERATION_FILES iteration files${NC}"
    echo -e "${BLUE}Do you want to re-aggregate before generating reports? (y/N)${NC}"
    read -r SHOULD_AGGREGATE
    
    if [[ "$SHOULD_AGGREGATE" =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${BLUE}🔄 Re-aggregating results...${NC}"
        node "$PROJECT_ROOT/scripts/aggregate-results.js" "$RESULTS_DIR" "$RESULTS_DIR"
        echo -e "${GREEN}✓ Aggregation complete${NC}"
    fi
fi

echo ""
echo -e "${BLUE}📝 Generating Markdown report...${NC}"
cd "$PROJECT_ROOT"
npm run generate-report
echo -e "${GREEN}✓ Report generated: results/REPORT.md${NC}"

echo ""
echo -e "${BLUE}📊 Generating visualizations...${NC}"
npm run generate-viz
echo -e "${GREEN}✓ Visualizations generated${NC}"
echo -e "${GREEN}  • results/index.html${NC}"
echo -e "${GREEN}  • results/overview.html${NC}"
echo -e "${GREEN}  • results/tls-comparison.html${NC}"
echo -e "${GREEN}  • results/bellingrath.html${NC}"
echo -e "${GREEN}  • results/schmatz.html${NC}"
echo -e "${GREEN}  • results/mraz.html${NC}"
echo -e "${GREEN}  • results/pqc.html${NC}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Reports regenerated successfully!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Open the reports:"
echo "  • Markdown: cat results/REPORT.md"
echo "  • Dashboard: open results/index.html"
echo "  • Specific chart: open results/schmatz.html"
echo ""
echo "Deploy to GitHub Pages:"
echo "  • Manual: Copy results/*.html to gh-pages branch"
echo "  • Automated: Use 'Regenerate Reports Only' workflow"
echo ""

