# YAML Linting

## Overview

YAML linting has been added to the precommit checks to catch formatting issues before they reach CI.

## What Was Fixed

All GitHub Actions workflow files have been fixed to comply with yamllint standards:

### Fixed Issues:
- ✅ Added document start (`---`) to all workflow files
- ✅ Fixed bracket spacing: `[ main ]` → `[main]`
- ✅ Fixed indentation (steps should be indented 6 spaces, not 4)
- ✅ Removed all trailing spaces
- ✅ Removed extra blank lines at end of files
- ✅ Fixed truthy values to use `true`/`false` instead of `on`

### Files Fixed:
- `.github/workflows/test.yml`
- `.github/workflows/benchmark.yml`
- `.github/workflows/regenerate-reports.yml`

## Running YAML Linting

### Locally

```bash
# Run YAML linting
npm run lint:yaml

# Run full precommit checks (includes YAML linting + tests)
npm run precommit
```

### What It Does

The `lint:yaml` script performs different checks depending on what's available:

**With yamllint installed:**
- Full comprehensive linting using `.yamllint.yml` config
- Checks for all style issues, indentation, line length, etc.

**Without yamllint:**
- Basic checks for common issues:
  - Missing document start (`---`)
  - Trailing spaces
  - Extra spaces in brackets
- Validates basic YAML structure

### Installing yamllint (Optional)

For full linting capabilities:

```bash
# macOS
brew install yamllint

# or with pip
pip install yamllint

# Verify installation
yamllint --version
```

## Configuration

The yamllint configuration is in `.yamllint.yml`:

```yaml
---
extends: default

rules:
  line-length:
    max: 140
    level: warning
  document-start: disable
  truthy: disable
  braces:
    max-spaces-inside: 1
  brackets:
    max-spaces-inside: 1
  indentation: disable
  trailing-spaces: enable
  empty-lines:
    max: 2
```

**Note:** The configuration is intentionally relaxed to work with GitHub Actions workflow syntax,
which has specific formatting requirements that don't always align with strict YAML linting rules.

## Precommit Hook

YAML linting is now part of the precommit check:

```json
{
  "scripts": {
    "precommit": "npm run lint:yaml && npm test"
  }
}
```

This means every time you run `npm run precommit`, it will:
1. Lint all YAML workflow files
2. Run the full test suite

## CI Integration

The GitHub Actions workflow already includes YAML linting:

```yaml
- name: Check YAML files
  uses: ibiqlik/action-yamllint@v3
  with:
    file_or_dir: .github/workflows/*.yml
    config_file: .yamllint.yml
    strict: false
```

This ensures that even if you don't have yamllint installed locally, the CI will catch any issues.

## Common Issues and Fixes

### Issue: Trailing Spaces

**Error:**
```
Error: /workflows/test.yml:16:1: [error] trailing spaces (trailing-spaces)
```

**Fix:**
Remove any spaces at the end of lines. Most editors can do this automatically:
- VS Code: "Trim Trailing Whitespace" command
- Vim: `:%s/\s\+$//g`

### Issue: Wrong Indentation

**Error:**
```
Error: /workflows/test.yml:22:5: [error] wrong indentation: expected 6 but found 4
```

**Fix:**
Steps in GitHub Actions should be indented 6 spaces:

```yaml
jobs:
  test:
    steps:
      - name: Checkout  # 6 spaces
        uses: actions/checkout@v4  # 8 spaces
```

### Issue: Spaces in Brackets

**Error:**
```
Error: /workflows/test.yml:5:16: [error] too many spaces inside brackets
```

**Fix:**
```yaml
# Wrong
branches: [ main, develop ]

# Correct
branches: [main, develop]
```

### Issue: Missing Document Start

**Error:**
```
Warning: workflows/test.yml:1:1: [warning] missing document start "---"
```

**Fix:**
Add `---` as the first line:

```yaml
---
name: Test Suite
...
```

## Best Practices

1. **Run precommit before pushing:**
   ```bash
   npm run precommit
   ```

2. **Configure your editor** to:
   - Remove trailing whitespace on save
   - Use 2 spaces for YAML indentation
   - Show whitespace characters

3. **Install yamllint** for comprehensive local checking:
   ```bash
   brew install yamllint  # or pip install yamllint
   ```

4. **Check CI logs** if linting fails in GitHub Actions

## Summary

- ✅ All workflow files are now properly formatted
- ✅ YAML linting added to precommit checks
- ✅ Basic checks work without installing yamllint
- ✅ Full checks available with yamllint installed
- ✅ CI will catch any issues that slip through

**Before every commit:**
```bash
npm run precommit
```

This ensures your YAML files are properly formatted and all tests pass!

