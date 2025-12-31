#!/bin/bash

# GitHub Actions workflow linting
# Uses actionlint if available, falls back to our custom checks

echo "🔍 Linting GitHub Actions workflows..."

if command -v actionlint &> /dev/null; then
  echo "Using actionlint (comprehensive)..."
  actionlint .github/workflows/*.yml
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All workflows valid"
  else
    echo "❌ Workflow validation failed"
  fi
  exit $EXIT_CODE
else
  echo "⚠️  actionlint not installed (install with: brew install actionlint)"
  echo "Falling back to basic checks..."
  echo ""
  
  # Run our custom checks
  npm run lint:yaml --silent
  YAML_EXIT=$?
  
  npm run lint:workflows --silent
  BASH_EXIT=$?
  
  if [ $YAML_EXIT -eq 0 ] && [ $BASH_EXIT -eq 0 ]; then
    echo ""
    echo "✅ Basic workflow checks passed"
    echo "💡 Install actionlint for comprehensive validation:"
    echo "   brew install actionlint"
    exit 0
  else
    echo ""
    echo "❌ Workflow validation failed"
    exit 1
  fi
fi

