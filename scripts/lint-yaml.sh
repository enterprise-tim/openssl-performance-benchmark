#!/bin/bash

# YAML linting script
# Uses yamllint if available, otherwise performs basic checks

echo "🔍 Linting YAML files..."

if command -v yamllint &> /dev/null; then
  echo "Using yamllint..."
  yamllint -c .yamllint.yml .github/workflows/*.yml
  exit $?
else
  echo "⚠️  yamllint not found (install with: pip install yamllint)"
  echo ""
  echo "📝 Performing basic checks..."
  
  # Basic checks for common issues
  ERRORS=0
  for file in .github/workflows/*.yml; do
    echo "  Checking $file..."
    
    # Check if file starts with ---
    if ! head -1 "$file" | grep -q "^---"; then
      echo "    ❌ Missing document start '---'"
      ERRORS=$((ERRORS + 1))
    fi
    
    # Check for trailing spaces
    if grep -n " $" "$file" > /dev/null; then
      echo "    ❌ Trailing spaces found"
      ERRORS=$((ERRORS + 1))
    fi
    
    # Check for spaces in brackets
    if grep -n "\[ " "$file" > /dev/null || grep -n " \]" "$file" > /dev/null; then
      echo "    ❌ Extra spaces in brackets"
      ERRORS=$((ERRORS + 1))
    fi
    
    if [ $ERRORS -eq 0 ]; then
      echo "    ✅ Basic checks passed"
    fi
  done
  
  if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "❌ Found $ERRORS issue(s)"
    echo "💡 Install yamllint for comprehensive checking: pip install yamllint"
    exit 1
  fi
  
  echo ""
  echo "✅ All basic YAML checks passed"
  echo "💡 Full linting will run in GitHub Actions CI"
  echo "   To test locally, install yamllint: pip install yamllint"
  exit 0
fi

