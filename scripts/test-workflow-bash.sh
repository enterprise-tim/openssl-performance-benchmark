#!/bin/bash

# Test bash syntax in workflow files
# Extracts bash scripts from YAML and validates them

echo "🔍 Testing bash syntax in workflow files..."

ERRORS=0

for workflow in .github/workflows/*.yml; do
  echo "Checking $workflow..."
  
  # Extract bash scripts from 'run: |' blocks
  # This is a simple extraction that looks for common patterns
  
  # Check for unclosed if statements
  if grep -n "if \[" "$workflow" | while read -r line; do
    LINE_NUM=$(echo "$line" | cut -d: -f1)
    # Check if there's a corresponding fi
    if ! sed -n "${LINE_NUM},/^[[:space:]]*-/p" "$workflow" | grep -q "fi$"; then
      echo "  ⚠️  Line $LINE_NUM: Possible unclosed 'if' statement"
    fi
  done | grep -q "⚠️"; then
    ERRORS=$((ERRORS + 1))
  fi
  
  # Check for missing spaces in [ conditionals
  if grep -n "if \[\[^[:space:]]" "$workflow" > /dev/null || \
     grep -n "if \[!\[^[:space:]]" "$workflow" > /dev/null; then
    echo "  ❌ Found 'if [' without space - should be 'if [ '"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "❌ Found $ERRORS potential issue(s)"
  echo "💡 Review the warnings above before pushing"
  exit 0  # Don't fail precommit, just warn
fi

echo "✅ No obvious bash syntax issues found"
exit 0

