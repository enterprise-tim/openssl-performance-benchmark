#!/bin/bash

# Installation Verification Script
# Verifies that all components are properly installed and configured

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🔍 OpenSSL Benchmark - Installation Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ v$NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check Docker
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
    echo -e "${GREEN}✓ v$DOCKER_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ Docker not found (needed for Docker tests)${NC}"
fi

# Check jq
echo -n "Checking jq... "
if command -v jq &> /dev/null; then
    JQ_VERSION=$(jq --version)
    echo -e "${GREEN}✓ $JQ_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ jq not found (needed for some tests)${NC}"
fi

echo ""
echo "─────────────────────────────────────────────────────────"
echo "Checking project structure..."
echo "─────────────────────────────────────────────────────────"
echo ""

# Check key files exist
FILES=(
    "config/versions.json"
    "docker/Dockerfile"
    "src/benchmark.sh"
    "scripts/aggregate-results.js"
    "scripts/generate-report.js"
    "scripts/generate-viz.js"
    "scripts/test-docker-build.sh"
    "tests/test-helpers.js"
    "tests/visualizations.test.js"
    "vitest.config.js"
    "package.json"
)

for file in "${FILES[@]}"; do
    echo -n "  $file... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ Missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "─────────────────────────────────────────────────────────"
echo "Checking package.json configuration..."
echo "─────────────────────────────────────────────────────────"
echo ""

# Check dependencies
echo -n "  Vitest... "
if grep -q '"vitest"' package.json; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Not configured${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo -n "  jsdom... "
if grep -q '"jsdom"' package.json; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Not configured${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo -n "  d3... "
if grep -q '"d3"' package.json; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Not configured${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check test scripts
echo ""
echo "Checking test scripts... "

SCRIPTS=(
    "test"
    "test:watch"
    "test:viz"
    "test:docker"
    "validate"
)

for script in "${SCRIPTS[@]}"; do
    echo -n "  npm run $script... "
    if grep -q "\"$script\":" package.json; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ Missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "─────────────────────────────────────────────────────────"
echo "Checking configuration..."
echo "─────────────────────────────────────────────────────────"
echo ""

# Check versions.json
echo -n "  Iterations field... "
if jq -e '.iterations' config/versions.json &> /dev/null; then
    ITERATIONS=$(jq -r '.iterations' config/versions.json)
    echo -e "${GREEN}✓ (set to $ITERATIONS)${NC}"
else
    echo -e "${YELLOW}⚠ Not set (will default to 1)${NC}"
fi

echo -n "  Versions array... "
VERSION_COUNT=$(jq -r '.versions | length' config/versions.json)
if [ "$VERSION_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ ($VERSION_COUNT versions configured)${NC}"
else
    echo -e "${RED}✗ No versions configured${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check if node_modules exists
echo ""
echo -n "Dependencies installed... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Run 'npm install' to install dependencies${NC}"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. npm install (if not done)"
    echo "  2. npm test"
    echo "  3. npm run test:docker (optional, takes 15-20 min)"
    echo ""
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found${NC}"
    echo ""
    echo "Please fix the errors above before continuing."
    echo ""
    exit 1
fi

